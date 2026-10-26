import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/api";

// Fetch Udhaar records with optional date filters
export const fetchUdhaarRecords = createAsyncThunk(
  "udhaar/fetchAll",
  async (filters = {}, thunkAPI) => {
    try {
      const response = await api.get("/udhaar", { params: filters });
      return response.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Failed to fetch credit records");
    }
  }
);

export const createUdhaarRecord = createAsyncThunk(
  "udhaar/create",
  async (udhaarData, thunkAPI) => {
    try {
      const response = await api.post("/udhaar", udhaarData);
      return response.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Failed to create credit entry");
    }
  }
);

export const payUdhaarRecord = createAsyncThunk(
  "udhaar/pay",
  async ({ id, amount_paid, payment_method }, thunkAPI) => {
    try {
      const response = await api.post(`/udhaar/${id}/pay`, { amount_paid, payment_method });
      return { id, ...response.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Failed to record payment");
    }
  }
);

export const deleteUdhaarRecord = createAsyncThunk(
  "udhaar/delete",
  async (id, thunkAPI) => {
    try {
      const response = await api.delete(`/udhaar/${id}`);
      return { id, message: response.data.message };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Failed to delete record");
    }
  }
);

const udhaarSlice = createSlice({
  name: "udhaar",
  initialState: {
    records: [],
    listLoading: false,
    actionLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUdhaarRecords.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(fetchUdhaarRecords.fulfilled, (state, action) => {
        state.listLoading = false;
        state.records = action.payload;
      })
      .addCase(fetchUdhaarRecords.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload;
      })
      .addCase(createUdhaarRecord.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(createUdhaarRecord.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(createUdhaarRecord.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(payUdhaarRecord.fulfilled, (state, action) => {
        const index = state.records.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.records[index].paid_amount = action.payload.paid_amount;
          state.records[index].remaining_amount = action.payload.remaining_amount;
          state.records[index].status = action.payload.status;
          state.records[index].computed_status = action.payload.status;
        }
      })
      .addCase(deleteUdhaarRecord.fulfilled, (state, action) => {
        state.records = state.records.filter((r) => r.id !== action.payload.id);
      });
  },
});

export default udhaarSlice.reducer;