import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MinusCircleIcon,
  PlusCircleIcon,
  PrinterIcon,
  ChevronDoubleLeftIcon,
  ClockIcon,
  InboxIcon as PackageIcon,
  TrashIcon,
  PlusIcon,
  BanknotesIcon,
  CreditCardIcon,
  CheckCircleIcon,
  PhotoIcon,
  ArrowPathIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { useDispatch, useSelector } from "react-redux";
import {
  increaseQuantity,
  decreaseQuantity,
  clearCart,
  removeFromCart
} from "../Redux/features/cart";
import { useReactToPrint } from "react-to-print";
import api from "../api";
import toast from "react-hot-toast";
import PrintableReceipt from "./PrintableReceipt";
import { toastConfirm, toastConfirmWarning } from "../utils/toastConfirm.jsx";
import { useKeyboard } from "../hooks/useKeyboard";
import { branding } from "../config/branding.js";
import { toPng } from "html-to-image";

const Bill = () => {
  const dispatch = useDispatch();
  const { cartItems } = useSelector((state) => state.cart);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [receiptConfig, setReceiptConfig] = useState({
    customer_note: "Jazzcash and Easypaisy is available",
    shop_name: "Hassan Mobiles and Repairing center",
    shop_address: "Shaheen chowk Ali wali Market, Gujrat",
    shop_phone: "0314-7088914, 0300-6295417",
    proprietor_name: "Bilal Hassan Warraich",
    show_cashier: true,
    show_invoice: true,
    show_datetime: true,
    phone_label: "Phone"
  });
  const [lastSale, setLastSale] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Stats/Saving, 2: Actions
  const [showQuickLoadModal, setShowQuickLoadModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [discount, setDiscount] = useState(0);
  const [quickLoadData, setQuickLoadData] = useState({ simName: 'Jazz', amount: '', phone: '' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const printRef = useRef();
  const customerInputRef = useRef(null);
  const discountInputRef = useRef(null);
  const [focusedItemIndex, setFocusedItemIndex] = useState(-1);

  // Fetch settings (tax rate) on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get("/config");
        if (res.data.settings) {
          const s = res.data.settings;
          setReceiptConfig({
            customer_note: s.receipt_customer_note || "Jazzcash and Easypaisy is available",
            shop_name: s.shop_name || "Hassan Mobiles and Repairing center",
            shop_address: s.shop_address || "Shaheen chowk Ali wali Market, Gujrat",
            shop_phone: s.shop_phone || "0314-7088914, 0300-6295417",
            proprietor_name: s.proprietor_name || "Bilal Hassan Warraich",
            show_cashier: s.receipt_show_cashier === 'true',
            show_invoice: s.receipt_show_invoice === 'true',
            show_datetime: s.receipt_show_datetime === 'true',
            phone_label: s.receipt_phone_label || "Phone"
          });
        }
      } catch (err) {
        console.error("Failed to fetch tax/receipt config", err);
      }
    };
    fetchConfig();
  }, []);

  // Print trigger
  const triggerPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bill-${lastSale?.invoice_no || new Date().toLocaleDateString()}`,
  });

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  const total = Math.max(subtotal - (subtotal * (discount / 100)), 0);
  const discountAmount = subtotal * (discount / 100);


  // ✅ Checkout Flow
  const handlePrintAndComplete = async () => {
    if (cartItems.length === 0) return toast.error("Cart is empty!");

    try {
      setLoading(true);
      setShowCheckoutModal(true);
      setCheckoutStep(1);

      // 1. Save Sale to Database
      const res = await api.post("/sales", {
        customer_id: null,
        customer_name: customerName,
        total: subtotal,
        discount: discountAmount,
        grand_total: total,
        paid: total,
        payment_method: paymentMethod,
        items: cartItems.map((item) => ({
          product_id: typeof item.id === 'string' && item.id.startsWith('load-') ? null : item.id,
          qty: item.quantity || 1,
          price: item.price,
          total: item.price * (item.quantity || 1),
          category: item.category,
          name: item.name ,
          cost: item.cost || 0,
        })),
      });

      setLastSale(res.data);
      setCheckoutStep(2);
      toast.success("Order recorded successfully!");

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to save order");
      setShowCheckoutModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = async () => {
    if (!lastSale || !printRef.current) return;

    try {
      toast.loading("Generating high-quality receipt...", { id: 'save-image' });

      const element = printRef.current;
      element.classList.remove('hidden');
      element.classList.add('block');

      // Use PixelRatio: 3 for high quality
      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#fff',
        pixelRatio: 3,
        style: { display: 'block' }
      });

      element.classList.remove('block');
      element.classList.add('hidden');

      // Trigger Browser Download (allows user to choose location)
      const link = document.createElement('a');
      link.download = `Receipt-${lastSale.invoice_no}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Receipt image ready!", { id: 'save-image' });
    } catch (error) {
      console.error("Image Capture Error:", error);
      toast.error("Failed to generate image", { id: 'save-image' });
    }
  };

  const finalizeCheckout = () => {
    dispatch(clearCart());
    setCustomerName("Walk-in Customer");
    setLastSale(null);
    setShowCheckoutModal(false);
    setCheckoutStep(1);
    toast.success("Bill Cleared. Ready for next!");
  };
  // Keyboard Handlers
  useKeyboard({
    CUSTOMER_FOCUS: () => {
      setTimeout(() => customerInputRef.current?.focus(), 100);
    },
    DISCOUNT_FOCUS: () => {
      setTimeout(() => discountInputRef.current?.focus(), 100);
    },
    SIDEBAR_TOGGLE: () => { },
    BILL_CLEAR: async () => {
      const confirmed = await toastConfirmWarning("Clear current bill?");
      if (confirmed) dispatch(clearCart());
    },
    BILL_PRINT: handlePrintAndComplete,
    CONFIRM_PRINT: handlePrintAndComplete,
  });


  return (
    <div className="flex flex-col border-l border-[#f4f4f4] shadow-2xl relative h-full max-h-screen bill-sidebar flex-shrink-0 z-20 overflow-hidden w-[320px] lg:w-[384px] bg-white">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-white border-b border-[#f4f4f4]">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-black text-[#001f3f] tracking-tight">Bill Section</h2>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              <ClockIcon className="w-3.5 h-3.5 text-[#008080]" />
              {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowQuickLoadModal(true)}
          className="px-3 py-1.5 bg-[#008080]/10 text-[#008080] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#008080] hover:text-white transition-all flex items-center gap-1.5 border border-[#008080]/20"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Quick Load
        </button>
      </div>
      <div className="px-4 mb-4">
        <input
          ref={customerInputRef}
          type="text"
          list="customer-suggestions"
          placeholder="Billing Name..."
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full pl-4 pr-12 py-3 bg-[#ffffff] border border-[#008080]/20 rounded-xl text-sm font-black text-[#001f3f] focus:outline-none focus:ring-2 focus:ring-[#008080] transition-all shadow-sm placeholder-gray-500"
        />
      </div>

      {/* Body */}
      <div className="flex flex-col h-full overflow-hidden">

        {/* Cart Items */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-[#ffffff]">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#001f3f] opacity-10 gap-4">
              <PackageIcon className="w-20 h-20" />
              <p className="text-xs font-black uppercase tracking-[0.2em]">Vault Empty</p>
            </div>
          ) : (
            cartItems.map((item, index) => {
              let attrs = {};
              if (typeof item.attributes === 'string') {
                try { attrs = JSON.parse(item.attributes); } catch (e) { }
              } else if (item.attributes) {
                attrs = item.attributes;
              }

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item.id}
                  id={`cart-item-${index}`}
                  tabIndex={0}
                  className={`bg-white rounded-2xl p-4 border transition-all flex flex-col gap-3 group relative overflow-hidden focus:outline-none shadow-sm ${focusedItemIndex === index ? 'ring-2 ring-[#008080] border-transparent scale-[1.02]' : 'border-[#f4f4f4]'}`}
                >
                  {/* Low Stock Indicator */}
                  {item.qty <= (item.min_stock || 3) && (
                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 text-white text-[7px] font-black rounded-bl-lg uppercase tracking-tighter">Low Stock</div>
                  )}

                  <div className="flex justify-between items-start">
                    <div className="w-full">
                      <div className="flex justify-between items-start">
                        <h4 className="font-black text-[#001f3f] text-xs line-clamp-2 leading-tight pr-6 uppercase">{item.name}</h4>
                        <button
                          onClick={() => dispatch(removeFromCart(item.id))}
                          className="text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors -mt-1 -mr-1 p-1 rounded-lg"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5 mb-2">
                        {item.category && (
                          <span className="bg-[#001f3f] text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm">
                            {item.category === 'repair' ? 'Repair' : (item.category?.split('_')[1] || item.category)}
                          </span>
                        )}
                        <span className="bg-[#f4f4f4] text-[#001f3f] text-[8px] font-black px-1.5 py-0.5 rounded border border-[#008080]/20 uppercase tracking-tighter">{item.company}</span>
                        {!item.category?.startsWith('mobile') && <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{item.model}</span>}
                        {attrs.warranty && (
                          <span className="text-[8px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 uppercase tracking-widest">
                            🛡️ {attrs.warranty}
                          </span>
                        )}
                        {attrs.imei && (
                          <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-widest">
                            📱 {attrs.imei}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-[#ffffff] rounded-xl p-2 border border-[#f4f4f4]">
                    {item.category === 'repair' ? (
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expected Date</span>
                        <span className="text-xs font-black text-[#008080]">{attrs.deliveryDate || 'N/A'}</span>
                      </div>
                    ) : item.category?.startsWith('mobile') || item.category === 'load' ? (
                      <div className="flex flex-col flex-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {item.category === 'load' ? 'Network' : 'Specifications'}
                        </span>
                        <span className="text-xs font-black text-[#001f3f] truncate">
                          {item.category === 'load' ? (attrs.simName || 'Direct Load') : `${attrs.storage || 'Std'} • ${attrs.color || 'N/A'}`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => dispatch(decreaseQuantity(item.id))}
                          className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-red-500 hover:bg-red-100 transition-all active:scale-90 border border-[#f4f4f4]"
                        >
                          <MinusCircleIcon className="w-5 h-5" />
                        </button>
                        <span className="font-black text-[#001f3f] text-sm min-w-[24px] text-center">{item.quantity || 1}</span>
                        <button
                          onClick={() => dispatch(increaseQuantity(item.id))}
                          disabled={item.quantity >= (item.qty || 999)}
                          className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#008080] hover:bg-[#f4f4f4] transition-all active:scale-90 disabled:opacity-30 border border-[#f4f4f4]"
                        >
                          <PlusCircleIcon className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    <span className="font-black text-[#001f3f] text-sm tabular-nums">
                      Rs {(item.price * (item.quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>

        {/* Checkout Footer */}
        <div className="p-3.5 bg-white border-t border-[#f4f4f4] shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          <div className="space-y-1 mb-3 text-[11px] font-bold">
            <div className="flex justify-between items-center text-gray-400">
              <span className="uppercase tracking-widest">Subtotal</span>
              <span className="text-[#001f3f]">Rs {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[#008080] py-1">
              <span className="uppercase tracking-widest">Discount (%)</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] opacity-60">Rs {discountAmount.toLocaleString()}</span>
                <input
                  ref={discountInputRef}
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 0 && val <= 100) setDiscount(val);
                  }}
                  className="w-16 text-right bg-[#008080]/5 border border-[#008080]/10 rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#008080] font-black text-[#001f3f]"
                />
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#f4f4f4] items-center">
              <span className="text-sm font-black text-[#001f3f] uppercase tracking-tighter">Grand Total</span>
              <span className="text-xl font-black text-[#001f3f] tabular-nums">Rs {total.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={async () => {
                const confirmed = await toastConfirmWarning("Wipe current cart data?");
                if (confirmed) dispatch(clearCart());
              }}
              className="p-3 bg-red-50 border border-red-200 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"
              title="Clear Cart"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrintAndComplete}
              disabled={loading || cartItems.length === 0}
              className="flex-1 bg-[#001f3f] hover:bg-[#001122] text-white font-black py-3 rounded-xl shadow-lg shadow-[#001f3f]/20 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 active:scale-[0.98] group border border-[#001f3f]"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <PrinterIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] uppercase tracking-widest">Checkout</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <PrintableReceipt
        ref={printRef}
        sale={lastSale}
        items={cartItems}
        customerName={customerName}
        subtotal={subtotal}
        discount={discountAmount}
        total={total}
        config={receiptConfig}
      />

      {/* Simplified Checkout Modal */}
      <AnimatePresence>
        {showCheckoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200"
            >
              <div className="p-8">
                {checkoutStep === 1 ? (
                  <div className="flex flex-col items-center gap-6 py-10">
                    <div className="w-12 h-12 border-4 border-[#001f3f]/10 border-t-[#008080] rounded-full animate-spin" />
                    <p className="text-xl font-black text-[#001f3f] uppercase tracking-widest">Saving Transaction...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="text-center border-b border-gray-100 pb-6">
                      <h2 className="text-2xl font-black text-[#001f3f] uppercase tracking-tight">Sale Completed Successfully</h2>
                      <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-[0.2em]">Invoice: {lastSale?.invoice_no}</p>
                    </div>

                    <div className="flex flex-row gap-4 items-stretch h-14">
                      {/* Save Image - Secondary Priority */}
                      <button
                        onClick={handleSaveImage}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-md flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest"
                      >
                        <PhotoIcon className="w-5 h-5" />
                        Save Image
                      </button>

                      {/* Print Bill - Highest Priority */}
                      <button
                        onClick={() => triggerPrint()}
                        className="flex-1 bg-[#001f3f] hover:bg-black text-white font-black rounded-md flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest shadow-lg shadow-[#001f3f]/20"
                      >
                        <PrinterIcon className="w-5 h-5" />
                        Print Bill
                      </button>

                      {/* Clear/Complete - Action Priority */}
                      <button
                        onClick={finalizeCheckout}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black rounded-md flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest shadow-lg shadow-red-500/20"
                      >
                        <TrashIcon className="w-5 h-5" />
                        Clear Bill
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Load Modal */}
      <AnimatePresence>
        {showQuickLoadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden p-8 border border-gray-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-[#001f3f] uppercase tracking-tight">Quick SIM Load</h2>
                <button onClick={() => setShowQuickLoadModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Network Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Jazz', 'Zong', 'Telenor', 'Ufone', 'Scom'].map(net => (
                      <button
                        key={net}
                        onClick={() => setQuickLoadData({ ...quickLoadData, simName: net })}
                        className={`py-2 rounded-xl text-[10px] font-black transition-all border ${quickLoadData.simName === net ? 'bg-[#001f3f] text-white border-[#001f3f] shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                      >
                        {net}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="03XXXXXXXXX"
                    value={quickLoadData.phone}
                    onChange={(e) => setQuickLoadData({ ...quickLoadData, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#008080] placeholder-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Load Amount</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={quickLoadData.amount}
                    onChange={(e) => setQuickLoadData({ ...quickLoadData, amount: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#008080] placeholder-gray-300"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowQuickLoadModal(false)}
                    className="flex-1 py-4 bg-gray-50 text-gray-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!quickLoadData.amount || !quickLoadData.simName}
                    onClick={() => {
                      const loadItem = {
                        id: `load-${Date.now()}`,
                        name: `${quickLoadData.simName} Load`,
                        price: parseFloat(quickLoadData.amount),
                        quantity: 1,
                        company: quickLoadData.simName,
                        model: "Direct Load",
                        category: "load",
                        attributes: JSON.stringify({
                          simName: quickLoadData.simName,
                          loadAmount: quickLoadData.amount,
                          phoneNumber: quickLoadData.phone
                        })
                      };
                      dispatch({ type: 'cart/addToCart', payload: loadItem });
                      toast.success("Load added to bill");
                      setShowQuickLoadModal(false);
                      setQuickLoadData({ simName: 'Jazz', amount: '', phone: '' });
                    }}
                    className={`flex-1 py-4 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 ${quickLoadData.amount && quickLoadData.simName ? 'bg-[#001f3f] text-white' : 'bg-gray-100 text-gray-200 cursor-not-allowed'}`}
                  >
                    Add to Bill
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Bill;
