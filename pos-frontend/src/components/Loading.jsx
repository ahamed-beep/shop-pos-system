import React from 'react';

/**
 * Global Loading Component
 * @param {string} message - Optional message to display
 * @param {boolean} full - If true, displays as a full-screen overlay (like login page)
 */
const Loading = ({ message = "Loading System...", full = false }) => {
    // Full Screen Mode (Matching Login style)
    if (full) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#f4f4f4] to-white flex items-center justify-center z-[100] fixed inset-0">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-4 border-[#001f3f] border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-[#001f3f] font-black text-2xl animate-pulse tracking-tighter uppercase">
                        {message}
                    </div>
                </div>
            </div>
        );
    }

    // Inline Mode (For parts of pages)
    return (
        <div className="flex flex-col items-center justify-center p-20 w-full animate-in fade-in duration-700">
            <div className="w-10 h-10 border-4 border-[#008080]/30 border-t-[#001f3f] rounded-full animate-spin mb-4 shadow-sm"></div>
            <div className="text-[#001f3f] font-black text-xs uppercase tracking-[0.3em] animate-pulse">
                {message}
            </div>
        </div>
    );
};

export default Loading;
