import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Printer, Search, CheckCircle, XCircle, Loader } from 'lucide-react';

const PrinterSetup = () => {
    const [config, setConfig] = useState({
        printer_type: 'auto',
        printer_name: null,
        printer_interface: null,
        paper_width: 58,
        auto_cut: 1
    });
    const [printers, setPrinters] = useState([]);
    const [detecting, setDetecting] = useState(false);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);

    useEffect(() => {
        fetchPrinterConfig();
    }, []);

    const fetchPrinterConfig = async () => {
        try {
            const res = await api.get('/printer/config');
            if (res.data.config) {
                setConfig(res.data.config);
            }
        } catch (error) {
            console.error('Failed to fetch printer config:', error);
        }
    };

    const handleDetectPrinters = async () => {
        if (!window.electronAPI || !window.electronAPI.detectPrinters) {
            toast.error('Thermal printer detection is only available in desktop app');
            return;
        }

        setDetecting(true);
        setConnectionStatus(null);

        try {
            // console.log('[PrinterSetup] Detecting printers via Electron...');
            const result = await window.electronAPI.detectPrinters();

            // console.log('[PrinterSetup] Detection result:', result);

            if (result.success && result.printers && result.printers.length > 0) {
                setPrinters(result.printers);

                // Auto-select first thermal printer if found
                const thermalPrinter = result.printers.find(p => p.isThermal);
                if (thermalPrinter) {
                    setConfig(prev => ({
                        ...prev,
                        printer_name: thermalPrinter.name,
                        printer_interface: `printer:${thermalPrinter.name}`,
                        printer_type: 'thermal'
                    }));
                    setConnectionStatus('thermal_found');
                    toast.success(`Thermal printer detected: ${thermalPrinter.displayName}`);
                } else {
                    setConnectionStatus('no_thermal');
                    toast('No thermal printer detected. Regular printing will be used.', {
                        icon: 'ℹ️'
                    });
                }
            } else if (result.error) {
                setConnectionStatus('error');
                toast.error(`Detection failed: ${result.error}`);
            } else {
                setConnectionStatus('no_printers');
                toast('No printers found. Regular printing will be used.', {
                    icon: 'ℹ️'
                });
            }
        } catch (error) {
            console.error('[PrinterSetup] Detection error:', error);
            setConnectionStatus('error');
            toast.error('Failed to detect printers');
        } finally {
            setDetecting(false);
        }
    };

    const handleTestPrint = async () => {
        if (!config.printer_name) {
            toast.error('Please select a printer first');
            return;
        }

        if (!window.electronAPI || !window.electronAPI.testThermalPrint) {
            toast.error('Test printing is only available in desktop app');
            return;
        }

        setTesting(true);

        try {
            // console.log('[PrinterSetup] Testing printer:', config.printer_name);
            const result = await window.electronAPI.testThermalPrint(config.printer_name);

            if (result.success) {
                toast.success('Test print successful! Check your printer.');
            } else {
                toast.error(`Test print failed: ${result.error}`);
            }
        } catch (error) {
            console.error('[PrinterSetup] Test print error:', error);
            toast.error('Failed to send test print');
        } finally {
            setTesting(false);
        }
    };

    const handleSaveConfig = async () => {
        setSaving(true);

        try {
            // console.log('[PrinterSetup] Saving config:', config);
            const res = await api.post('/printer/config', config);

            if (res.data.success) {
                toast.success('Printer configuration saved!');
            } else {
                toast.error('Failed to save configuration');
            }
        } catch (error) {
            console.error('[PrinterSetup] Save error:', error);
            toast.error('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const getPrinterTypeLabel = (type) => {
        switch (type) {
            case 'thermal': return 'Thermal (ESC/POS)';
            case 'regular': return 'Regular (Window Print)';
            case 'auto': return 'Auto (Try Thermal, Fallback to Regular)';
            default: return type;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detection & Configuration */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Printer className="w-3 h-3" /> Printer Setup
                </h3>

                {/* Printer Type Selector */}
                <div className="mb-4">
                    <label className="block text-xs font-bold text-[#001f3f] mb-2 ml-1">Printer Type</label>
                    <select
                        value={config.printer_type}
                        onChange={(e) => setConfig({ ...config, printer_type: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#008080] shadow-sm"
                    >
                        <option value="auto">Auto (Recommended)</option>
                        <option value="thermal">Thermal Only</option>
                        <option value="regular">Regular Only</option>
                    </select>
                    <p className="text-[10px] text-gray-500 mt-1 ml-1 italic">
                        {getPrinterTypeLabel(config.printer_type)}
                    </p>
                </div>

                {/* Auto-Detect Button */}
                <button
                    onClick={handleDetectPrinters}
                    disabled={detecting}
                    className="w-full bg-[#008080] hover:bg-[#008080]/90 text-[#001f3f] py-3 rounded-xl font-bold text-xs shadow-lg shadow-[#008080]/20 transition-all active:scale-95 flex items-center justify-center gap-2 mb-4"
                >
                    {detecting ? (
                        <>
                            <Loader className="w-4 h-4 animate-spin" /> Scanning...
                        </>
                    ) : (
                        <>
                            <Search className="w-4 h-4" /> Auto-Detect Printers
                        </>
                    )}
                </button>

                {/* Connection Status */}
                {connectionStatus && (
                    <div className={`px-4 py-3 rounded-xl mb-4 flex items-center gap-2 ${connectionStatus === 'thermal_found'
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : connectionStatus === 'error'
                                ? 'bg-red-50 border border-red-200 text-red-700'
                                : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                        }`}>
                        {connectionStatus === 'thermal_found' ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-bold">Thermal printer connected</span>
                            </>
                        ) : connectionStatus === 'error' ? (
                            <>
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs font-bold">Detection failed</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs font-bold">No thermal printer found</span>
                            </>
                        )}
                    </div>
                )}

                {/* Printer List */}
                {printers.length > 0 && (
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-[#001f3f] mb-2 ml-1">Select Printer</label>
                        <select
                            value={config.printer_name || ''}
                            onChange={(e) => setConfig({
                                ...config,
                                printer_name: e.target.value,
                                printer_interface: `printer:${e.target.value}`
                            })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#008080] shadow-sm"
                        >
                            <option value="">-- Select Printer --</option>
                            {printers.map((printer) => (
                                <option key={printer.name} value={printer.name}>
                                    {printer.displayName} {printer.isThermal && '(Thermal)'}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Advanced Settings & Test */}
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-inner">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Printer className="w-3 h-3" /> Advanced Options
                </h3>

                {/* Paper Width */}
                <div className="mb-4">
                    <label className="block text-xs font-bold text-[#001f3f] mb-2 ml-1">Paper Width (mm)</label>
                    <select
                        value={config.paper_width}
                        onChange={(e) => setConfig({ ...config, paper_width: Number(e.target.value) })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#008080] shadow-sm"
                    >
                        <option value={58}>58mm (Standard)</option>
                        <option value={80}>80mm (Wide)</option>
                    </select>
                </div>

                {/* Auto Cut */}
                <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.auto_cut === 1}
                            onChange={(e) => setConfig({ ...config, auto_cut: e.target.checked ? 1 : 0 })}
                            className="w-4 h-4 rounded border-gray-300 text-[#001f3f] focus:ring-[#008080]"
                        />
                        <span className="text-xs font-bold text-[#001f3f]">Auto-cut paper after printing</span>
                    </label>
                </div>

                {/* Test Print Button */}
                <button
                    onClick={handleTestPrint}
                    disabled={testing || !config.printer_name}
                    className="w-full bg-[#001f3f] hover:bg-[#001f3f]/90 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-[#001f3f]/20 transition-all active:scale-95 flex items-center justify-center gap-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {testing ? (
                        <>
                            <Loader className="w-4 h-4 animate-spin" /> Printing...
                        </>
                    ) : (
                        <>
                            <Printer className="w-4 h-4" /> Test Print
                        </>
                    )}
                </button>

                {/* Save Button */}
                <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="w-full bg-[#008080] hover:bg-[#008080]/90 text-[#001f3f] py-3 rounded-xl font-bold text-xs shadow-lg shadow-[#008080]/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
};

export default PrinterSetup;
