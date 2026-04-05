/**
 * src/pages/portal/Shop.jsx
 * Portal Home / Shop Page — Screen 1
 * Displays all active products as cards with pricing info.
 */
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ShoppingCart, Package, Star } from "lucide-react";
import api from "../../configs/api";
import { Spinner } from "../../components/common/UI";

export default function Shop() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get("/api/portal/products"),
      api.get("/api/portal/recurring-plans"),
    ]).then(([p, pl]) => { setProducts(p.data); setPlans(pl.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && gridRef.current) {
      gsap.fromTo(gridRef.current.querySelectorAll(".product-card"),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: "power2.out" }
      );
    }
  }, [loading]);

  const getLowestPrice = (product) => {
    if (product.recurring_prices?.length) {
      return Math.min(...product.recurring_prices.map(r => parseFloat(r.price)));
    }
    return parseFloat(product.sales_price) || 0;
  };

  const getMonthlyPlan = () => plans.find(p => p.billing_period === "monthly");

  if (loading) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="text-center py-12 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-4"
          style={{ background: "#dbeafe", color: "#1d4ed8" }}>
          <Star size={14} /> Flexible Subscription Plans
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
          Choose the right plan for your business
        </h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
          From CRM to analytics — everything you need to grow, on a subscription that works for you.
        </p>
      </div>

      {/* Product Grid */}
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {products.map(product => (
          <div key={product.id}
            className="product-card group rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            onClick={() => navigate(`/portal/products/${product.id}`)}
          >
            {/* Product Image */}
            <div className="h-44 overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Package size={32} className="text-blue-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4">
              <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                {product.product_type}
              </div>
              <h3 className="font-semibold text-sm leading-tight mb-1" style={{ color: "var(--text-primary)" }}>
                {product.name}
              </h3>
              {product.description && (
                <p className="text-xs line-clamp-2 mb-3" style={{ color: "var(--text-muted)" }}>
                  {product.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    ₹{getLowestPrice(product).toLocaleString()}
                  </span>
                  <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>
                    /{getMonthlyPlan()?.billing_period || "month"}
                  </span>
                </div>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  onClick={(e) => { e.stopPropagation(); navigate(`/portal/products/${product.id}`); }}
                >
                  <ShoppingCart size={12} /> View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!products.length && (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>No products available</h3>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Check back soon for new offerings.</p>
        </div>
      )}
    </div>
  );
}