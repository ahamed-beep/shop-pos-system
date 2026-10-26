// src/pages/UdhaarManagement.jsx
import React, { useState, useEffect, useRef } from "react";
import { useDispatch as useReduxDispatch, useSelector as useReduxSelector } from "react-redux";
import {
  fetchUdhaarRecords,
  createUdhaarRecord,
  payUdhaarRecord,
  deleteUdhaarRecord,
} from "../Redux/features/udhaarSlice";
import { getAllProducts } from "../Redux/features/product";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  BanknotesIcon,
  XMarkIcon,
  PrinterIcon,
  UserIcon,
  PhoneIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  PhotoIcon,
  PencilSquareIcon
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Loading from "../components/Loading";
import ConfirmationModal from "../components/ConfirmationModal";
import PrintableReceipt from "../components/PrintableReceipt";
import { useReactToPrint } from "react-to-print";
import { toPng } from "html-to-image";
import api from "../api";

export default function UdhaarManagement() {
  const dispatch = useReduxDispatch();
  const { records, listLoading, actionLoading } = useReduxSelector((state) => state.udhaar || { records: [] });
  const products = useReduxSelector((state) => state.product?.products) || [];

  // Edit Mode State
  const [editingId, setEditingId] = useState(null);

  // Form Staging State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [borrowedDate, setBorrowedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [stagedItems, setStagedItems] = useState([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [payModalData, setPayModalData] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [deleteId, setDeleteId] = useState(null);

  // Printing & Voucher Image States
  const [printData, setPrintData] = useState(null);
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Udhaar-Voucher-${printData?.sale?.invoice_no || 'Receipt'}`,
  });

  useEffect(() => {
    dispatch(fetchUdhaarRecords());
    dispatch(getAllProducts());
  }, [dispatch]);

  const applyDateFilters = () => {
    dispatch(fetchUdhaarRecords({ startDate: fromDate, endDate: toDate }));
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setSearchTerm("");
    setStatusFilter("all");
    dispatch(fetchUdhaarRecords());
  };

  const resetForm = () => {
    setEditingId(null);
    setCustomerName("");
    setCustomerPhone("");
    setBorrowedDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setDiscount(0);
    setNotes("");
    setStagedItems([]);
  };

  const subtotal = stagedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = subtotal * (discount / 100);
  const grandTotal = Math.max(subtotal - discountAmount, 0);

  const handleStageProduct = (prod) => {
    const existing = stagedItems.find((i) => i.product_id === prod.id);
    if (existing) {
      if (existing.qty >= prod.qty) {
        return toast.error("Stock limit reached!");
      }
      setStagedItems(stagedItems.map((i) => (i.product_id === prod.id ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      if (prod.qty <= 0) return toast.error("Product out of stock!");
      setStagedItems([...stagedItems, { product_id: prod.id, name: prod.name, price: prod.price, cost: prod.cost || 0, qty: 1 }]);
    }
    toast.success(`${prod.name} added`);
  };

  const handleEditInit = async (record) => {
    setEditingId(record.id);
    setCustomerName(record.customer_name || "");
    setCustomerPhone(record.customer_phone || "");
    setBorrowedDate(record.borrowed_date || new Date().toISOString().slice(0, 10));
    setDueDate(record.due_date || "");
    setNotes(record.notes || "");
    
    if (record.total_amount > 0 && record.discount > 0) {
      setDiscount(Math.round((record.discount / record.total_amount) * 100));
    } else {
      setDiscount(0);
    }

    try {
      const res = await api.get(`/udhaar/${record.id}/items`).catch(() => ({ data: [] }));
      const rawItems = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setStagedItems(rawItems.map(i => ({
        product_id: i.product_id,
        name: i.product_name || i.name,
        price: i.price,
        cost: i.cost || 0,
        qty: i.qty
      })));
    } catch (e) {
      toast.error("Failed to fetch record items");
    }
  };

  const handleSaveUdhaar = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) return toast.error("Customer name is required");
    if (stagedItems.length === 0) return toast.error("Add at least one item");

    const payload = {
      customer_name: customerName,
      customer_phone: customerPhone,
      total_amount: subtotal,
      discount: discountAmount,
      borrowed_date: borrowedDate,
      due_date: dueDate || null,
      notes,
      items: stagedItems,
    };

    try {
      if (editingId) {
        await api.put(`/udhaar/${editingId}`, payload);
        toast.success("Udhaar record updated successfully!");
      } else {
        await dispatch(createUdhaarRecord({ ...payload, paid_amount: 0 })).unwrap();
        toast.success("Udhaar record saved successfully!");
      }
      dispatch(fetchUdhaarRecords());
      dispatch(getAllProducts());
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.error || "Failed to save record");
    }
  };

  const handlePaymentSubmit = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return toast.error("Enter a valid payment amount");
    if (parseFloat(payAmount) > payModalData.remaining_amount) {
      return toast.error("Payment cannot exceed remaining due!");
    }

    try {
      await dispatch(
        payUdhaarRecord({
          id: payModalData.id,
          amount_paid: parseFloat(payAmount),
          payment_method: payMethod,
        })
      ).unwrap();
      toast.success("Payment recorded!");
      setPayModalData(null);
      setPayAmount("");
      dispatch(fetchUdhaarRecords());
    } catch (err) {
      toast.error(err?.error || "Payment failed");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deleteUdhaarRecord(deleteId)).unwrap();
      toast.success("Udhaar record deleted and stock restored!");
      dispatch(getAllProducts());
      setDeleteId(null);
    } catch (err) {
      toast.error("Failed to delete record");
    }
  };

  const prepareVoucherData = async (record) => {
    try {
      const res = await api.get(`/udhaar/${record.id}/items`).catch(() => ({ data: [] }));
      const rawItems = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      const items = rawItems.map(item => ({
        ...item,
        product_name: item.name || item.product_name,
        qty: item.qty || item.quantity || 1,
        price: item.price || 0,
        total: (item.price || 0) * (item.qty || item.quantity || 1)
      }));
      
      const saleFormat = {
        invoice_no: `UDHAAR-VOUCHER-#${record.id}`,
        customer_name: record.customer_name,
        sold_at: record.borrowed_date,
        total: record.total_amount,
        discount: record.discount || 0,
        grand_total: record.total_amount - (record.discount || 0),
        status: record.remaining_amount <= 0 ? 'PAID CREDIT' : 'UDHAAR CREDIT'
      };

      setPrintData({
        sale: saleFormat,
        items,
        customerName: record.customer_name,
        subtotal: record.total_amount,
        discount: record.discount || 0,
        total: record.total_amount - (record.discount || 0)
      });
      return true;
    } catch (e) {
      toast.error("Failed to load voucher details");
      return false;
    }
  };

  const handlePrintVoucher = async (record) => {
    const ready = await prepareVoucherData(record);
    if (ready) {
      setTimeout(() => handlePrint(), 200);
    }
  };

  const handleSaveVoucherImage = async (record) => {
    const ready = await prepareVoucherData(record);
    if (!ready || !printRef.current) return;

    try {
      toast.loading("Generating voucher image...", { id: 'save-img' });
      const element = printRef.current;
      element.classList.remove('hidden');
      element.classList.add('block');

      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#fff',
        pixelRatio: 3,
        style: { display: 'block' }
      });

      element.classList.remove('block');
      element.classList.add('hidden');

      const link = document.createElement('a');
      link.download = `Udhaar-Voucher-${record.customer_name}-${record.id}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Voucher image saved!", { id: 'save-img' });
    } catch (err) {
      toast.error("Failed to generate image", { id: 'save-img' });
    }
  };

  const filteredRecords = records.filter((r) => {
    const status = r.computed_status || r.status;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && (status === "pending" || status === "partial")) ||
      (statusFilter === "overdue" && status === "overdue") ||
      (statusFilter === "paid" && status === "paid");

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      r.customer_name?.toLowerCase().includes(searchLower) ||
      r.customer_phone?.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  const totalDebt = records.reduce((sum, r) => sum + (r.remaining_amount || 0), 0);
  const totalReceived = records.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
  const overdueAccounts = records.filter((r) => (r.computed_status || r.status) === "overdue").length;
  const activeAccounts = records.filter((r) => r.remaining_amount > 0).length;

  return (
    <div className="p-6 h-full max-w-7xl mx-auto flex flex-col overflow-hidden">
      {/* Header with Top Matrix Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
        <div>
          <h1 className="text-3xl font-black text-[#001f3f] uppercase flex items-center gap-3">
            <BanknotesIcon className="w-8 h-8 text-[#008080]" /> Udhaar & Credit
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium italic">Track customer accounts & credit transactions.</p>
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
          <div className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 shadow-sm min-w-[130px]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Outstanding</p>
            <p className="text-sm font-black text-red-600">Rs {totalDebt.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 shadow-sm min-w-[130px]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Received</p>
            <p className="text-sm font-black text-emerald-600">Rs {totalReceived.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 shadow-sm min-w-[100px]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overdue</p>
            <p className="text-sm font-black text-amber-600">{overdueAccounts}</p>
          </div>
          <div className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 shadow-sm min-w-[100px]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active</p>
            <p className="text-sm font-black text-[#001f3f]">{activeAccounts}</p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-grow flex flex-col lg:flex-row gap-6 overflow-hidden pb-4 px-2">
        {/* LEFT SIDEBAR: Add / Edit Udhaar Form */}
        <div className="w-full lg:w-[360px] bg-white rounded-2xl border border-gray-300 p-5 flex flex-col shadow-sm flex-shrink-0 overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
            <h2 className="text-sm font-black text-[#001f3f] uppercase tracking-wider flex items-center gap-2">
              {editingId ? <PencilSquareIcon className="w-4 h-4 text-[#008080]" /> : <PlusIcon className="w-4 h-4 text-[#008080]" />}
              {editingId ? `Edit Entry #${editingId}` : "New Credit Entry"}
            </h2>
            {editingId && (
              <button onClick={resetForm} className="text-xs text-red-500 font-bold hover:underline">
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSaveUdhaar} className="space-y-4 flex-1 flex flex-col">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Customer Name *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Ahmad"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-[#001f3f] focus:ring-1 focus:ring-[#008080]"
                />
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="03XXXXXXXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-[#001f3f] focus:ring-1 focus:ring-[#008080]"
                />
                <PhoneIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-500">Items *</label>
                <span className="text-xs font-bold text-[#008080]">{stagedItems.length} selected</span>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                className="w-full py-2.5 bg-gray-50 border border-gray-300 text-gray-700 hover:border-[#008080] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <PlusIcon className="w-4 h-4 text-[#008080]" /> Select Store Items
              </button>
            </div>

            {stagedItems.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 space-y-2 max-h-36 overflow-y-auto no-scrollbar">
                {stagedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <div className="truncate pr-2">
                      <p className="font-bold text-[#001f3f] truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">Rs {item.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{item.qty}x</span>
                      <button
                        type="button"
                        onClick={() => setStagedItems(stagedItems.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Borrowed Date</label>
                <input
                  type="date"
                  value={borrowedDate}
                  onChange={(e) => setBorrowedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                />
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                <span>Subtotal</span>
                <span>Rs {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-[#001f3f]">
                <span>Total Credit</span>
                <span className="text-base font-black text-[#008080]">Rs {grandTotal.toLocaleString()}</span>
              </div>
              <button
                type="submit"
                disabled={actionLoading || stagedItems.length === 0}
                className="w-full py-3 bg-[#001f3f] hover:bg-[#001f3f]/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 transition-all"
              >
                {actionLoading ? "Saving..." : editingId ? "Update Entry" : "Save Credit Entry"}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT MAIN TABLE */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-300 p-5 flex flex-col overflow-hidden shadow-sm">
          {/* Filters Bar */}
          <div className="flex flex-col justify-between items-start md:justify-items-stretch  gap-4 border-b border-gray-100 pb-4">
            <div className="flex flex-row gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-[#008080] font-bold text-sm text-gray-700 min-w-[130px]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>

              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder="Search customer or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-1 focus:ring-[#008080] font-bold text-sm"
                />
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Date Range Pickers */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 shadow-sm"
              />
              <span className="text-gray-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 shadow-sm"
              />
              <button
                onClick={applyDateFilters}
                className="px-4 py-2 bg-[#008080] text-white rounded-xl text-xs font-bold hover:bg-[#008080]/90 transition-all shadow-sm"
              >
                Filter
              </button>
              {(fromDate || toDate || searchTerm || statusFilter !== "all") && (
                <button
                  onClick={resetFilters}
                  className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all"
                  title="Reset Filters"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </button>
              )}
                  </div>
            </div>

          {/* Table View */}
          <div className="flex-1 overflow-y-auto no-scrollbar border border-gray-200 rounded-xl">
            {listLoading ? (
              <Loading message="Fetching Customer Ledgers..." />
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-xl text-gray-400">
                <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-bold text-sm">No credit records found</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-xs font-bold text-gray-400 border-b border-gray-200">
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Received</th>
                    <th className="px-4 py-3">Remaining</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                  {filteredRecords.map((row) => {
                    const status = row.computed_status || row.status;
                    const isOverdue = status === "overdue";
                    const isPaid = status === "paid";

                    return (
                      <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-[#001f3f] text-sm">{row.customer_name}</p>
                          <p className="text-[10px] text-gray-400">{row.customer_phone || "No phone"}</p>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-gray-800">Rs {(row.total_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-emerald-600 font-bold">Rs {(row.paid_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-red-500 font-bold">Rs {(row.remaining_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-[10px] text-gray-500">
                          <p>Borrowed: {row.borrowed_date}</p>
                          {row.due_date && <p className={isOverdue ? "text-red-500 font-bold" : ""}>Due: {row.due_date}</p>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-600"
                                : isOverdue
                                ? "bg-red-50 text-red-500"
                                : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Print Voucher & Download Image buttons visible ONLY for Paid status */}
                            {isPaid && (
                              <>
                                <button
                                  onClick={() => handlePrintVoucher(row)}
                                  className="p-1.5 text-gray-400 hover:text-[#001f3f] hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Print Receipt Voucher"
                                >
                                  <PrinterIcon className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleSaveVoucherImage(row)}
                                  className="p-1.5 text-gray-400 hover:text-[#008080] hover:bg-teal-50 rounded-lg transition-colors"
                                  title="Download Voucher Image"
                                >
                                  <PhotoIcon className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => handleEditInit(row)}
                              className="p-1.5 text-gray-400 hover:text-[#008080] hover:bg-teal-50 rounded-lg transition-colors"
                              title="Edit Credit Record"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>

                            {!isPaid && (
                              <button
                                onClick={() => {
                                  setPayModalData(row);
                                  setPayAmount(row.remaining_amount.toString());
                                }}
                                className="px-3 py-1 bg-[#008080] text-white rounded-lg text-[10px] font-bold uppercase hover:bg-[#008080]/90 transition-all shadow-sm"
                              >
                                Receive
                              </button>
                            )}

                            <button
                              onClick={() => setDeleteId(row.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Off-screen Printable Receipt Component */}
      {printData && (
        <PrintableReceipt
          ref={printRef}
          sale={printData.sale}
          items={printData.items}
          customerName={printData.customerName}
          subtotal={printData.subtotal}
          discount={printData.discount}
          total={printData.total}
          date={printData.sale.sold_at}
        />
      )}

      {/* Product Selector Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 bg-[#001f3f] text-white flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">Select Store Items</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-white hover:opacity-80">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search inventory..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-[#001f3f] focus:ring-1 focus:ring-[#008080]"
              />
            </div>
            <div className="p-4 flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 no-scrollbar">
              {products
                .filter((p) => p.name.toLowerCase().includes(modalSearch.toLowerCase()) && p.qty > 0)
                .map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleStageProduct(prod)}
                    className="bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-[#008080] hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[9px] font-bold uppercase bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                        {prod.category}
                      </span>
                      <h4 className="font-bold text-xs text-[#001f3f] mt-1 line-clamp-2">{prod.name}</h4>
                    </div>
                    <div className="mt-3 flex justify-between items-center border-t border-gray-100 pt-2">
                      <span className="text-xs font-bold text-[#008080]">Rs {prod.price.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-gray-400">{prod.qty} left</span>
                    </div>
                  </div>
                ))}
            </div>
            <div className="p-3 border-t border-gray-100 text-right">
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="px-5 py-2 bg-[#001f3f] text-white rounded-xl text-xs font-bold uppercase"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Payment Modal */}
      {payModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-200">
            <h3 className="text-base font-bold text-[#001f3f] uppercase mb-1">Receive Udhaar Payment</h3>
            <p className="text-xs text-gray-400 font-bold mb-4">Customer: {payModalData.customer_name}</p>

            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                <span className="text-xs font-bold text-gray-500">Remaining Balance</span>
                <span className="text-sm font-bold text-red-500">
                  Rs {payModalData.remaining_amount.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Amount Received (Rs)
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-[#001f3f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-[#001f3f]"
                >
                  <option value="cash">Cash</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPayModalData(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  className="flex-1 py-2.5 bg-[#008080] text-white font-bold rounded-xl text-xs uppercase shadow-sm"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Udhaar Entry"
        message="Are you sure you want to delete this credit record? Deleting this entry will automatically restore the borrowed product stock back to your store inventory."
        confirmText="Yes, Delete & Restore Stock"
      />
    </div>
  );
}