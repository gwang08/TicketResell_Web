import React, { useState, useEffect } from "react";
import "@/Css/MyCart.css";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { CheckCircle, Trash2 } from "lucide-react";
import { fetchImage } from "@/models/FetchImage";
export interface CartItem {
  orderDetailId: string;
  orderId: string;
  ticketId: string;
  price: number;
  quantity: number;
  ticket: {
    name: string;
    image: string;
    startDate: string;
  };
}

interface CartItemWithSelection extends CartItem {
  isSelected: boolean;
  imageUrl: string;
  sellerName: string;
}

const MyCart: React.FC = () => {
  const [items, setItems] = useState<CartItemWithSelection[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const router = useRouter();

  // Fetch cart items when component loads
  useEffect(() => {
    const fetchCartItems = async () => {
      try {
        const id = Cookies.get("id");

        if (!id) {
          router.push("/login");
          return;
        }

        const response = await fetch(
          `http://${process.env.NEXT_PUBLIC_API_URL}/api/cart/items/${id}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        const itemsWithSelection = await Promise.all(
          data.data.map(async (item: any) => {
            let image =
              "https://img3.gelbooru.com/images/c6/04/c604a5f863d5ad32cc8afe8affadfee6.jpg"; // default image

            console.log("ticket", item.ticket.image);
            if (item.ticket.image) {
              const { imageUrl: fetchedImageUrl, error } = await fetchImage(
                item.ticket.image
              );

              if (fetchedImageUrl) {
                image = fetchedImageUrl;
              } else {
                console.error(
                  `Error fetching image for ticket ${item.ticketId}: ${error}`
                );
              }
            }

            return {
              ...item,
              imageUrl: image,
              isSelected: false,
              sellerName: item.ticket.seller.fullname,
            };
          })
        );

        setItems(itemsWithSelection);
      } catch (error) {
        console.error("Error fetching cart items:", error);
      }
    };

    fetchCartItems();
  }, []);

  useEffect(() => {
    console.log("Cart items updated: ", items);
  }, [items]);

  const paymentMethods = [
    {
      id: "VNpay",
      name: "VNpay",
      imageUrl:
        "https://vinadesign.vn/uploads/images/2023/05/vnpay-logo-vinadesign-25-12-57-55.jpg",
    },
    {
      id: "momo",
      name: "MoMo",
      imageUrl:
        "https://developers.momo.vn/v3/assets/images/square-logo-f8712a4d5be38f389e6bc94c70a33bf4.png",
    },
    {
      id: "Paypal",
      name: "Paypal",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png",
    },
  ];

  // Filter selected items for checkout
  const selectedItems = items.filter((item) => item.isSelected);
  const totalItemsPrice = selectedItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Select a cart item
  const handleSelect = (id: string) => {
    const updatedItems = items.map((item) =>
      item.orderDetailId === id
        ? { ...item, isSelected: !item.isSelected }
        : item
    );
    setItems(updatedItems);
  };

  // Select payment method
  const handleSelectPayment = (id: string) => {
    setSelectedPayment((prev) => (prev === id ? null : id));
  };

  // Change item quantity
  const handleQuantityChange = (id: string, increment: boolean) => {
    const updatedItems = items.map((item) => {
      if (item.orderDetailId === id) {
        const newQuantity = increment
          ? item.quantity + 1
          : Math.max(item.quantity - 1, 1);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setItems(updatedItems);
  };

  // Remove item from cart
  const handleRemoveItem = async (ticketId: string) => {
    console.log("Try remove", ticketId);
    const userId = Cookies.get("id");
    try {
      await fetch(
        `http://${process.env.NEXT_PUBLIC_API_URL}/api/cart/remove/${userId}/${ticketId}`,
        {
          credentials: "include",
          method: "DELETE",
        }
      );
      setItems((prevItems) =>
        prevItems.filter((item) => item.ticketId !== ticketId)
      );
    } catch (error) {
      console.error("Error removing item from cart:", error);
    }
  };

  // Proceed to checkout
  const handleCheckout = async () => {
    const productsForCheckout = items.filter((item) => item.isSelected);

    if (productsForCheckout.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
      return;
    }

    if (!selectedPayment) {
      alert("Vui lòng chọn phương thức thanh toán.");
      return;
    }

    // Store selected products and payment method in local storage
    localStorage.setItem(
      "selectedTickets",
      JSON.stringify(productsForCheckout)
    );
    localStorage.setItem("paymentMethod", selectedPayment);

    const orderId = `default`;
    const token = "default";

    const orderInfo = {
      userId: "default",
      selectedTicketIds: productsForCheckout.map((product) => ({
        ticketId: product.ticketId,
        quantity: product.quantity,
      })),
    };

    const requestBody = {
      orderId,
      token,
      orderInfo,
    };

    let apiEndpoint;
    switch (selectedPayment) {
      case "momo":
        apiEndpoint = `http://${process.env.NEXT_PUBLIC_API_URL}/api/Payment/momo/payment`;
        break;
      case "VNpay":
        apiEndpoint = `http://${process.env.NEXT_PUBLIC_API_URL}/api/Payment/vnpay/payment`;
        break;
      case "Paypal":
        apiEndpoint = `http://${process.env.NEXT_PUBLIC_API_URL}/api/Payment/paypal/payment`;
        break;
      default:
        alert("Invalid payment method selected.");
        return;
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.statusCode === 200 && result.data) {
        router.push(result.data[0].data); // Redirect to the payment URL
      } else {
        throw new Error(result.message || "Failed to process payment");
      }
    } catch (error) {
      console.error(`Error processing ${selectedPayment} payment:`, error);
      alert(
        `Đã xảy ra lỗi khi xử lý thanh toán ${selectedPayment}. Vui lòng thử lại.`
      );
    }
  };

  // Function to format price to VND
  const formatPriceVND = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  // Function to format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mt-24 w-full-screen rounded">
      <div className=" bg-white rounded-t overflow-hidden">
        <div className="px-8 xl:px-24 pb-16 flex flex-col lg:flex-row relative">
          {/* Left Column: Tickets Table */}
          <div className="w-full lg:w-2/3 overflow-y-auto max-h-[calc(100vh-6rem)]">
            <h2 className="text-2xl font-bold mb-6 sticky top-0 bg-white z-10 py-4">
              Giỏ hàng
            </h2>
            <div className="hidden sm:grid sm:grid-cols-7 gap-4 mb-4 min-w-full text-sm font-medium text-gray-500 sticky top-16 bg-white z-10 py-2">
              <div className="col-span-3">Sản phẩm</div>
              <div>Giá</div>
              <div>Số lượng</div>
              <div>Tổng</div>
              <div>Thao tác</div>
            </div>
            {items.map((item) => (
              <div
                key={item.orderDetailId}
                className="border-b border-t border-gray-200 py-4 sm:grid sm:grid-cols-7 sm:gap-4 sm:items-center relative"
              >
                <div className="flex flex-col col-span-3 mb-4 sm:mb-0">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">
                    {item.ticket.name}
                  </h3>
                  <div className="flex flex-col items-start">
                    <img
                      src={item.imageUrl}
                      alt={item.ticket.name}
                      className="w-64 h-32 object-cover rounded mb-2"
                    />
                    <p className="text-sm text-gray-500">
                      {formatDateTime(item.ticket.startDate)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Người bán: {item.sellerName}
                    </p>
                  </div>
                </div>
                <div className="mb-2">
                  <span className="sm:hidden font-medium mr-2">Giá:</span>
                  {formatPriceVND(item.price)}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="sm:hidden font-medium">Số lượng:</span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(item.orderDetailId, false)
                      }
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-700"
                    >
                      <svg
                        className="h-2.5 w-2.5 text-gray-900 dark:text-white"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 18 2"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M1 1h16"
                        />
                      </svg>
                    </button>
                    <span className="w-10 shrink-0 text-center text-sm font-medium text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(item.orderDetailId, true)
                      }
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-700"
                    >
                      <svg
                        className="h-2.5 w-2.5 text-gray-900 dark:text-white"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 18 18"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 1v16M1 9h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="mb-2">
                  <span className="sm:hidden font-medium mr-2">Tổng cộng:</span>
                  {formatPriceVND(item.price * item.quantity)}
                </div>
                <div className="flex items-center justify-center space-x-4">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.isSelected}
                      onChange={() => handleSelect(item.orderDetailId)}
                      className="hidden"
                    />
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-200 ease-in-out ${
                        item.isSelected
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300"
                      }`}
                    >
                      {item.isSelected && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </span>
                  </label>
                  <button
                    onClick={() => handleRemoveItem(item.ticketId)}
                    className="text-red-500 hover:text-red-700 focus:outline-none"
                    aria-label="Delete item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Payment Method and Summary */}
          <div className="w-full lg:w-1/3 lg:pl-6 lg:border-l lg:border-gray-200 sticky min-h-full">
            <div className="sticky top-0 bg-white z-10 py-4">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                Tổng kết đơn hàng
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Sản phẩm đã chọn
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedItems.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tổng cộng</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPriceVND(totalItemsPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Thuế (5%)</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPriceVND(totalItemsPrice * 0.05)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Phương thức thanh toán:
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer transition duration-300 ${
                          selectedPayment === method.id
                            ? "bg-blue-100 border border-green-500"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                        onClick={() => handleSelectPayment(method.id)}
                      >
                        {<img
                            src={method.imageUrl}
                            alt={method.name}
                            className="w-12 h-12 mb-2"
                          />}
                        <span className="text-xs text-gray-700">
                          {method.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                  <span className="text-lg font-semibold text-gray-800">
                    Tổng cộng (bao gồm thuế)
                  </span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatPriceVND(totalItemsPrice * 1.05)}
                  </span>
                </div>
                <button
                  className="w-full bg-green-500 text-white py-4 rounded-lg font-semibold hover:bg-green-600 transition duration-300 mt-4"
                  onClick={handleCheckout}
                >
                  Thành toán
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyCart;
