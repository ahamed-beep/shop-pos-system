import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/**
 * Reusable Settings Section with Accordion
 * Matches the design pattern from Settings
 */
const SettingsSection = ({
    icon: Icon,
    title,
    subtitle,
    children,
    defaultExpanded = false,
    badge = null
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header - Clickable */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#f4f4f4] rounded-2xl flex items-center justify-center border border-[#008080]/20">
                        <Icon className="w-6 h-6 text-[#001f3f]" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-lg font-black text-[#001f3f] uppercase tracking-tight">{title}</h2>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                            {subtitle}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Optional Badge */}
                    {badge && (
                        <div className="px-4 py-2 rounded-xl bg-[#f4f4f4] text-[#001f3f] font-bold text-[10px] uppercase tracking-widest border border-[#008080]/20">
                            {badge}
                        </div>
                    )}

                    {/* Expand Icon */}
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    </motion.div>
                </div>
            </button>

            {/* Expandable Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-8 pb-8 space-y-6 border-t border-gray-100 pt-6">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SettingsSection;
