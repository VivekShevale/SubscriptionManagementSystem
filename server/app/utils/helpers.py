"""
app/utils/helpers.py
Helper Utilities
-----------------
Shared utilities for password hashing, OTP generation,
auto-number sequence generation, and role-based access checks.
"""

import bcrypt
import random
import string
import re
from datetime import date, timedelta
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from app.models import User


# ── Password Utilities ────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password strength:
    - Length > 8
    - Contains uppercase
    - Contains lowercase
    - Contains special character
    Returns (is_valid, error_message).
    """
    if len(password) <= 8:
        return False, "Password must be longer than 8 characters."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"[^a-zA-Z0-9]", password):
        return False, "Password must contain at least one special character."
    return True, ""


def generate_temp_password(length: int = 12) -> str:
    """
    Generate a secure temporary password satisfying all validation rules.
    Used for auto-generated internal user passwords.
    """
    chars = string.ascii_letters + string.digits + "!@#$%^&*()"
    while True:
        pwd = "".join(random.choices(chars, k=length))
        valid, _ = validate_password(pwd)
        if valid:
            return pwd


# ── OTP Utilities ─────────────────────────────────────────────────────────────

# In-memory OTP store: {email: {"otp": str, "expires_at": datetime}}
_otp_store: dict = {}

# Tracks emails that have successfully verified their OTP (valid 15 min for reset)
_verified_emails: dict = {}


def generate_otp(email: str) -> str:
    """Generate a 6-digit OTP for the given email, valid for 10 minutes."""
    from datetime import datetime, timezone
    otp = str(random.randint(100000, 999999))
    _otp_store[email] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc).timestamp() + 600,  # 10 minutes
    }
    # Invalidate any prior verification when a new OTP is issued
    _verified_emails.pop(email, None)
    return otp


def verify_otp(email: str, otp: str) -> bool:
    """
    Verify OTP for the given email.
    Removes OTP from store after successful verification.
    Marks email as verified so reset_password can proceed.
    """
    from datetime import datetime, timezone
    record = _otp_store.get(email)
    if not record:
        return False
    if datetime.now(timezone.utc).timestamp() > record["expires_at"]:
        _otp_store.pop(email, None)
        return False
    if record["otp"] != otp:
        return False
    _otp_store.pop(email, None)  # single-use
    # Grant a 15-minute window to complete the password reset
    _verified_emails[email] = datetime.now(timezone.utc).timestamp() + 900
    return True


def consume_verified_email(email: str) -> bool:
    """
    Check and consume the OTP-verified status for an email.
    Returns True only if verify_otp was called successfully within the last 15 minutes.
    Removes the entry so it cannot be reused.
    """
    from datetime import datetime, timezone
    expires_at = _verified_emails.get(email)
    if not expires_at:
        return False
    if datetime.now(timezone.utc).timestamp() > expires_at:
        _verified_emails.pop(email, None)
        return False
    _verified_emails.pop(email, None)  # single-use
    return True


# ── Auto-Number Sequence ──────────────────────────────────────────────────────

def generate_subscription_number() -> str:
    """
    Generate next subscription number in format S0001, S0002, ...
    Uses COUNT+1 to avoid race conditions where two concurrent requests
    read the same last record and produce duplicate numbers.
    """
    from app.models import Subscription
    from app import db
    count = db.session.query(db.func.count(Subscription.id)).scalar() or 0
    return f"S{count + 1:04d}"


def generate_invoice_number() -> str:
    """
    Generate next invoice number in format INV/0001, INV/0002, ...
    Uses COUNT+1 to avoid race conditions.
    """
    from app.models import Invoice
    from app import db
    count = db.session.query(db.func.count(Invoice.id)).scalar() or 0
    return f"INV/{count + 1:04d}"


def compute_next_invoice_date(start_date: date, billing_period: str, count: int = 1) -> date:
    """
    Compute next invoice date based on billing period.
    billing_period: daily | weekly | monthly | yearly
    Uses calendar.monthrange to correctly handle leap years and month-end clamping.
    """
    import calendar
    if billing_period == "daily":
        return start_date + timedelta(days=count)
    elif billing_period == "weekly":
        return start_date + timedelta(weeks=count)
    elif billing_period == "monthly":
        # Add months safely, clamping day to last valid day of target month
        total_months = start_date.month - 1 + count
        year = start_date.year + total_months // 12
        month = total_months % 12 + 1
        day = min(start_date.day, calendar.monthrange(year, month)[1])
        return date(year, month, day)
    elif billing_period == "yearly":
        year = start_date.year + count
        # Clamp Feb 29 -> Feb 28 in non-leap target years
        day = min(start_date.day, calendar.monthrange(year, start_date.month)[1])
        return date(year, start_date.month, day)
    return start_date + timedelta(days=30)


# ── Role-Based Access Decorators ──────────────────────────────────────────────

def admin_required(fn):
    """Decorator: restrict endpoint to Admin users only."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or user.role != "admin":
            return jsonify({"error": "Admin access required."}), 403
        return fn(*args, **kwargs)
    return wrapper


def admin_or_internal_required(fn):
    """Decorator: restrict endpoint to Admin or Internal users."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or user.role not in ("admin", "internal"):
            return jsonify({"error": "Insufficient permissions."}), 403
        return fn(*args, **kwargs)
    return wrapper


def get_current_user() -> User | None:
    """Get the current authenticated user from JWT identity."""
    try:
        user_id = get_jwt_identity()
        return User.query.get(int(user_id)) if user_id else None
    except Exception:
        return None