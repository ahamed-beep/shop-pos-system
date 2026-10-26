import api from '../api';
import toast from 'react-hot-toast';


class ThermalPrintingService {
    constructor() {
        this.config = null;
        this.isElectron = window.electronAPI && window.electronAPI.printThermalReceipt;
    }


    async loadConfig() {
        try {
            const res = await api.get('/printer/config');
            this.config = res.data.config || { printer_type: 'auto' };
            return this.config;
        } catch (error) {
            console.error('[ThermalPrinting] Failed to load config:', error);
            this.config = { printer_type: 'regular' }; // Fallback to regular
            return this.config;
        }
    }

    /**
     * Print receipt using thermal printer or fallback to regular printing
     * @param {Object} receiptData - Receipt data to print
     * @param {Function} regularPrintFallback - Function to call for regular window.print()
     */
    async printReceipt(receiptData, regularPrintFallback) {
        // Load config if not already loaded
        if (!this.config) {
            await this.loadConfig();
        }

        const printerType = this.config.printer_type;

        // console.log('[ThermalPrinting] Print requested, type:', printerType);

        // If set to regular only, use regular printing
        if (printerType === 'regular') {
            // console.log('[ThermalPrinting] Using regular printing (configured)');
            return this.useFallback(regularPrintFallback);
        }

        // If not in Electron, use regular printing
        if (!this.isElectron) {
            // console.log('[ThermalPrinting] Not in Electron, using regular printing');
            return this.useFallback(regularPrintFallback);
        }

        // Try thermal printing
        if (printerType === 'thermal' || printerType === 'auto') {
            try {
                // console.log('[ThermalPrinting] Attempting thermal print...');

                const result = await window.electronAPI.printThermalReceipt({
                    printerName: this.config.printer_name,
                    config: this.config,
                    receipt: receiptData
                });

                if (result.success) {
                    // console.log('[ThermalPrinting] Thermal print successful');
                    toast.success('Receipt printed successfully');
                    return { success: true, method: 'thermal' };
                } else {
                    console.warn('[ThermalPrinting] Thermal print failed:', result.error);

                    if (printerType === 'thermal') {
                        // If set to thermal only, show error
                        toast.error(`Print failed: ${result.error}`);
                        return { success: false, method: 'thermal', error: result.error };
                    } else {
                        // If auto, fallback to regular
                        // console.log('[ThermalPrinting] Falling back to regular printing');
                        toast('Thermal printer unavailable. Using regular printing.', {
                            icon: 'ℹ️'
                        });
                        return this.useFallback(regularPrintFallback);
                    }
                }
            } catch (error) {
                console.error('[ThermalPrinting] Thermal print error:', error);

                if (printerType === 'thermal') {
                    toast.error('Thermal printing failed');
                    return { success: false, method: 'thermal', error: error.message };
                } else {
                    // Auto mode: fallback to regular
                    // console.log('[ThermalPrinting] Exception caught, using fallback');
                    toast('Using regular printing due to thermal printer error', {
                        icon: 'ℹ️'
                    });
                    return this.useFallback(regularPrintFallback);
                }
            }
        }

        // Default fallback
        return this.useFallback(regularPrintFallback);
    }

    /**
     * Use regular printing fallback
     */
    useFallback(regularPrintFallback) {
        if (typeof regularPrintFallback === 'function') {
            regularPrintFallback();
            return { success: true, method: 'regular' };
        } else {
            // Default to window.print()
            window.print();
            return { success: true, method: 'regular' };
        }
    }
}

// Export singleton instance
const thermalPrinter = new ThermalPrintingService();
export default thermalPrinter;

