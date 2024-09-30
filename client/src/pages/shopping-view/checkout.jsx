import Address from "@/components/shopping-view/address";
import UserCartItemsContent from "@/components/shopping-view/cart-items-content";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { createNewOrder } from "@/store/shop/order-slice";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import img from "../../assets/account.jpg";

function ShoppingCheckout() {
  const { cartItems } = useSelector((state) => state.shopCart);
  const { user } = useSelector((state) => state.auth);
  const [currentSelectedAddress, setCurrentSelectedAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const { toast } = useToast();

  // Calculate total cart amount
  const totalCartAmount =
    cartItems?.items?.reduce(
      (sum, currentItem) =>
        sum +
        (currentItem?.salePrice > 0
          ? currentItem?.salePrice
          : currentItem?.price) *
          currentItem?.quantity,
      0
    ) || 0;

  // Load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Validate cart and address before initiating payment
  const validateCheckout = () => {
    if (!cartItems?.items?.length) {
      toast({
        title: "Your cart is empty. Please add items to proceed.",
        variant: "destructive",
      });
      return false;
    }
    if (!currentSelectedAddress) {
      toast({
        title: "Please select an address to proceed.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // Handle Razorpay payment initiation
  const handleInitiateRazorpayPayment = async () => {
    if (!validateCheckout()) return;

    // Order data preparation
    const orderData = {
      userId: user?.id,
      cartId: cartItems?._id,
      cartItems: cartItems.items.map((item) => ({
        productId: item?.productId,
        title: item?.title,
        image: item?.image,
        price: item?.salePrice > 0 ? item?.salePrice : item?.price,
        quantity: item?.quantity,
      })),
      addressInfo: {
        addressId: currentSelectedAddress?._id,
        ...currentSelectedAddress, // spreading address fields for cleaner code
      },
      orderStatus: "pending",
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      totalAmount: totalCartAmount,
      orderDate: new Date(),
      orderUpdateDate: new Date(),
    };

    const isRazorpayLoaded = await loadRazorpayScript();
    if (!isRazorpayLoaded) {
      toast({
        title: "Razorpay SDK failed to load. Please check your connection.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true); // Start loading state

    try {
      const data = await dispatch(createNewOrder(orderData));
      const { orderId, amount, currency } = data.payload;

      const options = {
        key: "rzp_test_4qWBysCOWmcNPo", // Razorpay API key
        amount: amount * 100, // Razorpay processes amounts in paise
        currency,
        name: "Your Store Name",
        description: "Order payment",
        order_id: orderId,
        handler: async (response) => handlePaymentSuccess(response),
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast({
        title: "An error occurred while creating the order.",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false); // Stop loading state
    }
  };

  // Handle successful payment response
  const handlePaymentSuccess = async (response) => {
    const paymentData = {
      paymentId: response.razorpay_payment_id,
      orderId: response.razorpay_order_id,
      signature: response.razorpay_signature,
    };

    try {
      const validateRes = await fetch(`${import.meta.env.VITE_API_URL}/order/validate`, {
        method: "POST",
        body: JSON.stringify(paymentData),
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("auth-token") || "",
        },
      });

      if (!validateRes.ok) {
        const errorText = await validateRes.text();
        throw new Error(`Payment validation failed: ${errorText}`);
      }

      const jsonRes = await validateRes.json();
      if (jsonRes.msg === "success") {
        localStorage.removeItem("cartItems");
        toast({
          title: "Payment successful!",
          variant: "success",
        });
      } else {
        toast({
          title: "Payment validation failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Payment validation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header Image */}
      <div className="relative h-[300px] w-full overflow-hidden">
        <img
          src={img}
          className="h-full w-full object-cover object-center"
          alt="Account"
        />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5 p-5">
        <Address
          selectedId={currentSelectedAddress}
          setCurrentSelectedAddress={setCurrentSelectedAddress}
        />

        <div className="flex flex-col gap-4">
          {cartItems?.items?.length > 0 &&
            cartItems.items.map((item) => (
              <UserCartItemsContent key={item.productId} cartItem={item} />
            ))}

          {/* Total Amount */}
          <div className="mt-8 space-y-4">
            <div className="flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold">Rs {totalCartAmount}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <div className="mt-4 w-full">
            <Button
              onClick={handleInitiateRazorpayPayment}
              className="w-full"
              disabled={loading} // Disable button while loading
            >
              {loading ? "Processing..." : "Checkout with Razorpay"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShoppingCheckout;
