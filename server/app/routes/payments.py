"""
app/routes/payments.py
Payments Blueprint
-------------------
Handles payment recording and Razorpay payment gateway integration.
Supports cash payments and online payments via Razorpay.
"""

import os
import razorpay
import hmac
import hashlib
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import date
from app import db
from app.models import Invoice, Payment
from app.utils.helpers import admin_or_internal_required

payments_bp = Blueprint("payments", __name__)


def get_razorpay_client():
    """Initialize Razorpay client with credentials from environment."""
    return razorpay.Client(
        auth=(
            os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder"),
            os.getenv("RAZORPAY_KEY_SECRET", "placeholder_secret"),
        )
    )


@payments_bp.route("/", methods=["GET"], strict_slashes=False)
@jwt_required()
@admin_or_internal_required
def list_payments():
    """List all payments with optional invoice filter."""
    invoice_id = request.args.get("invoice_id", "")
    query = Payment.query
    if invoice_id:
        query = query.filter_by(invoice_id=int(invoice_id))
    payments = query.order_by(Payment.created_at.desc()).all()
    return jsonify([p.to_dict() for p in payments]), 200


@payments_bp.route("/", methods=["POST"], strict_slashes=False)
@jwt_required()
def create_payment():
    """
    Record a cash payment for an invoice.
    Updates invoice status to 'paid' if fully paid.
    """
    data = request.get_json()
    invoice_id = data.get("invoice_id")
    if not invoice_id:
        return jsonify({"error": "invoice_id is required."}), 400

    invoice = Invoice.query.get_or_404(invoice_id)

    payment = Payment(
        invoice_id=invoice_id,
        payment_method=data.get("payment_method", "cash"),
        amount=data.get("amount", invoice.amount_due),
        payment_date=data.get("payment_date") or date.today().isoformat(),
        status="completed",
        notes=data.get("notes"),
    )
    db.session.add(payment)

    # Mark invoice as paid if fully settled
    db.session.flush()
    db.session.refresh(invoice)  # reload relationship cache so amount_due is accurate
    if invoice.amount_due <= 0:
        invoice.status = "paid"

    db.session.commit()
    return jsonify({"message": "Payment recorded.", "payment": payment.to_dict()}), 201


@payments_bp.route("/razorpay/create-order", methods=["POST"])
@jwt_required()
def create_razorpay_order():
    """
    Create a Razorpay order for online payment.
    Returns order_id for frontend Razorpay checkout widget.
    """
    data = request.get_json()
    invoice_id = data.get("invoice_id")
    if not invoice_id:
        return jsonify({"error": "invoice_id is required."}), 400

    invoice = Invoice.query.get_or_404(invoice_id)

    try:
        client = get_razorpay_client()
        # Razorpay amounts are in paise (multiply INR by 100)
        order = client.order.create({
            "amount": int(invoice.amount_due * 100),
            "currency": "INR",
            "receipt": invoice.invoice_number,
            "notes": {"invoice_id": str(invoice_id)},
        })
        return jsonify({
            "razorpay_order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": os.getenv("RAZORPAY_KEY_ID", ""),
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to create Razorpay order: {str(e)}"}), 500


@payments_bp.route("/razorpay/verify", methods=["POST"])
@jwt_required()
def verify_razorpay_payment():
    """
    Verify Razorpay payment signature after successful payment.
    Records payment and updates invoice status.
    """
    data = request.get_json()
    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_signature = data.get("razorpay_signature")
    invoice_id = data.get("invoice_id")
    amount = data.get("amount", 0)

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        return jsonify({"error": "Missing Razorpay payment details."}), 400

    # Verify signature
    secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    body = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected, razorpay_signature):
        return jsonify({"error": "Invalid payment signature."}), 400

    invoice = Invoice.query.get_or_404(invoice_id)

    payment = Payment(
        invoice_id=invoice_id,
        payment_method="razorpay",
        amount=float(amount) / 100,  # Convert paise back to INR
        payment_date=date.today(),
        status="completed",
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_signature=razorpay_signature,
    )
    db.session.add(payment)

    db.session.flush()
    db.session.refresh(invoice)  # reload relationship cache so amount_due is accurate
    if invoice.amount_due <= 0:
        invoice.status = "paid"

    db.session.commit()
    return jsonify({"message": "Payment verified and recorded.", "payment": payment.to_dict()}), 200