"""
app/routes/products.py
Products Blueprint
-------------------
CRUD endpoints for products, product variants, and recurring prices.
Admin: full access. Internal: view/limited edit. Portal: no access.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Product, ProductVariant, ProductRecurringPrice, Tax
from app.utils.helpers import admin_required, admin_or_internal_required, get_current_user

products_bp = Blueprint("products", __name__)


@products_bp.route("/", methods=["GET"])
@jwt_required()
def list_products():
    """List all active products. Accessible to admin and internal users."""
    search = request.args.get("q", "")
    query = Product.query.filter_by(is_active=True)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    products = query.order_by(Product.created_at.desc()).all()
    return jsonify([p.to_dict() for p in products]), 200


@products_bp.route("/public", methods=["GET"])
def list_public_products():
    """Public product listing for portal shop. No authentication required."""
    products = Product.query.filter_by(is_active=True).order_by(Product.name).all()
    return jsonify([p.to_dict() for p in products]), 200


@products_bp.route("/<int:product_id>", methods=["GET"])
def get_product(product_id):
    """Get a specific product by ID. Public endpoint for portal."""
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict()), 200


@products_bp.route("/", methods=["POST"])
@jwt_required()
@admin_or_internal_required
def create_product():
    """Create a new product. Admin and Internal users only."""
    data = request.get_json()

    if not data.get("name"):
        return jsonify({"error": "Product name is required."}), 400

    product = Product(
        name=data["name"],
        product_type=data.get("product_type", "service"),
        sales_price=data.get("sales_price", 0),
        cost_price=data.get("cost_price", 0),
        description=data.get("description"),
        image_url=data.get("image_url"),
    )

    # Assign taxes
    if data.get("tax_ids"):
        taxes = Tax.query.filter(Tax.id.in_(data["tax_ids"])).all()
        product.taxes = taxes

    db.session.add(product)
    db.session.flush()

    # Create variants
    for v in data.get("variants", []):
        variant = ProductVariant(
            product_id=product.id,
            attribute_id=v.get("attribute_id"),
            attribute_value_id=v.get("attribute_value_id"),
            extra_price=v.get("extra_price", 0),
        )
        db.session.add(variant)

    # Create recurring prices
    for r in data.get("recurring_prices", []):
        rp = ProductRecurringPrice(
            product_id=product.id,
            recurring_plan_id=r.get("recurring_plan_id"),
            price=r.get("price", 0),
            min_qty=r.get("min_qty", 1),
            start_date=r.get("start_date"),
            end_date=r.get("end_date"),
        )
        db.session.add(rp)

    db.session.commit()
    return jsonify({"message": "Product created.", "product": product.to_dict()}), 201


@products_bp.route("/<int:product_id>", methods=["PUT"])
@jwt_required()
@admin_or_internal_required
def update_product(product_id):
    """Update a product. Admin and Internal users only."""
    product = Product.query.get_or_404(product_id)
    data = request.get_json()

    product.name = data.get("name", product.name)
    product.product_type = data.get("product_type", product.product_type)
    product.sales_price = data.get("sales_price", product.sales_price)
    product.cost_price = data.get("cost_price", product.cost_price)
    product.description = data.get("description", product.description)
    product.image_url = data.get("image_url", product.image_url)

    # Update taxes
    if "tax_ids" in data:
        taxes = Tax.query.filter(Tax.id.in_(data["tax_ids"])).all()
        product.taxes = taxes

    # Replace variants
    if "variants" in data:
        ProductVariant.query.filter_by(product_id=product.id).delete()
        for v in data["variants"]:
            variant = ProductVariant(
                product_id=product.id,
                attribute_id=v.get("attribute_id"),
                attribute_value_id=v.get("attribute_value_id"),
                extra_price=v.get("extra_price", 0),
            )
            db.session.add(variant)

    # Replace recurring prices
    if "recurring_prices" in data:
        ProductRecurringPrice.query.filter_by(product_id=product.id).delete()
        for r in data["recurring_prices"]:
            rp = ProductRecurringPrice(
                product_id=product.id,
                recurring_plan_id=r.get("recurring_plan_id"),
                price=r.get("price", 0),
                min_qty=r.get("min_qty", 1),
                start_date=r.get("start_date"),
                end_date=r.get("end_date"),
            )
            db.session.add(rp)

    db.session.commit()
    return jsonify({"message": "Product updated.", "product": product.to_dict()}), 200


@products_bp.route("/<int:product_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_product(product_id):
    """Soft-delete a product. Admin only."""
    product = Product.query.get_or_404(product_id)
    product.is_active = False
    db.session.commit()
    return jsonify({"message": "Product deactivated."}), 200