"""
app/routes/invoices.py
Invoices Blueprint
-------------------
Manage invoice lifecycle: draft → confirmed → paid.
Supports PDF generation, email sending, and Razorpay payment initiation.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import date
from app import db
from app.models import Invoice, InvoiceLine, Payment
from app.utils.helpers import generate_invoice_number, admin_or_internal_required, get_current_user
from app.utils.email import send_invoice_email
from app.utils.helpers import admin_required

invoices_bp = Blueprint("invoices", __name__)


@invoices_bp.route("/", methods=["GET"], strict_slashes=False)
@jwt_required()
@admin_or_internal_required
def list_invoices():
    status = request.args.get("status", "")
    customer_id = request.args.get("customer_id", "")
    query = Invoice.query
    if status:
        query = query.filter_by(status=status)
    if customer_id:
        query = query.filter_by(customer_id=int(customer_id))
    invoices = query.order_by(Invoice.created_at.desc()).all()
    return jsonify([i.to_dict() for i in invoices]), 200


@invoices_bp.route("/<int:inv_id>", methods=["GET"])
@jwt_required()
def get_invoice(inv_id):
    inv = Invoice.query.get_or_404(inv_id)
    return jsonify(inv.to_dict()), 200


@invoices_bp.route("/", methods=["POST"], strict_slashes=False)
@jwt_required()
@admin_or_internal_required
def create_invoice():
    data = request.get_json()
    inv_number = generate_invoice_number()
    invoice = Invoice(
        invoice_number=inv_number,
        subscription_id=data.get("subscription_id"),
        customer_id=data.get("customer_id"),
        invoice_date=data.get("invoice_date") or date.today().isoformat(),
        due_date=data.get("due_date"),
        status="draft",
        notes=data.get("notes"),
    )
    db.session.add(invoice)
    db.session.flush()

    for line in data.get("lines", []):
        il = InvoiceLine(
            invoice_id=invoice.id,
            product_id=line.get("product_id"),
            description=line.get("description"),
            quantity=line.get("quantity", 1),
            unit_price=line.get("unit_price", 0),
            discount_pct=line.get("discount_pct", 0),
            tax_ids=line.get("tax_ids", []),
        )
        db.session.add(il)

    db.session.commit()
    return jsonify({"message": "Invoice created.", "invoice": invoice.to_dict()}), 201


@invoices_bp.route("/<int:inv_id>", methods=["PUT"])
@jwt_required()
@admin_or_internal_required
def update_invoice(inv_id):
    invoice = Invoice.query.get_or_404(inv_id)
    data = request.get_json()

    if invoice.status == "paid":
        return jsonify({"error": "Cannot edit a paid invoice."}), 400

    invoice.customer_id = data.get("customer_id", invoice.customer_id)
    invoice.invoice_date = data.get("invoice_date", invoice.invoice_date)
    invoice.due_date = data.get("due_date", invoice.due_date)
    invoice.notes = data.get("notes", invoice.notes)

    if "lines" in data and invoice.status == "draft":
        InvoiceLine.query.filter_by(invoice_id=invoice.id).delete()
        for line in data["lines"]:
            il = InvoiceLine(
                invoice_id=invoice.id,
                product_id=line.get("product_id"),
                description=line.get("description"),
                quantity=line.get("quantity", 1),
                unit_price=line.get("unit_price", 0),
                discount_pct=line.get("discount_pct", 0),
                tax_ids=line.get("tax_ids", []),
            )
            db.session.add(il)

    db.session.commit()
    return jsonify({"message": "Invoice updated.", "invoice": invoice.to_dict()}), 200


@invoices_bp.route("/<int:inv_id>/confirm", methods=["POST"])
@jwt_required()
@admin_or_internal_required
def confirm_invoice(inv_id):
    invoice = Invoice.query.get_or_404(inv_id)
    if invoice.status != "draft":
        return jsonify({"error": "Only draft invoices can be confirmed."}), 400
    invoice.status = "confirmed"
    db.session.commit()
    return jsonify({"message": "Invoice confirmed.", "invoice": invoice.to_dict()}), 200


@invoices_bp.route("/<int:inv_id>/send", methods=["POST"])
@jwt_required()
@admin_or_internal_required
def send_invoice(inv_id):
    invoice = Invoice.query.get_or_404(inv_id)
    if invoice.customer:
        send_invoice_email(
            invoice.customer.email,
            invoice.customer.name,
            invoice.invoice_number,
            invoice.amount_due,
        )
    return jsonify({"message": "Invoice sent via email."}), 200


@invoices_bp.route("/<int:inv_id>/cancel", methods=["POST"])
@jwt_required()
@admin_required
def cancel_invoice(inv_id):
    invoice = Invoice.query.get_or_404(inv_id)
    if invoice.status == "paid":
        return jsonify({"error": "Cannot cancel a paid invoice."}), 400
    invoice.status = "cancelled"
    db.session.commit()
    return jsonify({"message": "Invoice cancelled.", "invoice": invoice.to_dict()}), 200


@invoices_bp.route("/<int:inv_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_invoice(inv_id):
    invoice = Invoice.query.get_or_404(inv_id)
    if invoice.status not in ("draft", "cancelled"):
        return jsonify({"error": "Only draft or cancelled invoices can be deleted."}), 400
    db.session.delete(invoice)
    db.session.commit()
    return jsonify({"message": "Invoice deleted."}), 200