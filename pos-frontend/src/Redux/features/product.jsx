import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/api"; // axios instance pointing to http://localhost:3000/api

// ================== Thunks ==================

// Create (Upload Product)
export const uploadProduct = createAsyncThunk(
  "products/upload",
  async (formData, thunkAPI) => {
    try {
      const response = await api.post("/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Upload failed");
    }
  }
);

// Get All Products
export const getAllProducts = createAsyncThunk(
  "products/getAll",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/products");
      return response.data; // directly an array
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Fetch failed");
    }
  }
);

// Get Single Product by ID
export const getSingleProduct = createAsyncThunk(
  "products/getOne",
  async (id, thunkAPI) => {

    try {
      const response = await api.get(`/products/${id}`);
      return response.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Fetch failed");
    }
  }
);

// Delete Product by ID
export const deleteProductById = createAsyncThunk(
  "products/delete",
  async (id, thunkAPI) => {
    try {
      const response = await api.delete(`/products/${id}`);
      return { id, message: response.data.message };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Delete failed");
    }
  }
);

// Update Product by ID
export const updateProductById = createAsyncThunk(
  "products/update",
  async ({ id, data }, thunkAPI) => {
    try {

      const response = await api.put(`/products/${id}`, data, {
        // headers: { "Content-Type": "multipart/form-data" }, 
      });
      return response.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data || "Failed to update product"
      );
    }
  }
);

// Duplicate Product by ID
export const duplicateProductById = createAsyncThunk(
  "products/duplicate",
  async (id, thunkAPI) => {
    try {
      const response = await api.post(`/products/duplicate/${id}`);
      return response.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Duplicate failed");
    }
  }
);

// ================== Slice ==================
const productSlice = createSlice({
  name: "product",
  initialState: {
    products: [],
    selectedProduct: null,
    listLoading: false,
    singleLoading: false,
    actionLoading: false, // for upload, update, delete
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // Upload
    builder
      .addCase(uploadProduct.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(uploadProduct.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.products = [...state.products, action.payload];
      })
      .addCase(uploadProduct.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });

    // Get All
    builder
      .addCase(getAllProducts.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(getAllProducts.fulfilled, (state, action) => {
        state.listLoading = false;
        state.products = action.payload;
      })
      .addCase(getAllProducts.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload;
      });

    // Get Single
    builder
      .addCase(getSingleProduct.pending, (state) => {
        state.singleLoading = true;
        state.error = null;
      })
      .addCase(getSingleProduct.fulfilled, (state, action) => {
        state.singleLoading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(getSingleProduct.rejected, (state, action) => {
        state.singleLoading = false;
        state.error = action.payload;
      });

    // Delete
    builder
      .addCase(deleteProductById.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteProductById.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.products = state.products.filter(
          (p) => p.id !== action.payload.id
        );
        if (state.selectedProduct?.id === action.payload.id) {
          state.selectedProduct = null;
        }
      })
      .addCase(deleteProductById.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });

    // Update
    builder
      .addCase(updateProductById.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateProductById.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updatedProduct = action.payload;
        const index = state.products.findIndex((p) => p.id === updatedProduct.id);
        if (index !== -1) {
          state.products[index] = updatedProduct;
        }
        if (state.selectedProduct?.id === updatedProduct.id) {
          state.selectedProduct = updatedProduct;
        }
      })
      .addCase(updateProductById.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // Duplicate
      .addCase(duplicateProductById.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(duplicateProductById.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.products = [action.payload, ...state.products];
      })
      .addCase(duplicateProductById.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

export default productSlice.reducer;
