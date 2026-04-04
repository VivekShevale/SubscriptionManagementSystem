"""
app/routes/users.py
Users Blueprint
----------------
Admin-only routes for managing system users.
Only Admin can create Internal Users.
Portal users are created via the public registration endpoint.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Contact
from app.utils.helpers import (
    hash_password, validate_password, generate_temp_password,
    admin_required, get_current_user
)
from app.utils.email import send_internal_user_credentials

users_bp = Blueprint("users", __name__)


@users_bp.route("/", methods=["GET"])
@jwt_required()
@admin_required
def list_users():
    """List all users. Admin only."""
    search = request.args.get("q", "")
    role_filter = request.args.get("role", "")
    query = User.query

    if search:
        query = query.filter(
            (User.login_id.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )
    if role_filter:
        query = query.filter_by(role=role_filter)

    users = query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200


@users_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id):
    """Get a specific user. Admin can view any; others can only view themselves."""
    current = get_current_user()
    if current.role != "admin" and current.id != user_id:
        return jsonify({"error": "Access denied."}), 403

    user = User.query.get_or_404(user_id)
    data = user.to_dict()
    contact = Contact.query.filter_by(user_id=user_id).first()
    if contact:
        data["contact"] = contact.to_dict()
    return jsonify(data), 200


@users_bp.route("/", methods=["POST"])
@jwt_required()
@admin_required
def create_user():
    """
    Create a new Internal or Portal user. Admin only.
    Auto-generates a temporary password and emails credentials to the user.
    """
    data = request.get_json()
    login_id = (data.get("login_id") or "").strip()
    email = (data.get("email") or "").strip().lower()
    role = data.get("role", "internal")
    is_active = data.get("is_active", True)

    if not login_id or not email:
        return jsonify({"error": "login_id and email are required."}), 400

    if not (6 <= len(login_id) <= 12):
        return jsonify({"error": "Login ID must be between 6 and 12 characters."}), 400

    if role not in ("admin", "internal", "portal"):
        return jsonify({"error": "Invalid role. Choose from: admin, internal, portal."}), 400

    if User.query.filter_by(login_id=login_id).first():
        return jsonify({"error": "Login ID already taken."}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered."}), 409

    # Auto-generate temporary password
    temp_password = generate_temp_password()
    current_admin = get_current_user()

    user = User(
        login_id=login_id,
        email=email,
        password_hash=hash_password(temp_password),
        role=role,
        is_active=is_active,
        must_reset_password=True,  # forced reset on first login
        created_by=current_admin.id,
    )
    db.session.add(user)
    db.session.flush()

    # Create linked contact
    contact = Contact(name=login_id, email=email, user_id=user.id)
    db.session.add(contact)
    db.session.commit()

    # Send credentials via email
    send_internal_user_credentials(email, login_id, temp_password)

    return jsonify({"message": "User created successfully.", "user": user.to_dict()}), 201


@users_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    """
    Update user details.
    Admin can update any user; others can only update themselves (limited fields).
    """
    current = get_current_user()
    if current.role != "admin" and current.id != user_id:
        return jsonify({"error": "Access denied."}), 403

    user = User.query.get_or_404(user_id)
    data = request.get_json()

    # Only admin can change role and active status
    if current.role == "admin":
        if "role" in data:
            if data["role"] not in ("admin", "internal", "portal"):
                return jsonify({"error": "Invalid role."}), 400
            user.role = data["role"]
        if "is_active" in data:
            user.is_active = data["is_active"]

    # Update contact details
    if "name" in data or "phone" in data or "address" in data:
        contact = Contact.query.filter_by(user_id=user_id).first()
        if contact:
            contact.name = data.get("name", contact.name)
            contact.phone = data.get("phone", contact.phone)
            contact.address = data.get("address", contact.address)
            contact.city = data.get("city", contact.city)
            contact.country = data.get("country", contact.country)

    db.session.commit()
    return jsonify({"message": "User updated.", "user": user.to_dict()}), 200


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Delete a user. Admin only. Cannot delete the last admin."""
    user = User.query.get_or_404(user_id)

    # Prevent deleting the last admin
    if user.role == "admin" and User.query.filter_by(role="admin").count() <= 1:
        return jsonify({"error": "Cannot delete the last admin user."}), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted."}), 200