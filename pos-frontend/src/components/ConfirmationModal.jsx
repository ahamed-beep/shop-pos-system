import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'; // Using XMarkIcon for close button

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", cancelText = "Cancel", confirmButtonClass = "bg-red-600 hover:bg-red-700", isLoading = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1817171f]  p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full mx-auto p-6 border border-gray-200 transform transition-all scale-100 opacity-100 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-gothic-1 text-[#001f3f]">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="flex items-start mb-6">
                    <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 mr-4 flex-shrink-0" />
                    <p className="text-gray-500 font-poppins text-md leading-relaxed">{message}</p>
                </div>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg font-bold text-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all transform hover:scale-[102%]"
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2 rounded-lg font-bold text-md text-white transition-transform transform hover:scale-[102%] ${confirmButtonClass} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;