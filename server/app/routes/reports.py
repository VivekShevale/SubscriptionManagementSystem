"""
app/routes/reports.py
Reports Blueprint
------------------
Analytics and reporting endpoints.
Supports: active subscriptions, revenue, payments, overdue invoices.
Export formats: JSON (default), CSV, Excel, PDF summary.
"""

import io
import csv
from datetime import date, timedelta
from flask import Blueprint, request, jsonify, send_file, Response
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from app import db
from app.models import Subscription, Invoice, Payment, Contact, Product
from app.utils.helpers import admin_or_internal_required

reports_bp = Blueprint("reports", __name__)


def _subscription_stats():
    """Compute key subscription statistics."""
    total = Subscription.query.count()
    active = Subscription.query.filter_by(status="active").count()
    confirmed = Subscription.query.filter_by(status="confirmed").count()
    closed = Subscription.query.filter_by(status="closed").count()
    quotation = Subscription.query.filter(
        Subscription.status.in_(["draft", "quotation", "quotation_sent"])
    ).count()
    return {
        "total": total,
        "active": active,
        "confirmed": confirmed,
        "closed": closed,
        "quotation": quotation,
    }


def _revenue_stats():
    """Compute revenue from paid invoices."""
    today = date.today()
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)

    total_revenue = db.session.query(func.sum(Payment.amount)).filter_by(status="completed").scalar() or 0
    monthly = db.session.query(func.sum(Payment.amount)).filter(
        Payment.status == "completed",
        Payment.payment_date >= month_start,
    ).scalar() or 0
    yearly = db.session.query(func.sum(Payment.amount)).filter(
        Payment.status == "completed",
        Payment.payment_date >= year_start,
    ).scalar() or 0

    return {
        "total_revenue": float(total_revenue),
        "monthly_revenue": float(monthly),
        "yearly_revenue": float(yearly),
    }


def _invoice_stats():
    """Compute invoice metrics including overdue."""
    today = date.today()
    total = Invoice.query.count()
    paid = Invoice.query.filter_by(status="paid").count()
    draft = Invoice.query.filter_by(status="draft").count()
    confirmed = Invoice.query.filter_by(status="confirmed").count()
    overdue = Invoice.query.filter(
        Invoice.status == "confirmed",
        Invoice.due_date < today,
    ).count()

    return {
        "total": total,
        "paid": paid,
        "draft": draft,
        "confirmed": confirmed,
        "overdue": overdue,
    }


def _contact_stats():
    """Compute contact statistics."""
    total_contacts = Contact.query.count()
    active_contacts = Contact.query.filter_by(is_active=True).count() if hasattr(Contact, 'is_active') else total_contacts
    return {
        "total": total_contacts,
        "active": active_contacts,
    }


def _product_stats():
    """Compute product statistics."""
    total_products = Product.query.filter_by(is_active=True).count()
    return {
        "total": total_products,
    }


@reports_bp.route("/dashboard", methods=["GET"])
@jwt_required()
@admin_or_internal_required
def dashboard_stats():
    """
    Main dashboard statistics endpoint.
    Returns subscription, revenue, invoice, contact, and product KPIs.
    """
    return jsonify({
        "subscriptions": _subscription_stats(),
        "revenue": _revenue_stats(),
        "invoices": _invoice_stats(),
        "contacts": _contact_stats(),
        "products": _product_stats(),
    }), 200


@reports_bp.route("/subscriptions", methods=["GET"])
@jwt_required()
@admin_or_internal_required
def subscription_report():
    """
    Detailed subscription report with optional date filtering.
    Supports export to CSV or Excel.
    """
    status = request.args.get("status", "")
    export = request.args.get("export", "json")  # json | csv | excel

    query = Subscription.query
    if status:
        query = query.filter_by(status=status)
    subs = query.order_by(Subscription.created_at.desc()).all()

    rows = [
        {
            "Subscription #": s.subscription_number,
            "Customer": s.customer.name if s.customer else "",
            "Plan": s.plan.name if s.plan else "",
            "Status": s.status,
            "Start Date": s.start_date.isoformat() if s.start_date else "",
            "Next Invoice": s.next_invoice_date.isoformat() if s.next_invoice_date else "",
            "Created At": s.created_at.isoformat() if s.created_at else "",
        }
        for s in subs
    ]

    if export == "csv":
        return _export_csv(rows, "subscriptions_report")
    elif export == "excel":
        return _export_excel(rows, "subscriptions_report")

    return jsonify(rows), 200


@reports_bp.route("/revenue", methods=["GET"])
@jwt_required()
@admin_or_internal_required
def revenue_report():
    """Monthly revenue breakdown for the last 12 months."""
    today = date.today()
    months = []
    for i in range(11, -1, -1):
        # Calculate month start for each of last 12 months
        m = (today.month - i - 1) % 12 + 1
        y = today.year - ((today.month - i - 1) // 12)
        start = date(y, m, 1)
        if m == 12:
            end = date(y + 1, 1, 1)
        else:
            end = date(y, m + 1, 1)

        revenue = db.session.query(func.sum(Payment.amount)).filter(
            Payment.status == "completed",
            Payment.payment_date >= start,
            Payment.payment_date < end,
        ).scalar() or 0

        months.append({
            "month": start.strftime("%b %Y"),
            "revenue": float(revenue),
        })

    return jsonify(months), 200


@reports_bp.route("/overdue-invoices", methods=["GET"])
@jwt_required()
@admin_or_internal_required
def overdue_invoices():
    """List of all overdue confirmed invoices."""
    today = date.today()
    invoices = Invoice.query.filter(
        Invoice.status == "confirmed",
        Invoice.due_date < today,
    ).order_by(Invoice.due_date).all()

    export = request.args.get("export", "json")
    rows = [
        {
            "Invoice #": inv.invoice_number,
            "Customer": inv.customer.name if inv.customer else "",
            "Due Date": inv.due_date.isoformat() if inv.due_date else "",
            "Amount Due": float(inv.amount_due),
            "Days Overdue": (today - inv.due_date).days if inv.due_date else 0,
        }
        for inv in invoices
    ]

    if export == "csv":
        return _export_csv(rows, "overdue_invoices")
    elif export == "excel":
        return _export_excel(rows, "overdue_invoices")

    return jsonify([i.to_dict() for i in invoices]), 200


@reports_bp.route("/payments", methods=["GET"])
@jwt_required()
@admin_or_internal_required
def payment_report():
    """Payment history report."""
    payments = Payment.query.order_by(Payment.created_at.desc()).limit(500).all()
    export = request.args.get("export", "json")
    rows = [
        {
            "Payment ID": p.id,
            "Invoice #": p.invoice.invoice_number if p.invoice else "",
            "Method": p.payment_method,
            "Amount": float(p.amount),
            "Date": p.payment_date.isoformat() if p.payment_date else "",
            "Status": p.status,
        }
        for p in payments
    ]

    if export == "csv":
        return _export_csv(rows, "payments_report")
    elif export == "excel":
        return _export_excel(rows, "payments_report")

    return jsonify(rows), 200


# ── Export Helpers ─────────────────────────────────────────────────────────────

def _export_csv(rows: list, filename: str) -> Response:
    """Stream data as CSV download."""
    if not rows:
        return Response("No data", mimetype="text/plain")
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
    )


def _export_excel(rows: list, filename: str):
    """Stream data as Excel (.xlsx) download."""
    try:
        import openpyxl
    except ImportError:
        return jsonify({"error": "openpyxl not installed."}), 500

    wb = openpyxl.Workbook()
    ws = wb.active
    if rows:
        ws.append(list(rows[0].keys()))
        for row in rows:
            ws.append(list(row.values()))

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        download_name=f"{filename}.xlsx",
        as_attachment=True,
    )