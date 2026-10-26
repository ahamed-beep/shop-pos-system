import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    EyeIcon,
    EyeSlashIcon,
    CheckCircleIcon,
    SparklesIcon,
    EnvelopeIcon,
    LockClosedIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../api';
import { branding } from '../config/branding';

const FirstTimeSetup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        pin: '',
        confirmPin: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (!/^\d{4}$/.test(formData.pin)) {
            toast.error('PIN must be exactly 4 digits');
            return;
        }

        if (formData.pin !== formData.confirmPin) {
            toast.error('PINs do not match');
            return;
        }

        setLoading(true);

        try {
            // console.log('[FirstTimeSetup] Submitting form...');
            const response = await api.post('/setup/first-user', {
                email: formData.email,
                password: formData.password,
                pin: formData.pin
            });

            // console.log('[FirstTimeSetup] Response received:', response.data);

            if (response.data.success) {
                // console.log('[FirstTimeSetup] Success! Clearing storage...');

                // Clear sessionStorage
                sessionStorage.clear();


                // Set new auth data
                sessionStorage.setItem('token', response.data.token);
                sessionStorage.setItem('user', JSON.stringify(response.data.user));
                sessionStorage.setItem('role', response.data.user.role);
                sessionStorage.setItem('id', response.data.user.id);

                // console.log('[FirstTimeSetup] Storage updated. Navigating...');
                toast.success('Welcome! Admin account created');

                // Give toast time to show, then navigate
                setTimeout(() => {
                    // console.log('[FirstTimeSetup] Attempting navigation...');
                    try {
                        navigate('/Dashboard/', { replace: true });
                    } catch (navError) {
                        console.error('[FirstTimeSetup] navigate() failed:', navError);
                        // Fallback to window.location if navigate fails
                        window.location.hash = '#/Dashboard/';
                    }
                }, 800);
            }
        } catch (error) {
            console.error('[FirstTimeSetup] Error:', error);
            toast.error(error.response?.data?.error || 'Failed to create account');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f4f4f4] to-white flex items-center justify-center p-4 select-none">
            <div className="w-full max-w-6xl">
                {/* Logo & Branding Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 bg-[#001f3f] rounded-xl flex items-center justify-center shadow-lg shadow-[#001f3f]/20">
                            <span className="text-3xl font-black text-white">M</span>
                        </div>
                        <div className="text-left">
                            <div className="text-3xl font-black text-[#001f3f] leading-none tracking-tight">{branding.shortName}</div>
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">{branding.appName}</div>
                        </div>
                    </div>
                </div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left Side - Welcome Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#001f3f] rounded-3xl p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-8">
                                <SparklesIcon className="w-10 h-10 text-[#008080]" />
                                <h1 className="text-4xl lg:text-5xl font-black tracking-tight uppercase">Welcome!</h1>
                            </div>

                            <h2 className="text-xl lg:text-2xl font-bold mb-6 text-[#008080] uppercase">
                                Setup Your Account
                            </h2>

                            <p className="text-gray-300 text-lg mb-12 font-medium italic">
                                Create your admin account to start using the Mobile POS System.
                            </p>

                            {/* Feature List */}
                            <div className="space-y-5">
                                {[
                                    'Full Control',
                                    'Inventory & Analytics',
                                    'Bill & Receipt',
                                    'Backup & Restore'
                                ].map((feature, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-4"
                                    >
                                        <CheckCircleIcon className="w-6 h-6 text-[#008080] flex-shrink-0" />
                                        <span className="text-sm font-bold text-gray-100">{feature}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Side - Form Section */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-3xl p-8 lg:p-12 shadow-2xl border border-gray-100 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#001f3f] to-[#008080]"></div>

                        <h2 className="text-2xl font-black text-[#001f3f] mb-2 uppercase tracking-tight">Create Admin</h2>
                        <p className="text-gray-400 text-sm font-semibold mb-8 italic">Enter your personal account details</p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email */}
                            <div>
                                <label className="block text-xs font-bold text-[#001f3f] mb-2 ml-1">
                                    Admin Email Address
                                </label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#008080] focus:border-[#008080] hover:border-[#008080] outline-none text-sm font-bold transition-all"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-bold text-[#001f3f] mb-2 ml-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#008080] focus:border-[#008080] hover:border-[#008080] outline-none text-sm font-bold transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001f3f] transition-colors"
                                    >
                                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs font-bold text-[#001f3f] mb-2 ml-1">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#008080] focus:border-[#008080] hover:border-[#008080] outline-none text-sm font-bold transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001f3f] transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* 4-Digit PIN */}
                            <div>
                                <label className="block text-xs font-bold text-[#001f3f] mb-2 ml-1">
                                    Secure 4-Digit PIN
                                </label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPin ? 'text' : 'password'}
                                        name="pin"
                                        value={formData.pin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                            handleChange({ target: { name: 'pin', value: val } });
                                        }}
                                        required
                                        className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#008080] focus:border-[#008080] hover:border-[#008080] outline-none text-sm font-bold transition-all"
                                        placeholder="1111"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPin(!showPin)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001f3f] transition-colors"
                                    >
                                        {showPin ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 ml-1 font-medium">Used for editing & managing products</p>
                            </div>

                            {/* Confirm PIN */}
                            <div>
                                <label className="block text-xs font-bold text-[#001f3f] mb-2 ml-1">
                                    Confirm PIN
                                </label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showConfirmPin ? 'text' : 'password'}
                                        name="confirmPin"
                                        value={formData.confirmPin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                            handleChange({ target: { name: 'confirmPin', value: val } });
                                        }}
                                        required
                                        className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#008080] focus:border-[#008080] hover:border-[#008080] outline-none text-sm font-bold transition-all"
                                        placeholder="1111"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001f3f] transition-colors"
                                    >
                                        {showConfirmPin ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#001f3f] hover:bg-[#001f3f]/90 text-white py-4 rounded-xl font-bold text-sm transition-all shadow-xl shadow-[#001f3f]/20 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Initializing...' : 'Create account & continue'}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {branding.copyright}
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default FirstTimeSetup;
