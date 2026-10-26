import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { resetShortcuts } from '../Redux/features/shortcuts';

const KeyboardShortcutManager = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { mappings } = useSelector((state) => state.shortcuts);

    // Auto-fix state if new keys are missing (due to Redux Persist legacy state)
    useEffect(() => {
        if (!mappings || !mappings.NAV_DASHBOARD || !mappings.NAV_BILLING_HISTORY) {
            console.warn('[KeyboardShortcutManager] Detected missing shortcuts in state, resetting to defaults...');
            dispatch(resetShortcuts());
        }
    }, [mappings, dispatch]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Allow Ctrl+ combinations even in inputs
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

            // If typing in input and NO modifiers, ignore (allow typing)
            if (isInput && !e.ctrlKey && !e.altKey && !e.metaKey && !e.key.startsWith('F')) {
                return;
            }

            // Construct comparison string matching Redux format
            let keyCombo = "";
            if (e.ctrlKey) keyCombo += "Ctrl+";
            if (e.shiftKey) keyCombo += "Shift+";
            if (e.altKey) keyCombo += "Alt+";

            // Handle keys
            let key = (e.key || "").toUpperCase();

            // Map specific codes if needed for consistency (e.g., Numpad)
            // Use e.code to discriminate digit keys correctly regardless of Shift status
            if (e.code && e.code.startsWith('Digit')) {
                key = e.code.replace('Digit', ''); // "Digit1" -> "1"
            } else if (e.code && e.code.startsWith('Numpad')) {
                key = e.code.replace('Numpad', ''); // "Numpad1" -> "1"
            }

            if (key === ' ') key = 'SPACE';
            if (key === 'CONTROL' || key === 'SHIFT' || key === 'ALT') return; // Ignore modifier-only presses

            keyCombo += key;

            // Debug log to help identify what the app is seeing
            // console.debug(`[KeyboardShortcutManager] Pressed: ${e.code} -> Combo: ${keyCombo}`);

            // Check against mappings
            // We iterate to find the action because mappings is Action -> Combo
            const actionEntry = Object.entries(mappings || {}).find(([_, mappedKey]) => mappedKey === keyCombo);

            if (actionEntry) {
                const [actionName] = actionEntry;
                // console.log(`[KeyboardShortcutManager] Triggering Action: ${actionName}`);

                e.preventDefault(); // Stop browser default (e.g. Ctrl+1 switching tabs)

                // Navigation Logic
                switch (keyCombo) {
                    case mappings.SEARCH_FOCUS: {
                        // Global Search Focus Logic: Find any visible text input that looks like a search bar
                        const searchInput = document.querySelector('input[type="text"][placeholder*="Search"i]') ||
                            document.querySelector('.search-input') ||
                            document.querySelector('input[placeholder*="Filter"i]');
                        if (searchInput) {
                            searchInput.focus();
                            searchInput.select();
                        }
                        break;
                    }
                    case mappings.NAV_DASHBOARD:
                        navigate('/Dashboard');
                        break;
                    case mappings.NAV_BILLING:
                        navigate('/Dashboard'); // Assuming Billing is on Dashboard or a subroute
                        break;
                    case mappings.NAV_BILLING_HISTORY:
                        navigate('/Dashboard/billing-history');
                        break;
                    case mappings.NAV_MANAGE_PRODUCTS:
                        navigate('/Dashboard/product-manage');
                        break;
                    case mappings.NAV_SALES_REPORT:
                        navigate('/Dashboard/sales-report');
                        break;
                    case mappings.NAV_SETTINGS:
                        navigate('/Dashboard/settings');
                        break;
                    case mappings.CONFIRM_PRINT:
                        // This is usually handled by the modal/component context
                        break;
                    default:
                        break;
                }
            }
        };

        // Use capture phase to ensure we intercept before other handlers if needed
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [navigate, mappings]);

    return null; // This component doesn't render anything
};

export default KeyboardShortcutManager;
