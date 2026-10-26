import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { uploadProduct, getAllProducts } from "../Redux/features/product";
import toast from "react-hot-toast";
import { RefreshCw, Save, ChevronDown, ChevronUp } from "lucide-react";
import {
  DevicePhoneMobileIcon,
  ArrowPathRoundedSquareIcon,
  ShoppingBagIcon,
  WrenchScrewdriverIcon,
  BanknotesIcon
} from "@heroicons/react/24/outline";
import api from "../api";

const PackageIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15" />
    <path d="M2.52 6.17 12 11.5l9.48-5.33L12 1 2.52 6.17Z" />
    <path d="m7.5 19.73 9-5.15" />
    <path d="M3.29 7.12V17.9L12 23l8.71-5.1V7.12" />
  </svg>
);

const CATEGORIES = [
  { id: 'mobile_new', label: 'New Mobile', Icon: DevicePhoneMobileIcon },
  { id: 'mobile_used', label: 'Second Hand Mobile', Icon: ArrowPathRoundedSquareIcon },
  { id: 'accessories', label: 'Accessories', Icon: ShoppingBagIcon },
  { id: 'repair', label: 'Repairing Ticket', Icon: WrenchScrewdriverIcon },
  { id: 'load', label: 'SIM Load', Icon: BanknotesIcon }
];

const UploadProduct = () => {
  const dispatch = useDispatch();
  const actionLoading = useSelector((state) => state.product?.actionLoading);
  const products = useSelector((state) => state.product?.products);

  const [formData, setFormData] = useState({
    name: "",
    model: "",
    company: "",
    price: "",
    cost: "1",
    qty: "1",
    category: "mobile_new",
    attributes: {},
    image: null
  });

  const [preview, setPreview] = useState(null);
  const [recentModels, setRecentModels] = useState([]);
  const [recentCompanies, setRecentCompanies] = useState([]);

  // Fetch products on mount to get recent models/companies
  useEffect(() => {
    dispatch(getAllProducts());
  }, [dispatch]);

  // Extract last 5 unique models and companies from products
  useEffect(() => {
    if (products && Array.isArray(products)) {
      // Get unique models (last 5)
      const models = [...new Set(products.map(p => p.model).filter(Boolean))].slice(0, 5);
      setRecentModels(models);

      // Get unique companies (last 5)
      const companies = [...new Set(products.map(p => p.company).filter(Boolean))].slice(0, 5);
      setRecentCompanies(companies);
    }
  }, [products]);

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
    const isMobile = newCategory.startsWith('mobile');
    setFormData({
      ...formData,
      category: newCategory,
      qty: isMobile ? "1" : (newCategory === 'repair' ? "1" : (formData.qty === "1" ? "100" : formData.qty)),
      attributes: {}
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.category === 'load') {
      // Direct Sale for Load
      try {
        const saleData = {
          customer_name: "Walk-in Customer",
          total: parseFloat(formData.price),
          discount: 0,
          grand_total: parseFloat(formData.price),
          paid: parseFloat(formData.price),
          payment_method: 'cash',
          items: [{
            product_id: null,
            product_name: `${formData.company} Load - ${formData.name}`,
            qty: 1,
            price: parseFloat(formData.price),
            total: parseFloat(formData.price),
            category: 'load',
            attributes: JSON.stringify({
              simName: formData.company,
              loadAmount: formData.price,
              phoneNumber: formData.attributes.phoneNumber || ''
            })
          }]
        };

        const res = await api.post("/sales", saleData);
        if (res.status === 201 || res.status === 200) {
          toast.success("Load Sale Recorded Successfully!");
          setFormData({
            name: "", model: "Direct Load", company: "", price: "",
            cost: "0", qty: "1", category: 'load', attributes: {}, image: null
          });
        }
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to record load sale");
      }
      return;
    }

    const finalData = new FormData();
    for (const key in formData) {
      if (key === "image") {
        if (formData.image) finalData.append("image", formData.image);
      } else if (key === "attributes") {
        finalData.append("attributes", JSON.stringify(formData.attributes));
      } else if (formData[key]) {
        finalData.append(key, formData[key]);
      }
    }

    try {
      const isMobile = formData.category.startsWith('mobile');
      const res = await dispatch(uploadProduct(finalData));
      if (uploadProduct.fulfilled.match(res)) {
        toast.success("Product Added Successfully!");
        setFormData({
          name: "", model: "", company: "", price: "",
          cost: "0", qty: isMobile ? "1" : "100", category: formData.category, attributes: {}, image: null
        });
        setPreview(null);
      } else {
        const errorMsg = typeof res?.payload === 'string' ? res.payload : (res?.payload?.error || "Error adding product");
        toast.error(errorMsg);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const labelClass = "block text-xs font-bold text-[#001f3f] mb-2 ml-1";
  const inputClass = "w-full bg-white border border-gray-300 rounded-xl px-4 py-4 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#008080] hover:border-[#008080] transition-all shadow-sm placeholder-gray-400 text-[#001f3f]";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 px-2">
        <h1 className="text-3xl font-black text-[#001f3f] uppercase tracking-tight flex items-center gap-3">
          <PackageIcon className="w-8 h-8 text-[#008080]" />
          Add Product
        </h1>
        <p className="text-gray-500 text-sm mt-1 font-medium italic">Register new inventory item with essential details.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#001f3f] to-[#008080]"></div>

        {/* Category Selector */}
        <div className="mb-2">
          <label className={labelClass}>Product Category <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange({ target: { value: cat.id } })}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${formData.category === cat.id
                  ? 'border-[#001f3f] bg-[#001f3f]/5 text-[#001f3f] shadow-md scale-105'
                  : 'border-gray-100 bg-white text-gray-400 hover:border-[#008080]/30 hover:bg-gray-50'
                  }`}
              >
                <cat.Icon className="w-8 h-8 mb-2" strokeWidth={1.5} />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">{cat.label}</span>
              </button>
            ))}
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
                  price: "Estimated Total Cost", pricePh: "1200"
                };
                case 'accessories': return {
                  name: "Accessory Name", namePh: "e.g. Silicone Case",
                  model: "Model / Type", modelPh: "e.g. Back Cover",
                  company: "Accessory Brand", companyPh: "e.g. Spigen / Generic",
                  price: "Selling Price", pricePh: "1200"
                };
                case 'mobile_new':
                case 'mobile_used': return {
                  name: "Phone Name", namePh: "e.g. Samsung Galaxy S23",
                  model: "Model Number", modelPh: "e.g. SM-S911B",
                  company: "Brand", companyPh: "e.g. Samsung",
                  price: "Selling Price", pricePh: "1200"
                };
                case 'load': return {
                  name: "Load Title", namePh: "e.g. Jazz Load Request",
                  model: "SIM Type", modelPh: "e.g. Prepaid / Postpaid",
                  company: "Network Operator", companyPh: "e.g. Jazz / Zong / Telenor",
                  price: "Load Amount", pricePh: "500"
                };
                default: return {
                  name: "Title / Name", namePh: "e.g. Generic Item",
                  model: "Model", modelPh: "e.g. Generic Model",
                  company: "Brand / Company", companyPh: "e.g. Generic Brand",
                  price: "Selling Price", pricePh: "1200"
                };
              }
            };
            const lbl = getLabels(formData.category);
            return (
              <>
                <div className={`${formData.category === 'load' ? 'md:col-span-1' : 'md:col-span-2 lg:col-span-3'}`}>
                  <label className={labelClass}>{lbl.name} <span className="text-red-500">*</span></label>
                  <input type="text" name="name" placeholder={lbl.namePh} value={formData.name} onChange={handleChange} className={inputClass} required />
                </div>
                {!formData.category.startsWith('mobile') && formData.category !== 'load' && (
                  <>
                    <div>
                      <label className={labelClass}>{lbl.model} <span className="text-red-500">*</span></label>
                      <input type="text" name="model" placeholder={lbl.modelPh} value={formData.model} onChange={handleChange} list="model-suggestions" className={inputClass} required />
                      <datalist id="model-suggestions">{recentModels.map((m, i) => <option key={i} value={m} />)}</datalist>
                    </div>
                  </>
                )}
                <div>
                  <label className={labelClass}>{lbl.company} <span className="text-red-500">*</span></label>
                  {formData.category === 'load' ? (
                    <select name="company" value={formData.company} onChange={handleChange} className={inputClass} required>
                      <option value="" disabled>Select Network</option>
                      <option value="Jazz">Jazz</option>
                      <option value="Zong">Zong</option>
                      <option value="Telenor">Telenor</option>
                      <option value="Ufone">Ufone</option>
                      <option value="Scom">Scom</option>
                    </select>
                  ) : (
                    <>
                      <input type="text" name="company" placeholder={lbl.companyPh} value={formData.company} onChange={handleChange} list="company-suggestions" className={inputClass} required />
                      <datalist id="company-suggestions">{recentCompanies.map((c, i) => <option key={i} value={c} />)}</datalist>
                    </>
                  )}
                </div>
                <div>
                  <label className={labelClass}>{lbl.price} <span className="text-red-500">*</span></label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} className={inputClass} placeholder={lbl.pricePh} required />
                </div>
                {formData.category === 'load' && (
                  <div>
                    <label className={labelClass}>Phone Number <span className="text-xs text-gray-400 font-normal ml-1">(Optional)</span></label>
                    <input type="tel" name="phoneNumber" placeholder="03XXXXXXXXX"
                      value={formData.attributes.phoneNumber || ''} onChange={handleAttributeChange} className={inputClass} />
                  </div>
                )}
                {formData.category !== 'load' && (
                  <>
                    <div>
                      <label className={labelClass}>Cost Price</label>
                      <input type="number" name="cost" value={formData.cost} onChange={handleChange} placeholder="1000" className={inputClass} />
                    </div>
                    {!formData.category.startsWith('mobile') && formData.category !== 'repair' && (
                      <div>
                        <label className={labelClass}>Stock Quantity <span className="text-red-500">*</span></label>
                        <input type="number" name="qty" value={formData.qty} onChange={handleChange} className={inputClass} required />
                      </div>
                    )}
                    <div>
                      <label className={labelClass}>Product Image {preview && <span className="text-[#008080] ml-2">(Selected)</span>}</label>
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full bg-white border border-gray-300 rounded-xl px-4 py-4 text-sm font-bold text-gray-400 flex items-center gap-3 transition-all group-hover:border-[#008080]">
                          <Save className="w-4 h-4 text-gray-300" />
                          {preview ? "Change Image" : "Choose Image File..."}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>

        {/* Dynamic Category Fields */}
        {formData.category !== 'load' && (
          <div className="pt-6 border-t border-gray-100 animate-in slide-in-from-top duration-300">
            <h3 className="text-sm font-black text-[#001f3f] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#008080]"></span>
              {CATEGORIES.find(c => c.id === formData.category)?.label}
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
                    <label className={labelClass}>Expected Delivery Date <span className="text-red-500">*</span></label>
                    <input type="date" name="deliveryDate" required
                      value={formData.attributes.deliveryDate || ''} onChange={handleAttributeChange} className={inputClass} />
                  </div>
                </>
              )}

            </div>
          </div>
        )}






        <button
          type="submit"
          disabled={actionLoading}
          className="w-full font-black py-5 rounded-xl shadow-xl hover:shadow-2xl shadow-[#001f3f]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 tracking-[0.3em] text-[10px] mt-4 bg-[#001f3f] hover:bg-[#001f3f]/90 text-white disabled:opacity-50"
        >
          {actionLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {actionLoading ? "Processing..." : "Add Product"}
        </button>

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
    </div>
  );
};

export default UploadProduct;
