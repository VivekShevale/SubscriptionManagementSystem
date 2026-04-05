"""
app/routes/attributes.py
Attributes Blueprint
---------------------
Manage product attributes and their values.
e.g., Attribute: "Brand", Values: ["Odoo → +₹560", "Custom → +₹200"]
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Attribute, AttributeValue
from app.utils.helpers import admin_required, admin_or_internal_required

attributes_bp = Blueprint("attributes", __name__)


@attributes_bp.route("/", methods=["GET"],  strict_slashes=False)
@jwt_required()
def list_attributes():
    """List all attributes with their values."""
    attrs = Attribute.query.order_by(Attribute.name).all()
    return jsonify([a.to_dict() for a in attrs]), 200


@attributes_bp.route("/<int:attr_id>", methods=["GET"])
@jwt_required()
def get_attribute(attr_id):
    """Get a specific attribute."""
    return jsonify(Attribute.query.get_or_404(attr_id).to_dict()), 200


@attributes_bp.route("/", methods=["POST"],  strict_slashes=False)
@jwt_required()
@admin_or_internal_required
def create_attribute():
    """Create an attribute with optional initial values."""
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Attribute name is required."}), 400

    # Check uniqueness
    if Attribute.query.filter_by(name=data["name"]).first():
        return jsonify({"error": "Attribute with this name already exists."}), 409

    attr = Attribute(name=data["name"])
    db.session.add(attr)
    db.session.flush()

    # Add initial values if provided
    for v in data.get("values", []):
        db.session.add(AttributeValue(
            attribute_id=attr.id,
            value=v.get("value", ""),
            default_extra_price=v.get("default_extra_price", 0),
        ))

    db.session.commit()
    return jsonify({"message": "Attribute created.", "attribute": attr.to_dict()}), 201


@attributes_bp.route("/<int:attr_id>", methods=["PUT"])
@jwt_required()
@admin_or_internal_required
def update_attribute(attr_id):
    """Update attribute name and replace all values."""
    attr = Attribute.query.get_or_404(attr_id)
    data = request.get_json()

    attr.name = data.get("name", attr.name)

    # Replace values
    if "values" in data:
        AttributeValue.query.filter_by(attribute_id=attr.id).delete()
        for v in data["values"]:
            db.session.add(AttributeValue(
                attribute_id=attr.id,
                value=v.get("value", ""),
                default_extra_price=v.get("default_extra_price", 0),
            ))

    db.session.commit()
    return jsonify({"message": "Attribute updated.", "attribute": attr.to_dict()}), 200


@attributes_bp.route("/<int:attr_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_attribute(attr_id):
    """Delete an attribute and all its values."""
    attr = Attribute.query.get_or_404(attr_id)
    db.session.delete(attr)
    db.session.commit()
    return jsonify({"message": "Attribute deleted."}), 200