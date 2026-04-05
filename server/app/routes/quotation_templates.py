"""app/routes/quotation_templates.py - Quotation Templates Blueprint"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import QuotationTemplate, QuotationTemplateLine
from app.utils.helpers import admin_required, admin_or_internal_required

quotation_templates_bp = Blueprint("quotation_templates", __name__)

@quotation_templates_bp.route("/", methods=["GET"], strict_slashes=False)
@jwt_required()
def list_templates():
    templates = QuotationTemplate.query.order_by(QuotationTemplate.name).all()
    return jsonify([t.to_dict() for t in templates]), 200

@quotation_templates_bp.route("/<int:tid>", methods=["GET"])
@jwt_required()
def get_template(tid):
    return jsonify(QuotationTemplate.query.get_or_404(tid).to_dict()), 200

@quotation_templates_bp.route("/", methods=["POST"], strict_slashes=False)
@jwt_required()
@admin_or_internal_required
def create_template():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Template name is required."}), 400
    t = QuotationTemplate(
        name=data["name"],
        validity_days=data.get("validity_days", 30),
        recurring_plan_id=data.get("recurring_plan_id"),
        last_forever=data.get("last_forever", False),
        end_after_count=data.get("end_after_count"),
        end_after_unit=data.get("end_after_unit"),
    )
    db.session.add(t)
    db.session.flush()
    for line in data.get("lines", []):
        db.session.add(QuotationTemplateLine(
            template_id=t.id,
            product_id=line.get("product_id"),
            description=line.get("description"),
            quantity=line.get("quantity", 1),
        ))
    db.session.commit()
    return jsonify({"message": "Template created.", "template": t.to_dict()}), 201

@quotation_templates_bp.route("/<int:tid>", methods=["PUT"])
@jwt_required()
@admin_or_internal_required
def update_template(tid):
    t = QuotationTemplate.query.get_or_404(tid)
    data = request.get_json()
    t.name = data.get("name", t.name)
    t.validity_days = data.get("validity_days", t.validity_days)
    t.recurring_plan_id = data.get("recurring_plan_id", t.recurring_plan_id)
    t.last_forever = data.get("last_forever", t.last_forever)
    t.end_after_count = data.get("end_after_count", t.end_after_count)
    t.end_after_unit = data.get("end_after_unit", t.end_after_unit)
    if "lines" in data:
        QuotationTemplateLine.query.filter_by(template_id=t.id).delete()
        for line in data["lines"]:
            db.session.add(QuotationTemplateLine(
                template_id=t.id,
                product_id=line.get("product_id"),
                description=line.get("description"),
                quantity=line.get("quantity", 1),
            ))
    db.session.commit()
    return jsonify({"message": "Template updated.", "template": t.to_dict()}), 200

@quotation_templates_bp.route("/<int:tid>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_template(tid):
    t = QuotationTemplate.query.get_or_404(tid)
    db.session.delete(t)
    db.session.commit()
    return jsonify({"message": "Template deleted."}), 200