"""
app/__init__.py
Flask Application Factory
--------------------------
Initializes Flask app with all extensions: SQLAlchemy, CORS, JWT.
Registers all blueprints for modular routing.
"""

import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

# Initialize extensions (without app context yet)
db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    """
    Application factory function.
    Creates and configures the Flask application instance.
    """
    app = Flask(__name__)
    app.url_map.strict_slashes = False  # accept /api/foo and /api/foo/ equally

    # ── Configuration ────────────────────────────────────────────────────────
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "postgresql://postgres:master@localhost:5432/subscription_db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600))
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")

    # ── Initialize Extensions ─────────────────────────────────────────────────
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # ── Register Blueprints ───────────────────────────────────────────────────
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.products import products_bp
    from app.routes.subscriptions import subscriptions_bp
    from app.routes.invoices import invoices_bp
    from app.routes.payments import payments_bp
    from app.routes.recurring_plans import recurring_plans_bp
    from app.routes.quotation_templates import quotation_templates_bp
    from app.routes.discounts import discounts_bp
    from app.routes.taxes import taxes_bp
    from app.routes.contacts import contacts_bp
    from app.routes.attributes import attributes_bp
    from app.routes.reports import reports_bp
    from app.routes.health import health_bp
    from app.routes.portal import portal_bp
    from app.routes.upload import upload_bp
    from app.routes.payment_terms import payment_terms_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(subscriptions_bp, url_prefix="/api/subscriptions")
    app.register_blueprint(invoices_bp, url_prefix="/api/invoices")
    app.register_blueprint(payments_bp, url_prefix="/api/payments")
    app.register_blueprint(recurring_plans_bp, url_prefix="/api/recurring-plans")
    app.register_blueprint(quotation_templates_bp, url_prefix="/api/quotation-templates")
    app.register_blueprint(discounts_bp, url_prefix="/api/discounts")
    app.register_blueprint(taxes_bp, url_prefix="/api/taxes")
    app.register_blueprint(contacts_bp, url_prefix="/api/contacts")
    app.register_blueprint(attributes_bp, url_prefix="/api/attributes")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(portal_bp, url_prefix="/api/portal")
    app.register_blueprint(upload_bp, url_prefix="/api/upload")
    app.register_blueprint(payment_terms_bp, url_prefix="/api/payment-terms")

    return app