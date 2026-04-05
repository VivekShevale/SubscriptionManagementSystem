"""
app/models/__init__.py
Database Models
----------------
All SQLAlchemy ORM models for the Subscription Management System.
Covers: Users, Contacts, Products, Variants, Attributes, RecurringPlans,
        Subscriptions, QuotationTemplates, Invoices, Payments, Discounts, Taxes.
"""

from app import db
from datetime import datetime, timezone
import uuid


def utcnow():
    """Timezone-aware UTC now helper."""
    return datetime.now(timezone.utc)


# ══════════════════════════════════════════════════════════════════════════════
# USER & CONTACT MODELS
# ══════════════════════════════════════════════════════════════════════════════

class User(db.Model):
    """
    System user model. Supports three roles:
    - admin: full access
    - internal: limited operational access
    - portal: external customer access
    """
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    login_id = db.Column(db.String(12), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="portal")  # admin | internal | portal
    is_active = db.Column(db.Boolean, default=True)
    must_reset_password = db.Column(db.Boolean, default=False)  # forced reset on first login
    invite_token = db.Column(db.String(64), nullable=True, unique=True, index=True)  # secure invite link token
    invite_token_expires = db.Column(db.DateTime(timezone=True), nullable=True)      # token expiry (24h)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    # Relationships
    contact = db.relationship("Contact", backref="user", uselist=False, lazy=True)
    subscriptions_as_salesperson = db.relationship(
        "Subscription", backref="salesperson", foreign_keys="Subscription.salesperson_id", lazy=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "login_id": self.login_id,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "must_reset_password": self.must_reset_password,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Contact(db.Model):
    """
    Contact/Customer model. Separate from User to allow one user to manage
    multiple contacts. Linked to User via user_id.
    """
    __tablename__ = "contacts"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(50))
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    country = db.Column(db.String(100))
    avatar_url = db.Column(db.String(500))  # Cloudinary URL
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    subscriptions = db.relationship("Subscription", backref="customer", lazy=True)
    invoices = db.relationship("Invoice", backref="customer", lazy=True)

    def to_dict(self):
        active_subs = Subscription.query.filter_by(
            customer_id=self.id, status="active"
        ).count()
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "city": self.city,
            "country": self.country,
            "avatar_url": self.avatar_url,
            "user_id": self.user_id,
            "active_subscriptions": active_subs,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ══════════════════════════════════════════════════════════════════════════════
# ATTRIBUTE & PRODUCT MODELS
# ══════════════════════════════════════════════════════════════════════════════

class Attribute(db.Model):
    """
    Product attribute model (e.g., 'Brand', 'Color').
    Each attribute has multiple values with extra pricing.
    """
    __tablename__ = "attributes"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    # Relationships
    values = db.relationship("AttributeValue", backref="attribute", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "values": [v.to_dict() for v in self.values],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AttributeValue(db.Model):
    """
    Specific value for an attribute (e.g., 'Odoo' for 'Brand').
    Carries an extra price that adds to the base product price.
    """
    __tablename__ = "attribute_values"

    id = db.Column(db.Integer, primary_key=True)
    attribute_id = db.Column(db.Integer, db.ForeignKey("attributes.id"), nullable=False)
    value = db.Column(db.String(255), nullable=False)
    default_extra_price = db.Column(db.Numeric(10, 2), default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "attribute_id": self.attribute_id,
            "attribute_name": self.attribute.name if self.attribute else None,
            "value": self.value,
            "default_extra_price": float(self.default_extra_price or 0),
        }


class Tax(db.Model):
    """
    Tax configuration model. Taxes are applied to invoice lines.
    Supports percentage or fixed amount computation.
    """
    __tablename__ = "taxes"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    computation = db.Column(db.String(20), nullable=False, default="percentage")  # percentage | fixed
    amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "computation": self.computation,
            "amount": float(self.amount or 0),
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# Junction table: product <-> tax (many-to-many)
product_taxes = db.Table(
    "product_taxes",
    db.Column("product_id", db.Integer, db.ForeignKey("products.id"), primary_key=True),
    db.Column("tax_id", db.Integer, db.ForeignKey("taxes.id"), primary_key=True),
)


class Product(db.Model):
    """
    Product/service offering. Can have variants and recurring prices.
    Supports image upload via Cloudinary.
    """
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    product_type = db.Column(db.String(50), default="service")  # service | goods
    sales_price = db.Column(db.Numeric(10, 2), default=0)
    cost_price = db.Column(db.Numeric(10, 2), default=0)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(500))  # Cloudinary URL
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    taxes = db.relationship("Tax", secondary=product_taxes, lazy="subquery", backref=db.backref("products", lazy=True))
    variants = db.relationship("ProductVariant", backref="product", lazy=True, cascade="all, delete-orphan")
    recurring_prices = db.relationship("ProductRecurringPrice", backref="product", lazy=True, cascade="all, delete-orphan")

    def to_dict(self, include_relations=True):
        data = {
            "id": self.id,
            "name": self.name,
            "product_type": self.product_type,
            "sales_price": float(self.sales_price or 0),
            "cost_price": float(self.cost_price or 0),
            "description": self.description,
            "image_url": self.image_url,
            "is_active": self.is_active,
            "taxes": [t.to_dict() for t in self.taxes],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_relations:
            data["variants"] = [v.to_dict() for v in self.variants]
            data["recurring_prices"] = [r.to_dict() for r in self.recurring_prices]
        return data


class ProductVariant(db.Model):
    """
    Product variant with attribute-based pricing customization.
    e.g., Brand=Odoo → +$560 extra price.
    """
    __tablename__ = "product_variants"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    attribute_id = db.Column(db.Integer, db.ForeignKey("attributes.id"), nullable=True)
    attribute_value_id = db.Column(db.Integer, db.ForeignKey("attribute_values.id"), nullable=True)
    extra_price = db.Column(db.Numeric(10, 2), default=0)

    # Relationships
    attribute = db.relationship("Attribute")
    attribute_value = db.relationship("AttributeValue")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "attribute_id": self.attribute_id,
            "attribute_name": self.attribute.name if self.attribute else None,
            "attribute_value_id": self.attribute_value_id,
            "attribute_value": self.attribute_value.value if self.attribute_value else None,
            "extra_price": float(self.extra_price or 0),
        }


class ProductRecurringPrice(db.Model):
    """
    Recurring price configuration for a product.
    Links product to a recurring plan with custom pricing.
    """
    __tablename__ = "product_recurring_prices"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    recurring_plan_id = db.Column(db.Integer, db.ForeignKey("recurring_plans.id"), nullable=True)
    price = db.Column(db.Numeric(10, 2), default=0)
    min_qty = db.Column(db.Integer, default=1)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)

    # Relationships
    recurring_plan = db.relationship("RecurringPlan")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "recurring_plan_id": self.recurring_plan_id,
            "recurring_plan_name": self.recurring_plan.name if self.recurring_plan else None,
            "price": float(self.price or 0),
            "min_qty": self.min_qty,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
        }


# ══════════════════════════════════════════════════════════════════════════════
# RECURRING PLAN MODEL
# ══════════════════════════════════════════════════════════════════════════════

class RecurringPlan(db.Model):
    """
    Defines billing rules for subscriptions.
    Supports daily/weekly/monthly/yearly billing periods.
    """
    __tablename__ = "recurring_plans"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    billing_period = db.Column(db.String(20), nullable=False, default="monthly")  # daily|weekly|monthly|yearly
    billing_period_count = db.Column(db.Integer, default=1)  # e.g., 3 months
    auto_close_period = db.Column(db.Integer, nullable=True)  # auto close after N periods
    auto_close_unit = db.Column(db.String(20), nullable=True)  # month | year
    is_closable = db.Column(db.Boolean, default=True)
    is_pausable = db.Column(db.Boolean, default=False)
    is_renewable = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    # Relationships
    subscriptions = db.relationship("Subscription", backref="plan", lazy=True)
    quotation_templates = db.relationship("QuotationTemplate", backref="recurring_plan", lazy=True)
    plan_products = db.relationship("RecurringPlanProduct", backref="recurring_plan", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        active_subs = Subscription.query.filter_by(
            plan_id=self.id, status="active"
        ).count()
        return {
            "id": self.id,
            "name": self.name,
            "billing_period": self.billing_period,
            "billing_period_count": self.billing_period_count,
            "auto_close_period": self.auto_close_period,
            "auto_close_unit": self.auto_close_unit,
            "is_closable": self.is_closable,
            "is_pausable": self.is_pausable,
            "is_renewable": self.is_renewable,
            "is_active": self.is_active,
            "active_subscriptions": active_subs,
            "plan_products": [p.to_dict() for p in self.plan_products],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RecurringPlanProduct(db.Model):
    """
    Products linked to a recurring plan with pricing details.
    """
    __tablename__ = "recurring_plan_products"

    id = db.Column(db.Integer, primary_key=True)
    recurring_plan_id = db.Column(db.Integer, db.ForeignKey("recurring_plans.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)
    variant_id = db.Column(db.Integer, db.ForeignKey("product_variants.id"), nullable=True)
    price = db.Column(db.Numeric(10, 2), default=0)
    min_qty = db.Column(db.Integer, default=1)

    # Relationships
    product = db.relationship("Product")
    variant = db.relationship("ProductVariant")

    def to_dict(self):
        return {
            "id": self.id,
            "recurring_plan_id": self.recurring_plan_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "variant_id": self.variant_id,
            "variant_name": self.variant.attribute_value.value if self.variant and self.variant.attribute_value else None,
            "price": float(self.price or 0),
            "min_qty": self.min_qty,
        }


# ══════════════════════════════════════════════════════════════════════════════
# QUOTATION TEMPLATE MODEL
# ══════════════════════════════════════════════════════════════════════════════

class QuotationTemplate(db.Model):
    """
    Predefined subscription templates to speed up subscription creation.
    Contains product lines and links to recurring plans.
    """
    __tablename__ = "quotation_templates"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    validity_days = db.Column(db.Integer, default=30)
    recurring_plan_id = db.Column(db.Integer, db.ForeignKey("recurring_plans.id"), nullable=True)
    last_forever = db.Column(db.Boolean, default=False)
    end_after_count = db.Column(db.Integer, nullable=True)
    end_after_unit = db.Column(db.String(20), nullable=True)  # week | month | year
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    # Relationships
    lines = db.relationship("QuotationTemplateLine", backref="template", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "validity_days": self.validity_days,
            "recurring_plan_id": self.recurring_plan_id,
            "recurring_plan_name": self.recurring_plan.name if self.recurring_plan else None,
            "last_forever": self.last_forever,
            "end_after_count": self.end_after_count,
            "end_after_unit": self.end_after_unit,
            "lines": [l.to_dict() for l in self.lines],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class QuotationTemplateLine(db.Model):
    """
    Individual product line within a quotation template.
    """
    __tablename__ = "quotation_template_lines"

    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey("quotation_templates.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)
    description = db.Column(db.Text)
    quantity = db.Column(db.Numeric(10, 2), default=1)

    # Relationships
    product = db.relationship("Product")

    def to_dict(self):
        return {
            "id": self.id,
            "template_id": self.template_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "description": self.description,
            "quantity": float(self.quantity or 1),
        }


# ══════════════════════════════════════════════════════════════════════════════
# DISCOUNT MODEL
# ══════════════════════════════════════════════════════════════════════════════

# Junction table: discount <-> product
discount_products = db.Table(
    "discount_products",
    db.Column("discount_id", db.Integer, db.ForeignKey("discounts.id"), primary_key=True),
    db.Column("product_id", db.Integer, db.ForeignKey("products.id"), primary_key=True),
)


class Discount(db.Model):
    """
    Discount rules applicable to products and subscriptions.
    Only Admins can create discounts.
    """
    __tablename__ = "discounts"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    discount_type = db.Column(db.String(20), nullable=False, default="percentage")  # percentage | fixed
    value = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    min_purchase = db.Column(db.Numeric(10, 2), default=0)
    min_quantity = db.Column(db.Integer, default=1)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    limit_usage = db.Column(db.Boolean, default=False)
    usage_limit = db.Column(db.Integer, nullable=True)
    usage_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    # Applies to specific products (empty = all products)
    products = db.relationship("Product", secondary=discount_products, lazy="subquery")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "discount_type": self.discount_type,
            "value": float(self.value or 0),
            "min_purchase": float(self.min_purchase or 0),
            "min_quantity": self.min_quantity,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "limit_usage": self.limit_usage,
            "usage_limit": self.usage_limit,
            "usage_count": self.usage_count,
            "is_active": self.is_active,
            "products": [{"id": p.id, "name": p.name} for p in self.products],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT TERM MODEL
# ══════════════════════════════════════════════════════════════════════════════

class PaymentTerm(db.Model):
    """
    Payment terms define when invoices are due.
    Supports early discount and due term configuration.
    """
    __tablename__ = "payment_terms"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    early_discount_percentage = db.Column(db.Numeric(5, 2), default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    # Relationships
    due_terms = db.relationship("PaymentTermLine", backref="payment_term", lazy=True, cascade="all, delete-orphan")
    subscriptions = db.relationship("Subscription", backref="payment_term", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "early_discount_percentage": float(self.early_discount_percentage or 0),
            "due_terms": [d.to_dict() for d in self.due_terms],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PaymentTermLine(db.Model):
    """
    Individual due term line within a payment term.
    e.g., "100% after 30 days from invoice date"
    """
    __tablename__ = "payment_term_lines"

    id = db.Column(db.Integer, primary_key=True)
    payment_term_id = db.Column(db.Integer, db.ForeignKey("payment_terms.id"), nullable=False)
    due_type = db.Column(db.String(20), default="percentage")  # percentage | fixed
    due_value = db.Column(db.Numeric(10, 2), default=100)
    after_days = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "due_type": self.due_type,
            "due_value": float(self.due_value or 100),
            "after_days": self.after_days,
        }


# ══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION MODEL
# ══════════════════════════════════════════════════════════════════════════════

class Subscription(db.Model):
    """
    Core subscription model. Tracks the full lifecycle:
    draft → quotation → quotation_sent → confirmed → active → closed
    """
    __tablename__ = "subscriptions"

    id = db.Column(db.Integer, primary_key=True)
    subscription_number = db.Column(db.String(20), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("contacts.id"), nullable=True)
    plan_id = db.Column(db.Integer, db.ForeignKey("recurring_plans.id"), nullable=True)
    quotation_template_id = db.Column(db.Integer, db.ForeignKey("quotation_templates.id"), nullable=True)
    payment_term_id = db.Column(db.Integer, db.ForeignKey("payment_terms.id"), nullable=True)
    salesperson_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    # Status flow: draft → quotation → quotation_sent → confirmed → active → closed
    status = db.Column(db.String(30), nullable=False, default="draft")

    start_date = db.Column(db.Date, nullable=True)
    expiration_date = db.Column(db.Date, nullable=True)
    order_date = db.Column(db.Date, nullable=True)
    next_invoice_date = db.Column(db.Date, nullable=True)
    payment_method = db.Column(db.String(50), nullable=True)
    payment_done = db.Column(db.Boolean, default=False)

    discount_code = db.Column(db.String(100), nullable=True)
    discount_id = db.Column(db.Integer, db.ForeignKey("discounts.id"), nullable=True)

    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    # Relationships
    order_lines = db.relationship("SubscriptionLine", backref="subscription", lazy=True, cascade="all, delete-orphan")
    invoices = db.relationship("Invoice", backref="subscription", lazy=True)
    discount = db.relationship("Discount", foreign_keys=[discount_id])
    quotation_template = db.relationship("QuotationTemplate")

    def to_dict(self):
        return {
            "id": self.id,
            "subscription_number": self.subscription_number,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else None,
            "plan_id": self.plan_id,
            "plan_name": self.plan.name if self.plan else None,
            "billing_period": self.plan.billing_period if self.plan else None,
            "quotation_template_id": self.quotation_template_id,
            "payment_term_id": self.payment_term_id,
            "payment_term_name": self.payment_term.name if self.payment_term else None,
            "salesperson_id": self.salesperson_id,
            "salesperson_name": self.salesperson.login_id if self.salesperson else None,
            "status": self.status,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "expiration_date": self.expiration_date.isoformat() if self.expiration_date else None,
            "order_date": self.order_date.isoformat() if self.order_date else None,
            "next_invoice_date": self.next_invoice_date.isoformat() if self.next_invoice_date else None,
            "payment_method": self.payment_method,
            "payment_done": self.payment_done,
            "discount_id": self.discount_id,
            "notes": self.notes,
            "order_lines": [l.to_dict() for l in self.order_lines],
            "invoices": [{"id": i.id, "invoice_number": i.invoice_number, "status": i.status} for i in self.invoices],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SubscriptionLine(db.Model):
    """
    Individual product line within a subscription order.
    Tracks product, quantity, pricing, taxes, and discount.
    """
    __tablename__ = "subscription_lines"

    id = db.Column(db.Integer, primary_key=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey("subscriptions.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)
    variant_id = db.Column(db.Integer, db.ForeignKey("product_variants.id"), nullable=True)
    description = db.Column(db.Text)
    quantity = db.Column(db.Numeric(10, 2), default=1)
    unit_price = db.Column(db.Numeric(10, 2), default=0)
    discount_pct = db.Column(db.Numeric(5, 2), default=0)
    tax_ids = db.Column(db.JSON, default=list)  # list of tax ids

    # Relationships
    product = db.relationship("Product")
    variant = db.relationship("ProductVariant")

    @property
    def amount(self):
        """Computed line amount after discount (before tax)."""
        base = float(self.quantity or 1) * float(self.unit_price or 0)
        disc = base * float(self.discount_pct or 0) / 100
        return round(base - disc, 2)

    def to_dict(self):
        taxes = []
        if self.tax_ids:
            taxes = [t.to_dict() for t in Tax.query.filter(Tax.id.in_(self.tax_ids)).all()]
        return {
            "id": self.id,
            "subscription_id": self.subscription_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "variant_id": self.variant_id,
            "description": self.description,
            "quantity": float(self.quantity or 1),
            "unit_price": float(self.unit_price or 0),
            "discount_pct": float(self.discount_pct or 0),
            "taxes": taxes,
            "amount": self.amount,
        }


# ══════════════════════════════════════════════════════════════════════════════
# INVOICE MODEL
# ══════════════════════════════════════════════════════════════════════════════

class Invoice(db.Model):
    """
    Invoice model. Generated from subscriptions.
    Status flow: draft → confirmed → paid
    """
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(30), unique=True, nullable=False)
    subscription_id = db.Column(db.Integer, db.ForeignKey("subscriptions.id"), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("contacts.id"), nullable=True)
    invoice_date = db.Column(db.Date, nullable=True)
    due_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="draft")  # draft | confirmed | paid | cancelled
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    lines = db.relationship("InvoiceLine", backref="invoice", lazy=True, cascade="all, delete-orphan")
    payments = db.relationship("Payment", backref="invoice", lazy=True)

    @property
    def subtotal(self):
        return sum(l.amount for l in self.lines)

    @property
    def tax_amount(self):
        total_tax = 0
        for line in self.lines:
            if line.tax_ids:
                taxes = Tax.query.filter(Tax.id.in_(line.tax_ids)).all()
                for tax in taxes:
                    if tax.computation == "percentage":
                        total_tax += line.amount * float(tax.amount) / 100
                    else:
                        total_tax += float(tax.amount)
        return round(total_tax, 2)

    @property
    def total(self):
        return round(self.subtotal + self.tax_amount, 2)

    @property
    def amount_paid(self):
        return sum(float(p.amount or 0) for p in self.payments if p.status == "completed")

    @property
    def amount_due(self):
        return round(self.total - self.amount_paid, 2)

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "subscription_id": self.subscription_id,
            "subscription_number": self.subscription.subscription_number if self.subscription else None,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else None,
            "invoice_date": self.invoice_date.isoformat() if self.invoice_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.status,
            "notes": self.notes,
            "lines": [l.to_dict() for l in self.lines],
            "subtotal": self.subtotal,
            "tax_amount": self.tax_amount,
            "total": self.total,
            "amount_paid": self.amount_paid,
            "amount_due": self.amount_due,
            "payments": [p.to_dict() for p in self.payments],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class InvoiceLine(db.Model):
    """
    Individual product line on an invoice.
    """
    __tablename__ = "invoice_lines"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)
    description = db.Column(db.Text)
    quantity = db.Column(db.Numeric(10, 2), default=1)
    unit_price = db.Column(db.Numeric(10, 2), default=0)
    discount_pct = db.Column(db.Numeric(5, 2), default=0)
    tax_ids = db.Column(db.JSON, default=list)

    # Relationships
    product = db.relationship("Product")

    @property
    def amount(self):
        base = float(self.quantity or 1) * float(self.unit_price or 0)
        disc = base * float(self.discount_pct or 0) / 100
        return round(base - disc, 2)

    def to_dict(self):
        taxes = []
        if self.tax_ids:
            taxes = [t.to_dict() for t in Tax.query.filter(Tax.id.in_(self.tax_ids)).all()]
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "description": self.description,
            "quantity": float(self.quantity or 1),
            "unit_price": float(self.unit_price or 0),
            "discount_pct": float(self.discount_pct or 0),
            "taxes": taxes,
            "amount": self.amount,
        }


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT MODEL
# ══════════════════════════════════════════════════════════════════════════════

class Payment(db.Model):
    """
    Payment records for invoice settlement.
    Tracks Razorpay order IDs and payment status.
    """
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False, default="cash")  # cash | online | razorpay
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), default="completed")  # pending | completed | failed
    razorpay_order_id = db.Column(db.String(100), nullable=True)
    razorpay_payment_id = db.Column(db.String(100), nullable=True)
    razorpay_signature = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "invoice_number": self.invoice.invoice_number if self.invoice else None,
            "payment_method": self.payment_method,
            "amount": float(self.amount or 0),
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "status": self.status,
            "razorpay_order_id": self.razorpay_order_id,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }