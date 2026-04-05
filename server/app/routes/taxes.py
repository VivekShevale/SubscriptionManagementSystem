"""app/routes/taxes.py - Admin-only tax management"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Tax
from app.utils.helpers import admin_required

taxes_bp = Blueprint("taxes", __name__)

@taxes_bp.route("/", methods=["GET"], strict_slashes=False)
@jwt_required()
def list_taxes():
    taxes = Tax.query.filter_by(is_active=True).all()
    return jsonify([t.to_dict() for t in taxes]), 200

@taxes_bp.route("/<int:tid>", methods=["GET"])
@jwt_required()
def get_tax(tid):
    return jsonify(Tax.query.get_or_404(tid).to_dict()), 200

@taxes_bp.route("/", methods=["POST"], strict_slashes=False)
@jwt_required()
@admin_required
def create_tax():
    data = request.get_json()
    t = Tax(
        name=data.get("name", ""),
        computation=data.get("computation", "percentage"),
        amount=data.get("amount", 0),
    )
    db.session.add(t)
    db.session.commit()
    return jsonify({"message": "Tax created.", "tax": t.to_dict()}), 201

@taxes_bp.route("/<int:tid>", methods=["PUT"])
@jwt_required()
@admin_required
def update_tax(tid):
    t = Tax.query.get_or_404(tid)
    data = request.get_json()
    t.name = data.get("name", t.name)
    t.computation = data.get("computation", t.computation)
    t.amount = data.get("amount", t.amount)
    db.session.commit()
    return jsonify({"message": "Tax updated.", "tax": t.to_dict()}), 200

@taxes_bp.route("/<int:tid>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_tax(tid):
    t = Tax.query.get_or_404(tid)
    t.is_active = False
    db.session.commit()
    return jsonify({"message": "Tax deactivated."}), 200