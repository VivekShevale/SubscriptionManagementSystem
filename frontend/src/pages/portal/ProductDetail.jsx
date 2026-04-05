/**
 * src/pages/portal/ProductDetail.jsx
 * Product Detail Page — Screen 2
 * Shows pricing table, variants, quantity selector, add-to-cart.
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ShoppingCart, Package, ChevronLeft, Shield, RefreshCw, Truck } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../configs/api";
import { addToCart } from "../../store/slices/cartSlice";
import { Spinner } from "../../components/common/UI";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [product, setProduct] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/api/portal/products/${id}`), api.get("/api/portal/recurring-plans")])
      .then(([p, pl]) => {
        setProduct(p.data);
        setPlans(pl.data);
        if (pl.data.length) setSelectedPlan(pl.data[0]);
      }).catch(() => toast.error("Failed to load product."))
      .finally(() => setLoading(false));
  }, [id]);

  const getPrice = () => {
    if (!product) return 0;
    let base = parseFloat(product.sales_price) || 0;
    if (selectedPlan && product.recurring_prices?.length) {
      const rp = product.recurring_prices.find(r => r.recurring_plan_id === selectedPlan.id);
      if (rp) base = parseFloat(rp.price) || base;
    }
    if (selectedVariant) base += parseFloat(selectedVariant.extra_price) || 0;
    return base;
  };

  const getMonthlyEquivalent = (plan, price) => {
    if (!plan) return price;
    if (plan.billing_period === "monthly") return price / plan.billing_period_count;
    if (plan.billing_period === "yearly") return price / 12;
    if (plan.billing_period === "weekly") return (price * 52) / 12;
    return price;
  };

  const getDiscount = (plan, price) => {
    const monthly = plans.find(p => p.billing_period === "monthly" && p.billing_period_count === 1);
    if (!monthly || !plan || plan.id === monthly.id) return 0;
    const monthlyPrice = parseFloat(product?.sales_price) || 0;
    const monthlyEquiv = getMonthlyEquivalent(plan, price);
    if (monthlyPrice === 0) return 0;
    return Math.round(((monthlyPrice - monthlyEquiv) / monthlyPrice) * 100);
  };

  const handleAddToCart = () => {
    if (!product) return;
    dispatch(addToCart({ product, variantId: selectedVariant?.id, quantity, planId: selectedPlan?.id }));
    toast.success(`${product.name} added to cart!`);
    navigate("/portal/cart");
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={36} /></div>;
  if (!product) return <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>Product not found.</div>;

  const currentPrice = getPrice();

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate("/portal/shop")} className="flex items-center gap-1.5 text-sm transition-colors hover:text-blue-500" style={{ color: "var(--text-muted)" }}>
        <ChevronLeft size={16} /> Back to Shop
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Images */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={80} style={{ color: "var(--text-muted)" }} />
              </div>
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-5">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              {product.product_type}
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{product.name}</h1>
            {product.description && <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>{product.description}</p>}
          </div>

          {/* Pricing Table */}
          {plans.length > 0 && (
            <div>
              <div className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Choose your billing plan</div>
              <div className="space-y-2">
                {plans.map(plan => {
                  const rp = product.recurring_prices?.find(r => r.recurring_plan_id === plan.id);
                  const price = parseFloat(rp?.price || product.sales_price) || 0;
                  const monthlyEq = getMonthlyEquivalent(plan, price);
                  const disc = getDiscount(plan, price);
                  const isSelected = selectedPlan?.id === plan.id;
                  return (
                    <div key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${isSelected ? "ring-2 ring-blue-600" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
                      style={{ background: isSelected ? "#dbeafe" : "var(--bg-secondary)", border: isSelected ? "1px solid #3b82f6" : "1px solid var(--border-color)" }}
                    >
                      <div>
                        <div className="font-medium text-sm" style={{ color: isSelected ? "#1d4ed8" : "var(--text-primary)" }}>
                          {plan.billing_period_count} {plan.billing_period.charAt(0).toUpperCase() + plan.billing_period.slice(1)}
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          ₹{monthlyEq.toFixed(0)}/month
                          {disc > 0 && <span className="ml-1 text-green-600 font-semibold">[{disc}% off]</span>}
                        </div>
                      </div>
                      <div className="font-bold text-lg" style={{ color: isSelected ? "#1d4ed8" : "var(--text-primary)" }}>
                        ₹{price.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div>
              <div className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Available Variants</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedVariant(null)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${!selectedVariant ? "bg-blue-600 text-white" : "border hover:bg-black/5"}`}
                  style={!selectedVariant ? {} : { borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                  Base
                </button>
                {product.variants.map(v => (
                  <button key={v.id} onClick={() => setSelectedVariant(v)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${selectedVariant?.id === v.id ? "bg-blue-600 text-white" : "border hover:bg-black/5"}`}
                    style={selectedVariant?.id !== v.id ? { borderColor: "var(--border-color)", color: "var(--text-secondary)" } : {}}>
                    {v.attribute_value} {v.extra_price > 0 && `+₹${v.extra_price}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Quantity</div>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold transition-colors hover:bg-black/10"
                style={{ border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>−</button>
              <span className="w-10 text-center font-semibold text-lg" style={{ color: "var(--text-primary)" }}>{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold transition-colors hover:bg-black/10"
                style={{ border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>+</button>
            </div>
          </div>

          {/* Total Price */}
          <div className="py-3 border-t border-b" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between">
              <span className="font-medium" style={{ color: "var(--text-secondary)" }}>Total</span>
              <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>₹{(currentPrice * quantity).toLocaleString()}</span>
            </div>
          </div>

          {/* Add to Cart */}
          <button onClick={handleAddToCart}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]">
            <ShoppingCart size={18} /> Add to Cart
          </button>

          {/* Terms & Conditions */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Shield, text: "30-day money back guarantee" },
              { icon: RefreshCw, text: "Cancel anytime" },
              { icon: Truck, text: "Instant activation" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center text-center gap-1.5 p-3 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                <Icon size={16} className="text-blue-500" />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}