import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { resetPassword } from '../Redux/features/auth';
import { Link, useNavigate } from 'react-router-dom';
import {
    LockClosedIcon,
    EyeIcon,
    EyeSlashIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { branding } from '../config/branding';

const ResetPassword = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [formdata, setformdata] = useState({ Token: '', newpassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const ResetHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await dispatch(resetPassword(formdata));
            if (resetPassword.fulfilled.match(response)) {
                toast.success(response?.payload?.message || "Password reset successfully!");
                setTimeout(() => {
                    navigate('/');
                }, 1500);
            } else {
                toast.error(response?.payload || "Failed to reset password");
            }
        } catch (error) {
            toast.error("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f4f4f4] to-white flex items-center justify-center p-6 select-none">
            <div className="w-full max-w-md">
                {/* Logo & Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 bg-[#001f3f] rounded-xl flex items-center justify-center shadow-lg shadow-[#001f3f]/20">
                            <span className="text-3xl font-black text-white">E</span>
                        </div>
                        <div className="text-left">
                            <div className="text-3xl font-black text-[#001f3f] leading-none tracking-tight">{branding.shortName}</div>
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">{branding.appName}</div>
                        </div>
                    </div>
                    <p className="text-gray-500 font-medium italic">v{branding.version} • Developed by {branding.developerName}</p>
                </div>

                {/* Reset Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#001f3f] to-[#008080]"></div>

                    <h2 className="text-2xl font-black text-[#001f3f] mb-2 uppercase tracking-tight">Reset Password</h2>
                    <p className="text-gray-400 text-sm font-semibold mb-8 italic">Enter the OTP sent to your email and your new password</p>

                    <form onSubmit={ResetHandler} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-[#001f3f] mb-2 ml-1">
                                6-Digit OTP
                            </label>
                            <div className="relative">
                                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={formdata.Token}
                                    onChange={(e) => setformdata({ ...formdata, Token: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#008080] focus:border-[#008080] hover:border-[#008080] outline-none text-sm font-bold transition-all tracking-[0.5em]"
                                    placeholder="••••••"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#001f3f] mb-2 ml-1">
                                New Password
                            </label>
                            <div className="relative">
                                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formdata.newpassword}
                                    onChange={(e) => setformdata({ ...formdata, newpassword: e.target.value })}
                                    className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#008080] focus:border-[#008080] hover:border-[#008080] outline-none text-sm font-bold transition-all"
                                    placeholder="Enter new password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001f3f]"
                                >
                                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#001f3f] hover:bg-[#001f3f]/90 text-white py-4 rounded-xl font-bold text-sm transition-all shadow-xl shadow-[#001f3f]/20 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? "Resetting..." : "Update password"}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-50 text-center">
                        <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-[#001f3f] transition-colors">
                            <ArrowLeftIcon className="w-3 h-3" strokeWidth={3} />
                            Back to sign in
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-12 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <p>{branding.copyright}</p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
