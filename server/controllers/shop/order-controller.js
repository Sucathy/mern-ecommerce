const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const Razorpay = require("razorpay");
require("dotenv").config();
const crypto = require("crypto");

// Initialize Razorpay instance
const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
console.log("Razorpay Instance initialized");

// Create Order
const createOrder = async (req, res) => {
  try {
    const {
      userId,
      cartItems,
      addressInfo,
      totalAmount,
      cartId,
      orderDate,
      orderUpdateDate,
    } = req.body;

    const amountInPaise = Math.round(totalAmount * 100);

    // Validate required fields
    if (!userId || !cartItems || !totalAmount || !cartId || !addressInfo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields in the request body.",
      });
    }

    console.log(
      `Creating order for UserId: ${userId}, Amount: ${amountInPaise}, Address Info: ${JSON.stringify(
        addressInfo
      )}`
    );

    // Razorpay order options
    const options = {
      amount: amountInPaise, // Amount in paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    // Create order in Razorpay
    const razorpayOrder = await instance.orders.create(options);
    console.log("Razorpay Order Created:", razorpayOrder);

    // Create a new order record in the database
    const newlyCreatedOrder = new Order({
      userId,
      cartId,
      cartItems,
      addressInfo,
      orderStatus: "pending",
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      totalAmount,
      orderDate,
      orderUpdateDate,
      paymentId: razorpayOrder.id, // Store Razorpay order ID
    });

    await newlyCreatedOrder.save();

    res.status(201).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      orderId: newlyCreatedOrder._id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  } catch (e) {
    console.error("Error creating order:", e.message);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while creating the order.",
      error: e.message,
    });
  }
};

// Validate Payment
const validatePayment = async (req, res) => {
  try {
    const { paymentId, orderId, signature } = req.body;

    // Create generated signature for verification
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    // Validate payment signature
    if (generatedSignature !== signature) {
      return res
        .status(400)
        .json({ success: false, message: "Payment validation failed" });
    }

    // Update order status to confirmed if payment is valid
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: "completed",
      orderStatus: "confirmed",
    });

    return res
      .status(200)
      .json({ success: true, message: "Payment validated successfully" });
  } catch (error) {
    console.error("Payment validation error:", error);
    res.status(500).json({
      success: false,
      message: "Error during payment validation",
      error: error.message,
    });
  }
};

// Capture Payment
const capturePayment = async (req, res) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId } =
      req.body;
    const order = await Order.findById(orderId);

    // Check if order exists and matches the Razorpay order ID
    if (!order || order.paymentId !== razorpayOrderId) {
      return res.status(404).json({
        success: false,
        message: "Order not found or mismatch in order ID",
      });
    }

    // Validate payment signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed!",
      });
    }

    // Update order status and payment ID
    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.paymentId = razorpayPaymentId;

    // Reduce stock for each product in the order
    for (let item of order.cartItems) {
      let product = await Product.findById(item.productId);
      if (!product || product.totalStock < item.quantity) {
        return res.status(404).json({
          success: false,
          message: `Not enough stock for product: ${item.title}`,
        });
      }
      product.totalStock -= item.quantity;
      await product.save();
    }

    // Delete the cart after order is confirmed
    await Cart.findByIdAndDelete(order.cartId);
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order confirmed and payment captured",
      data: order,
    });
  } catch (e) {
    console.error("Error capturing payment:", e.message);
    res.status(500).json({
      success: false,
      message: "Error occurred while capturing the payment!",
      error: e.message,
    });
  }
};

// Fetch all orders by a user
const getAllOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({ userId });

    if (!orders.length) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found!" });
    }

    res.status(200).json({ success: true, data: orders });
  } catch (e) {
    console.error("Error fetching orders:", e);
    res.status(500).json({
      success: false,
      message: "Error occurred while fetching orders!",
      error: e.message,
    });
  }
};

// Get order details
const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found!" });
    }

    res.status(200).json({ success: true, data: order });
  } catch (e) {
    console.error("Error fetching order details:", e);
    res.status(500).json({
      success: false,
      message: "Error occurred while fetching order details!",
      error: e.message,
    });
  }
};

module.exports = {
  createOrder,
  validatePayment,
  capturePayment,
  getAllOrdersByUser,
  getOrderDetails,
};
