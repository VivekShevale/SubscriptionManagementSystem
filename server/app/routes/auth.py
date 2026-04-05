"""
app/routes/auth.py
Authentication Blueprint
-------------------------
Handles user registration, login, password reset via OTP.
JWT tokens are issued on successful login.
By default, the first registered user becomes Admin.
Subsequent registrations via signup become Portal users.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models import User, Contact
from app.utils.helpers import (
    hash_password, check_password, validate_password,
    generate_otp, verify_otp, get_current_user
)
from app.utils.email import send_welcome_email, send_otp_email

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user.
    First user ever → Admin role.
    Subsequent users from signup → Portal role.
    Creates a linked Contact record automatically.
    """
    data = request.get_json()
    login_id = (data.get("login_id") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    # ── Validation ────────────────────────────────────────────────────────────
    if not login_id or not email or not password:
        return jsonify({"error": "login_id, email, and password are required."}), 400

    if not (6 <= len(login_id) <= 12):
        return jsonify({"error": "Login ID must be between 6 and 12 characters."}), 400

    if User.query.filter_by(login_id=login_id).first():
        return jsonify({"error": "Login ID already taken."}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered."}), 409

    if password != confirm_password:
        return jsonify({"error": "Passwords do not match."}), 400

    valid, msg = validate_password(password)
    if not valid:
        return jsonify({"error": msg}), 400

    # ── Determine Role ────────────────────────────────────────────────────────
    total_users = User.query.count()
    role = "admin" if total_users == 0 else "portal"

    # ── Create User ───────────────────────────────────────────────────────────
    user = User(
        login_id=login_id,
        email=email,
        password_hash=hash_password(password),
        role=role,
    )
    db.session.add(user)
    db.session.flush()  # get user.id before commit

    # ── Create linked Contact record ──────────────────────────────────────────
    contact = Contact(
        name=login_id,
        email=email,
        user_id=user.id,
    )
    db.session.add(contact)
    db.session.commit()

    # ── Send Welcome Email ────────────────────────────────────────────────────
    send_welcome_email(email, login_id)

    return jsonify({"message": "Account created successfully.", "role": role}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate user with login_id/email + password.
    Returns JWT access token on success.
    """
    data = request.get_json()
    identifier = (data.get("login_id") or data.get("email") or "").strip()
    password = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "Login ID/Email and password are required."}), 400

    # ── Find user by login_id or email ────────────────────────────────────────
    user = User.query.filter(
        (User.login_id == identifier) | (User.email == identifier.lower())
    ).first()

    if not user or not check_password(password, user.password_hash):
        return jsonify({"error": "Invalid login ID or password."}), 401

    if not user.is_active:
        return jsonify({"error": "Your account is inactive. Contact an administrator."}), 403

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "token": token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """
    Send OTP to registered email for password reset.
    Verifies email existence before sending OTP.
    """
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        # Return success to prevent email enumeration attacks
        return jsonify({"message": "If that email exists, an OTP has been sent."}), 200

    otp = generate_otp(email)
    send_otp_email(email, user.login_id, otp)

    return jsonify({"message": "OTP sent to your email address."}), 200


@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp_route():
    """Verify OTP entered by user for password reset."""
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()

    if not email or not otp:
        return jsonify({"error": "Email and OTP are required."}), 400

    if not verify_otp(email, otp):
        return jsonify({"error": "Invalid or expired OTP."}), 400

    return jsonify({"message": "OTP verified. You may now reset your password.", "verified": True}), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Reset user password after OTP verification."""
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()
    new_password = data.get("new_password", "")

    if not email or not new_password:
        return jsonify({"error": "Email and new_password are required."}), 400

    valid, msg = validate_password(new_password)
    if not valid:
        return jsonify({"error": msg}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found."}), 404

    user.password_hash = hash_password(new_password)
    db.session.commit()

    return jsonify({"message": "Password reset successfully."}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    """Return current authenticated user's profile."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found."}), 404

    contact = Contact.query.filter_by(user_id=user.id).first()
    data = user.to_dict()
    if contact:
        data["contact"] = contact.to_dict()
    return jsonify(data), 200


@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    """Allow authenticated users to change their own password."""
    user = get_current_user()
    data = request.get_json()
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not check_password(current_password, user.password_hash):
        return jsonify({"error": "Current password is incorrect."}), 400

    valid, msg = validate_password(new_password)
    if not valid:
        return jsonify({"error": msg}), 400

    user.password_hash = hash_password(new_password)
    db.session.commit()

    return jsonify({"message": "Password changed successfully."}), 200