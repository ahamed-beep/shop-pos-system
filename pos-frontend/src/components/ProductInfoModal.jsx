
const ProductInfoModal = ({ product, onClose }) => {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
        {/* Left Side: Image */}
        <div className="md:w-1/2 relative bg-gray-50 ">
          <img
            src={`http://localhost:3000${product.image_path}`}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {product.discount > 0 && (
            <span className="absolute top-6 left-6 bg-[#008080] text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-lg border border-[#001f3f]/10">
              {product.discount}% OFF
            </span>
          )}
        </div>

        {/* Right Side: Details */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-gray-400">{product.company}{!product.category?.startsWith('mobile') && ` • ${product.model}`}</span>
            </div>
            <h2 className="text-3xl font-black text-[#001f3f] tracking-tight leading-tight uppercase">{product.name}</h2>
          </div>

          <div className="space-y-6 mb-8">

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#ffffff] p-4 rounded-2xl border border-gray-100 shadow-inner">
                <p className="text-xs font-bold text-[#001f3f] mb-1">Available Stock</p>
                <p className="text-xl font-black text-[#001f3f]">{product.qty > 0 ? product.qty : <span className="text-red-500">Out of Stock</span>}</p>
              </div>
              {!product.category?.startsWith('mobile') && (
                <div className="bg-[#ffffff] p-4 rounded-2xl border border-gray-100 shadow-inner">
                  <p className="text-xs font-bold text-[#001f3f] mb-1">Model</p>
                  <p className="text-xl font-black text-[#001f3f] truncate">{product.model || product.sku || "N/A"}</p>
                </div>
              )}
            </div>

            {/* Category Specific Data */}
            {product.category !== 'load' && (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-[#001f3f] mb-3 uppercase tracking-widest border-b border-gray-200 pb-2">Technical Specifications</p>
                <div className="grid grid-cols-1 gap-y-3 gap-x-4">
                  {(() => {
                    let attrs = {};
                    try { attrs = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : (product.attributes || {}); } catch (e) { }

                    if (product.category === 'mobile_new' || product.category === 'mobile_used') {
                      return (
                        <>
                          <div><span className="text-[10px] text-gray-500 font-bold block w-full">IMEI 1</span><span className="text-sm font-black text-[#001f3f]">{attrs.imei1 || 'N/A'}</span></div>
                          {attrs.imei1 && <div><span className="text-[10px] text-gray-500 font-bold block w-full">IMEI 1</span><span className="text-sm font-black text-[#001f3f]">{attrs.imei1 || 'N/A'}</span></div>}
                          {attrs.imei2 && <div><span className="text-[10px] text-gray-500 font-bold block">IMEI 2</span><span className="text-sm font-black text-[#001f3f]">{attrs.imei2}</span></div>}

                          {attrs.storage && <div><span className="text-[10px] text-gray-500 font-bold block">Storage/RAM</span><span className="text-sm font-black text-[#001f3f]">{attrs.storage}</span></div>}
                          {attrs.color && <div><span className="text-[10px] text-gray-500 font-bold block">Color</span><span className="text-sm font-black text-[#001f3f]">{attrs.color}</span></div>}
                          {attrs.condition && <div><span className="text-[10px] text-gray-500 font-bold block">Condition</span><span className="text-sm font-black text-[#001f3f]">{attrs.condition}</span></div>}
                          {attrs.batteryHealth && <div><span className="text-[10px] text-gray-500 font-bold block">Battery Health</span><span className="text-sm font-black text-[#001f3f]">{attrs.batteryHealth}%</span></div>}
                          {attrs.warranty && <div><span className="text-[10px] text-gray-500 font-bold block">Warranty</span><span className="text-sm font-black text-[#001f3f]">{attrs.warranty}</span></div>}
                          {attrs.includedAccessories && <div className="col-span-2"><span className="text-[10px] text-gray-500 font-bold block">Accessories</span><span className="text-sm font-black text-[#001f3f]">{attrs.includedAccessories}</span></div>}
                        </>
                      );
                    } else if (product.category === 'accessories') {
                      return (
                        <>
                          <div><span className="text-[10px] text-gray-500 font-bold block">Type</span><span className="text-sm font-black text-[#001f3f]">{attrs.accessoryType || 'N/A'}</span></div>
                          <div><span className="text-[10px] text-gray-500 font-bold block">Color</span><span className="text-sm font-black text-[#001f3f]">{attrs.color || 'N/A'}</span></div>
                          <div className="col-span-2"><span className="text-[10px] text-gray-500 font-bold block">Compatibility</span><span className="text-sm font-black text-[#001f3f]">{attrs.compatibleModels || 'N/A'}</span></div>
                        </>
                      );
                    } else if (product.category === 'repair') {
                      return (
                        <>
                          <div className="col-span-2"><span className="text-[10px] text-purple-600 font-bold block">Issue Reported</span><span className="text-sm font-black text-[#001f3f]">{attrs.issue || 'N/A'}</span></div>
                          <div><span className="text-[10px] text-gray-500 font-bold block">Phone</span><span className="text-sm font-black text-[#001f3f]">{attrs.customerPhone || 'N/A'}</span></div>
                          <div><span className="text-[10px] text-gray-500 font-bold block">Customer</span><span className="text-sm font-black text-[#001f3f]">{attrs.customerName || 'N/A'}</span></div>

                          <div><span className="text-[10px] text-gray-500 font-bold block">Expected Delivery</span><span className="text-sm font-black text-[#001f3f]">{attrs.deliveryDate ? new Date(attrs.deliveryDate).toLocaleDateString() : 'N/A'}</span></div>
                          <div><span className="text-[10px] text-gray-500 font-bold block">Advance Paid</span><span className="text-sm font-black text-green-600">Rs {attrs.advancePayment || '0'}</span></div>
                        </>
                      );
                    } else {
                      return <div className="col-span-2 text-xs text-gray-400 italic font-medium">No specialized specifications available for this category.</div>
                    }
                  })()}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-[#001f3f] mb-1">Retail Price</p>
              <p className="text-4xl font-black text-[#001f3f] tracking-tighter"><span className="text-xl align-top mr-1 opacity-50">Rs</span>{product.price.toFixed(0)}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-[#001f3f] text-white rounded-xl font-bold text-md  transition-all border border-transparent hover:border-gray-300"
          >
            Dismiss Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductInfoModal;
