import toast from 'react-hot-toast';

/**
 * Custom toast-based confirmation dialog
 * Matches the app's UI design with green/zinc color scheme
 * 
 * @param {string} message - The confirmation message to display
 * @param {Object} options - Configuration options
 * @param {string} options.confirmText - Text for confirm button (default: "Confirm")
 * @param {string} options.cancelText - Text for cancel button (default: "Cancel")
 * @param {string} options.confirmColor - Color class for confirm button (default: "bg-[#001f3f]")
 * @param {Function} options.onConfirm - Callback when confirmed
 * @param {Function} options.onCancel - Callback when cancelled
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
export const toastConfirm = (message, options = {}) => {
    const {
        confirmText = "Confirm",
        cancelText = "Cancel",
        confirmColor = "bg-[#001f3f] hover:bg-[#001122]",
        onConfirm,
        onCancel
    } = options;

    return new Promise((resolve) => {
        const toastId = toast.custom((t) => (
            <div
                className={`bg-white rounded-2xl shadow-2xl border border-zinc-400 p-6 max-w-md transform transition-all ${t.visible ? 'animate-in slide-in-from-top-5 fade-in' : 'animate-out slide-out-to-top-5 fade-out'
                    }`}
            >
                {/* Message */}
                <p className="text-gray-800 font-semibold text-sm leading-relaxed mb-6">
                    {message}
                </p>

                {/* Button Group */}
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            toast.dismiss(toastId);
                            if (onCancel) onCancel();
                            resolve(false);
                        }}
                        className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            toast.dismiss(toastId);
                            if (onConfirm) onConfirm();
                            resolve(true);
                        }}
                        className={`flex-1 px-4 py-2.5 ${confirmColor} text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        ), {
            duration: Infinity,
            position: 'top-center',
        });
    });
};

/**
 * Danger variant for destructive actions
 */
export const toastConfirmDanger = (message, options = {}) => {
    return toastConfirm(message, {
        ...options,
        confirmText: options.confirmText || "Delete",
        confirmColor: "bg-red-600 hover:bg-red-700"
    });
};

/**
 * Warning variant for important actions
 */
export const toastConfirmWarning = (message, options = {}) => {
    return toastConfirm(message, {
        ...options,
        confirmText: options.confirmText || "Proceed",
        confirmColor: "bg-amber-600 hover:bg-amber-700"
    });
};
