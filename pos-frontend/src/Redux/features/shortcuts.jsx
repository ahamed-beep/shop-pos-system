import { createSlice } from '@reduxjs/toolkit';

const initialShortcuts = {
    // Dashboard / Search
    SEARCH_FOCUS: 'F1',

    // Global
    CLOSE_MODAL: 'Escape',
    CONFIRM_PRINT: 'Ctrl+Enter',

    // Navigation (Universal)
    NAV_DASHBOARD: 'Ctrl+1',
    NAV_BILLING: 'Ctrl+2',
    NAV_BILLING_HISTORY: 'Ctrl+3',
    NAV_MANAGE_PRODUCTS: 'Ctrl+4',
    NAV_SALES_REPORT: 'Ctrl+6',
    NAV_SETTINGS: 'Ctrl+7'
};

const shortcutSlice = createSlice({
    name: 'shortcuts',
    initialState: {
        mappings: initialShortcuts,
        isCustomizing: false,
        activeShortcutKey: null,
    },
    reducers: {
        updateShortcut: (state, action) => {
            const { key, mapping } = action.payload;
            state.mappings[key] = mapping;
        },
        setAllShortcuts: (state, action) => {
            state.mappings = { ...initialShortcuts, ...action.payload };
        },
        resetShortcuts: (state) => {
            state.mappings = initialShortcuts;
        }
    }
});

export const { updateShortcut, setAllShortcuts, resetShortcuts } = shortcutSlice.actions;
export default shortcutSlice.reducer;
