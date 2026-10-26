import { useLocation, useNavigate } from 'react-router';
import SidebarLink from './SidebarLink';
import {
  Squares2X2Icon, BriefcaseIcon, CubeIcon, LightBulbIcon, RssIcon,
  RectangleStackIcon, SunIcon, ChevronUpDownIcon,
  ChevronDoubleLeftIcon, ArrowRightEndOnRectangleIcon, ClockIcon, UserGroupIcon,
  CheckBadgeIcon, ClipboardDocumentListIcon, PresentationChartLineIcon, CloudArrowUpIcon,
  ShoppingBagIcon, ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { GetOneUser, Logout } from '@/Redux/features/auth';
import { branding } from '../config/branding';

const mainLinks = [
  { href: '/Dashboard/', text: 'Dashboard', type: 'dashboard' },
  { href: '/Dashboard/product-upload', text: 'Upload Product', type: 'upload-product' },
  { href: '/Dashboard/product-manage', text: 'Manage Products', type: 'manage-products' },
  { href: '/Dashboard/sales-report', text: 'Sales Report', type: 'sales' },
  { href: '/Dashboard/billing-history', text: 'Billing History', type: 'orders' },
{ href: '/Dashboard/udhaar-manage', text: 'Udhaar Control', type: 'udhaar' },
  { href: '/Dashboard/settings', text: 'Settings', type: 'settings' },
];

const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const id = sessionStorage.getItem('id') || localStorage.getItem('id');
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const products = useSelector((state) => state.product?.products || []);

  const lowStockCount = products.filter(p => p.qty <= (p.low_qty || 2)).length;

  useEffect(() => {
    if (id) {
      dispatch(GetOneUser(id));
    }
  }, [id, dispatch]);

  const handleLogout = () => {
    dispatch(Logout());
    navigate('/');
  };

  const getInitials = (name) => {
    if (!name) return 'M';
    const words = name.split(' ');
    if (words.length >= 2) {
      return words[0][0].toUpperCase() + words[1][0].toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className={`
        bg-[#001f3f] text-white flex flex-col p-2 
        transition-all duration-300 ease-in-out
        fixed inset-y-0 left-0 top-0 z-30 lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:w-[120px] max-h-screen
      `}
    >
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
        <div className="flex flex-col items-center w-full gap-2 overflow-hidden">
          <div className="relative shrink-0">
            <div className="flex items-center justify-center w-12 h-12 bg-white text-[#001f3f] rounded-xl font-black shadow-lg text-2xl mt-2">
              {getInitials(user?.name)}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <p className="font-bold text-white truncate capitalize text-[10px]">{user?.email?.split('@')[0] || 'Loading...'}</p>
            <p className="text-[8px] font-bold text-[#f4f4f4] tracking-widest uppercase opacity-60">{user?.role || 'User'}</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-grow mt-">
        <ul className="space-y-1">
          {mainLinks.map((link) => {
            const isInventory = link.type === 'manage-products';
            return (
              <li key={link.text} className="relative">
                <SidebarLink
                  link={link}
                  active={pathname === link.href}
                />
                {isInventory && lowStockCount > 0 && (
                  <span className="absolute right-2 top-0 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[8px] font-black rounded-full px-1 shadow-lg ring-2 ring-[#001f3f]">
                    {lowStockCount}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="space-y-1 mt-4">
        <button
          onClick={handleLogout}
          className="w-full flex flex-col items-center gap-1 px-2 py-3 text-[9px] font-bold rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-all duration-300"
        >
          <ArrowRightEndOnRectangleIcon className="w-6 h-6 flex-shrink-0" />
          <span className="uppercase tracking-tighter">Logout</span>
        </button>

        
      </div>
    </div>
  );
};

export default Sidebar;
