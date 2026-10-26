import { useEffect } from 'react';
import { useSelector } from 'react-redux';

export const useKeyboard = (handlers) => {
    const { mappings } = useSelector((state) => state.shortcuts);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Check if we are typing in an input (unless it's a function key)
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

            // Find which shortcut was pressed
            const action = Object.entries(mappings).find(([_, keyCombo]) => {
                if (!keyCombo) return false;

                // Simplified check: only supports single keys (F1, F2...) or Ctrl+Key
                const parts = keyCombo.split('+');
                const key = parts[parts.length - 1].toLowerCase();
                const needsCtrl = parts.includes('Ctrl');
                const needsShift = parts.includes('Shift');
                const needsAlt = parts.includes('Alt');

                return e?.key?.toLowerCase() === key &&
                    e.ctrlKey === needsCtrl &&
                    e.shiftKey === needsShift &&
                    e.altKey === needsAlt;
            });

            if (action) {
                const [actionKey] = action;

                const hasModifier = e.ctrlKey || e.altKey || e.shiftKey;
                const isFKey = e.key.startsWith('F');

                // If in input, only allow:
                // 1. F-keys
                // 2. Modified keys (Ctrl+S, Ctrl+1, etc.)
                // 3. Enter (often used for submission)
                if (isInput && !isFKey && !hasModifier && e.key !== 'Enter') {
                    return;
                }

                if (handlers[actionKey]) {
                    e.preventDefault();
                    handlers[actionKey](e);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mappings, handlers]);
};
