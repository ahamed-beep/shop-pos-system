import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { XCircle, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { getSingleProduct, updateProductById, getAllProducts } from "../Redux/features/product";
import {
    DevicePhoneMobileIcon,
    ArrowPathRoundedSquareIcon,
    ShoppingBagIcon,
    WrenchScrewdriverIcon
} from "@heroicons/react/24/outline";

const ModalOverlay = ({ closeModal, children }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#0000005d] bg-opacity-50"
        onClick={closeModal}
    >
        {children}
    </div>
);

const CATEGORIES = [
    { id: 'mobile_new', label: 'New Mobile', Icon: DevicePhoneMobileIcon },
    { id: 'mobile_used', label: 'Second Hand Mobile', Icon: ArrowPathRoundedSquareIcon },
    { id: 'accessories', label: 'Accessories', Icon: ShoppingBagIcon },
    { id: 'repair', label: 'Repairing Ticket', Icon: WrenchScrewdriverIcon }
];

const EditProductModal = ({ closeModal, id }) => {
    const dispatch = useDispatch();
    const singleLoading = useSelector((state) => state.product?.singleLoading);
    const actionLoading = useSelector((state) => state.product?.actionLoading);
    const products = useSelector((state) => state.product?.products);

    const [formData, setFormData] = useState({
        name: "",
        model: "",
        company: "",
        price: "",
        cost: "",
        qty: "",
        category: "mobile_new",
        attributes: {}
    });

    const [recentModels, setRecentModels] = useState([]);
    const [recentCompanies, setRecentCompanies] = useState([]);

    // Fetch products for suggestions
    useEffect(() => {
        dispatch(getAllProducts());
    }, [dispatch]);

    // Extract recent models/companies
    useEffect(() => {
        if (products && Array.isArray(products)) {
            const models = [...new Set(products.map(p => p.model).filter(Boolean))].slice(0, 5);
            setRecentModels(models);

            const companies = [...new Set(products.map(p => p.company).filter(Boolean))].slice(0, 5);
            setRecentCompanies(companies);
        }
    }, [products]);

    // Fetch product details
    useEffect(() => {
        if (id) {
            dispatch(getSingleProduct(id));
        }
    }, [id, dispatch]);

    const product = useSelector((state) => state.product?.selectedProduct);

    // Populate form when product loads
    useEffect(() => {
        if (product) {
            const isMobile = product.category?.startsWith('mobile');
            setFormData({
                name: product.name || "",
                model: product.model || "",
                company: product.company || "",
                price: product.price || "",
                cost: product.cost || "0",
                qty: isMobile ? (product.qty || "1") : (product.qty || "100"),
                category: product.category || "mobile_new",
                attributes: typeof product.attributes === 'string'
                    ? JSON.parse(product.attributes)
                    : (product.attributes || {})
            });
        }
    }, [product]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleAttributeChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            attributes: {
                ...formData.attributes,
                [name]: value
            }
        });
    };

    const handleCategoryChange = (e) => {
        const newCategory = e.target.value;
        setFormData({
            ...formData,
            category: newCategory,
            qty: newCategory === 'repair' ? "1" : (formData.qty === "1" ? "100" : formData.qty),
            attributes: {} // Reset attributes when category changes
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Mobile Rule: If qty is 0, clear IMEIs
            let finalAttributes = { ...formData.attributes };
            if ((formData.category === 'mobile_new' || formData.category === 'mobile_used') && parseInt(formData.qty) === 0) {
                finalAttributes.imei1 = "";
                finalAttributes.imei2 = "";
            }

            // Stringify attributes for backend
            const payload = {
                ...formData,
                attributes: JSON.stringify(finalAttributes)
            };
            const res = await dispatch(updateProductById({ id, data: payload }));
            if (updateProductById.fulfilled.match(res)) {
                toast.success("Product updated successfully!");
                closeModal();
            } else {
                const errorMsg = typeof res?.payload === 'string' ? res.payload : (res?.payload?.error || "Failed to update product");
                toast.error(errorMsg);
            }
        } catch (err) {
            toast.error(err.message);
        }
    };

    const labelClass = "block text-xs font-bold text-[#001f3f] mb-2 ml-1";
    const inputClass = "w-full bg-white border border-gray-300 rounded-xl px-4 py-4 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#008080] hover:border-[#008080] transition-all shadow-sm placeholder-gray-400 text-[#001f3f]";

    return (
        <ModalOverlay closeModal={closeModal}>
            <div
                className="bg-white rounded-3xl p-8 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-200 border border-gray-100 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#001f3f] to-[#008080]"></div>
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-50">
                    <h2 className="text-2xl font-black text-[#001f3f] tracking-tight uppercase">Edit Product</h2>
                    <button
                        onClick={closeModal}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
                    >
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                {singleLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader className="w-8 h-8 animate-spin text-[#001f3f]" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Category Label (Read Only during edit) */}
                        <div className="mb-2">
                            <label className={labelClass}>Product Category</label>
                            <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-[#001f3f] bg-[#001f3f]/5 text-[#001f3f] w-fit min-w-[200px]">
                                {(() => {
                                    const cat = CATEGORIES.find(c => c.id === formData.category);
                                    if (!cat) return null;
                                    return (
                                        <>
                                            <cat.Icon className="w-8 h-8 mr-2" strokeWidth={1.5} />
                                            <span className="text-xs font-black uppercase tracking-widest">{cat.label}</span>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Required Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                            {(() => {
                                const getLabels = (cat) => {
                                    switch (cat) {
                                        case 'repair': return {
                                            name: "Repair Title / Issue", namePh: "e.g. iPhone 13 Screen Replacement",
                                            model: "Device Model", modelPh: "e.g. iPhone 13",
                                            company: "Device Brand", companyPh: "e.g. Apple",
                                            price: "Estimated Total Cost", pricePh: "0.00"
                                        };
                                        case 'accessories': return {
                                            name: "Accessory Name", namePh: "e.g. Silicone Case",
                                            model: "Model / Type", modelPh: "e.g. Back Cover",
                                            company: "Accessory Brand", companyPh: "e.g. Spigen / Generic",
                                            price: "Selling Price", pricePh: "0.00"
                                        };
                                        case 'mobile_new':
                                        case 'mobile_used': return {
                                            name: "Phone Name", namePh: "e.g. Samsung Galaxy S23",
                                            model: "Model Number", modelPh: "e.g. SM-S911B",
                                            company: "Brand", companyPh: "e.g. Samsung",
                                            price: "Selling Price", pricePh: "0.00"
                                        };
                                        default: return {
                                            name: "Title / Name", namePh: "e.g. Generic Item",
                                            model: "Model", modelPh: "e.g. Generic Model",
                                            company: "Brand / Company", companyPh: "e.g. Generic Brand",
                                            price: "Selling Price", pricePh: "0.00"
                                        };
                                    }
                                };
                                const lbl = getLabels(formData.category);
                                return (
                                    <>
                                        <div className="md:col-span-2 lg:col-span-3">
                                            <label className={labelClass}>{lbl.name} <span className="text-red-500">*</span></label>
                                            <input type="text" name="name" placeholder={lbl.namePh} value={formData.name} onChange={handleChange} className={inputClass} required />
                                        </div>
                                        {!formData.category?.startsWith('mobile') && formData.category !== 'load' && (
                                            <div>
                                                <label className={labelClass}>{lbl.model} <span className="text-red-500">*</span></label>
                                                <input type="text" name="model" placeholder={lbl.modelPh} value={formData.model} onChange={handleChange} list="edit-model-suggestions" className={inputClass} required />
                                                <datalist id="edit-model-suggestions">{recentModels.map((m, i) => <option key={i} value={m} />)}</datalist>
                                            </div>
                                        )}
                                        <div>
                                            <label className={labelClass}>{lbl.company} <span className="text-red-500">*</span></label>
                                            <input type="text" name="company" placeholder={lbl.companyPh} value={formData.company} onChange={handleChange} list="edit-company-suggestions" className={inputClass} required />
                                            <datalist id="edit-company-suggestions">{recentCompanies.map((c, i) => <option key={i} value={c} />)}</datalist>
                                        </div>
                                        <div>
                                            <label className={labelClass}>{lbl.price} <span className="text-red-500">*</span></label>
                                            <input type="number" name="price" step="0.01" value={formData.price} onChange={handleChange} className={inputClass} placeholder={lbl.pricePh} required />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Cost Price</label>
                                            <input type="number" name="cost" step="0.01" value={formData.cost} onChange={handleChange} className={inputClass} />
                                        </div>
                                        {formData.category !== 'repair' && (
                                            <div>
                                                <label className={labelClass}>Stock Quantity <span className="text-red-500">*</span></label>
                                                <input
                                                    type="number"
                                                    name="qty"
                                                    value={formData.qty}
                                                    onChange={handleChange}
                                                    className={inputClass}
                                                    required
                                                    min="0"
                                                    max={(formData.category === 'mobile_new' || formData.category === 'mobile_used') ? "1" : undefined}
                                                />
                                                {(formData.category === 'mobile_new' || formData.category === 'mobile_used') && (
                                                    <p className="text-[9px] text-gray-400 mt-1 italic font-medium">Mobiles are limited to 1 unit per entry.</p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Dynamic Category Fields */}
                        <div className="pt-6 border-t border-gray-100 animate-in slide-in-from-top duration-300">
                            <h3 className="text-sm font-black text-[#001f3f] uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#008080]"></span>
                                {CATEGORIES.find(c => c.id === formData.category)?.label} Specifics
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f4f4f4]/50 p-6 rounded-3xl border border-gray-100">

                                {/* NEW MOBILE */}
                                {formData.category === 'mobile_new' && (
                                    <>
                                        <div>
                                            <label className={labelClass}>IMEI 1 <span className="text-red-500">*</span></label>
                                            <input type="text" name="imei1" placeholder="Enter Primary IMEI" required
                                                value={formData.attributes.imei1 || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>IMEI 2 <span className="text-xs text-gray-400 font-normal ml-1">(Optional)</span></label>
                                            <input type="text" name="imei2" placeholder="Enter Secondary IMEI"
                                                value={formData.attributes.imei2 || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Color <span className="text-red-500">*</span></label>
                                            <input type="text" name="color" placeholder="e.g. Midnight Black" list="color-suggestions" required
                                                value={formData.attributes.color || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Storage / RAM <span className="text-red-500">*</span></label>
                                            <input type="text" name="storage" placeholder="e.g. 8GB/256GB" list="storage-suggestions" required
                                                value={formData.attributes.storage || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Warranty Duration <span className="text-xs text-gray-400 font-normal ml-1">(Optional)</span></label>
                                            <input type="text" name="warranty" placeholder="e.g. 1 Year Local" list="warranty-suggestions"
                                                value={formData.attributes.warranty || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                    </>
                                )}

                                {/* SECOND HAND MOBILE */}
                                {formData.category === 'mobile_used' && (
                                    <>
                                        <div>
                                            <label className={labelClass}>IMEI 1 <span className="text-red-500">*</span></label>
                                            <input type="text" name="imei1" placeholder="Enter Primary IMEI" required
                                                value={formData.attributes.imei1 || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Condition <span className="text-xs text-gray-400 font-normal ml-1">(Optional)</span></label>
                                            <select name="condition" value={formData.attributes.condition || ''} onChange={handleAttributeChange} className={inputClass}>
                                                <option value="">Select Condition</option>
                                                <option value="10/10 (Flawless)">10/10 (Flawless)</option>
                                                <option value="9/10 (Excellent)">9/10 (Excellent)</option>
                                                <option value="8/10 (Good)">8/10 (Good - Minor Scratches)</option>
                                                <option value="7/10 (Fair)">7/10 (Fair - Visible Wear)</option>
                                                <option value="Needs Repair">Needs Repair</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Battery Health % <span className="text-xs text-[#008080] font-black italic ml-1">Required for iPhones</span></label>
                                            <input type="number" min="0" max="100" name="batteryHealth" placeholder="e.g. 85"
                                                value={formData.attributes.batteryHealth || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Accessories Included <span className="text-red-500">*</span></label>
                                            <select name="includedAccessories" value={formData.attributes.includedAccessories || ''} onChange={handleAttributeChange} className={inputClass} required>
                                                <option value="" disabled>Select Included Accessories</option>
                                                <option value="Box, Charger, Cable">Box, Charger, Cable (Full Box)</option>
                                                <option value="Box & Cable">Box & Cable</option>
                                                <option value="Phone & Charger">Phone & Charger</option>
                                                <option value="Phone Only">Phone Only</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Storage / RAM <span className="text-red-500">*</span></label>
                                            <input type="text" name="storage" placeholder="e.g. 8GB/256GB" list="storage-suggestions" required
                                                value={formData.attributes.storage || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Color <span className="text-red-500">*</span></label>
                                            <input type="text" name="color" placeholder="e.g. Midnight Black" list="color-suggestions" required
                                                value={formData.attributes.color || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Sourced From <span className="text-xs text-gray-400 font-normal ml-1">(Optional) - Internal</span></label>
                                            <input type="text" name="sourcedFrom" placeholder="Customer Name/Phone"
                                                value={formData.attributes.sourcedFrom || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                    </>
                                )}

                                {/* ACCESSORIES */}
                                {formData.category === 'accessories' && (
                                    <>
                                        <div>
                                            <label className={labelClass}>Accessory Type <span className="text-red-500">*</span></label>
                                            <select name="accessoryType" value={formData.attributes.accessoryType || ''} onChange={handleAttributeChange} className={inputClass} required>
                                                <option value="" disabled>Select Type</option>
                                                <option value="Charger">Charger / Adapter</option>
                                                <option value="Cable">Data Cable</option>
                                                <option value="Case">Case / Cover</option>
                                                <option value="Screen Protector">Screen Protector / Glass</option>
                                                <option value="Earbuds/Audio">Earbuds / Audio</option>
                                                <option value="Power Bank">Power Bank</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Compatible Models <span className="text-red-500">*</span></label>
                                            <input type="text" name="compatibleModels" placeholder='e.g. "iPhone 13/14" or "Universal Type-C"' required
                                                value={formData.attributes.compatibleModels || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Color <span className="text-red-500">*</span></label>
                                            <input type="text" name="color" placeholder="e.g. Transparent / White" list="color-suggestions" required
                                                value={formData.attributes.color || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                    </>
                                )}

                                {/* REPAIR TICKET */}
                                {formData.category === 'repair' && (
                                    <>
                                        <div>
                                            <label className={labelClass}>Customer Name <span className="text-red-500">*</span></label>
                                            <input type="text" name="customerName" placeholder="Enter Customer Name" required
                                                value={formData.attributes.customerName || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Customer Phone <span className="text-xs text-gray-400 font-normal ml-1">(Optional)</span></label>
                                            <input type="tel" name="customerPhone" placeholder="Enter Phone Number"
                                                value={formData.attributes.customerPhone || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Fault / Issue Description <span className="text-red-500">*</span></label>
                                            <input type="text" name="issue" placeholder="e.g. Broken screen, Dead battery" required
                                                value={formData.attributes.issue || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Advance Payment Received <span className="text-xs text-gray-400 font-normal ml-1">(Optional)</span></label>
                                            <input type="number" min="0" step="0.01" name="advancePayment" placeholder="e.g. 500.00"
                                                value={formData.attributes.advancePayment || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Expected Delivery Date <span className="text-red-500">*</span></label>
                                            <input type="date" name="deliveryDate" required
                                                value={formData.attributes.deliveryDate || ''} onChange={handleAttributeChange} className={inputClass} />
                                        </div>
                                    </>
                                )}

                            </div>
                        </div>



                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-6 border-t border-gray-50">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-4 rounded-xl font-black tracking-widest text-[10px] transition-all"
                            >
                                Discard Changes
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="flex-1 bg-[#001f3f] hover:bg-[#001f3f]/90 text-white py-4 rounded-xl font-black tracking-widest text-[10px] shadow-xl shadow-[#001f3f]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-[#001f3f]"
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>

                        {/* Global Datalists for Hints */}
                        <datalist id="color-suggestions">
                            <option value="Black" /><option value="White" /><option value="Silver" /><option value="Gold" /><option value="Blue" /><option value="Red" />
                        </datalist>
                        <datalist id="storage-suggestions">
                            <option value="2GB/32GB" /><option value="4GB/64GB" /><option value="6GB/128GB" /><option value="8GB/256GB" />
                            <option value="12GB/256GB" /><option value="12GB/512GB" /><option value="16GB/1TB" />
                        </datalist>
                        <datalist id="warranty-suggestions">
                            <option value="No Warranty" /><option value="1 Year Local Warranty" /><option value="2 Years Local Warranty" /><option value="6 Months Warranty" />
                        </datalist>
                    </form>
                )}
            </div>
        </ModalOverlay>
    );
};

export default EditProductModal;