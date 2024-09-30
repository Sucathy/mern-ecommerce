import { useSelector } from "react-redux";
import { Badge } from "../ui/badge";
import { DialogContent } from "../ui/dialog";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";

function ShoppingOrderDetailsView({ orderDetails }) {
  const { user } = useSelector((state) => state.auth);

  return (
    <DialogContent className="sm:max-w-[600px] w-full p-4 max-h-[80vh] overflow-auto">
      <div className="grid gap-6">
        {/* Order Information */}
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Order ID</p>
            <Label>{orderDetails?._id || "N/A"}</Label>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-medium">Order Date</p>
            <Label>{orderDetails?.orderDate?.split("T")[0] || "N/A"}</Label>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-medium">Order Price</p>
            <Label>Rs {orderDetails?.totalAmount || "N/A"}</Label>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-medium">Payment Method</p>
            <Label>{orderDetails?.paymentMethod || "N/A"}</Label>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-medium">Payment Status</p>
            <Label>{orderDetails?.paymentStatus || "N/A"}</Label>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-medium">Order Status</p>
            <Label>
              <Badge
                className={`py-1 px-3 ${
                  orderDetails?.orderStatus === "confirmed"
                    ? "bg-green-500"
                    : orderDetails?.orderStatus === "rejected"
                    ? "bg-red-600"
                    : "bg-black"
                }`}
              >
                {orderDetails?.orderStatus || "N/A"}
              </Badge>
            </Label>
          </div>
        </div>

        <Separator />

        {/* Order Items */}
        <div className="grid gap-4">
          <div className="font-medium">Order Details</div>
          <ul className="grid gap-4">
            {orderDetails?.cartItems && orderDetails.cartItems.length > 0 ? (
              orderDetails.cartItems.map((item, index) => (
                <li key={index} className="flex flex-col sm:flex-row gap-4">
                  {/* Product Image */}
                  <div className="w-full sm:w-24">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="aspect-square w-full h-auto object-cover"
                      width={100}
                      height={100}
                    />
                  </div>
                  {/* Product Details */}
                  <div className="flex-1">
                    <div className="flex justify-between sm:flex-row flex-col">
                      <span className="font-medium">Title: {item.title}</span>
                      <span>Quantity: {item.quantity}</span>
                      <span>Price: Rs {item.price}</span>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <p>No items in the cart</p>
            )}
          </ul>
        </div>

        <Separator />

        {/* Shipping Info */}
        <div className="grid gap-4">
          <div className="font-medium">Shipping Info</div>
          <div className="grid gap-0.5 text-muted-foreground">
            <span>{user?.userName || "N/A"}</span>
            <span>{orderDetails?.addressInfo?.address || "N/A"}</span>
            <span>{orderDetails?.addressInfo?.city || "N/A"}</span>
            <span>{orderDetails?.addressInfo?.pincode || "N/A"}</span>
            <span>{orderDetails?.addressInfo?.phone || "N/A"}</span>
            <span>{orderDetails?.addressInfo?.notes || "N/A"}</span>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

export default ShoppingOrderDetailsView;
