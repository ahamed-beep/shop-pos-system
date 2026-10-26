import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { LockClosedIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import api from '../api';

const PinGuard = ({ children }) => {
    const [isVerified, setIsVerified] = useState(false);
    const [pin, setPin] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
    const location = useLocation();
    
    // We get the current user ID to verify their PIN
    const userId = useSelector((state) => state.auth.user?.id) || sessionStorage.getItem('id');

    // Reset verification when routing changes (e.g. from Manage to Upload)
    useEffect(() => {
        setIsVerified(false);
        setPin(['', '', '', '']);
    }, [location.pathname]);

    // Auto focus first input
    useEffect(() => {
        if (!isVerified && inputRefs[0].current) {
            inputRefs[0].current.focus();
        }
    }, [isVerified]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Move to next input
        if (value !== '' && index < 3) {
            inputRefs[index + 1].current.focus();
        }
        
        // Auto submit when 4 digits are entered
        if (index === 3 && value !== '') {
            verifyPin(newPin.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && pin[index] === '' && index > 0) {
            inputRefs[index - 1].current.focus();
        }
    };

    const verifyPin = async (fullPin) => {
        if (!userId) {
            toast.error('User session not found. Please log in again.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post(`/users/${userId}/verify-pin`, { pin: fullPin });
            if (res.data.success) {
                toast.success('Access Granted');
                setIsVerified(true);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid PIN');
            setPin(['', '', '', '']); // Clear PIN on failure
            inputRefs[0].current.focus(); // Focus back to first input
        } finally {
            setLoading(false);
        }
    };

    if (isVerified) {
        return children;
    }

    return (
        <div className="flex-1 h-full flex flex-col items-center justify-center bg-gray-50/50 backdrop-blur-sm z-50 p-4 select-none">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-300 max-w-md w-full text-center relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#001f3f] to-[#008080]"></div>
                
                <div className="w-20 h-20 bg-[#f4f4f4] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-[#008080]/10">
                    <LockClosedIcon className="w-10 h-10 text-[#001f3f]" />
                </div>
                
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-2">Restricted Access</h2>
                <p className="text-gray-500 text-sm font-medium mb-8">
                    Please enter your 4-digit security PIN to access this area.
                </p>

                <div className="flex justify-center gap-4 mb-4">
                    {pin.map((digit, index) => (
                        <input
                            key={index}
                            ref={inputRefs[index]}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            disabled={loading}
                            className="w-14 h-16 text-center text-2xl font-black bg-gray-50 border-2 border-gray-300 rounded-2xl focus:border-[#008080] focus:ring-0 focus:outline-none transition-all focus:scale-105 shadow-inner"
                        />
                    ))}
                </div>

                {loading && (
                    <p className="text-[#008080] text-sm font-bold animate-pulse mt-4">Verifying...</p>
                )}

                <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 py-3 rounded-xl border border-gray-300">
                    <ShieldExclamationIcon className="w-4 h-4" />
                    <span>Protected Area</span>
                </div>
            </motion.div>
        </div>
    );
};

export default PinGuard;
