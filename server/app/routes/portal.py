"""
app/routes/portal.py
Portal Blueprint
-----------------
Customer-facing endpoints for the portal/shop experience.
Portal users can: browse products, place subscription orders,
view their orders, invoices, and make payments.
"""

import os
import razorpay
import hmac
import hashlib
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from app import db
from app.models import (
    Product, Subscription, SubscriptionLine, Invoice, InvoiceLine,
    Payment, Contact, RecurringPlan, Discount, Tax, User
)
from app.utils.helpers import generate_subscription_number, generate_invoice_number, compute_next_invoice_date
from app.utils.email import send_invoice_paid_email, send_invoice_email

portal_bp = Blueprint("portal", __name__)


def get_razorpay_client():
    return razorpay.Client(
        auth=(
            os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder"),
            os.getenv("RAZORPAY_KEY_SECRET", "placeholder_secret"),
        )
    )


def _get_portal_contact():
    """Get the Contact record linked to the current portal user."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return None
    return Contact.query.filter_by(user_id=user_id).first()


@portal_bp.route("/products", methods=["GET"])
def list_shop_products():
    """Public product listing for portal shop. No auth required."""
    products = Product.query.filter_by(is_active=True).order_by(Product.name).all()
    return jsonify([p.to_dict() for p in products]), 200


@portal_bp.route("/products/<int:product_id>", methods=["GET"])
def get_shop_product(product_id):
    """Get single product details for the portal product page."""
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict()), 200


@portal_bp.route("/recurring-plans", methods=["GET"])
def list_public_plans():
    """List active recurring plans for the portal product pricing display."""
    plans = RecurringPlan.query.filter_by(is_active=True).all()
    return jsonify([p.to_dict() for p in plans]), 200


@portal_bp.route("/orders", methods=["GET"])
@jwt_required()
def get_my_orders():
    """
    Get all subscriptions/orders for the current portal user.
    Filters by the linked contact record.
    """
    contact = _get_portal_contact()
    if not contact:
        return jsonify([]), 200

    subs = Subscription.query.filter_by(customer_id=contact.id).order_by(
        Subscription.created_at.desc()
    ).all()
    return jsonify([s.to_dict() for s in subs]), 200


@portal_bp.route("/orders/<int:sub_id>", methods=["GET"])
@jwt_required()
def get_my_order(sub_id):
    """Get a specific subscription order for the portal user."""
    contact = _get_portal_contact()
    if not contact:
        return jsonify({"error": "Contact not found."}), 404

    sub = Subscription.query.filter_by(id=sub_id, customer_id=contact.id).first()
    if not sub:
        return jsonify({"error": "Order not found."}), 404

    return jsonify(sub.to_dict()), 200


@portal_bp.route("/orders/<int:sub_id>/invoices", methods=["GET"])
@jwt_required()
def get_my_order_invoices(sub_id):
    """Get all invoices for a specific portal order."""
    contact = _get_portal_contact()
    if not contact:
        return jsonify({"error": "Contact not found."}), 404

    sub = Subscription.query.filter_by(id=sub_id, customer_id=contact.id).first()
    if not sub:
        return jsonify({"error": "Order not found."}), 404

    invoices = Invoice.query.filter_by(subscription_id=sub_id).all()
    return jsonify([i.to_dict() for i in invoices]), 200


@portal_bp.route("/invoices/<int:inv_id>", methods=["GET"])
@jwt_required()
def get_my_invoice(inv_id):
    """Get a specific invoice for the current portal user."""
    contact = _get_portal_contact()
    if not contact:
        return jsonify({"error": "Contact not found."}), 404

    invoice = Invoice.query.filter_by(id=inv_id, customer_id=contact.id).first()
    if not invoice:
        return jsonify({"error": "Invoice not found."}), 404

    return jsonify(invoice.to_dict()), 200


@portal_bp.route("/checkout", methods=["POST"])
@jwt_required()
def checkout():
    """
    Process cart checkout and create a subscription order.
    payment_method: 'cash' → invoice status 'confirmed' (pay later)
                    'online' → returns invoice_id + razorpay order details; invoice stays 'confirmed' until verify-payment called
    Address from profile is used automatically; if missing, address fields are required.
    """
    contact = _get_portal_contact()
    if not contact:
        return jsonify({"error": "Contact profile not found. Please update your profile first."}), 400

    data = request.get_json()
    cart_items = data.get("items", [])
    discount_code = data.get("discount_code", "")
    plan_id = data.get("plan_id")
    payment_method = data.get("payment_method", "cash")  # 'cash' | 'online'

    # Address: use profile address or fall back to submitted address
    address_fields = data.get("address", {})
    shipping_address = (
        contact.address or address_fields.get("line1", "")
    )
    if not shipping_address:
        return jsonify({"error": "Delivery address is required. Please update your profile or provide an address."}), 400

    if not cart_items:
        return jsonify({"error": "Cart is empty."}), 400

    plan = RecurringPlan.query.get(plan_id) if plan_id else None

    # Validate and apply discount
    discount = None
    if discount_code:
        discount = Discount.query.filter_by(name=discount_code, is_active=True).first()
        if discount:
            today_check = date.today()
            if discount.start_date and today_check < discount.start_date:
                discount = None
            elif discount.end_date and today_check > discount.end_date:
                discount = None
            elif discount.limit_usage and discount.usage_count >= (discount.usage_limit or 0):
                discount = None

    sub_number = generate_subscription_number()
    today = date.today()

    sub = Subscription(
        subscription_number=sub_number,
        customer_id=contact.id,
        plan_id=plan_id,
        status="confirmed",
        start_date=today,
        order_date=today,
        discount_id=discount.id if discount else None,
    )
    if plan:
        sub.next_invoice_date = compute_next_invoice_date(
            today, plan.billing_period, plan.billing_period_count
        )
    db.session.add(sub)
    db.session.flush()

    for item in cart_items:
        product = Product.query.get(item.get("product_id"))
        if not product:
            continue

        unit_price = float(product.sales_price or 0)
        if item.get("variant_id"):
            from app.models import ProductVariant
            variant = ProductVariant.query.get(item["variant_id"])
            if variant:
                unit_price += float(variant.extra_price or 0)

        disc_pct = 0
        if discount and discount.discount_type == "percentage":
            disc_pct = float(discount.value)

        tax_ids = [t.id for t in product.taxes]
        sl = SubscriptionLine(
            subscription_id=sub.id,
            product_id=product.id,
            variant_id=item.get("variant_id"),
            quantity=item.get("quantity", 1),
            unit_price=unit_price,
            discount_pct=disc_pct,
            tax_ids=tax_ids,
        )
        db.session.add(sl)

    if discount:
        discount.usage_count = (discount.usage_count or 0) + 1

    # Auto-generate invoice
    inv_number = generate_invoice_number()
    invoice = Invoice(
        invoice_number=inv_number,
        subscription_id=sub.id,
        customer_id=contact.id,
        invoice_date=today,
        status="confirmed",
    )
    db.session.add(invoice)
    db.session.flush()

    for sl in sub.order_lines:
        il = InvoiceLine(
            invoice_id=invoice.id,
            product_id=sl.product_id,
            description=sl.product.name if sl.product else "",
            quantity=sl.quantity,
            unit_price=sl.unit_price,
            discount_pct=sl.discount_pct,
            tax_ids=sl.tax_ids,
        )
        db.session.add(il)

    db.session.commit()
    db.session.refresh(invoice)

    # For online payment: create Razorpay order and return details
    if payment_method == "online":
        try:
            client = get_razorpay_client()
            amount_paise = int(float(invoice.amount_due) * 100)
            rp_order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": invoice.invoice_number,
                "notes": {"invoice_id": str(invoice.id), "subscription_id": str(sub.id)},
            })
            return jsonify({
                "message": "Order created. Complete payment to confirm.",
                "subscription": sub.to_dict(),
                "invoice": invoice.to_dict(),
                "razorpay_order_id": rp_order["id"],
                "amount": rp_order["amount"],
                "currency": rp_order["currency"],
                "key_id": os.getenv("RAZORPAY_KEY_ID", ""),
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to create Razorpay order: {str(e)}"}), 500

    # Cash payment: send invoice email to buyer
    try:
        send_invoice_email(contact.email, contact.name, invoice.invoice_number, float(invoice.amount_due))
    except Exception:
        pass  # don't block order on email failure

    return jsonify({
        "message": "Order placed successfully.",
        "subscription": sub.to_dict(),
        "invoice": invoice.to_dict(),
    }), 201


@portal_bp.route("/checkout/verify-payment", methods=["POST"])
@jwt_required()
def verify_portal_payment():
    """
    Verify Razorpay payment after online checkout.
    Marks invoice as 'paid', creates a Payment record, and sends confirmation email.
    """
    contact = _get_portal_contact()
    if not contact:
        return jsonify({"error": "Contact not found."}), 404

    data = request.get_json()
    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_signature = data.get("razorpay_signature")
    invoice_id = data.get("invoice_id")

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id]):
        return jsonify({"error": "Missing required payment details."}), 400

    # Verify signature
    secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    body = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, razorpay_signature):
        return jsonify({"error": "Invalid payment signature."}), 400

    invoice = Invoice.query.filter_by(id=invoice_id, customer_id=contact.id).first()
    if not invoice:
        return jsonify({"error": "Invoice not found."}), 404

    # Record payment
    payment = Payment(
        invoice_id=invoice.id,
        payment_method="razorpay",
        amount=float(invoice.amount_due),
        payment_date=date.today(),
        status="completed",
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_signature=razorpay_signature,
    )
    db.session.add(payment)
    db.session.flush()
    db.session.refresh(invoice)

    invoice.status = "paid"
    db.session.commit()

    # Send paid confirmation email
    try:
        sub = invoice.subscription
        send_invoice_paid_email(
            contact.email, contact.name,
            invoice.invoice_number, float(payment.amount),
            sub.subscription_number if sub else ""
        )
    except Exception:
        pass

    return jsonify({
        "message": "Payment verified successfully.",
        "subscription": invoice.subscription.to_dict() if invoice.subscription else None,
        "invoice": invoice.to_dict(),
    }), 200


@portal_bp.route("/orders/<int:sub_id>/renew", methods=["POST"])
@jwt_required()
def renew_my_order(sub_id):
    """Renew a portal subscription from the customer side."""
    contact = _get_portal_contact()
    if not contact:
        return jsonify({"error": "Contact not found."}), 404

    sub = Subscription.query.filter_by(id=sub_id, customer_id=contact.id).first()
    if not sub:
        return jsonify({"error": "Order not found."}), 404

    new_number = generate_subscription_number()
    today = date.today()
    new_sub = Subscription(
        subscription_number=new_number,
        customer_id=contact.id,
        plan_id=sub.plan_id,
        status="confirmed",
        start_date=today,
        order_date=today,
    )
    if sub.plan:
        new_sub.next_invoice_date = compute_next_invoice_date(
            today, sub.plan.billing_period, sub.plan.billing_period_count
        )
    db.session.add(new_sub)
    db.session.flush()

    for sl in sub.order_lines:
        db.session.add(SubscriptionLine(
            subscription_id=new_sub.id,
            product_id=sl.product_id,
            variant_id=sl.variant_id,
            quantity=sl.quantity,
            unit_price=sl.unit_price,
            discount_pct=sl.discount_pct,
            tax_ids=sl.tax_ids,
        ))

    db.session.commit()
    return jsonify({"message": "Subscription renewed.", "subscription": new_sub.to_dict()}), 201


@portal_bp.route("/orders/<int:sub_id>/close", methods=["POST"])
@jwt_required()
def close_my_order(sub_id):
    """Allow portal user to close their own subscription."""
    contact = _get_portal_contact()
    if not contact:
        return jsonify({"error": "Contact not found."}), 404
    sub = Subscription.query.filter_by(id=sub_id, customer_id=contact.id).first()
    if not sub:
        return jsonify({"error": "Order not found."}), 404

    if sub.plan and not sub.plan.is_closable:
        return jsonify({"error": "This subscription plan does not allow self-closure."}), 400

    sub.status = "closed"
    db.session.commit()
    return jsonify({"message": "Subscription closed.", "subscription": sub.to_dict()}), 200


@portal_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_portal_profile():
    """Get current portal user's profile and contact details."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    contact = Contact.query.filter_by(user_id=user_id).first()
    return jsonify({
        "user": user.to_dict(),
        "contact": contact.to_dict() if contact else None,
    }), 200


@portal_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_portal_profile():
    """Update portal user's contact/profile information."""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    contact = Contact.query.filter_by(user_id=user_id).first()
    if not contact:
        contact = Contact(user_id=user_id, email=data.get("email", ""), name=data.get("name", ""))
        db.session.add(contact)

    contact.name = data.get("name", contact.name)
    contact.phone = data.get("phone", contact.phone)
    contact.address = data.get("address", contact.address)
    contact.city = data.get("city", contact.city)
    contact.country = data.get("country", contact.country)

    db.session.commit()
    return jsonify({"message": "Profile updated.", "contact": contact.to_dict()}), 200