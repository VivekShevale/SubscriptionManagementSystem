"""
app/routes/health.py
Health Check Blueprint
-----------------------
Single health endpoint to verify API and database connectivity.
Used for monitoring and deployment health checks.
"""

from flask import Blueprint, jsonify
from app import db
from datetime import datetime, timezone

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint.
    Verifies Flask app is running and database is reachable.
    """
    db_status = "ok"
    try:
        db.session.execute(db.text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return jsonify({
        "status": "healthy" if db_status == "ok" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "version": "1.0.0",
    }), 200 if db_status == "ok" else 503