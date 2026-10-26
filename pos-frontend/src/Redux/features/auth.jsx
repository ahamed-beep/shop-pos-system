import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/api";

export const SignupUser = createAsyncThunk('Register', async (user, { rejectWithValue }) => {
    try {
        const response = await api.post('/Signup', user)
        // console.log(response)
        return response.data;

    } catch (error) {
        return rejectWithValue(error.response?.data?.message)
    }
})

export const LoginUser = createAsyncThunk('login ', async (user, { rejectWithValue }) => {

    try {
        const { rememberMe, ...credentials } = user;
        const response = await api.post('/users/login', { ...credentials, rememberMe })

        if (rememberMe) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('role', response.data.user.role);
            localStorage.setItem('id', response.data.user.id);
        } else {
            sessionStorage.setItem('token', response.data.token);
            sessionStorage.setItem('role', response.data.user.role);
            sessionStorage.setItem('id', response.data.user.id);
        }
        //  api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

        return response.data;
    } catch (error) {

        return rejectWithValue(error.response?.data.message || "Something went wrong");
    }
})

export const OtpVerification = createAsyncThunk('OtpVerification', async (data, { rejectWithValue }) => {
    try {
        const response = await api.post('/OTP-Verification', data)
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Something went wrong");
    }
})

export const ResendOtp = createAsyncThunk('ResendOtp', async (data, { rejectWithValue }) => {
    try {
        const response = await api.post('/Resend', data)
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Something went wrong");
    }
})

export const ForgotPassword = createAsyncThunk('ForgotPassword', async (data, { rejectWithValue }) => {
    try {
        const response = await api.post('/users/forget', data)
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Something went wrong");
    }
})

export const resetPassword = createAsyncThunk('ResetPassword', async (data, { rejectWithValue }) => {
    try {
        const response = await api.post(`/users/Reset`, data)
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Something went wrong");
    }
})
export const GetOneUser = createAsyncThunk('GetUserById', async (id, { rejectWithValue }) => {
    try {
        const response = await api.get(`/users/${id}`)

        return response.data;
    } catch (error) {

        return rejectWithValue(error.response?.data?.message || "Something went wrong");
    }
})
const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        role: null,
        error: null,
        loading: false,
        authenticated: false,
    },
    reducers: {
        Logout(state) {
            state.token = null;
            state.user = null;
            state.role = null;
            state.authenticated = false;
            // Clear localStorage and sessionStorage
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('id');
            sessionStorage.removeItem('role');
            localStorage.removeItem('token');
            localStorage.removeItem('id');
            localStorage.removeItem('role');
            // Clear axios header
            delete api.defaults.headers.common['Authorization'];
        }
    },
    extraReducers: (builder) => {
        builder.addCase(SignupUser.pending, (state) => {
            state.loading = true,
                state.error = null
        }),
            builder.addCase(SignupUser.fulfilled, (state, action) => {
                state.loading = false,
                    state.user = action.payload,
                    state.authenticated = true
            }),
            builder.addCase(SignupUser.rejected, (state, action) => {
                state.loading = false,
                    state.error = action.payload
            }),
            builder.addCase(LoginUser.pending, (state) => {
                state.loading = true,
                    state.error = null
            }),
            builder.addCase(LoginUser.fulfilled, (state, action) => {
                state.loading = false,
                    state.user = action.payload.user,
                    // state.token = action.payload.token,
                    state.authenticated = true,
                    state.role = action.payload.user.role
            }),
            builder.addCase(LoginUser.rejected, (state, action) => {
                state.loading = false,
                    state.error = action.payload
            }),
            builder.addCase(OtpVerification.pending, (state) => {
                state.loading = true,
                    state.error = null
            }),
            builder.addCase(OtpVerification.fulfilled, (state, action) => {
                state.loading = false,
                    state.authenticated = true
            }),
            builder.addCase(OtpVerification.rejected, (state, action) => {
                state.loading = false,
                    state.error = action.payload
            }),
            builder.addCase(ResendOtp.pending, (state) => {
                state.loading = true,
                    state.error = null
            }),
            builder.addCase(ResendOtp.fulfilled, (state, action) => {
                state.loading = false,
                    state.error = null
            }),
            builder.addCase(ResendOtp.rejected, (state, action) => {
                state.loading = false,
                    state.error = action.payload
            }),
            builder.addCase(ForgotPassword.pending, (state) => {
                state.loading = true,
                    state.error = null
            }),
            builder.addCase(ForgotPassword.fulfilled, (state, action) => {
                state.loading = false,
                    state.error = null
            }),
            builder.addCase(ForgotPassword.rejected, (state, action) => {
                state.loading = false,
                    state.error = action.payload
            }),
            builder.addCase(resetPassword.pending, (state) => {
                state.loading = true,
                    state.error = null
            }),
            builder.addCase(resetPassword.fulfilled, (state, action) => {
                state.loading = false,
                    state.error = null
            }),
            builder.addCase(resetPassword.rejected, (state, action) => {
                state.loading = false,
                    state.error = action.payload
            }),
            builder.addCase(GetOneUser.pending, (state) => {
                state.loading = true,
                    state.error = null
            }),
            builder.addCase(GetOneUser.fulfilled, (state, action) => {
                state.loading = false,
                    state.error = null,
                    state.user = action.payload.data
            }),
            builder.addCase(GetOneUser.rejected, (state, action) => {
                state.loading = false,
                    state.error = action.payload
            })
    }
})
export default authSlice.reducer;
export const { Logout } = authSlice.actions;