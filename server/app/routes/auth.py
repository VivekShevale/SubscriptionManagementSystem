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
from datetime import datetime, timezone
from app import db
from app.models import User, Contact
from app.utils.helpers import (
    hash_password, check_password, validate_password,
    generate_otp, verify_otp, get_current_user
)
from app.utils.email import send_welcome_email, send_otp_email

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/accept-invite/<string:token>", methods=["GET"])
def accept_invite(token):
    """
    Validate an invite token issued when admin creates a user.
    On success: issues a short-lived JWT and returns user info so the
    frontend can authenticate the user and redirect them to set-password.
    Token is single-use and expires after 24 hours.
    """
    user = User.query.filter_by(invite_token=token).first()

    if not user:
        return jsonify({"error": "Invalid or already-used invite link."}), 400

    if not user.invite_token_expires or \
       datetime.now(timezone.utc) > user.invite_token_expires:
        return jsonify({"error": "This invite link has expired. Please ask your administrator to resend."}), 400

    # Consume the token — single use
    user.invite_token = None
    user.invite_token_expires = None
    db.session.commit()

    # Issue a real JWT so frontend can authenticate immediately
    jwt_token = create_access_token(identity=str(user.id))

    return jsonify({
        "token": jwt_token,
        "user": user.to_dict(),
        "must_set_password": True,  # always true for invite flow
    }), 200


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
        "must_reset_password": user.must_reset_password,
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
    """
    Reset user password after OTP verification.
    Also clears the must_reset_password flag.
    """
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
    user.must_reset_password = False
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


@auth_bp.route("/set-invite-password", methods=["POST"])
@jwt_required()
def set_invite_password():
    """
    Set password for users who authenticated via invite link.
    No current password required — the invite token already proved identity.
    Only works when must_reset_password is True.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found."}), 404

    if not user.must_reset_password:
        return jsonify({"error": "Password has already been set."}), 400

    data = request.get_json()
    new_password = data.get("new_password", "")

    valid, msg = validate_password(new_password)
    if not valid:
        return jsonify({"error": msg}), 400

    user.password_hash = hash_password(new_password)
    user.must_reset_password = False
    db.session.commit()

    return jsonify({"message": "Password set successfully. Your account is now active."}), 200
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
    user.must_reset_password = False
    db.session.commit()

    return jsonify({"message": "Password changed successfully."}), 200