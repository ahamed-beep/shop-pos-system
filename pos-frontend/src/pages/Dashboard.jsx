import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllProducts } from "../Redux/features/product";
import { addToCart } from "../Redux/features/cart";
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  PlusIcon,
  TagIcon,
  SparklesIcon,
  QueueListIcon,
  Squares2X2Icon as GridIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  CpuChipIcon,
  BanknotesIcon,
  ListBulletIcon
} from "@heroicons/react/24/outline";
import { Package } from "lucide-react";
import toast from "react-hot-toast";
import { useKeyboard } from "../hooks/useKeyboard";
import Bill from "../components/Bill";
import Loading from "../components/Loading";
import { ShoppingCartIcon, InformationCircleIcon as InfoIcon } from "@heroicons/react/24/solid";
import ContextMenu from "../components/ContextMenu";
import ProductInfoModal from "../components/ProductInfoModal";
import VariantSelectionModal from "../components/VariantSelectionModal";




export default function Dashboard() {
  const dispatch = useDispatch();
  const products = useSelector((state) => state?.product.products) || [];
  const listLoading = useSelector((state) => state?.product.listLoading);
  const { cartItems } = useSelector((state) => state.cart);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeBrand, setActiveBrand] = useState("all");
  const [activeModel, setActiveModel] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [inspectedProduct, setInspectedProduct] = useState(null);
  const [variantModal, setVariantModal] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [isRepairReminderDismissed, setIsRepairReminderDismissed] = useState(() => {
    return sessionStorage.getItem("isRepairReminderDismissed") === "true";
  });

  // Display Mode 
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("dashboardViewMode") || "visual");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [cols, setCols] = useState(1);
  const searchInputRef = useRef(null);
  const gridRef = useRef(null);


  // Save mode on change
  useEffect(() => {
    localStorage.setItem("dashboardViewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    dispatch(getAllProducts());
  }, [dispatch, cartItems.length]); // Auto-refresh when sale completes (cart clears)

  const categoryMap = {
    'all': 'All Items',
    'mobile_new': 'New Mobiles',
    'mobile_used': 'Old Mobiles',
    'accessories': 'Accessories',
    'repair': 'Repairs'
  };

  const categories = ["all", "mobile_new", "mobile_used", "accessories", "repair"];
  const models = ["all", ...new Set(products.map((p) => p.model))];

  const filteredProducts = products.filter((p) => {
    // Hide Repair items with 0 quantity
    if (p.category === 'repair' && p.qty <= 0) return false;
    // Hide SIM Load category from dashboard
    if (p.category === 'load') return false;

    const categoryMatch = activeCategory === "all" || p.category === activeCategory;
    const modelMatch = activeModel === "all" || p.model === activeModel;

    let attrs = {};
    if (typeof p.attributes === 'string') {
      try { attrs = JSON.parse(p.attributes); } catch (e) { }
    } else if (p.attributes) {
      attrs = p.attributes;
    }

    const searchString = `${p.name} ${p.company} ${p.model} ${p.shortcut || ""} ${attrs.imei1 || ""} ${attrs.imei2 || ""} ${attrs.customerName || ""} ${attrs.customerPhone || ""}`.toLowerCase();
    const searchMatch = searchString.includes(searchTerm.toLowerCase());
    return categoryMatch && modelMatch && searchMatch;
  });

  // Grouping Logic
  const groupedProducts = [];
  const processedGroups = new Set();

  filteredProducts.forEach(p => {
    const isMobile = p.category?.startsWith('mobile');
    if (isMobile) {
      const groupKey = `${p.category}-${p.name}`;
      if (!processedGroups.has(groupKey)) {
        const variants = filteredProducts.filter(v => v.category === p.category && v.name === p.name);
        if (variants.length > 1) {
          // Find first variant with an image to use as fallback
          const variantWithImage = variants.find(v => v.image_path) || p;
          groupedProducts.push({
            ...p,
            image_path: p.image_path || variantWithImage.image_path,
            isGroup: true,
            variants: variants,
            totalQty: variants.reduce((sum, v) => sum + v.qty, 0)
          });
          processedGroups.add(groupKey);
        } else {
          groupedProducts.push(p);
        }
      }
    } else {
      groupedProducts.push(p);
    }
  });

  const displayProducts = groupedProducts.sort((a, b) => {
    if (a.category === 'repair' && b.category !== 'repair') return -1;
    if (a.category !== 'repair' && b.category === 'repair') return 1;
    return 0;
  });
  // Dynamic column detection
  useEffect(() => {
    const updateCols = () => {
      if (gridRef.current) {
        const gridStyle = window.getComputedStyle(gridRef.current);
        const gridCols = gridStyle.getPropertyValue('grid-template-columns').split(' ').length;
        setCols(gridCols);
      }
    };
    updateCols();
    const observer = new ResizeObserver(updateCols);
    if (gridRef.current) observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [viewMode, displayProducts.length]);

  // Auto-scroll logic removed as requested.
  // Keyboard Hooks
  useKeyboard({
    SEARCH_FOCUS: () => {
      searchInputRef.current?.focus();
      setFocusedIndex(-1);
    }
  });

  // Keyboard auto-navigation removed

  const handleAddToCart = (product) => {
    if (product.isGroup) {
      setVariantModal(product);
      return;
    }
    if (product.qty <= 0) {
      toast.error("Product out of stock!");
      return;
    }
    dispatch(
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        cost: product.cost,
        company: product.company,
        model: product.model,
        image_path: product.image_path,
        available_qty: product.qty,
        quantity: 1,
        low_qty: product.low_qty,
        category: product.category,
        attributes: product.attributes
      })
    );
    toast.success(`${product.name} added to cart`, {
      icon: '🛒',
      style: { borderRadius: '12px', background: '#333', color: '#fff' }
    });
    setSearchTerm("");

    // Refocus search for next item
    setTimeout(() => {
      searchInputRef.current?.focus();
      setFocusedIndex(-1);
      setSearchTerm("");
    }, 100);
  };

  const handleRightClick = (e, product) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      product
    });
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'repair': return 'bg-red-500 text-white shadow-red-200';
      case 'mobile_new': return 'bg-emerald-500 text-white shadow-emerald-200';
      case 'mobile_used': return 'bg-teal-500 text-white shadow-teal-200';
      case 'accessories': return 'bg-orange-500 text-white shadow-orange-200';
      default: return 'bg-indigo-500 text-white shadow-indigo-200';
    }
  };

  const getCategoryIcon = (cat, className = "w-10 h-10") => {
    switch (cat) {
      case 'repair': return <WrenchScrewdriverIcon className={className} />;
      case 'mobile_new':
      case 'mobile_used': return <DevicePhoneMobileIcon className={className} />;
      case 'accessories': return <CpuChipIcon className={className} />;
      case 'load': return <BanknotesIcon className={className} />;
      default: return <Package className={className} />;
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-transparent">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        {/* Header - BillingHistory Style */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2 mt-2">
          <div className="mb-2">
            <h1 className="text-3xl font-black text-[#001f3f] uppercase tracking-tight flex items-center gap-3">
              <Squares2X2Icon className="w-8 h-8 text-[#008080]" />
              Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1 font-medium italic">Store Inventory & Quick Actions</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-grow max-w-2xl">
            <div className="relative flex-grow w-full sm:w-auto">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-[#008080] hover:border-[#008080] transition-all font-bold text-sm placeholder-gray-400"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-xs font-bold text-gray-500 shadow-sm whitespace-nowrap">
                  {displayProducts.length} Items
                </span>
              </div>
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Models Dropdown */}
            <div className="relative min-w-[140px] w-full sm:w-auto">
              <SparklesIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3 z-10" />
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="w-full pl-9 pr-8 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-[#008080] hover:border-[#008080] text-sm font-bold appearance-none cursor-pointer text-[#001f3f]"
              >
                <option value="all">All Models</option>
                {models.filter(m => m !== 'all').map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            {/* Refresh Button moved here */}
            <button
              onClick={() => {
                toast.loading("Refreshing Data...", { id: "refresh" });
                dispatch(getAllProducts()).then(() => toast.success("Data Refreshed", { id: "refresh" }));
              }}
              className="p-3 sm:py-3 sm:px-4 rounded-xl bg-white text-gray-400 hover:text-[#008080] hover:bg-[#008080]/10 transition-colors border border-gray-300 shadow-sm flex items-center justify-center flex-shrink-0"
              title="Refresh Data"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pending Repairs Reminder */}
        {!isRepairReminderDismissed && activeCategory === "all" && displayProducts.some(p => p.category === 'repair' && p.qty > 0) && (
          <div className="mx-2 mb-6 bg-red-50 border border-red-100 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-red-200/30 transition-all duration-700"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-red-500 p-3 rounded-2xl shadow-lg shadow-red-200">
                  <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#001f3f] uppercase tracking-tight">Pending Repairs</h3>
                  <p className="text-red-600 text-xs font-bold italic">You have {displayProducts.filter(p => p.category === 'repair' && p.qty > 0).length} repairs to complete today.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveCategory('repair')}
                  className="bg-white px-5 py-2.5 rounded-xl text-xs font-black text-red-600 shadow-sm border border-red-100 hover:bg-red-600 hover:text-white transition-all active:scale-95"
                >
                  VIEW LIST
                </button>
                <button
                  onClick={() => {
                    setIsRepairReminderDismissed(true);
                    sessionStorage.setItem("isRepairReminderDismissed", "true");
                  }}
                  className="bg-white p-2.5 rounded-xl text-gray-400 shadow-sm border border-gray-100 hover:bg-gray-100 hover:text-gray-600 transition-all active:scale-95"
                  title="Dismiss for today"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Controls Row */}
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start px-2 mb-4 gap-4">
          {/* Categories Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar flex-grow w-full">
            <TagIcon className="w-4 h-4 text-gray-400 mr-1 flex-shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${activeCategory === cat
                  ? "bg-[#001f3f] border-[#001f3f] text-white shadow-lg shadow-[#001f3f]/20 ring-4 ring-[#f4f4f4]"
                  : "bg-white border-gray-200 text-gray-400 hover:border-[#008080] hover:text-[#001f3f] hover:bg-[#f4f4f4]"
                  }`}
              >
                {categoryMap[cat] || cat}
              </button>
            ))}
          </div>

          {/* View Mode Selector */}
          <div className="flex bg-white rounded-2xl border border-gray-200 p-1 flex-shrink-0 shadow-sm">
            {[
              { id: 'visual', icon: GridIcon, label: 'Visual' },
              { id: 'compact', icon: QueueListIcon, label: 'Compact' },
              { id: 'list', icon: ListBulletIcon, label: 'List' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`p-2 rounded-xl transition-all ${viewMode === mode.id ? 'bg-[#001f3f] text-white shadow-md shadow-[#001f3f]/20' : 'text-gray-300 hover:text-[#001f3f] hover:bg-[#f4f4f4]'}`}
                title={mode.label}
              >
                <mode.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-grow overflow-y-auto pr-2 no-scrollbar px-2">
          {listLoading ? (
            <Loading message="Fetching Inventory..." />
          ) : displayProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 text-gray-400 mx-2 shadow-sm">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p className="font-bold text-lg">No products found</p>
              <p className="text-xs font-medium px-10">Try adjusting your filters or search term</p>
            </div>
          ) : (
            <div ref={gridRef} className={`grid gap-4 pb-20 ${viewMode === 'list' ? 'grid-cols-1' : viewMode === 'compact' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
              {displayProducts?.map((p, index) => {
                if (viewMode === 'list') return (
                  <div
                    key={p.id}
                    id={`product-card-${index}`}
                    tabIndex={0}
                    onClick={() => handleAddToCart(p)}
                    onContextMenu={(e) => handleRightClick(e, p)}
                    className={`group flex items-center justify-between bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-sm focus:outline-none ${focusedIndex === index ? 'ring-2 ring-[#008080] border-transparent shadow-lg scale-[1.01]' : 'border-gray-300 hover:border-[#008080] hover:shadow-lg hover:shadow-[#001f3f]/5'}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-2 h-10 rounded-full ${getCategoryColor(p.category).split(' ')[0]}`} />
                      <div>
                        {p.category && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black shadow-sm uppercase tracking-widest mb-1 inline-block ${getCategoryColor(p.category)}`}>
                            {categoryMap[p.category]?.replace('Mobiles', '').trim() || p.category}
                          </span>
                        )}
                        <h3 className="font-bold text-[#001f3f] text-sm mb-0.5">{p.name}</h3>
                        <div className="flex gap-3 text-xs text-gray-500 font-bold tracking-wider">
                          {p.category === 'repair' ? (
                            <span className="bg-[#f4f4f4] text-[#001f3f] px-2 rounded font-bold border border-[#008080]/20">Delivery: {JSON.parse(p.attributes)?.deliveryDate || 'N/A'}</span>
                          ) : (
                            <>
                              <span className="bg-[#f4f4f4] text-[#001f3f] px-2 rounded font-bold border border-[#008080]/20">{p.company}</span>
                              {!p.category?.startsWith('mobile') && <span className="font-bold">{p.model}</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-10">
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 tracking-widest">Stock</p>
                        <p className={`text-xs font-bold ${p.qty > 0 ? 'text-gray-700' : 'text-red-500'}`}>{p.qty <= 5 && p.qty > 0 ? <span className="text-orange-500">{p.qty} (Low)</span> : p.qty}</p>
                      </div>
                      <div className="text-right w-24">
                        <p className="text-xs font-bold text-gray-400 tracking-widest">Price</p>
                        <p className="text-sm font-bold text-gray-900 group-hover:text-[#001f3f] transition-colors">Rs {p.price?.toLocaleString()}</p>
                      </div>
                      <button className="p-3 bg-gray-50 text-gray-400 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-[#001f3f] hover:text-white shadow-sm">
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );

                if (viewMode === 'compact') return (
                  <div
                    key={p.id}
                    id={`product-card-${index}`}
                    tabIndex={0}
                    onClick={() => handleAddToCart(p)}
                    onContextMenu={(e) => handleRightClick(e, p)}
                    className={`group bg-white p-5 rounded-xl border transition-all cursor-pointer shadow-sm flex flex-col justify-between h-full relative overflow-hidden focus:outline-none ${focusedIndex === index ? 'ring-2 ring-[#008080] border-transparent shadow-lg scale-[1.01]' : 'border-gray-300 hover:border-[#008080] hover:shadow-lg hover:shadow-[#001f3f]/5'}`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        {p.category && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black shadow-sm uppercase tracking-widest ${getCategoryColor(p.category)}`}>
                            {categoryMap[p.category]?.replace('Mobiles', '').trim() || p.category}
                          </span>
                        )}
                        {p.qty <= 5 && !p.category?.startsWith('mobile') && p.category !== 'repair' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm leading-snug mb-1 line-clamp-2">{p.name}</h3>
                      <p className="text-xs text-gray-400 font-bold line-clamp-1">
                        {p.category === 'repair' ? `Date: ${JSON.parse(p.attributes)?.deliveryDate || 'N/A'}` : `${p.company}${p.category?.startsWith('mobile') ? '' : ` • ${p.model}`}`}
                      </p>
                    </div>
                    <div className="mt-4 flex justify-between items-end border-t border-gray-50 pt-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 group-hover:text-[#001f3f] leading-none transition-colors">Rs {p.price?.toLocaleString()}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-xs font-bold ${(p.isGroup ? p.totalQty : p.qty) > 0 ? 'bg-[#f4f4f4] text-[#001f3f]' : 'bg-red-600 text-white shadow-lg '}`}>
                        {p.category === 'repair' ? 'PENDING' : (p.isGroup ? (p.totalQty > 0 ? `${p.totalQty} Units` : 'SOLD') : (p.qty > 0 ? `${p.qty} Stock` : 'SOLD'))}
                      </div>
                    </div>
                  </div>
                );

                return (
                  <div
                    key={p.id}
                    id={`product-card-${index}`}
                    tabIndex={0}
                    onContextMenu={(e) => handleRightClick(e, p)}
                    className={`group relative bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:shadow-[#001f3f]/5 hover:-translate-y-1 focus:outline-none ${focusedIndex === index ? 'ring-2 ring-[#008080] border-transparent shadow-lg scale-[1.01]' : 'border-gray-300'}`}
                  >
                    <div className="relative h-40 overflow-hidden bg-gray-50 border-b border-gray-100 flex items-center justify-center">
                      {p.image_path ? (
                        <img
                          src={`http://localhost:3000${p.image_path}`}
                          alt={p.name}
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : null}
                      {/* Fallback Icon */}
                      <div className={`w-full h-full flex flex-col items-center justify-center opacity-30 ${p.image_path ? 'hidden' : 'flex'}`}>
                        {getCategoryIcon(p.category, "w-16 h-16 mb-2")}
                        <span className="text-xs font-bold uppercase tracking-widest">{categoryMap[p.category]?.replace('Mobiles', '').trim() || p.category}</span>
                      </div>

                      {p.category && (
                        <span className={`absolute top-3 left-3 text-[9px] px-2 py-1 rounded-lg font-black shadow-xl uppercase tracking-widest ${getCategoryColor(p.category)}`}>
                          {categoryMap[p.category]?.replace('Mobiles', '').trim() || p.category}
                        </span>
                      )}
                      {p.isGroup && (
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-sm border border-gray-100 flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                          <PlusIcon className="w-3 h-3 text-[#008080]" strokeWidth={3} />
                          <span className="text-[10px] font-black text-[#001f3f]">{p.variants.length} Variants</span>
                        </div>
                      )}
                      <div
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                        className="absolute inset-0 bg-[#001f3f]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer backdrop-blur-[2px]"
                      >
                        <button className="bg-white text-[#001f3f] rounded-full p-4 shadow-2xl transform scale-75 group-hover:scale-100 transition-transform hover:bg-[#f4f4f4]">
                          <PlusIcon className="w-6 h-6" strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                    <div onClick={() => handleAddToCart(p)} className="p-5 flex-grow flex flex-col cursor-pointer">
                      <div className="flex justify-between items-start mb-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        {p.category === 'repair' ? (
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md line-clamp-1 w-full text-center">
                            Date: {JSON.parse(p.attributes)?.deliveryDate || 'N/A'}
                          </span>
                        ) : (
                          <>
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md line-clamp-1 max-w-[50%]">
                              {p.company}
                            </span>
                            {!p.category?.startsWith('mobile') && (
                              <span className="text-xs font-bold text-gray-400 line-clamp-1 max-w-[45%] text-right">
                                {p.model}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex-grow mb-3">
                        <h3 className="text-sm font-bold text-gray-800 leading-tight group-hover:text-[#001f3f] transition-colors line-clamp-2" title={p.name}>
                          {p.name}
                        </h3>
                      </div>
                      <div className="flex items-end justify-between border-t border-gray-50 pt-3">
                        <div>
                          <p className="text-xs font-bold text-gray-400 mb-0.5">Price</p>
                          <p className="text-xl font-bold text-gray-900 group-hover:text-[#001f3f] transition-colors">
                            <span className="text-sm align-top opacity-50 mr-0.5">Rs</span>{p.price?.toLocaleString()}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${(p.isGroup ? p.totalQty : p.qty) > 0 ? 'bg-[#f4f4f4] text-[#001f3f]' : 'bg-red-600 text-white shadow-lg'}`}>
                          {p.category === 'repair' ? 'PENDING' : (p.isGroup ? (p.totalQty > 0 ? `${p.totalQty} Units` : 'SOLD') : (p.qty > 0 ? `${p.qty} Stock` : 'SOLD'))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Bill />

      <ProductInfoModal
        product={inspectedProduct}
        onClose={() => setInspectedProduct(null)}
      />

      {variantModal && (
        <VariantSelectionModal
          pName={variantModal.name}
          products={variantModal.variants}
          onClose={() => setVariantModal(null)}
          onAdd={handleAddToCart}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={[
            {
              label: "Add to Bill",
              icon: ShoppingCartIcon,
              onClick: () => handleAddToCart(contextMenu.product)
            },
            {
              label: "Show Details",
              icon: InfoIcon,
              onClick: () => setInspectedProduct(contextMenu.product)
            }
          ]}
        />
      )}
    </div>
  );
}
