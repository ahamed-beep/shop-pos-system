import React, { useEffect, useState } from "react";
import {
    ChevronDownIcon,
    ChevronUpIcon,
    ClockIcon,
    UserIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { Package } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import PrintableReceipt from "../components/PrintableReceipt";
import { useRef } from "react";

const PackageIcon = Package;


export const parseUTCDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'string' && !dateStr.includes('T') && !dateStr.includes('Z')) {
        return new Date(dateStr + ' Z');
    }
    return new Date(dateStr);
};

const SaleRow = ({ sale, saleItems, handleRefund, handleItemRefund, handleMove, handleDelete, toggleExpand, expandedSaleId, user, receiptConfig }) => {
    const printRef = useRef();
    const triggerPrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Receipt-${sale.invoice_no}`,
    });

    const soldDate = parseUTCDate(sale.sold_at);

    return (
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:border-[#008080] ${sale.status === 'refunded' ? 'grayscale-[0.2] border-red-200' : 'border-gray-300'}`}>
            <div
                className="p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                onClick={() => toggleExpand(sale.id)}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${sale.status === 'refunded' ? 'bg-red-50 text-red-500' : 'bg-[#f4f4f4] text-[#001f3f]'}`}>
                        <PackageIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800">{sale.invoice_no}</h3>
                            {sale.status === 'refunded' && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-md">Refunded</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 font-medium">Customer: <span className="text-gray-600">{sale.customer_name}</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="hidden sm:flex flex-col items-start pr-8 border-r border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
                            <UserIcon className="w-3 h-3" /> Operator
                        </div>
                        <p className="text-sm font-semibold text-gray-700">{sale.user_email?.split('@')[0] || "System"}</p>
                    </div>

                    <div className="hidden lg:flex flex-col items-start pr-8 border-r border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
                            <ClockIcon className="w-3 h-3" /> Time
                        </div>
                        <p className="text-sm font-semibold text-gray-700">{soldDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                    </div>

                    <div className="text-right min-w-[120px]">
                        <p className="text-xs font-bold text-gray-400 mb-1">Total Amount</p>
                        <p className={`text-lg font-bold ${sale.status === 'refunded' ? 'text-gray-400 line-through' : 'text-[#001f3f]'}`}>Rs {sale.grand_total?.toFixed(0)}</p>
                    </div>

                    <div className="text-gray-400">
                        {expandedSaleId === sale.id ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                    </div>
                </div>
            </div>

            {expandedSaleId === sale.id && (
                <div className="px-6 pb-6 pt-2 border-t border-gray-50 bg-gray-50/50 animate-in slide-in-from-top duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-gray-400">Items Summary</h4>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); triggerPrint(); }}
                                className="px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-50 transition-all text-sm font-bold border border-gray-200 shadow-sm"
                            >
                                Print Receipt
                            </button>
                            {sale.status !== 'refunded' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRefund(sale.id); }}
                                    className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all text-sm font-bold border border-red-100 shadow-sm shadow-red-50"
                                >
                                    Process Refund
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(sale.id); }}
                                className="p-1.5 bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg border border-gray-100 shadow-sm"
                                title="Delete Record"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-300 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-xs font-bold text-gray-400">
                                <tr>
                                    <th className="px-4 py-3">Title</th>
                                    <th className="px-4 py-3 text-center">Qty</th>
                                    <th className="px-4 py-3 text-right">Price</th>
                                    <th className="px-4 py-3 text-right">Subtotal</th>
                                    {sale.status !== 'refunded' && <th className="px-4 py-3 text-right">Action</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {saleItems[sale.id] ? (
                                    saleItems[sale.id].map((item, idx) => {
                                        let parsedAttributes = null;
                                        try {
                                            if (item.attributes) {
                                                parsedAttributes = typeof item.attributes === 'string' ? JSON.parse(item.attributes) : item.attributes;
                                            }
                                        } catch (e) {
                                            console.error("Failed to parse attributes", e);
                                        }

                                        return (
                                            <React.Fragment key={idx}>
                                                <tr className={`text-sm ${item.refunded_qty >= item.qty ? 'opacity-50 line-through' : ''}`}>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-700">{item.product_name || item.name}</span>
                                                            {item.refunded_qty > 0 && (
                                                                <span className="text-[10px] text-red-500 font-bold uppercase">
                                                                    {item.refunded_qty >= item.qty ? 'Fully Refunded' : `${item.refunded_qty} Refunded`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {item.category !== 'repair' ? (
                                                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold text-xs">{item.qty}x</span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-red-500 uppercase">Service</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-gray-500">Rs {item.price}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-gray-800">Rs {item.total}</td>
                                                    {sale.status !== 'refunded' && (
                                                        <td className="px-4 py-3 text-right">
                                                            {(item.refunded_qty || 0) < item.qty && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleItemRefund(sale.id, item); }}
                                                                    className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 transition-colors"
                                                                >
                                                                    Refund
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                                {parsedAttributes && Object.keys(parsedAttributes).length > 0 && (
                                                    <tr className="bg-gray-50 border-none">
                                                        <td colSpan={sale.status !== 'refunded' ? 5 : 4} className="px-4 py-2 border-none">
                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                                                {Object.entries(parsedAttributes).map(([key, value]) => {
                                                                    if (!value) return null;
                                                                    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                                                    return (
                                                                        <span key={key} className="bg-white px-2 py-1 rounded shadow-sm border border-gray-100">
                                                                            <span className="font-semibold text-gray-400 mr-1">{formattedKey}:</span>
                                                                            <span className="font-bold text-[#001f3f]">{value}</span>
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan="5" className="p-10 text-center text-xs text-gray-400 italic">Fetching item details...</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-8 text-xs font-bold">
                        <div className="flex flex-col gap-1">
                            <span className="text-gray-400 font-medium">Payment Method</span>
                            <span className="text-gray-700 font-bold">{sale.payment_method}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-gray-400 font-medium">Discount</span>
                            <span className="text-red-500 font-bold">Rs {sale.discount?.toFixed(0)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-gray-400 font-medium">Reference Date</span>
                            <span className="text-gray-700 font-bold">{soldDate.toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            )}
            {/* Hidden Printable Comp */}
            <PrintableReceipt
                ref={printRef}
                sale={sale}
                items={saleItems[sale.id]}
                subtotal={sale.total}
                discount={sale.discount}
                total={sale.grand_total}
                config={receiptConfig}
            />
        </div>
    );
};

export default SaleRow;
