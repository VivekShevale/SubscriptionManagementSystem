/**
 * src/pages/portal/Cart.jsx
 * Shopping Cart — 3 tabs: Order, Address, Payment
 * Supports Cash (current flow) and Online (Razorpay) payment methods.
 * Address is auto-fetched from user profile; if missing, fields are required.
 */
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Trash2, ShoppingBag, CreditCard, Banknote, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { selectCartItems, selectCartTotal, removeFromCart, updateQuantity, clearCart } from "../../store/slices/cartSlice";
import { selectIsAuthenticated } from "../../store/slices/authSlice";
import { FormField, Spinner } from "../../components/common/UI";

const TABS = ["order", "address", "payment"];

export default function Cart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartTotal);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [activeTab, setActiveTab] = useState("order");
  const [address, setAddress] = useState({ line1: "", city: "", state: "", pincode: "", country: "India" });
  const [addressFromProfile, setAddressFromProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash"); // "cash" | "online"

  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  // Auto-load address from profile
  useEffect(() => {
    if (isAuthenticated) {
      setProfileLoading(true);
      api.get("/api/portal/profile")
        .then(res => {
          const contact = res.data?.contact;
          if (contact && (contact.address || contact.city)) {
            setAddress({
              line1: contact.address || "",
              city: contact.city || "",
              state: "",
              pincode: "",
              country: contact.country || "India",
            });
            setAddressFromProfile(true);
          }
        })
        .catch(() => {})
        .finally(() => setProfileLoading(false));
    }
  }, [isAuthenticated]);

  const applyDiscount = () => {
    if (discountCode) { setDiscountApplied(true); toast.success("Discount code applied!"); }
  };

  const validateAddress = () => {
    if (!address.line1.trim() || !address.city.trim()) {
      toast.error("Address Line 1 and City are required to continue.");
      return false;
    }
    return true;
  };

  const loadRazorpayScript = () =>
    new Promise(resolve => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleCheckout = async () => {
    if (!isAuthenticated) { toast.error("Please sign in to checkout."); navigate("/login"); return; }
    if (!validateAddress()) { setActiveTab("address"); return; }
    setLoading(true);
    try {
      const cartItems = items.map(i => ({
        product_id: i.product.id,
        variant_id: i.variantId,
        quantity: i.quantity,
        plan_id: i.planId,
      }));

      const res = await api.post("/api/portal/checkout", {
        items: cartItems,
        discount_code: discountApplied ? discountCode : "",
        plan_id: items[0]?.planId,
        payment_method: paymentMethod,
        address: { line1: address.line1, city: address.city, state: address.state, pincode: address.pincode, country: address.country },
      });

      if (paymentMethod === "online") {
        const loaded = await loadRazorpayScript();
        if (!loaded) { toast.error("Failed to load payment gateway. Please try again."); setLoading(false); return; }

        const { razorpay_order_id, amount, currency, key_id, invoice, subscription } = res.data;

        const options = {
          key: key_id,
          amount,
          currency,
          name: "SubscriptionMS",
          description: `Order ${subscription.subscription_number}`,
          order_id: razorpay_order_id,
          handler: async (response) => {
            try {
              const verifyRes = await api.post("/api/portal/checkout/verify-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                invoice_id: invoice.id,
              });
              dispatch(clearCart());
              toast.success("Payment successful! 🎉");
              navigate("/portal/order-success", {
                state: {
                  order: verifyRes.data.subscription,
                  invoice: verifyRes.data.invoice,
                  items,
                  subtotal,
                  taxAmt: parseFloat(tax.toFixed(2)),
                  total: parseFloat(total.toFixed(2)),
                  paymentMethod: "online",
                },
              });
            } catch (e) {
              toast.error(e.response?.data?.error || "Payment verification failed.");
            }
          },
          prefill: {},
          theme: { color: "#2563eb" },
          modal: {
            ondismiss: () => {
              toast("Payment cancelled.", { icon: "ℹ️" });
              setLoading(false);
            },
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
        setLoading(false);
      } else {
        dispatch(clearCart());
        toast.success("Order placed successfully!");
        navigate("/portal/order-success", {
          state: {
            order: res.data.subscription,
            invoice: res.data.invoice,
            items,
            subtotal,
            taxAmt: parseFloat(tax.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
            paymentMethod: "cash",
          },
        });
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Checkout failed. Please try again.");
      setLoading(false);
    }
  };

  const inp = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" };

  const OrderSummaryBox = () => (
    <div className="rounded-2xl p-5 space-y-3 sticky top-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
      <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Order Summary</h3>
      {items.map(i => (
        <div key={i.key} className="flex justify-between text-sm">
          <span style={{ color: "var(--text-secondary)" }}>{i.product.name} × {i.quantity}</span>
          <span style={{ color: "var(--text-primary)" }}>₹{((i.product.sales_price || 0) * i.quantity).toLocaleString()}</span>
        </div>
      ))}
      <div className="border-t pt-3 space-y-1.5" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Subtotal</span><span style={{ color: "var(--text-primary)" }}>₹{subtotal.toLocaleString()}</span></div>
        <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>GST (18%)</span><span style={{ color: "var(--text-primary)" }}>₹{tax.toFixed(2)}</span></div>
        <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
          <span>Total</span><span>₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="pt-1">
        <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Payment Method</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPaymentMethod("cash")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${paymentMethod === "cash" ? "border-blue-600 bg-blue-600 text-white" : "bg-transparent"}`}
            style={paymentMethod !== "cash" ? { borderColor: "var(--border-color)", color: "var(--text-secondary)" } : {}}
          >
            <Banknote size={15} /> Cash
          </button>
          <button
            onClick={() => setPaymentMethod("online")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${paymentMethod === "online" ? "border-blue-600 bg-blue-600 text-white" : "bg-transparent"}`}
            style={paymentMethod !== "online" ? { borderColor: "var(--border-color)", color: "var(--text-secondary)" } : {}}
          >
            <CreditCard size={15} /> Online
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <input value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="Discount code" className="flex-1 px-3 py-2 rounded-xl text-sm outline-none" style={inp} />
        <button onClick={applyDiscount} className="px-3 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">Apply</button>
      </div>
      {discountApplied && <p className="text-xs text-green-500">✓ Discount applied successfully</p>}

      {activeTab === "payment" && (
        <button onClick={handleCheckout} disabled={loading || !items.length}
          className="w-full py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" /></svg>}
          {loading ? "Processing…" : paymentMethod === "online" ? `Pay ₹${total.toFixed(0)} Online` : "Place Order (Cash on Delivery)"}
        </button>
      )}
    </div>
  );

  if (!items.length) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <ShoppingBag size={56} className="mb-4 text-gray-300" />
      <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Your cart is empty</h2>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Add some products from our shop.</p>
      <button onClick={() => navigate("/portal/shop")} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Browse Shop</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Your Cart</h1>

      {/* Tab Navigation */}
      <div className="flex gap-0 border-b" style={{ borderColor: "var(--border-color)" }}>
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-all ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent"}`}
            style={activeTab !== tab ? { color: "var(--text-muted)" } : {}}>
            {i + 1}. {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Order Tab */}
          {activeTab === "order" && (
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.key} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                    {item.product.image_url
                      ? <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={20} style={{ color: "var(--text-muted)" }} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{item.product.name}</div>
                    <div className="text-sm font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>₹{(item.product.sales_price || 0).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => dispatch(updateQuantity({ key: item.key, quantity: item.quantity - 1 }))} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>−</button>
                    <span className="w-6 text-center text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.quantity}</span>
                    <button onClick={() => dispatch(updateQuantity({ key: item.key, quantity: item.quantity + 1 }))} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>+</button>
                  </div>
                  <button onClick={() => dispatch(removeFromCart(item.key))} className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={15} /></button>
                </div>
              ))}
              <div className="flex justify-end mt-2">
                <button onClick={() => setActiveTab("address")} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Continue to Address →</button>
              </div>
            </div>
          )}

          {/* Address Tab */}
          {activeTab === "address" && (
            <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Billing / Shipping Address</h2>
                {profileLoading && <Spinner size={16} />}
              </div>

              {addressFromProfile && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
                  <AlertCircle size={14} className="text-blue-500 shrink-0" />
                  <span style={{ color: "var(--text-secondary)" }}>Address auto-filled from your profile. You can edit it below.</span>
                </div>
              )}

              {!addressFromProfile && !profileLoading && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: "#fef9c3", border: "1px solid #fde68a" }}>
                  <AlertCircle size={14} className="text-yellow-600 shrink-0 mt-0.5" />
                  <span className="text-yellow-700">
                    No address found in your profile. Please fill in your delivery address below.{" "}
                    <a href="/portal/profile" className="underline font-medium">Update Profile</a> to save for future orders.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ["line1", "Address Line 1 *", "sm:col-span-2"],
                  ["city", "City *", ""],
                  ["state", "State", ""],
                  ["pincode", "PIN Code", ""],
                  ["country", "Country", ""],
                ].map(([key, label, cls]) => (
                  <FormField key={key} label={label} className={cls}>
                    <input
                      value={address[key]}
                      onChange={(e) => setAddress(a => ({ ...a, [key]: e.target.value }))}
                      placeholder={label.replace(" *", "")}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                      style={inp}
                    />
                  </FormField>
                ))}
              </div>

              <div className="flex justify-between mt-2">
                <button onClick={() => setActiveTab("order")} className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-black/5" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>← Back</button>
                <button
                  onClick={() => { if (validateAddress()) setActiveTab("payment"); }}
                  className="px-6 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}

          {/* Payment Tab */}
          {activeTab === "payment" && (
            <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
              <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Payment</h2>

              {paymentMethod === "online" ? (
                <div className="p-4 rounded-xl text-sm flex items-start gap-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
                  <CreditCard size={20} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>Razorpay Secure Payment</p>
                    <p style={{ color: "var(--text-secondary)" }}>
                      Click <strong>"Pay ₹{total.toFixed(0)} Online"</strong> to open the Razorpay payment window.
                      Your invoice will be marked as <span className="text-green-600 font-semibold">Paid</span> instantly and
                      a confirmation email will be sent to you.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl text-sm flex items-start gap-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
                  <Banknote size={20} className="text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>Cash on Delivery</p>
                    <p style={{ color: "var(--text-secondary)" }}>Your order will be confirmed and an invoice will be emailed to you. Payment is collected on delivery.</p>
                  </div>
                </div>
              )}

              <div className="rounded-xl p-3 text-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
                <p className="font-medium mb-0.5" style={{ color: "var(--text-primary)" }}>Delivering to:</p>
                <p style={{ color: "var(--text-secondary)" }}>
                  {address.line1}, {address.city}{address.state ? `, ${address.state}` : ""} {address.pincode} — {address.country}
                </p>
              </div>

              <div className="flex justify-start">
                <button onClick={() => setActiveTab("address")} className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-black/5" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>← Back to Address</button>
              </div>
            </div>
          )}
        </div>

        <div><OrderSummaryBox /></div>
      </div>
    </div>
  );
}
