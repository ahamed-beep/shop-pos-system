import { useState, useEffect, useRef } from "react";

const ContextMenu = ({ x, y, options, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
      window.addEventListener('contextmenu', handleOutsideClick);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('contextmenu', handleOutsideClick);
    };
  }, [onClose]);


  const [position, setPosition] = useState({ top: y, left: x });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let newLeft = x;
      let newTop = y;

      if (x + rect.width > winW) newLeft = winW - rect.width - 10;
      if (y + rect.height > winH) newTop = winH - rect.height - 10;

      setPosition({ top: newTop, left: newLeft });
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[999] bg-white/60 backdrop-blur-3xl  rounded-2xl py-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5  border-1 border-gray-300"
      style={{ top: position.top, left: position.left }}
      onContextMenu={(e) => e.preventDefault()}
    >

      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/50 pointer-events-none" />

      {options.map((opt, idx) => (
        <button
          key={idx}
          onClick={() => { opt.onClick(); onClose(); }}
          className="w-[92%] mx-auto text-left px-3 py-2.5 text-xs font-bold text-[#001f3f]/90 hover:bg-[#001f3f]/5 flex items-center justify-between gap-3 transition-all rounded-xl active:scale-95 group relative mb-0.5 last:mb-0"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${opt.iconColor || 'bg-[#001f3f]/5 group-hover:bg-[#008080]/10 text-gray-500 group-hover:text-[#008080]'}`}>
              {opt.icon && <opt.icon className="w-4 h-4" />}
            </div>
            <span className="font-bold">{opt.label}</span>
          </div>
          {opt.shortcut && <span className="text-[10px] opacity-40 font-black uppercase tracking-tighter bg-gray-100 px-1.5 py-0.5 rounded-md group-hover:bg-white transition-colors">{opt.shortcut}</span>}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
