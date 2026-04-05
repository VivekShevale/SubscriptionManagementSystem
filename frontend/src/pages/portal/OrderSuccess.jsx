/**
 * src/pages/portal/OrderSuccess.jsx
 * Order Success Page — Screen 4 (Portal)
 * ----------------------------------------
 * Shown after successful checkout. Displays thank-you message,
 * clickable order ID, print button, and order summary box.
 * GSAP entrance animation for the success card.
 */

import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { gsap } from "gsap";
import { CheckCircle, Printer, ArrowLeft, Package, Download, CreditCard, Banknote } from "lucide-react";

export default function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  // Order data passed via router state from Cart checkout
  const { order, invoice, items = [], subtotal = 0, taxAmt = 0, total = 0, paymentMethod = "cash" } = location.state || {};
  const cardRef = useRef(null);

  // ── GSAP entrance animation ──────────────────────────────────────────────
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, scale: 0.9, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(1.2)" }
      );
    }
  }, []);

  // Print receipt function
  const handlePrint = () => {
    const printContent = document.getElementById('print-receipt-content');
    const originalTitle = document.title;
    
    if (!printContent) return;
    
    // Clone the content to print
    const printWindow = window.open('', '_blank');
    const clonedContent = printContent.cloneNode(true);
    
    // Get current date for receipt
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN');
    
    // Create print styles
    const styles = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          padding: 40px 20px;
          background: white;
          color: #333;
        }
        
        .receipt-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 30px;
        }
        
        .receipt-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #4CAF50;
        }
        
        .receipt-header h1 {
          color: #4CAF50;
          font-size: 28px;
          margin-bottom: 10px;
        }
        
        .receipt-header h3 {
          color: #666;
          font-size: 16px;
          margin-top: 5px;
        }
        
        .order-info {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .order-info p {
          margin: 8px 0;
          font-size: 14px;
        }
        
        .order-info strong {
          color: #333;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .items-table th {
          background: #f5f5f5;
          padding: 12px;
          text-align: left;
          font-weight: bold;
          border-bottom: 2px solid #ddd;
        }
        
        .items-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #eee;
        }
        
        .totals {
          margin-top: 20px;
          text-align: right;
          padding-top: 15px;
          border-top: 2px solid #ddd;
        }
        
        .totals p {
          margin: 8px 0;
          font-size: 14px;
        }
        
        .totals .grand-total {
          font-size: 18px;
          font-weight: bold;
          color: #4CAF50;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
        }
        
        .payment-badge {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .payment-online {
          background: #e8f5e9;
          color: #2e7d32;
        }
        
        .payment-cash {
          background: #fff3e0;
          color: #e65100;
        }
        
        .receipt-footer {
          margin-top: 30px;
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #999;
        }
        
        @media print {
          body {
            padding: 0;
            margin: 0;
          }
          
          .receipt-container {
            border: none;
            padding: 20px;
          }
          
          .no-print {
            display: none;
          }
        }
      </style>
    `;
    
    // Build the HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Receipt - ${order?.subscription_number || 'Order'}</title>
        ${styles}
      </head>
      <body>
        <div class="receipt-container">
          <div class="receipt-header">
            <h1>🧾 Order Receipt</h1>
            <h3>Thank you for your purchase!</h3>
          </div>
          
          <div class="order-info">
            <p><strong>Order ID:</strong> ${order?.subscription_number || 'N/A'}</p>
            <p><strong>Order Date:</strong> ${dateStr} at ${timeStr}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod === 'online' ? 'Online Payment (Razorpay)' : 'Cash on Delivery'}</p>
            <p><strong>Order Status:</strong> ${order?.status || 'Processing'}</p>
          </div>
          
          <table class="items-table">
            <thead>
              <tr><th>Product</th><th>Quantity</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.product?.name || item.name}</td>
                  <td>${item.quantity}</td>
                  <td>₹${((item.product?.sales_price || item.price || 0)).toLocaleString()}</td>
                  <td>₹${((item.product?.sales_price || item.price || 0) * item.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <p><strong>Subtotal:</strong> ₹${subtotal.toLocaleString()}</p>
            <p><strong>Tax (18% GST):</strong> ₹${taxAmt.toLocaleString()}</p>
            <p class="grand-total"><strong>Total Amount:</strong> ₹${total.toLocaleString()}</p>
          </div>
          
          <div class="receipt-footer">
            <p>This is a computer-generated receipt and requires no signature.</p>
            <p>For any queries, please contact our support team.</p>
            <p>© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  };

  // If no order data, redirect to shop
  if (!order) {
    return (
      <div className="text-center py-20">
        <p style={{ color: "var(--text-muted)" }}>No order found.</p>
        <button
          onClick={() => navigate("/portal")}
          className="mt-4 text-blue-500 hover:underline text-sm"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Hidden print content */}
      <div id="print-receipt-content" style={{ display: 'none' }}>
        {/* This div is just a placeholder - actual print content is generated in handlePrint */}
      </div>
      
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left: Thank You Message ─────────────────────────────────────── */}
          <div className="lg:col-span-2" ref={cardRef}>
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              {/* Success Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={44} className="text-green-600" />
                </div>
              </div>

              <h1
                className="text-3xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Thanks for your order! 🎉
              </h1>
              <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                Your subscription has been created and is being processed.
              </p>

              {/* Payment method badge */}
              <div className="flex justify-center mb-5">
                {paymentMethod === "online" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                    <CreditCard size={13} /> Paid via Razorpay ✓
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
                    <Banknote size={13} /> Cash on Delivery
                  </span>
                )}
              </div>

              {/* Order ID — clickable to order detail page */}
              <Link
                to={`/portal/orders/${order.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono font-bold text-lg transition-colors border border-blue-200"
              >
                <Package size={20} />
                {order.subscription_number}
              </Link>

              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                Click your order ID to view full details
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Printer size={16} /> Print Receipt
                </button>

                {/* {invoice?.id && (
                  <Link
                    to={`/portal/invoices/${invoice.id}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-all"
                  >
                    <Download size={16} /> Download Invoice
                  </Link>
                )} */}

                <Link
                  to="/portal/orders"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all"
                >
                  My Orders
                </Link>

                <Link
                  to="/portal"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
                  <ArrowLeft size={16} /> Back to Shop
                </Link>
              </div>
            </div>
          </div>

          {/* ── Right: Order Summary Box ─────────────────────────────────────── */}
          <div>
            <div
              className="rounded-2xl p-6 space-y-4 sticky top-24"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow)",
              }}
            >
              <h2
                className="font-bold text-sm border-b pb-3"
                style={{
                  color: "var(--text-primary)",
                  borderColor: "var(--border-color)",
                }}
              >
                Order Summary
              </h2>

              {/* Product list */}
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm shrink-0">
                        📦
                      </div>
                      <span
                        className="truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {item.product?.name || item.name}
                      </span>
                      {item.quantity > 1 && (
                        <span
                          className="text-xs shrink-0"
                          style={{ color: "var(--text-muted)" }}
                        >
                          ×{item.quantity}
                        </span>
                      )}
                    </div>
                    <span
                      className="font-semibold shrink-0 ml-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      ₹{((item.product?.sales_price || item.price || 0) * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div
                className="border-t pt-3 space-y-1.5"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>Taxes (18% GST)</span>
                  <span>₹{taxAmt.toLocaleString()}</span>
                </div>
                <div
                  className="flex justify-between text-base font-bold border-t pt-2"
                  style={{
                    color: "var(--text-primary)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}