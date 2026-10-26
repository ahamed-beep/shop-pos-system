import React, { useState, useEffect } from 'react';
import {
    BugAntIcon,
    InformationCircleIcon,
    ArrowRightOnRectangleIcon,
    ShieldCheckIcon,
    CpuChipIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { branding } from '../config/branding';

const ToolBar = () => {
    const [isVisible, setIsVisible] = useState(false);
    const isElectron = window.electronAPI !== undefined;

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                setIsVisible(prev => !prev);
            }
            if (e.key === 'Escape' && isVisible) {
                setIsVisible(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible]);

    if (!isElectron) return null;
    if (!isVisible) return null;

    const items = [
        {
            icon: BugAntIcon,
            label: 'DevTools',
            action: () => window.electronAPI.toggleDevTools(),
            color: 'hover:text-amber-400'
        },
        {
            icon: ArrowPathIcon,
            label: 'Reload',
            action: () => window.location.reload(),
            color: 'hover:text-blue-400'
        },
        {
            icon: ArrowRightOnRectangleIcon,
            label: 'Quit',
            action: () => window.electronAPI.close(),
            color: 'hover:text-red-400'
        }
    ];

    return (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1001] animate-in fade-in slide-in-from-top duration-200">
            <div className="bg-[#001f3f] border border-white/10 rounded-2xl shadow-2xl p-2 flex items-center gap-1 backdrop-blur-md bg-opacity-95">
                {items.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            item.action();
                            setIsVisible(false);
                        }}
                        className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${item.color} text-white/60 hover:bg-white/5 active:scale-95`}
                    >
                        <item.icon className="w-5 h-5 mb-1" />
                        <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
                    </button>
                ))}
            </div>
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-[#001f3f] rotate-45 border-t border-l border-white/10"></div>
        </div>
    );
};

export default ToolBar;
