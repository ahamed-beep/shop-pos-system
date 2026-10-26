import React, { useEffect, useState, useMemo } from "react";
import api from "../api";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Coins } from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { toastConfirmDanger, toastConfirmWarning } from '../utils/toastConfirm.jsx';
import Loading from "../components/Loading";
import SaleRow from "../components/SalesRow";

const BillingHistory = () => {
    const [sales, setSales] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [paymentFilter, setPaymentFilter] = useState("All"); // All, Cash, Udhaar
    const [expandedSaleId, setExpandedSaleId] = useState(null);
    const [saleItems, setSaleItems] = useState({});
    const [receiptConfig, setReceiptConfig] = useState(null);
    const user = useSelector((state) => state.auth.user);

    useEffect(() => {
        fetchHistory();
        fetchConfig();
    }, []);

    const categoryOptions = useMemo(() => {
        const cats = new Set();
        sales.forEach(sale => {
            if (Array.isArray(sale.categories)) {
                sale.categories.forEach(cat => cats.add(cat));
            }
        });
        return ["All", ...Array.from(cats).sort()];
    }, [sales]);

    // Filtering Logic (Category, Search & Cash/Udhaar Filter)
    useEffect(() => {
        if (!sales || sales.length === 0) {
            setFilteredSales([]);
            return;
        }

        const lower = searchTerm.toLowerCase();

        const filtered = sales.filter((sale) => {
            const matchesCategory = selectedCategory === "All" || 
                                   (Array.isArray(sale.categories) && sale.categories.includes(selectedCategory));

            const matchesType = paymentFilter === "All" ||
                               (paymentFilter === "Udhaar" && sale.isUdhaar) ||
                               (paymentFilter === "Cash" && !sale.isUdhaar);

            const matchesSearch = !searchTerm || 
                                  sale.customer_name?.toLowerCase().includes(lower) ||
                                  sale.invoice_no?.toLowerCase().includes(lower) ||
                                  sale.user_email?.toLowerCase().includes(lower);

            return matchesCategory && matchesType && matchesSearch;
        });

        setFilteredSales(filtered);
    }, [searchTerm, selectedCategory, paymentFilter, sales]);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/config');
            if (res.data.settings) {
                const s = res.data.settings;
                setReceiptConfig({
                    show_discount: s.receipt_show_discount === 'true',
                    customer_note: s.receipt_customer_note,
                    qr_url: s.receipt_qr_url,
                    show_qr: s.receipt_show_qr === 'true',
                    shop_name: s.shop_name,
                    shop_address: s.shop_address,
                    shop_phone: s.shop_phone,
                    show_cashier: s.receipt_show_cashier === 'true',
                    show_invoice: s.receipt_show_invoice === 'true',
                    show_datetime: s.receipt_show_datetime === 'true',
                    post_qr_note: s.receipt_post_qr_note,
                    phone_label: s.receipt_phone_label
                });
            }
        } catch (error) {
            console.error("Failed to fetch receipt config", error);
        }
    };
// src/pages/BillingHistory.jsx

const fetchHistory = async () => {
    try {
        setLoading(true);
        const [salesRes, udhaarRes] = await Promise.all([
            api.get("/sales").catch(() => ({ data: [] })),
            api.get("/udhaar").catch(() => ({ data: [] }))
        ]);

        const salesData = Array.isArray(salesRes.data) ? salesRes.data : [];
        const udhaarData = Array.isArray(udhaarRes.data) ? udhaarRes.data : [];

        // Transform fully paid Udhaar entries for invoice rendering
        const paidUdhaarInvoices = udhaarData
            .filter(u => (u.computed_status || u.status) === 'paid')
            .map(u => ({
                id: `udhaar-${u.id}`,
                isUdhaar: true,
                udhaarId: u.id,
                invoice_no: `UDHAAR-INV-${u.id}`,
                customer_name: u.customer_name,
                // Fix Operator Name: Use saved customer_phone or logged user email fallback
                user_email: u.user_email || user?.email || (u.customer_phone ? `Phone: ${u.customer_phone}` : 'Staff'),
                total: u.total_amount,
                discount: u.discount || 0,
                grand_total: u.total_amount - (u.discount || 0),
                paid: u.paid_amount,
                payment_method: 'Udhaar Paid',
                // Fix Time: Use last_paid_date or created_at instead of date-only borrowed_date
                sold_at: u.last_paid_date || u.created_at || u.borrowed_date,
                status: 'completed',
                categories: ['Udhaar']
            }));

        const combined = [...salesData, ...paidUdhaarInvoices].sort((a, b) => 
            new Date(b.sold_at || b.created_at) - new Date(a.sold_at || a.created_at)
        );

        setSales(combined);
        setFilteredSales(combined);
    } catch (error) {
        console.error("Failed to fetch billing history:", error);
        setSales([]);
        setFilteredSales([]);
    } finally {
        setLoading(false);
    }
};
// src/pages/BillingHistory.jsx

const fetchSaleDetails = async (id) => {
    if (saleItems[id]) return;
    try {
        if (typeof id === 'string' && id.startsWith('udhaar-')) {
            const udhaarId = id.replace('udhaar-', '');
            const res = await api.get(`/udhaar/${udhaarId}/items`);
            
            // Extract array safely whether backend returns Array directly or { items: [...] }
            const rawItems = Array.isArray(res.data) ? res.data : (res.data?.items || []);
            
            const formattedItems = rawItems.map(item => ({
                ...item,
                id: item.id || item.product_id,
                name: item.name || item.product_name || 'Store Item',
                product_name: item.name || item.product_name || 'Store Item',
                qty: Number(item.qty || item.quantity || 1),
                price: Number(item.price || 0),
                total: Number(item.total || (item.price * item.qty) || 0)
            }));
            
            setSaleItems(prev => ({ ...prev, [id]: formattedItems }));
        } else {
            const res = await api.get(`/sales/${id}`);
            const rawItems = Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : []);
            
            const formattedItems = rawItems.map(item => ({
                ...item,
                name: item.product_name || item.name || 'Store Item',
                product_name: item.product_name || item.name || 'Store Item',
                qty: Number(item.qty || item.quantity || 1),
                price: Number(item.price || 0),
                total: Number(item.total || (item.price * item.qty) || 0)
            }));
            
            setSaleItems(prev => ({ ...prev, [id]: formattedItems }));
        }
    } catch (error) {
        console.error("Failed to fetch sale details", error);
        setSaleItems(prev => ({ ...prev, [id]: [] }));
    }
};
    const toggleExpand = (id) => {
        if (expandedSaleId === id) {
            setExpandedSaleId(null);
        } else {
            setExpandedSaleId(id);
            fetchSaleDetails(id);
        }
    };

    const handleRefund = async (saleId) => {
        if (typeof saleId === 'string' && saleId.startsWith('udhaar-')) {
            return toast.error("Manage credit returns in Udhaar Control");
        }
        const confirmed = await toastConfirmWarning("Are you sure you want to refund this sale? Items will be restored to stock.");
        if (!confirmed) return;
        try {
            await api.put(`/sales/${saleId}/refund`);
            toast.success("Sale refunded & stock restored");
            fetchHistory();
        } catch (error) {
            toast.error(error.response?.data?.error || "Refund failed");
        }
    };

    const handleItemRefund = async (saleId, item) => {
        if (typeof saleId === 'string' && saleId.startsWith('udhaar-')) {
            return toast.error("Manage credit returns in Udhaar Control");
        }
        const confirmed = await toastConfirmWarning(`Refund this item?`);
        if (!confirmed) return;
        try {
            await api.put(`/sales/${saleId}/items/${item.id}/refund`, { qtyToRefund: 1 });
            toast.success("Item refunded");
            const res = await api.get(`/sales/${saleId}`);
            setSaleItems(prev => ({ ...prev, [saleId]: res.data.items }));
            fetchHistory();
        } catch (error) {
            toast.error(error.response?.data?.error || "Refund failed");
        }
    };

    const handleDelete = async (saleId) => {
        if (typeof saleId === 'string' && saleId.startsWith('udhaar-')) {
            return toast.error("Delete this entry from the Udhaar Control page");
        }
        const confirmed = await toastConfirmDanger("PERMANENT DELETE: Are you sure?", { confirmText: "Delete" });
        if (!confirmed) return;
        try {
            await api.delete(`/sales/${saleId}`);
            toast.success("Transaction deleted");
            fetchHistory();
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    return (
        <div className="p-6 h-full max-w-7xl mx-auto flex flex-col overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
                <div>
                    <h1 className="text-3xl font-black text-[#001f3f] uppercase flex items-center gap-3">
                        <Coins className="w-8 h-8 text-[#008080]" /> Billing History
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium italic">See your transaction history.</p>
                </div>

                <div className="flex flex-row gap-2 w-full md:w-auto">
                    {/* Payment Type Filter (Cash vs Udhaar) */}
                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="bg-white border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-[#008080] font-bold text-sm text-gray-700 min-w-[140px]"
                    >
                        <option value="All">All Types</option>
                        <option value="Cash">Cash Sales</option>
                        <option value="Udhaar">Udhaar (Paid)</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-white border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:ring-1 focus:ring-[#008080] font-bold text-sm text-gray-700 min-w-[140px]"
                    >
                        {categoryOptions.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Search invoice or customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-1 focus:ring-[#008080] font-bold text-sm"
                        />
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>
            </div>

            <div className="space-y-4 flex-grow overflow-y-auto no-scrollbar pb-20 px-2">
                {loading ? (
                    <Loading message="Fetching Transaction History..." />
                ) : filteredSales.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                        No transactions found
                    </div>
                ) : (
                    filteredSales.map((sale) => (
                        <>
                        <SaleRow
                            key={sale.id}
                            sale={sale}
                            saleItems={saleItems}
                            handleRefund={handleRefund}
                            handleItemRefund={handleItemRefund}
                            handleMove={() => {}}
                            handleDelete={handleDelete}
                            toggleExpand={toggleExpand}
                            expandedSaleId={expandedSaleId}
                            user={user}
                            receiptConfig={receiptConfig}
                            />
                            </> 
                    ))
                )}
            </div>
        </div>
    );
};

export default BillingHistory;