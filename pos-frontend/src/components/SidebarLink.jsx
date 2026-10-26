import { Link } from "react-router";
import {
  LayoutDashboard,
  Timer,
  PlusSquare,
  Package,
  BarChart3,
  History,
  Users,
  FileDown,
  Settings
} from "lucide-react";

const getIconComponent = (type) => {
  switch (type) {
    case 'dashboard': return LayoutDashboard;
    case 'held-carts': return Timer;
    case 'upload-product': return PlusSquare;
    case 'manage-products': return Package;
    case 'orders': return History;
    case 'udhaar': return Users;
    case 'sales': return BarChart3;
    case 'import': return FileDown;
    case 'settings': return Settings;
    default: return LayoutDashboard;
  }
};

const SidebarLink = ({ link, active, notificationCount }) => {
  const Icon = link.icon || getIconComponent(link.type);

  return (
    <Link
      to={link.href || '#'}
      className={`
        relative flex flex-col items-center gap-1.5 px-2 py-3 text-[9px] font-black
        transition-all duration-300 rounded-xl uppercase  text-center
        ${active
          ? 'bg-white text-[#001f3f] shadow-lg scale-105'
          : 'text-[#f4f4f4] hover:bg-white/5 hover:text-white'}
      `}
    >
      <Icon className={`w-7 h-7 flex-shrink-0 transition-transform ${active ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`} />

      <span className="font-black leading-tight">
        {link.text}
      </span>

      {notificationCount > 0 && (
        <span
          className="absolute right-1 top-1 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-red-500 text-white flex shadow-lg"
        >
          {notificationCount}
        </span>
      )}
    </Link>
  );
};

export default SidebarLink;
