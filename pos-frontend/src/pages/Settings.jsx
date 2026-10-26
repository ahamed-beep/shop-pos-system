import React, { useState, useEffect } from "react";
import api from "../api";
import toast from "react-hot-toast";
import { Download, Upload, RefreshCw, Save, Clock, ShieldCheck, Settings2, Percent, PlusCircle, Eye, EyeOff, UserMinus, UserCheck, UserX, PackageIcon, Printer, FileText, QrCode, Store, Users, Table, Pencil, Lock, Mail, Trash2, AlertTriangle } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { updateShortcut, setAllShortcuts } from "../Redux/features/shortcuts.jsx";
import { toastConfirmDanger, toastConfirmWarning } from "../utils/toastConfirm.jsx";
import { branding } from "../config/branding";
import SettingsSection from "../components/SettingsSection";
import PrinterSetup from "../components/PrinterSetup";


const Settings = () => {
    const dispatch = useDispatch();
    const { mappings } = useSelector((state) => state.shortcuts);
    const [recordingKey, setRecordingKey] = useState(null);
    const [lastBackup, setLastBackup] = useState(null);
    const [loading, setLoading] = useState(false);
    const user = useSelector((state) => state.auth.user);
    const [profileData, setProfileData] = useState({ email: user?.email || "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetPassword, setResetPassword] = useState("");
    const [pinData, setPinData] = useState({ currentPin: "", newPin: "", confirmNewPin: "" });
    const [showCurrentPin, setShowCurrentPin] = useState(false);
    const [showNewPin, setShowNewPin] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const [statusRes, configRes] = await Promise.all([
                api.get("/backup/status"),
                api.get("/config")
            ]);
            setLastBackup(statusRes.data.lastDate);
        } catch {
            console.error("Failed to fetch initial data");
        }
    };

    // User management simplified

    useEffect(() => {
        if (!recordingKey) return;

        const handleCapture = (e) => {
            e.preventDefault();
            e.stopPropagation();

            let combo = "";
            if (e.ctrlKey) combo += "Ctrl+";
            if (e.shiftKey) combo += "Shift+";
            if (e.altKey) combo += "Alt+";

            if (!['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
                combo += e.key.toUpperCase();
                dispatch(updateShortcut({ key: recordingKey, mapping: combo }));
                setRecordingKey(null);
                toast.success(`Shortcut for ${recordingKey} updated to ${combo}`);
            }
        };

        window.addEventListener('keydown', handleCapture, true);
        return () => window.removeEventListener('keydown', handleCapture, true);
    }, [recordingKey, dispatch]);

    // Removed auto-fetch of users


    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (!profileData.password || profileData.password.trim() === "") {
            return toast.error("Password is required to save changes");
        }
        if (profileData.password.length < 6) {
            return toast.error("New password must be at least 6 characters long");
        }
        try {
            setLoading(true);
            await api.put(`/users/${user.id}`, {
                email: profileData.email,
                password: profileData.password
            });
            toast.success("Profile updated successfully. Please re-login if you changed your email.");
            setProfileData(prev => ({ ...prev, password: "" }));
        } catch (error) {
            toast.error(error.response?.data?.message || "Update failed");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePin = async (e) => {
        e.preventDefault();
        if (!pinData.currentPin || !pinData.newPin) {
            return toast.error("Current and New PIN are required");
        }
        if (pinData.newPin.length !== 4) {
            return toast.error("New PIN must be exactly 4 digits");
        }
        if (pinData.newPin !== pinData.confirmNewPin) {
            return toast.error("New PINs do not match");
        }
        try {
            setLoading(true);
            await api.put(`/users/${user.id}/reset-pin`, {
                currentPin: pinData.currentPin,
                newPin: pinData.newPin
            });
            toast.success("Security PIN updated successfully");
            setPinData({ currentPin: "", newPin: "", confirmNewPin: "" });
        } catch (error) {
            toast.error(error.response?.data?.message || "PIN Update failed");
        } finally {
            setLoading(false);
        }
    };

    const handleBackup = async () => {
        try {
            setLoading(true);
            const res = await api.get("/backup");
            // Add custom local preferences to the backup payload
            const dataToDownload = { ...res.data, shortcuts: mappings };
            const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("Backup downloaded successfully!");
            fetchStatus();
        } catch {
            toast.error("Backup failed");
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const confirmed = await toastConfirmWarning(`Are you sure you want to RESTORE? This action will merge the backup with your current data.`, {
                    confirmText: "Proceed with Restore"
                });
                if (!confirmed) return;

                setLoading(true);
                await api.post("/restore", { data });

                if (data.shortcuts && typeof data.shortcuts === 'object') {
                    dispatch(setAllShortcuts(data.shortcuts));
                }

                toast.success(`Data restored successfully (Merge Mode)!`);
                fetchStatus();
            } catch {
                toast.error("Restore failed: Invalid file or server error");
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleResetSystem = async (e) => {
        e.preventDefault();
        if (!resetPassword) return toast.error("Admin password is required");

        try {
            setLoading(true);
            await api.post("/backup/reset", { password: resetPassword });
            toast.success("System reset successful. All data cleared.");
            setIsResetModalOpen(false);
            setResetPassword("");
            fetchStatus();
        } catch (error) {
            toast.error(error.response?.data?.message || "Reset failed");
        } finally {
            setLoading(false);
        }
    };

    // Staff management removed for single-admin simplified system

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 select-none">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
                <div className="mb-2">
                    <h1 className="text-3xl font-black text-[#001f3f] uppercase tracking-tight flex items-center gap-3">
                        <Settings2 className="w-8 h-8 text-[#008080]" />
                        Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium italic">Manage system configurations, security, and data backups.</p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-6 py-2 bg-[#f4f4f4] rounded-xl border border-[#008080]/20 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-[#001f3f] animate-pulse" />
                    <span className="text-xs font-bold text-[#001f3f]">System Active</span>
                </div>
            </div>

            {/* Account Settings Section */}
            <SettingsSection
                icon={ShieldCheck}
                title="Account Security"
                subtitle="Update your credentials"
                defaultExpanded={true}
            >
                <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Mail className="w-3 h-3" /> Email Address
                        </h3>
                        <input
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            placeholder="Email Address"
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm font-bold text-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#008080]"
                            required
                        />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Lock className="w-3 h-3" /> Update Password
                        </h3>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={profileData.password}
                                onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                                placeholder="Enter New Password (Required)"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 pr-12 text-sm font-bold text-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#008080]"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001f3f]"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div className="lg:col-span-2 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-[#001f3f] hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-[#001f3f]/20"
                        >
                            <Save className="w-5 h-5" />
                            {loading ? "Updating..." : "Update Profile"}
                        </button>
                    </div>
                </form>
            </SettingsSection>

            {/* PIN Security Section */}
            <SettingsSection
                icon={Lock}
                title="PIN Security"
                subtitle="Manage your 4-digit access PIN"
                defaultExpanded={false}
            >
                <form onSubmit={handleUpdatePin} className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Lock className="w-3 h-3" /> Current PIN
                        </h3>
                        <div className="relative">
                            <input
                                type={showCurrentPin ? "text" : "password"}
                                value={pinData.currentPin}
                                onChange={(e) => setPinData({ ...pinData, currentPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                                placeholder="Enter Current PIN"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 pr-12 text-sm font-bold text-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#008080]"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPin(!showCurrentPin)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001f3f]"
                            >
                                {showCurrentPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Lock className="w-3 h-3" /> New PIN
                        </h3>
                        <div className="relative">
                            <input
                                type={showNewPin ? "text" : "password"}
                                value={pinData.newPin}
                                onChange={(e) => setPinData({ ...pinData, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                                placeholder="Enter 4-Digit PIN"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 pr-12 text-sm font-bold text-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#008080]"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPin(!showNewPin)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001f3f]"
                            >
                                {showNewPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Lock className="w-3 h-3" /> Confirm New PIN
                        </h3>
                        <div className="relative">
                            <input
                                type={showNewPin ? "text" : "password"}
                                value={pinData.confirmNewPin}
                                onChange={(e) => setPinData({ ...pinData, confirmNewPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                                placeholder="Confirm 4-Digit PIN"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 pr-12 text-sm font-bold text-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#008080]"
                                required
                            />
                        </div>
                    </div>
                    <div className="lg:col-span-3 flex justify-end mt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-[#001f3f] hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-[#001f3f]/20"
                        >
                            <Save className="w-5 h-5" />
                            {loading ? "Updating..." : "Update PIN"}
                        </button>
                    </div>
                </form>
            </SettingsSection>

            {/* System Operations */}
            <SettingsSection
                icon={Settings2}
                title="Backup & Data"
                subtitle="Data, Backup & Tax Configuration"
                defaultExpanded={false}
                badge={lastBackup ? `Backup: ${new Date(lastBackup).toLocaleDateString()}` : null}
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-inner flex flex-col">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4 shrink-0">
                            <Download className="w-3 h-3" /> System Backup
                        </h3>
                        <div className="flex-grow flex flex-col gap-4">
                            <div className="px-4 py-3 bg-white rounded-xl border border-gray-200 text-center min-h-[44px] flex items-center justify-center">
                                <p className="text-xs font-black text-[#001f3f]">{lastBackup ? new Date(lastBackup).toLocaleString() : "No backup found"}</p>
                            </div>
                            <button
                                onClick={handleBackup}
                                disabled={loading}
                                className="mt-auto w-full bg-[#001f3f] hover:bg-[#001f3f]/90 text-white py-3 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" /> Create Backup
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-inner flex flex-col">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4 shrink-0">
                            <Upload className="w-3 h-3" /> Data Recovery
                        </h3>
                        <div className="flex-grow flex flex-col gap-4">

                            <label className="mt-auto w-full cursor-pointer bg-zinc-800 hover:bg-black text-white py-3 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2">
                                <Upload className="w-4 h-4" /> Load Archive
                                <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                            </label>
                        </div>
                    </div>

                    <div className="bg-red-50/30 p-6 rounded-3xl border border-red-100 shadow-inner flex flex-col">
                        <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2 mb-4 shrink-0">
                            <Trash2 className="w-3 h-3" /> System Format
                        </h3>
                        <div className="flex-grow flex flex-col">
                            <p className="text-[10px] text-red-500 font-bold mb-4 italic leading-relaxed">Warning: This will permanently erase all products, sales history, and images. User accounts are preserved.</p>
                            <button
                                onClick={() => setIsResetModalOpen(true)}
                                className="mt-auto w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                                <RefreshCw className="w-4 h-4" /> Reset System
                            </button>
                        </div>
                    </div>
                </div>
            </SettingsSection>

            {/* Printer Setup */}
            <SettingsSection
                icon={Printer}
                title="Printer Setup"
                subtitle="Thermal Printer Configuration & Testing"
                defaultExpanded={false}
            >
                <PrinterSetup />
            </SettingsSection>

            {/* Keyboard Shortcuts */}
            <SettingsSection
                icon={Table}
                title="Keyboard Shortcuts"
                subtitle="Lightning Fast Checkout Shortcuts"
                defaultExpanded={false}
            >
                <div className="overflow-hidden border border-gray-100 rounded-3xl">
                    <table className="w-full text-left font-sans text-sm">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs">Command Action</th>
                                <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs">Combination</th>
                                <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs text-right">Settings</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {Object.entries(mappings).map(([action, key]) => (
                                <tr key={action} className="hover:bg-gray-50/30">
                                    <td className="px-6 py-4 font-bold text-gray-700">{action.replace(/_/g, ' ')}</td>
                                    <td className="px-6 py-4">
                                        <kbd className="px-2 py-1 bg-white border-2 border-[#f4f4f4] rounded-lg text-[#001f3f] font-bold text-xs shadow-sm">
                                            {key || 'NOT MAPPED'}
                                        </kbd>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setRecordingKey(action)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${recordingKey === action ? 'bg-[#001f3f] text-white border-[#001f3f] animate-pulse' : 'bg-white border-gray-300 text-[#001f3f] hover:bg-[#001f3f] hover:text-white'}`}>
                                            {recordingKey === action ? 'Awaiting...' : 'Change'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SettingsSection>

            {/* Footer Branding */}
            <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-gray-300 text-center space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#001f3f] to-[#008080]"></div>
                <div className="w-20 h-20 bg-[#f4f4f4] rounded-[2rem] flex items-center justify-center mx-auto border border-[#008080]/20 shadow-inner">
                    <PackageIcon className="w-10 h-10 text-[#001f3f]" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">{branding.appName}</h2>
                    <p className="text-gray-400 text-[10px] font-black tracking-[0.4em] mt-2">Vers. {branding.version} — {branding.appName}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-4 py-8">
                    <div className="bg-gray-50 px-8 py-6 rounded-3xl border border-gray-100 min-w-[240px] shadow-inner">
                        <p className="text-gray-400 text-xs font-bold mb-2">Developed By</p>
                        <h3 className="text-[#001f3f] font-bold text-xl tracking-tight font-sans">{branding.developerName}</h3>
                        <p className="text-[#001f3f] font-bold text-sm mt-1 font-sans">{branding.phoneNumber}</p>
                    </div>
                </div>
                <div className="flex items-center justify-center gap-6">
                    <div className="w-2 h-2 rounded-full bg-[#008080]" />
                    <p className="text-gray-400 text-[10px] font-bold tracking-[0.3em] font-sans">{branding.copyright}</p>
                    <div className="w-2 h-2 rounded-full bg-gray-200" />
                </div>
            </div>

            {/* System Reset Confirmation Modal */}
            {isResetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-red-100 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-2">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Erase All Data?</h2>
                            <p className="text-sm text-gray-500 font-medium">
                                You are about to format the system. All <span className="text-red-600 font-black">products, sales history, and images</span> will be permanently deleted.
                            </p>

                            <form onSubmit={handleResetSystem} className="w-full space-y-4 pt-4">
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Verify Admin Password</label>
                                    <input
                                        type="password"
                                        value={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.value)}
                                        placeholder="Enter administrator password"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                        autoFocus
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsResetModalOpen(false);
                                            setResetPassword("");
                                        }}
                                        className="flex-1 px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? "Wiping..." : "Format Now"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
