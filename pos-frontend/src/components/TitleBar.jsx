import React, { useState, useEffect } from 'react';
import { XMarkIcon, MinusIcon, Square2StackIcon, StopIcon } from '@heroicons/react/24/outline';
import { branding } from '../config/branding';

const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);
    const isElectron = window.electronAPI !== undefined;

    useEffect(() => {
        if (!isElectron) return;

        const checkMaximized = async () => {
            const maximized = await window.electronAPI.isMaximized();
            setIsMaximized(maximized);
        };

        checkMaximized();
        window.addEventListener('resize', checkMaximized);
        return () => window.removeEventListener('resize', checkMaximized);
    }, [isElectron]);

    if (!isElectron) return null;

    const handleMinimize = () => window.electronAPI.minimize();
    const handleMaximize = () => {
        window.electronAPI.maximize();
        // State will update via the 'resize' listener
    };
    const handleClose = () => window.electronAPI.close();

    return (
        <div className="h-8 bg-[#001f3f] flex items-center justify-between select-none z-[1000] border-b border-white/5" style={{ WebkitAppRegion: 'drag' }}>
            {/* Logo and App Title */}
            <div className="flex items-center gap-2 px-3 h-full">
                <div className="w-4 h-4 bg-[#008080] rounded flex items-center justify-center">
                    <span className="text-[10px] font-black text-[#001f3f]">M</span>
                </div>
                {/* <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest">{branding.shortName}</span> */}
                <span className="text-sm font-bold text-white  ">Hassan Mobile and Repairing Lab</span>
            </div>

            {/* Draggable Spacer */}
            <div className="flex-1 h-full"></div>

            {/* Window Controls */}
            <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' }}>
                <button
                    onClick={handleMinimize}
                    className="h-full w-10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                    title="Minimize"
                >
                    <MinusIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full w-10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                    title={isMaximized ? "Restore" : "Maximize"}
                >
                    {isMaximized ? <Square2StackIcon className="w-3.5 h-3.5" /> : <StopIcon className="w-3.5 h-3.5" />}
                </button>
                <button
                    onClick={handleClose}
                    className="h-full w-12 flex items-center justify-center text-white/60 hover:bg-red-500 hover:text-white transition-colors"
                    title="Close"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
