"""
app/routes/payment_terms.py
Payment Terms Blueprint
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import PaymentTerm, PaymentTermLine
from app.utils.helpers import admin_required

payment_terms_bp = Blueprint("payment_terms", __name__)

@payment_terms_bp.route("/", methods=["GET"], strict_slashes=False)
@jwt_required()
def list_payment_terms():
    terms = PaymentTerm.query.order_by(PaymentTerm.name).all()
    return jsonify([t.to_dict() for t in terms]), 200

@payment_terms_bp.route("/", methods=["POST"], strict_slashes=False)
@jwt_required()
@admin_required
def create_payment_term():
    data = request.get_json()
    pt = PaymentTerm(name=data.get("name",""), early_discount_percentage=data.get("early_discount_percentage",0))
    db.session.add(pt)
    db.session.flush()
    for line in data.get("due_terms", []):
        db.session.add(PaymentTermLine(payment_term_id=pt.id, due_type=line.get("due_type","percentage"), due_value=line.get("due_value",100), after_days=line.get("after_days",0)))
    db.session.commit()
    return jsonify({"message": "Created.", "payment_term": pt.to_dict()}), 201