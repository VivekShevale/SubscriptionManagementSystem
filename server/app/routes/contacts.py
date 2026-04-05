"""
app/routes/contacts.py
Contacts Blueprint
-------------------
Manage customer/contact records.
Admin: full access. Internal: create/view. Portal: no access.
One contact record is auto-created per user on registration.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Contact, Subscription
from app.utils.helpers import admin_required, admin_or_internal_required, get_current_user

contacts_bp = Blueprint("contacts", __name__)


@contacts_bp.route("/", methods=["GET"], strict_slashes=False)
@jwt_required()
@admin_or_internal_required
def list_contacts():
    """List all contacts with optional search."""
    search = request.args.get("q", "")
    query = Contact.query
    if search:
        query = query.filter(
            (Contact.name.ilike(f"%{search}%")) |
            (Contact.email.ilike(f"%{search}%")) |
            (Contact.phone.ilike(f"%{search}%"))
        )
    contacts = query.order_by(Contact.name).all()
    return jsonify([c.to_dict() for c in contacts]), 200


@contacts_bp.route("/<int:contact_id>", methods=["GET"])
@jwt_required()
@admin_or_internal_required
def get_contact(contact_id):
    """Get a specific contact by ID."""
    contact = Contact.query.get_or_404(contact_id)
    return jsonify(contact.to_dict()), 200


@contacts_bp.route("/", methods=["POST"], strict_slashes=False)
@jwt_required()
@admin_or_internal_required
def create_contact():
    """Create a new contact record."""
    data = request.get_json()
    if not data.get("name") or not data.get("email"):
        return jsonify({"error": "Name and email are required."}), 400

    # Check for duplicate email
    if Contact.query.filter_by(email=data["email"].strip().lower()).first():
        return jsonify({"error": "A contact with this email already exists."}), 409

    contact = Contact(
        name=data["name"],
        email=data["email"].strip().lower(),
        phone=data.get("phone"),
        address=data.get("address"),
        city=data.get("city"),
        country=data.get("country"),
        avatar_url=data.get("avatar_url"),
    )
    db.session.add(contact)
    db.session.commit()
    return jsonify({"message": "Contact created.", "contact": contact.to_dict()}), 201


@contacts_bp.route("/<int:contact_id>", methods=["PUT"])
@jwt_required()
@admin_or_internal_required
def update_contact(contact_id):
    """Update a contact record."""
    contact = Contact.query.get_or_404(contact_id)
    data = request.get_json()

    contact.name = data.get("name", contact.name)
    contact.email = data.get("email", contact.email)
    contact.phone = data.get("phone", contact.phone)
    contact.address = data.get("address", contact.address)
    contact.city = data.get("city", contact.city)
    contact.country = data.get("country", contact.country)
    contact.avatar_url = data.get("avatar_url", contact.avatar_url)

    db.session.commit()
    return jsonify({"message": "Contact updated.", "contact": contact.to_dict()}), 200


@contacts_bp.route("/<int:contact_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_contact(contact_id):
    """Delete a contact. Admin only."""
    contact = Contact.query.get_or_404(contact_id)
    db.session.delete(contact)
    db.session.commit()
    return jsonify({"message": "Contact deleted."}), 200


@contacts_bp.route("/<int:contact_id>/subscriptions", methods=["GET"])
@jwt_required()
@admin_or_internal_required
def get_contact_subscriptions(contact_id):
    """Get all subscriptions for a specific contact."""
    Contact.query.get_or_404(contact_id)
    subs = Subscription.query.filter_by(customer_id=contact_id).all()
    return jsonify([s.to_dict() for s in subs]), 200