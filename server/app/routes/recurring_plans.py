"""
app/routes/recurring_plans.py
Recurring Plans Blueprint
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import RecurringPlan, RecurringPlanProduct
from app.utils.helpers import admin_required, admin_or_internal_required

recurring_plans_bp = Blueprint("recurring_plans", __name__)

@recurring_plans_bp.route("/", methods=["GET"], strict_slashes=False)
@jwt_required()
def list_plans():
    plans = RecurringPlan.query.filter_by(is_active=True).order_by(RecurringPlan.name).all()
    return jsonify([p.to_dict() for p in plans]), 200

@recurring_plans_bp.route("/<int:plan_id>", methods=["GET"])
@jwt_required()
def get_plan(plan_id):
    plan = RecurringPlan.query.get_or_404(plan_id)
    return jsonify(plan.to_dict()), 200

@recurring_plans_bp.route("/", methods=["POST"], strict_slashes=False)
@jwt_required()
@admin_required
def create_plan():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Plan name is required."}), 400
    plan = RecurringPlan(
        name=data["name"],
        billing_period=data.get("billing_period", "monthly"),
        billing_period_count=data.get("billing_period_count", 1),
        auto_close_period=data.get("auto_close_period"),
        auto_close_unit=data.get("auto_close_unit"),
        is_closable=data.get("is_closable", True),
        is_pausable=data.get("is_pausable", False),
        is_renewable=data.get("is_renewable", True),
    )
    db.session.add(plan)
    db.session.flush()
    for pp in data.get("plan_products", []):
        db.session.add(RecurringPlanProduct(
            recurring_plan_id=plan.id,
            product_id=pp.get("product_id"),
            variant_id=pp.get("variant_id"),
            price=pp.get("price", 0),
            min_qty=pp.get("min_qty", 1),
        ))
    db.session.commit()
    return jsonify({"message": "Plan created.", "plan": plan.to_dict()}), 201

@recurring_plans_bp.route("/<int:plan_id>", methods=["PUT"])
@jwt_required()
@admin_required
def update_plan(plan_id):
    plan = RecurringPlan.query.get_or_404(plan_id)
    data = request.get_json()
    plan.name = data.get("name", plan.name)
    plan.billing_period = data.get("billing_period", plan.billing_period)
    plan.billing_period_count = data.get("billing_period_count", plan.billing_period_count)
    plan.auto_close_period = data.get("auto_close_period", plan.auto_close_period)
    plan.auto_close_unit = data.get("auto_close_unit", plan.auto_close_unit)
    plan.is_closable = data.get("is_closable", plan.is_closable)
    plan.is_pausable = data.get("is_pausable", plan.is_pausable)
    plan.is_renewable = data.get("is_renewable", plan.is_renewable)
    if "plan_products" in data:
        RecurringPlanProduct.query.filter_by(recurring_plan_id=plan.id).delete()
        for pp in data["plan_products"]:
            db.session.add(RecurringPlanProduct(
                recurring_plan_id=plan.id,
                product_id=pp.get("product_id"),
                variant_id=pp.get("variant_id"),
                price=pp.get("price", 0),
                min_qty=pp.get("min_qty", 1),
            ))
    db.session.commit()
    return jsonify({"message": "Plan updated.", "plan": plan.to_dict()}), 200

@recurring_plans_bp.route("/<int:plan_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_plan(plan_id):
    plan = RecurringPlan.query.get_or_404(plan_id)
    plan.is_active = False
    db.session.commit()
    return jsonify({"message": "Plan deactivated."}), 200