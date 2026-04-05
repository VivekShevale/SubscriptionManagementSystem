/**
 * src/App.jsx
 * Root Application Component
 * ---------------------------
 * Defines all routes for:
 * - Auth pages (login, signup, forgot/reset password)
 * - Admin/Internal pages (protected by role)
 * - Portal pages (customer-facing shop and account)
 *
 * Uses React Router v6 with nested layouts.
 */

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";
import { selectCurrentUser, selectIsAuthenticated } from "./store/slices/authSlice";

// ── Layouts ──────────────────────────────────────────────────────────────────
import AdminLayout from "./layout/AdminLayout";
import PortalLayout from "./layout/PortalLayout";

// ── Auth Pages ───────────────────────────────────────────────────────────────
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// ── Admin / Internal Pages ────────────────────────────────────────────────────
import Dashboard from "./pages/admin/Dashboard";
import Subscriptions from "./pages/admin/Subscriptions";
import SubscriptionForm from "./pages/admin/SubscriptionForm";
import Products from "./pages/admin/Products";
import ProductForm from "./pages/admin/ProductForm";
import RecurringPlans from "./pages/admin/RecurringPlans";
import RecurringPlanForm from "./pages/admin/RecurringPlanForm";
import Invoices from "./pages/admin/Invoices";
import InvoiceForm from "./pages/admin/InvoiceForm";
import Contacts from "./pages/admin/Contacts";
import ContactForm from "./pages/admin/ContactForm";
import Attributes from "./pages/admin/Attributes";
import AttributeForm from "./pages/admin/AttributeForm";
import QuotationTemplates from "./pages/admin/QuotationTemplates";
import QuotationTemplateForm from "./pages/admin/QuotationTemplateForm";
import Discounts from "./pages/admin/Discounts";
import DiscountForm from "./pages/admin/DiscountForm";
import Taxes from "./pages/admin/Taxes";
import TaxForm from "./pages/admin/TaxForm";
import UserRoles from "./pages/admin/UserRoles";
import CreateInternalUser from "./pages/admin/CreateInternalUser";
import Reports from "./pages/admin/Reports";
import AdminProfile from "./pages/admin/AdminProfile";

// ── Portal Pages ──────────────────────────────────────────────────────────────
import Shop from "./pages/portal/Shop";
import ProductDetail from "./pages/portal/ProductDetail";
import Cart from "./pages/portal/Cart";
import OrderSuccess from "./pages/portal/OrderSuccess";
import Orders from "./pages/portal/Orders";
import OrderDetail from "./pages/portal/OrderDetail";
import PortalInvoice from "./pages/portal/PortalInvoice";
import PortalProfile from "./pages/portal/PortalProfile";


// ── Route Guards ──────────────────────────────────────────────────────────────

/** Redirect unauthenticated users to login */
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

/** Redirect portal users away from admin routes */
const AdminRoute = ({ children }) => {
  const user = useSelector(selectCurrentUser);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "portal") return <Navigate to="/portal" replace />;
  return children;
};

/** Redirect admin/internal users away from portal */
const PortalRoute = ({ children }) => {
  const user = useSelector(selectCurrentUser);
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

/** Redirect authenticated users based on role after login */
const AuthRedirect = ({ children }) => {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  if (isAuthenticated) {
    return user?.role === "portal"
      ? <Navigate to="/portal" replace />
      : <Navigate to="/admin/dashboard" replace />;
  }
  return children;
};


export default function App() {
  return (
    <>
      {/* React Hot Toast notification container */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "10px",
            fontSize: "14px",
          },
        }}
      />

      <Routes>
        {/* ── Root redirect ─────────────────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ── Auth Routes ───────────────────────────────────────────────── */}
        <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
        <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Admin / Internal Routes ───────────────────────────────────── */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Subscriptions */}
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="subscriptions/new" element={<SubscriptionForm />} />
          <Route path="subscriptions/:id" element={<SubscriptionForm />} />

          {/* Products */}
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductForm />} />

          {/* Recurring Plans */}
          <Route path="recurring-plans" element={<RecurringPlans />} />
          <Route path="recurring-plans/new" element={<RecurringPlanForm />} />
          <Route path="recurring-plans/:id" element={<RecurringPlanForm />} />

          {/* Invoices */}
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/new" element={<InvoiceForm />} />
          <Route path="invoices/:id" element={<InvoiceForm />} />

          {/* Contacts */}
          <Route path="contacts" element={<Contacts />} />
          <Route path="contacts/new" element={<ContactForm />} />
          <Route path="contacts/:id" element={<ContactForm />} />

          {/* Configuration */}
          <Route path="attributes" element={<Attributes />} />
          <Route path="attributes/new" element={<AttributeForm />} />
          <Route path="attributes/:id" element={<AttributeForm />} />

          <Route path="quotation-templates" element={<QuotationTemplates />} />
          <Route path="quotation-templates/new" element={<QuotationTemplateForm />} />
          <Route path="quotation-templates/:id" element={<QuotationTemplateForm />} />

          <Route path="discounts" element={<Discounts />} />
          <Route path="discounts/new" element={<DiscountForm />} />
          <Route path="discounts/:id" element={<DiscountForm />} />

          <Route path="taxes" element={<Taxes />} />
          <Route path="taxes/new" element={<TaxForm />} />
          <Route path="taxes/:id" element={<TaxForm />} />

          {/* User Management (Admin only) */}
          <Route path="user-roles" element={<UserRoles />} />
          <Route path="user-roles/new" element={<CreateInternalUser />} />

          {/* Reports */}
          <Route path="reports" element={<Reports />} />

          {/* Profile */}
          <Route path="profile" element={<AdminProfile />} />
        </Route>

        {/* ── Portal Routes ─────────────────────────────────────────────── */}
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<Shop />} />
          <Route path="shop" element={<Shop />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="cart" element={<PortalRoute><Cart /></PortalRoute>} />
          <Route path="order-success" element={<PortalRoute><OrderSuccess /></PortalRoute>} />
          <Route path="orders" element={<PortalRoute><Orders /></PortalRoute>} />
          <Route path="orders/:id" element={<PortalRoute><OrderDetail /></PortalRoute>} />
          <Route path="orders/:orderId/invoices/:invoiceId" element={<PortalRoute><PortalInvoice /></PortalRoute>} />
          <Route path="profile" element={<PortalRoute><PortalProfile /></PortalRoute>} />
        </Route>

        {/* ── 404 fallback ──────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}