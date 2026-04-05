"""
app/routes/subscriptions.py
Subscriptions Blueprint
------------------------
Full subscription lifecycle management:
Draft → Quotation → Quotation Sent → Confirmed → Active → Closed
Includes send quotation, confirm, create invoice, renew, upsell, close.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import date
from app import db
from app.models import (
    Subscription, SubscriptionLine, Invoice, InvoiceLine, Contact,
    RecurringPlan, QuotationTemplate, Tax
)
from app.utils.helpers import (
    generate_subscription_number, generate_invoice_number,
    compute_next_invoice_date, admin_or_internal_required, get_current_user
)
from app.utils.email import send_quotation_email
import os
from app.utils.helpers import admin_required

subscriptions_bp = Blueprint("subscriptions", __name__)


@subscriptions_bp.route("/", methods=["GET"], strict_slashes=False)
@jwt_required()
@admin_or_internal_required
def list_subscriptions():
    """
    List all subscriptions with optional filtering.
    Supports search by customer name, status, plan.
    """
    status = request.args.get("status", "")
    customer_id = request.args.get("customer_id", "")
    plan_id = request.args.get("plan_id", "")
    search = request.args.get("q", "")
    limit = request.args.get("limit", "")

    query = Subscription.query
    if status:
        query = query.filter_by(status=status)
    if customer_id:
        query = query.filter_by(customer_id=int(customer_id))
    if plan_id:
        query = query.filter_by(plan_id=int(plan_id))
    if search:
        query = query.join(Contact, isouter=True).filter(
            (Subscription.subscription_number.ilike(f"%{search}%")) |
            (Contact.name.ilike(f"%{search}%"))
        )

    query = query.order_by(Subscription.created_at.desc())
    if limit:
        try:
            query = query.limit(int(limit))
        except ValueError:
            pass

    subs = query.all()
    return jsonify([s.to_dict() for s in subs]), 200


@subscriptions_bp.route("/<int:sub_id>", methods=["GET"])
@jwt_required()
def get_subscription(sub_id):
    """Get a specific subscription by ID."""
    sub = Subscription.query.get_or_404(sub_id)
    return jsonify(sub.to_dict()), 200


@subscriptions_bp.route("/", methods=["POST"], strict_slashes=False)
@jwt_required()
@admin_or_internal_required
def create_subscription():
    """
    Create a new subscription in Draft state.
    Auto-generates subscription number.
    Sets current user as salesperson.
    """
    data = request.get_json()
    current_user = get_current_user()

    sub_number = generate_subscription_number()

    def _int_or_none(val):
        """Convert empty string / falsy non-zero to None for integer FK columns."""
        if val == "" or val is None:
            return None
        try:
            return int(val)
        except (TypeError, ValueError):
            return None

    sub = Subscription(
        subscription_number=sub_number,
        customer_id=_int_or_none(data.get("customer_id")),
        plan_id=_int_or_none(data.get("plan_id")),
        quotation_template_id=_int_or_none(data.get("quotation_template_id")),
        payment_term_id=_int_or_none(data.get("payment_term_id")),
        salesperson_id=_int_or_none(data.get("salesperson_id")) or current_user.id,
        status="draft",
        expiration_date=data.get("expiration_date") or None,
        notes=data.get("notes"),
        created_by=current_user.id,
    )
    db.session.add(sub)
    db.session.flush()

    # Add order lines
    for line in data.get("order_lines", []):
        product_id = _int_or_none(line.get("product_id"))
        if not product_id:
            continue  # skip blank lines
        sl = SubscriptionLine(
            subscription_id=sub.id,
            product_id=product_id,
            variant_id=_int_or_none(line.get("variant_id")),
            description=line.get("description") or None,
            quantity=line.get("quantity", 1),
            unit_price=line.get("unit_price", 0),
            discount_pct=line.get("discount_pct", 0),
            tax_ids=line.get("tax_ids", []),
        )
        db.session.add(sl)

    db.session.commit()
    return jsonify({"message": "Subscription created.", "subscription": sub.to_dict()}), 201


@subscriptions_bp.route("/<int:sub_id>", methods=["PUT"])
@jwt_required()
@admin_or_internal_required
def update_subscription(sub_id):
    """
    Update subscription details.
    Order lines are locked once status is 'confirmed'.
    Only admin can change salesperson.
    """
    sub = Subscription.query.get_or_404(sub_id)
    data = request.get_json()
    current_user = get_current_user()

    def _int_or_none(val):
        if val == "" or val is None:
            return None
        try:
            return int(val)
        except (TypeError, ValueError):
            return None

    sub.customer_id = _int_or_none(data.get("customer_id")) or sub.customer_id
    sub.plan_id = _int_or_none(data.get("plan_id"))
    sub.quotation_template_id = _int_or_none(data.get("quotation_template_id"))
    sub.payment_term_id = _int_or_none(data.get("payment_term_id"))
    sub.expiration_date = data.get("expiration_date") or None
    sub.start_date = data.get("start_date") or None
    sub.notes = data.get("notes", sub.notes)
    sub.payment_method = data.get("payment_method", sub.payment_method)
    sub.payment_done = data.get("payment_done", sub.payment_done)

    # Only admin can reassign salesperson
    if "salesperson_id" in data and current_user.role == "admin":
        sub.salesperson_id = _int_or_none(data["salesperson_id"])

    # Update order lines only if not confirmed
    if "order_lines" in data and sub.status not in ("confirmed", "active", "closed"):
        SubscriptionLine.query.filter_by(subscription_id=sub.id).delete()
        for line in data["order_lines"]:
            product_id = _int_or_none(line.get("product_id"))
            if not product_id:
                continue  # skip blank lines
            sl = SubscriptionLine(
                subscription_id=sub.id,
                product_id=product_id,
                variant_id=_int_or_none(line.get("variant_id")),
                description=line.get("description") or None,
                quantity=line.get("quantity", 1),
                unit_price=line.get("unit_price", 0),
                discount_pct=line.get("discount_pct", 0),
                tax_ids=line.get("tax_ids", []),
            )
            db.session.add(sl)

    db.session.commit()
    return jsonify({"message": "Subscription updated.", "subscription": sub.to_dict()}), 200


@subscriptions_bp.route("/<int:sub_id>/send", methods=["POST"])
@jwt_required()
@admin_or_internal_required
def send_quotation(sub_id):
    """
    Send quotation to customer via email.
    Changes status from 'draft' → 'quotation_sent'.
    """
    sub = Subscription.query.get_or_404(sub_id)

    if sub.status not in ("draft", "quotation"):
        return jsonify({"error": "Can only send quotations in draft/quotation status."}), 400

    sub.status = "quotation_sent"

    # Send email if customer exists
    if sub.customer:
        portal_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/portal/orders/{sub.id}"
        send_quotation_email(
            sub.customer.email,
            sub.customer.name,
            sub.subscription_number,
            portal_url,
        )

    db.session.commit()
    return jsonify({"message": "Quotation sent.", "subscription": sub.to_dict()}), 200


@subscriptions_bp.route("/<int:sub_id>/confirm", methods=["POST"])
@jwt_required()
@admin_or_internal_required
def confirm_subscription(sub_id):
    """
    Confirm a subscription quotation.
    Status changes to 'confirmed'. Start date defaults to today.
    Computes next invoice date based on recurring plan.
    """
    sub = Subscription.query.get_or_404(sub_id)

    if sub.status in ("confirmed", "active", "closed"):
        return jsonify({"error": "Subscription is already confirmed or closed."}), 400

    today = date.today()
    sub.status = "confirmed"
    sub.order_date = today

    if not sub.start_date:
        sub.start_date = today

    # Compute next invoice date from plan
    if sub.plan and sub.start_date:
        sub.next_invoice_date = compute_next_invoice_date(
            sub.start_date, sub.plan.billing_period, sub.plan.billing_period_count
        )

    db.session.commit()
    return jsonify({"message": "Subscription confirmed.", "subscription": sub.to_dict()}), 200


@subscriptions_bp.route("/<int:sub_id>/create-invoice", methods=["POST"])
@jwt_required()
@admin_or_internal_required
def create_invoice_from_subscription(sub_id):
    """
    Generate an invoice from a confirmed subscription.
    Copies subscription order lines to invoice lines.
    Returns the created draft invoice.
    """
    sub = Subscription.query.get_or_404(sub_id)

    if sub.status not in ("confirmed", "active"):
        return jsonify({"error": "Can only invoice confirmed or active subscriptions."}), 400

    inv_number = generate_invoice_number()
    invoice = Invoice(
        invoice_number=inv_number,
        subscription_id=sub.id,
        customer_id=sub.customer_id,
        invoice_date=date.today(),
        status="draft",
    )
    db.session.add(invoice)
    db.session.flush()

    # Copy subscription lines to invoice lines
    for sl in sub.order_lines:
        il = InvoiceLine(
            invoice_id=invoice.id,
            product_id=sl.product_id,
            description=sl.description or (sl.product.name if sl.product else ""),
            quantity=sl.quantity,
            unit_price=sl.unit_price,
            discount_pct=sl.discount_pct,
            tax_ids=sl.tax_ids,
        )
        db.session.add(il)

    # Update subscription status to active
    if sub.status == "confirmed":
        sub.status = "active"

    # Advance next invoice date
    if sub.plan and sub.next_invoice_date:
        sub.next_invoice_date = compute_next_invoice_date(
            sub.next_invoice_date, sub.plan.billing_period, sub.plan.billing_period_count
        )

    db.session.commit()
    return jsonify({"message": "Invoice created.", "invoice": invoice.to_dict()}), 201


@subscriptions_bp.route("/<int:sub_id>/renew", methods=["POST"])
@jwt_required()
@admin_or_internal_required
def renew_subscription(sub_id):
    """
    Renew a subscription by creating a new one with the same details.
    Increments start and next invoice dates accordingly.
    """
    sub = Subscription.query.get_or_404(sub_id)

    new_number = generate_subscription_number()
    today = date.today()

    new_sub = Subscription(
        subscription_number=new_number,
        customer_id=sub.customer_id,
        plan_id=sub.plan_id,
        quotation_template_id=sub.quotation_template_id,
        payment_term_id=sub.payment_term_id,
        salesperson_id=sub.salesperson_id,
        status="confirmed",
        start_date=today,
        order_date=today,
        created_by=get_current_user().id,
    )

    if sub.plan:
        new_sub.next_invoice_date = compute_next_invoice_date(
            today, sub.plan.billing_period, sub.plan.billing_period_count
        )

    db.session.add(new_sub)
    db.session.flush()

    # Copy order lines
    for sl in sub.order_lines:
        new_sl = SubscriptionLine(
            subscription_id=new_sub.id,
            product_id=sl.product_id,
            variant_id=sl.variant_id,
            description=sl.description,
            quantity=sl.quantity,
            unit_price=sl.unit_price,
            discount_pct=sl.discount_pct,
            tax_ids=sl.tax_ids,
        )
        db.session.add(new_sl)

    db.session.commit()
    return jsonify({"message": "Subscription renewed.", "subscription": new_sub.to_dict()}), 201


@subscriptions_bp.route("/<int:sub_id>/close", methods=["POST"])
@jwt_required()
@admin_or_internal_required
def close_subscription(sub_id):
    """Close a subscription. Changes status to 'closed'."""
    sub = Subscription.query.get_or_404(sub_id)
    if sub.status == "closed":
        return jsonify({"error": "Subscription already closed."}), 400
    sub.status = "closed"
    db.session.commit()
    return jsonify({"message": "Subscription closed.", "subscription": sub.to_dict()}), 200


@subscriptions_bp.route("/<int:sub_id>/upsell", methods=["POST"])
@jwt_required()
@admin_or_internal_required
def upsell_subscription(sub_id):
    """
    Create a new subscription for upsell/upgrade.
    Starts fresh but copies customer and plan reference.
    """
    sub = Subscription.query.get_or_404(sub_id)
    data = request.get_json() or {}

    new_number = generate_subscription_number()
    new_sub = Subscription(
        subscription_number=new_number,
        customer_id=sub.customer_id,
        plan_id=data.get("plan_id", sub.plan_id),
        salesperson_id=sub.salesperson_id,
        status="draft",
        created_by=get_current_user().id,
    )
    db.session.add(new_sub)
    db.session.flush()

    for line in data.get("order_lines", []):
        new_sl = SubscriptionLine(
            subscription_id=new_sub.id,
            product_id=line.get("product_id"),
            quantity=line.get("quantity", 1),
            unit_price=line.get("unit_price", 0),
            discount_pct=line.get("discount_pct", 0),
            tax_ids=line.get("tax_ids", []),
        )
        db.session.add(new_sl)

    db.session.commit()
    return jsonify({"message": "Upsell subscription created.", "subscription": new_sub.to_dict()}), 201


@subscriptions_bp.route("/<int:sub_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_subscription(sub_id):
    """Delete a draft subscription. Admin only."""
    sub = Subscription.query.get_or_404(sub_id)
    if sub.status not in ("draft", "quotation"):
        return jsonify({"error": "Only draft subscriptions can be deleted."}), 400
    db.session.delete(sub)
    db.session.commit()
    return jsonify({"message": "Subscription deleted."}), 200