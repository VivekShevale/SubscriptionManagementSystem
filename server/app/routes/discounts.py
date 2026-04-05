"""app/routes/discounts.py - Admin-only discount management"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Discount, Product
from app.utils.helpers import admin_required, get_current_user

discounts_bp = Blueprint("discounts", __name__)

@discounts_bp.route("/", methods=["GET"], strict_slashes=False)
@jwt_required()
@admin_required
def list_discounts():
    discounts = Discount.query.filter_by(is_active=True).all()
    return jsonify([d.to_dict() for d in discounts]), 200

@discounts_bp.route("/<int:did>", methods=["GET"])
@jwt_required()
@admin_required
def get_discount(did):
    return jsonify(Discount.query.get_or_404(did).to_dict()), 200

@discounts_bp.route("/", methods=["POST"], strict_slashes=False)
@jwt_required()
@admin_required
def create_discount():
    data = request.get_json()
    current = get_current_user()
    d = Discount(
        name=data.get("name", ""),
        discount_type=data.get("discount_type", "percentage"),
        value=data.get("value", 0),
        min_purchase=data.get("min_purchase", 0),
        min_quantity=data.get("min_quantity", 1),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        limit_usage=data.get("limit_usage", False),
        usage_limit=data.get("usage_limit"),
        created_by=current.id,
    )
    if data.get("product_ids"):
        d.products = Product.query.filter(Product.id.in_(data["product_ids"])).all()
    db.session.add(d)
    db.session.commit()
    return jsonify({"message": "Discount created.", "discount": d.to_dict()}), 201

@discounts_bp.route("/<int:did>", methods=["PUT"])
@jwt_required()
@admin_required
def update_discount(did):
    d = Discount.query.get_or_404(did)
    data = request.get_json()
    d.name = data.get("name", d.name)
    d.discount_type = data.get("discount_type", d.discount_type)
    d.value = data.get("value", d.value)
    d.min_purchase = data.get("min_purchase", d.min_purchase)
    d.min_quantity = data.get("min_quantity", d.min_quantity)
    d.start_date = data.get("start_date", d.start_date)
    d.end_date = data.get("end_date", d.end_date)
    d.limit_usage = data.get("limit_usage", d.limit_usage)
    d.usage_limit = data.get("usage_limit", d.usage_limit)
    if "product_ids" in data:
        d.products = Product.query.filter(Product.id.in_(data["product_ids"])).all()
    db.session.commit()
    return jsonify({"message": "Discount updated.", "discount": d.to_dict()}), 200

@discounts_bp.route("/<int:did>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_discount(did):
    d = Discount.query.get_or_404(did)
    d.is_active = False
    db.session.commit()
    return jsonify({"message": "Discount deactivated."}), 200