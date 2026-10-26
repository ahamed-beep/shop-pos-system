// src/components/PrintableReceipt.jsx
import React from "react";
import { branding } from "../config/branding";

const PrintableReceipt = React.forwardRef(({ sale, items = [], customerName, subtotal, discount, total, date, config }, ref) => {
    const userEmail = JSON.parse(sessionStorage.getItem("user") || "{}")?.email || "Staff";

    const safeItems = Array.isArray(items) ? items : [];

    const receiptConfig = {
        customer_note: "Jazzcash and Easypaisy is available",
        shop_name: "Hassan Mobiles and Repairing center",
        shop_address: "Shaheen chowk Ali wali Market, Gujrat",
        shop_phone: "0314-7088914, 0300-6295417",
        proprietor_name: "Bilal Hassan Warraich",
        show_cashier: config?.show_cashier ?? true,
        show_invoice: config?.show_invoice ?? true,
        show_datetime: config?.show_datetime ?? true,
        phone_label: "Phone"
    };

    return (
        <div
            ref={ref}
            className="hidden print:block p-4 w-[80mm] bg-white text-black font-mono leading-tight"
        >
            <div className="text-center">
                <h1 className="text-[16px] font-black uppercase tracking-tight text-black">{receiptConfig.shop_name}</h1>
                <p className="text-[10px] font-bold text-black">{receiptConfig.shop_address}</p>
                <p className="text-[10px] mb-2 font-bold text-black">{receiptConfig?.phone_label}: {receiptConfig.shop_phone}</p>
                <div className="border-t border-b border-black border-dashed py-1 mb-2">
                    <p className="text-[10px] uppercase font-bold text-black">
                        {sale?.status === 'refunded' ? 'REFUND INVOICE' : 'Bill invoice'}
                    </p>
                </div>
            </div>

            <div className="flex justify-between text-[10px] mb-4 text-black">
                <div className="flex flex-col text-[8px]">
                    {receiptConfig.show_datetime && (
                        <>
                            <span>Date: {date || new Date(sale?.sold_at || Date.now()).toLocaleDateString()}</span>
                            <span>Time: {new Date(sale?.sold_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        </>
                    )}
                    {receiptConfig.show_invoice && (
                        <span>Invoice: {sale?.invoice_no || "PRO-000"}</span>
                    )}
                </div>
                <div className="text-right flex flex-col text-[8px]">
                    <span>Customer: {customerName || sale?.customer_name}</span>
                </div>
            </div>

            <table className="w-full text-[10px] mb-4 text-black">
                <thead>
                    <tr className="border-b border-black border-dashed">
                        <th className="text-left py-1">Item</th>
                        <th className="text-center py-1">Qty</th>
                        <th className="text-right py-1">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                    {safeItems.map((item, idx) => {
                        let attrs = {};
                        if (typeof item.attributes === 'string') {
                            try { attrs = JSON.parse(item.attributes); } catch (e) { }
                        } else if (item.attributes) {
                            attrs = item.attributes;
                        }

                        return (
                            <React.Fragment key={idx}>
                                <tr>
                                    <td className="py-2">
                                        <div className="font-bold line-clamp-2 text-black">
                                            {item.product_name || item.name}
                                            {!item.category?.startsWith('mobile') && item.model && ` (${item.model})`}
                                        </div>
                                        {attrs.issue && (
                                            <div className="text-[8px] text-black">
                                                Issue: {attrs.issue}
                                            </div>
                                        )}
                                        {attrs.color && (
                                            <div className="text-[7px] text-black uppercase">
                                                Color: {attrs.color}
                                            </div>
                                        )}
                                        {attrs.storage && (
                                            <div className="text-[7px] text-black">
                                                Specs: {attrs.storage}
                                            </div>
                                        )}
                                        {(attrs.imei1 || attrs.imei) && (
                                            <div className="text-[7px] text-black uppercase">
                                                IMEI: {attrs.imei1 || attrs.imei}
                                            </div>
                                        )}
                                        {item.category === 'load' && (
                                            <div className="text-[7px] text-black font-bold">
                                                SIM: {attrs.simName} {attrs.phoneNumber ? `(${attrs.phoneNumber})` : ''}
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-center py-2 align-top text-black">{item.qty || item.quantity}</td>
                                    <td className="text-right py-2 align-top font-bold text-black">Rs {item.total?.toFixed(0) || (item.price * item.quantity).toFixed(0)}</td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

            <div className="space-y-1 text-[10px] border-t border-black border-dashed pt-2 text-black">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs {subtotal?.toFixed(0) || sale?.total?.toFixed(0)}</span>
                </div>
                {(discount > 0 || sale?.discount > 0) && (
                    <div className="flex justify-between font-bold text-black">
                        <span>Discount:</span>
                        <span>-Rs {(discount || sale?.discount)?.toFixed(0)}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm font-black pt-2 border-t border-black text-black">
                    <span>TOTAL:</span>
                    <span>Rs {total?.toFixed(0) || sale?.grand_total?.toFixed(0)}</span>
                </div>
            </div>

            <div className="mt-6 text-center text-black">
                {sale?.status === 'refunded' && (
                    <p className="text-[10px] font-bold text-black uppercase">This sale has been Refunded</p>
                )}

                {receiptConfig.customer_note && (
                    <div className="mt-2 border-t border-black/10 pt-2">
                        <p className="text-[9px] font-black uppercase tracking-tight text-black">Note:</p>
                        <p className="text-[8px] italic text-black">
                            {receiptConfig.customer_note}
                        </p>
                    </div>
                )}

                <div className="mt-4 pt-2 border-t border-black border-dotted">
                    <p className="text-[7px] font-bold text-black uppercase tracking-tighter">Developed by: {branding.developerName}</p>
                    <p className="text-[6px] text-black font-bold uppercase tracking-widest mt-1">{branding.shortName} System • Version {branding.version} • {branding.phoneNumber}</p>
                </div>
            </div>
        </div>
    );
});

export default PrintableReceipt;