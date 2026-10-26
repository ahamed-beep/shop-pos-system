import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    PencilSquareIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    PlusCircleIcon,
    DevicePhoneMobileIcon,
    ArrowPathRoundedSquareIcon,
    ShoppingBagIcon,
    WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import ConfirmationModal from 'Components/ConfirmationModal'
import { deleteProductById, getAllProducts } from '../Redux/features/product';
import EditProductModal from './EditProductModal';
import { PackageIcon, Table, RefreshCwIcon } from 'lucide-react';
import Loading from '../components/Loading';
import api from '../api.js';

const ManageProducts = () => {
    const dispatch = useDispatch();
    const products = useSelector((state) => state.product?.products);
    const listLoading = useSelector((state) => state.product?.listLoading);
    const actionLoading = useSelector((state) => state.product?.actionLoading);
    const error = useSelector((state) => state?.product?.error);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCompany, setActiveCompany] = useState('all');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [EditingID, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [sortOrder, setSortOrder] = useState('default'); // 'default', 'qty-asc', 'qty-desc'

    const closeModal = () => {
        setIsEditModalOpen(false);
        setEditingId(null);
    };

    const [productIdToDelete, setProductIdToDelete] = useState(null);
    const [productTitleToDelete, setProductTitleToDelete] = useState('');

    const user = useSelector((state) => state.auth.user);

    useEffect(() => {
        dispatch(getAllProducts());
    }, [dispatch]);

    const companies = ["all", ...new Set((products || []).map(p => p.company).filter(Boolean))];

    useEffect(() => {
        if (products && Array.isArray(products)) {
            const lowercasedSearchTerm = searchTerm?.toLowerCase();
            const results = products.filter(product => {
                if (product.category === 'load') return false;
                let attrs = {};
                if (typeof product.attributes === 'string') {
                    try { attrs = JSON.parse(product.attributes); } catch (e) { }
                } else if (product.attributes) {
                    attrs = product.attributes;
                }

                const searchMatch = product.name.toLowerCase().includes(lowercasedSearchTerm) ||
                    (product.company && product.company.toLowerCase().includes(lowercasedSearchTerm)) ||
                    (product.model && product.model.toLowerCase().includes(lowercasedSearchTerm)) ||
                    (product.shortcut && product.shortcut.toLowerCase().includes(lowercasedSearchTerm)) ||
                    (attrs.imei1 && attrs.imei1.toLowerCase().includes(lowercasedSearchTerm)) ||
                    (attrs.imei2 && attrs.imei2.toLowerCase().includes(lowercasedSearchTerm));

                const companyMatch = activeCompany === 'all' || product.company === activeCompany;
                const lowStockMatch = !lowStockOnly || (product.qty <= (product.low_qty || 2));

                return searchMatch && companyMatch && lowStockMatch;
            });

            // Apply Sorting
            const sortedResults = [...results];
            if (sortOrder === 'qty-asc') {
                sortedResults.sort((a, b) => a.qty - b.qty);
            } else if (sortOrder === 'qty-desc') {
                sortedResults.sort((a, b) => b.qty - a.qty);
            }

            setFilteredProducts(sortedResults);
        }
    }, [products, searchTerm, activeCompany, lowStockOnly, sortOrder]);

    const confirmDelete = (productId, productTitle) => {
        setProductIdToDelete(productId);
        setProductTitleToDelete(productTitle);
        setIsModalOpen(true);
    };

    const handleActualDelete = async () => {
        if (!productIdToDelete) return;
        const resultAction = await dispatch(deleteProductById(productIdToDelete));
        if (deleteProductById.fulfilled.match(resultAction)) {
            toast.success("Product deleted successfully!");
            setIsModalOpen(false);
        } else {
            const errorMsg = typeof resultAction.payload === 'string' ? resultAction.payload : (resultAction.payload?.error || "Failed to delete product.");
            toast.error(errorMsg);
        }
    };

    const handleExportExcel = async () => {
        try {
            setLoading(true);
            const response = await api.get('/export/inventory', {
                responseType: 'blob'
            });

            // Create a link to download the file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success("Excel ledger generated!");
        } catch (error) {
            console.error("Export failed", error);
            if (error.response?.status === 403) {
                toast.error(error.response.data.error || "Export failed from server");
            } else {
                toast.error("Failed to export products. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
                <div className="mb-2">
                    <h1 className="text-3xl font-black text-[#001f3f] uppercase tracking-tight flex items-center gap-3">
                        <PackageIcon className="w-8 h-8 text-[#008080]" />
                        Manage Products
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium italic">Monitor and organize your inventory with precision.</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="px-3 py-1 bg-[#f4f4f4] text-[#001f3f] rounded-full text-xs font-bold border border-[#008080]/20">
                            {filteredProducts.length} Items Listed
                        </span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center bg-white text-gray-400 px-6 py-3 rounded-xl font-bold text-sm hover:text-[#001f3f] hover:bg-[#f4f4f4] transition-all shadow-sm active:scale-95 border border-gray-200"
                    >
                        <Table className="h-4 w-4 mr-2" />
                        Export Data
                    </button>
                    <Link
                        to="/Dashboard/product-upload"
                        className="flex items-center bg-[#001f3f] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#001f3f]/90 transition-all shadow-xl shadow-[#001f3f]/20 active:scale-95 border border-[#001f3f]"
                    >
                        <PlusCircleIcon className="h-4 w-4 mr-2" strokeWidth={3} />
                        Add Product
                    </Link>
                </div>
            </div>

            {/* Filters & Search Row */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mb-8">
                <div className="flex flex-col lg:flex-row gap-6 items-end">
                    {/* Search */}
                    <div className="flex-grow w-full lg:w-auto">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Search Inventory</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search products, IMEIs, or models..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] transition-all font-bold text-sm"
                            />
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
                    </div>

                    {/* Brand Filter */}
                    <div className="w-full lg:w-48">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Brand</label>
                        <select
                            value={activeCompany}
                            onChange={(e) => setActiveCompany(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] transition-all cursor-pointer"
                        >
                            <option value="all">All Brands</option>
                            {companies.filter(c => c !== 'all').map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort Order */}
                    <div className="w-full lg:w-48">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Sort by Stock</label>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] transition-all cursor-pointer"
                        >
                            <option value="default">Default</option>
                            <option value="qty-asc">Low → High</option>
                            <option value="qty-desc">High → Low</option>
                        </select>
                    </div>

                    {/* Low Stock Toggle */}
                    <div className="w-full lg:w-auto">
                        <button
                            onClick={() => setLowStockOnly(!lowStockOnly)}
                            className={`w-full lg:w-auto px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${lowStockOnly
                                ? 'bg-red-50 border-red-200 text-red-600 shadow-sm'
                                : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-[#008080]/30 hover:text-[#008080]'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${lowStockOnly ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
                            {lowStockOnly ? 'Showing Low Stock' : 'Filter Low Stock'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Product Table Card */}
            <div className="bg-white rounded-3xl border border-gray-300 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#001f3f] to-[#008080]"></div>
                {listLoading ? (
                    <Loading message="Sycing Product Database..." />
                ) : error ? (
                    <div className="p-20 text-center text-red-500 text-xs font-bold">System Error: {error}</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="p-20 text-center text-gray-400 border-2 border-dashed border-gray-50 m-8 rounded-3xl text-[10px] font-bold">
                        {searchTerm ? `No matching records for "${searchTerm}"` : "Database is currently empty"}
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#ffffff] border-b border-gray-100 sticky top-0 z-10">
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Image</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Information</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Specifications / Details</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing & Stock</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredProducts.map((product) => {
                                    let attrs = {};
                                    try {
                                        attrs = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : (product.attributes || {});
                                    } catch (e) { }

                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="w-14 h-14 rounded-[10px] bg-white overflow-hidden border border-gray-100 shadow-sm group-hover:border-[#008080] transition-all flex-shrink-0">
                                                    {product.image_path ? (
                                                        <img
                                                            src={`http://localhost:3000${product.image_path}`}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            {product.category === 'mobile_new' ? <DevicePhoneMobileIcon className="w-6 h-6 text-[#001f3f]" /> :
                                                                product.category === 'mobile_used' ? <ArrowPathRoundedSquareIcon className="w-6 h-6 text-[#008080]" /> :
                                                                    product.category === 'accessories' ? <ShoppingBagIcon className="w-6 h-6 text-orange-500" /> :
                                                                        <WrenchScrewdriverIcon className="w-6 h-6 text-purple-600" />}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#001f3f] text-sm tracking-tight">
                                                        {product.name}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-black text-[#001f3f] bg-[#001f3f]/5 px-2 py-0.5 rounded border border-[#001f3f]/10 uppercase tracking-widest">{product.company}</span>
                                                        {!product.category?.startsWith('mobile') && (
                                                            <span className="text-[10px] font-bold text-gray-400 italic">{product.model || 'Universal'}</span>
                                                        )}
                                                    </div>
                                                    {product.category && (
                                                        <span className="text-[9px] font-black text-[#008080] uppercase tracking-widest mt-1">
                                                            {product.category.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1">
                                                    {/* Category Specific Data */}
                                                    {(product.category === 'mobile_new' || product.category === 'mobile_used') && (
                                                        <>
                                                            {attrs.imei1 && <div className="text-[10px] font-bold text-[#001f3f]">IMEI: <span className="text-gray-500 font-medium">{attrs.imei1}</span></div>}
                                                            <div className="flex gap-2 items-center">
                                                                {attrs.storage && <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">{attrs.storage}</span>}
                                                                {attrs.color && <span className="text-[9px] font-black bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded uppercase">{attrs.color}</span>}
                                                                {attrs.condition && <span className="text-[9px] font-black bg-green-50 text-green-600 px-1.5 py-0.5 rounded uppercase">{attrs.condition}</span>}
                                                            </div>
                                                            {product.qty === 0 && (
                                                                <div className="mt-2 text-[9px] font-black text-red-500 bg-red-50 border border-red-100 px-2 py-1 rounded w-fit animate-pulse uppercase tracking-widest">
                                                                    IMEI Empty - Restock Required
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    {product.category === 'accessories' && (
                                                        <>
                                                            {attrs.accessoryType && <div className="text-[10px] font-bold text-[#001f3f]">Type: <span className="text-gray-500 font-medium">{attrs.accessoryType}</span></div>}
                                                            {attrs.compatibleModels && <div className="text-[10px] font-bold text-[#001f3f]">For: <span className="text-gray-500 font-medium">{attrs.compatibleModels}</span></div>}
                                                        </>
                                                    )}
                                                    {product.category === 'repair' && (
                                                        <>
                                                            {attrs.issue && <div className="text-[10px] font-bold text-purple-600 italic">"{attrs.issue}"</div>}
                                                            {attrs.customerName && <div className="text-[10px] font-bold text-[#001f3f]">Client: <span className="text-gray-500 font-medium">{attrs.customerName}</span></div>}
                                                        </>
                                                    )}
                                                    {!product.category && (
                                                        <span className="text-[10px] font-medium text-gray-400 italic">No specific details</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#001f3f] text-sm">Rs {product.price?.toLocaleString()}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${product.qty <= (product.low_qty || 2) ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-[#008080] border border-green-100'}`}>
                                                            {product.qty} IN STOCK
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => { setEditingId(product.id); setIsEditModalOpen(true) }}
                                                        className="p-2 text-[#001f3f] bg-white border border-gray-200 rounded-lg hover:bg-[#f4f4f4] transition-all active:scale-95 shadow-sm"
                                                        title="Refine Details"
                                                    >
                                                        <PencilSquareIcon className="h-4 w-4" />
                                                    </button>
                                                    {user?.role === 'admin' && (
                                                        <button
                                                            onClick={() => confirmDelete(product.id, product.name)}
                                                            className="p-2 text-red-400 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 shadow-sm"
                                                            title="Remove Entry"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal is kept outside the table loading check to prevent unmounting loops */}
            {isEditModalOpen && EditingID && (
                <EditProductModal closeModal={closeModal} id={EditingID} />
            )}

            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleActualDelete}
                title="Confirm Deletion"
                message={`Are you absolutely sure you want to delete "${productTitleToDelete}"? This action cannot be undone.`}
                confirmText="Delete Product"
                confirmButtonClass="bg-red-600 hover:bg-red-700"
                isLoading={actionLoading} // Pass deleteLoading state
            />
        </div>
    );
};

export default ManageProducts;
