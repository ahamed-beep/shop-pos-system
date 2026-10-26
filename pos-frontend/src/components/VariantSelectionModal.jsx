import { useState } from "react";
import {
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";


const VariantSelectionModal = ({ pName, products, onClose, onAdd }) => {
  const [selectedRAM, setSelectedRAM] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const rams = [...new Set(products.map(p => {
    try {
      const attrs = typeof p.attributes === 'string' ? JSON.parse(p.attributes) : p.attributes;
      return attrs?.storage || "Standard";
    } catch (e) { return "Standard"; }
  }))];

  const filteredByRAM = products.filter(p => {
    try {
      const attrs = typeof p.attributes === 'string' ? JSON.parse(p.attributes) : p.attributes;
      const ram = attrs?.storage || "Standard";
      return ram === selectedRAM;
    } catch (e) { return false; }
  });

  const colors = [...new Set(filteredByRAM.map(p => {
    try {
      const attrs = typeof p.attributes === 'string' ? JSON.parse(p.attributes) : p.attributes;
      return attrs?.color || "N/A";
    } catch (e) { return "N/A"; }
  }))];

  const finalProduct = filteredByRAM.find(p => {
    try {
      const attrs = typeof p.attributes === 'string' ? JSON.parse(p.attributes) : p.attributes;
      return (attrs?.color || "N/A") === selectedColor;
    } catch (e) { return false; }
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-[#001f3f] uppercase tracking-tight">Select Variant</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <p className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest">{pName}</p>

        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">1. Select RAM/ROM</label>
            <div className="grid grid-cols-2 gap-2">
              {rams.map(ram => (
                <button
                  key={ram}
                  onClick={() => { setSelectedRAM(ram); setSelectedColor(""); }}
                  className={`py-3 rounded-xl text-xs font-black transition-all border ${selectedRAM === ram ? 'bg-[#001f3f] text-white border-[#001f3f] shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-[#008080]'}`}
                >
                  {ram}
                </button>
              ))}
            </div>
          </div>

          {selectedRAM && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">2. Select Color</label>
              <div className="grid grid-cols-2 gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`py-3 rounded-xl text-xs font-black transition-all border ${selectedColor === color ? 'bg-[#008080] text-white border-[#008080] shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-[#008080]'}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-4 bg-gray-50 text-gray-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-200">Cancel</button>
          <button
            disabled={!finalProduct}
            onClick={() => { onAdd(finalProduct); onClose(); }}
            className={`flex-1 py-4 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 ${finalProduct ? 'bg-[#001f3f] text-white' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
          >
            Add to Bill
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VariantSelectionModal;