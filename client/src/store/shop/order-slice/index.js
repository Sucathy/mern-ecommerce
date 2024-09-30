import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

// Initial state
const initialState = {
  approvalURL: null,
  isLoading: false,
  orderId: null,
  orderDate: null, // Added orderDate
  orderList: [],
  orderDetails: null,
};

// Async thunk to create a new order
export const createNewOrder = createAsyncThunk(
  "order/createNewOrder",
  async (orderData, { rejectWithValue }) => {
    try {
      // Add the current date as orderDate
      const orderWithDate = { ...orderData, orderDate: Date.now() };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/shop/https://api.razorpay.com/v1/order/create`,
        orderWithDate
      );
      return response.data; // Ensure this includes orderId, approvalURL, and orderDate
    } catch (error) {
      return rejectWithValue(error.response.data); // Handle errors properly
    }
  }
);

// Async thunk to validate payment
export const validatePayment = createAsyncThunk(
  "order/validatePayment",
  async (paymentData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/shop/order/validate`,
        paymentData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Async thunk to capture payment
export const capturePayment = createAsyncThunk(
  "order/capturePayment",
  async ({ paymentId, orderId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/shop/order/capture`,
        { paymentId, orderId }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Async thunk to get all orders by user ID
export const getAllOrdersByUserId = createAsyncThunk(
  "order/getAllOrdersByUserId",
  async (userId) => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/shop/order/list/${userId}`
    );
    return response.data;
  }
);

// Async thunk to get order details by order ID
export const getOrderDetails = createAsyncThunk(
  "order/getOrderDetails",
  async (id) => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/shop/order/details/${id}`
    );
    return response.data;
  }
);

// Create slice for shopping orders
const shoppingOrderSlice = createSlice({
  name: "shoppingOrderSlice",
  initialState,
  reducers: {
    resetOrderDetails: (state) => {
      state.orderDetails = null;
      state.approvalURL = null;
      state.orderId = null;
      state.orderDate = null; // Reset orderDate
    },
  },
  extraReducers: (builder) => {
    builder
      // Handling createNewOrder actions
      .addCase(createNewOrder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createNewOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.approvalURL = action.payload.approvalURL;
        state.orderId = action.payload.orderId;
        state.orderDate = action.payload.orderDate || Date.now(); // Set orderDate from payload or use current date
        sessionStorage.setItem(
          "currentOrderId",
          JSON.stringify(action.payload.orderId)
        );
      })
      .addCase(createNewOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.approvalURL = null;
        state.orderId = null;
        state.orderDate = null; // Reset orderDate on error
        console.error("Create Order Error:", action.payload);
      })

      // Handling validatePayment actions
      .addCase(validatePayment.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validatePayment.fulfilled, (state, action) => {
        state.isLoading = false;
        console.log("Payment validation success:", action.payload);
      })
      .addCase(validatePayment.rejected, (state, action) => {
        state.isLoading = false;
        console.error("Payment validation error:", action.payload);
      })

      // Handling getAllOrdersByUserId actions
      .addCase(getAllOrdersByUserId.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAllOrdersByUserId.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orderList = action.payload.data; // Ensure this exists in your response
      })
      .addCase(getAllOrdersByUserId.rejected, (state, action) => {
        state.isLoading = false;
        state.orderList = [];
        console.error("Get All Orders Error:", action.payload);
      })

      // Handling getOrderDetails actions
      .addCase(getOrderDetails.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getOrderDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orderDetails = action.payload.data; // Ensure this exists in your response
      })
      .addCase(getOrderDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.orderDetails = null;
        console.error("Get Order Details Error:", action.payload);
      });
  },
});

// Exporting resetOrderDetails action
export const { resetOrderDetails } = shoppingOrderSlice.actions;

// Exporting the reducer
export default shoppingOrderSlice.reducer;
