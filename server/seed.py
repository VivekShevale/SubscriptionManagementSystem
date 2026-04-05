"""
seed.py
Dummy Data Seeder
------------------
Injects realistic test data into the database for development/demo.
Run: python seed.py (from the server/ directory with venv activated)

Creates:
  - 1 Admin user (admin@demo.com / Admin@123!)
  - 2 Internal users
  - 5 Portal/customer users
  - Taxes, Attributes, Products with variants
  - Recurring Plans, Quotation Templates, Payment Terms
  - Discounts, Contacts, Subscriptions, Invoices, Payments
"""

import os
import sys
from datetime import date, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from app import create_app, db
from app.models import (
    User, Contact, Tax, Attribute, AttributeValue, Product,
    ProductVariant, ProductRecurringPrice, RecurringPlan, RecurringPlanProduct,
    QuotationTemplate, QuotationTemplateLine, PaymentTerm, PaymentTermLine,
    Discount, Subscription, SubscriptionLine, Invoice, InvoiceLine, Payment
)
from app.utils.helpers import hash_password, generate_subscription_number, generate_invoice_number, compute_next_invoice_date

app = create_app()


def seed():
    with app.app_context():
        # Drop all and recreate for clean seed
        db.drop_all()
        db.create_all()
        print("🗄️  Database reset complete.")

        # ── 1. USERS ──────────────────────────────────────────────────────────
        admin = User(
            login_id="admin1",
            email="admin@demo.com",
            password_hash=hash_password("Admin@123!"),
            role="admin",
            is_active=True,
        )
        internal1 = User(
            login_id="john_int",
            email="john@demo.com",
            password_hash=hash_password("John@1234!"),
            role="internal",
            is_active=True,
        )
        internal2 = User(
            login_id="sara_int",
            email="sara@demo.com",
            password_hash=hash_password("Sara@1234!"),
            role="internal",
            is_active=True,
        )
        portal_users_data = [
            ("alice_p", "alice@customer.com"),
            ("bob_p", "bob@customer.com"),
            ("carol_p", "carol@customer.com"),
            ("dave_p", "dave@customer.com"),
            ("eve_p", "eve@customer.com"),
        ]
        portal_users = []
        db.session.add_all([admin, internal1, internal2])
        db.session.flush()

        for login_id, email in portal_users_data:
            pu = User(
                login_id=login_id,
                email=email,
                password_hash=hash_password("Portal@123!"),
                role="portal",
                is_active=True,
            )
            db.session.add(pu)
            portal_users.append(pu)

        db.session.flush()
        print("✅ Users created.")

        # ── 2. CONTACTS ───────────────────────────────────────────────────────
        contacts_data = [
            ("Admin User", "admin@demo.com", "+91-9000000001", "123 Admin Street, Mumbai", admin.id),
            ("John Internal", "john@demo.com", "+91-9000000002", "456 Office Lane, Delhi", internal1.id),
            ("Sara Internal", "sara@demo.com", "+91-9000000003", "789 Work Ave, Bangalore", internal2.id),
            ("Alice Johnson", "alice@customer.com", "+91-9876543210", "12 Rose Garden, Ahmedabad", portal_users[0].id),
            ("Bob Smith", "bob@customer.com", "+91-9876543211", "34 Blue Lake, Pune", portal_users[1].id),
            ("Carol White", "carol@customer.com", "+91-9876543212", "56 Green Park, Chennai", portal_users[2].id),
            ("Dave Brown", "dave@customer.com", "+91-9876543213", "78 Sunrise Colony, Hyderabad", portal_users[3].id),
            ("Eve Davis", "eve@customer.com", "+91-9876543214", "90 Silver Hills, Kolkata", portal_users[4].id),
        ]
        contacts = []
        for name, email, phone, address, user_id in contacts_data:
            c = Contact(name=name, email=email, phone=phone, address=address, user_id=user_id)
            db.session.add(c)
            contacts.append(c)
        db.session.flush()
        print("✅ Contacts created.")

        # ── 3. TAXES ──────────────────────────────────────────────────────────
        gst18 = Tax(name="GST 18%", computation="percentage", amount=18)
        gst12 = Tax(name="GST 12%", computation="percentage", amount=12)
        gst5 = Tax(name="GST 5%", computation="percentage", amount=5)
        fixed_tax = Tax(name="Service Charge ₹50", computation="fixed", amount=50)
        db.session.add_all([gst18, gst12, gst5, fixed_tax])
        db.session.flush()
        print("✅ Taxes created.")

        # ── 4. ATTRIBUTES ─────────────────────────────────────────────────────
        brand_attr = Attribute(name="Brand")
        size_attr = Attribute(name="Storage")
        db.session.add_all([brand_attr, size_attr])
        db.session.flush()

        brand_vals = [
            AttributeValue(attribute_id=brand_attr.id, value="Odoo", default_extra_price=560),
            AttributeValue(attribute_id=brand_attr.id, value="Salesforce", default_extra_price=800),
            AttributeValue(attribute_id=brand_attr.id, value="Custom", default_extra_price=200),
        ]
        size_vals = [
            AttributeValue(attribute_id=size_attr.id, value="10 GB", default_extra_price=0),
            AttributeValue(attribute_id=size_attr.id, value="50 GB", default_extra_price=300),
            AttributeValue(attribute_id=size_attr.id, value="100 GB", default_extra_price=700),
        ]
        db.session.add_all(brand_vals + size_vals)
        db.session.flush()
        print("✅ Attributes & values created.")

        # ── 5. RECURRING PLANS ────────────────────────────────────────────────
        monthly_plan = RecurringPlan(
            name="Monthly Basic",
            billing_period="monthly",
            billing_period_count=1,
            is_closable=True,
            is_pausable=True,
            is_renewable=True,
        )
        quarterly_plan = RecurringPlan(
            name="Quarterly Standard",
            billing_period="monthly",
            billing_period_count=3,
            is_closable=True,
            is_pausable=False,
            is_renewable=True,
        )
        yearly_plan = RecurringPlan(
            name="Annual Premium",
            billing_period="yearly",
            billing_period_count=1,
            is_closable=False,
            is_pausable=False,
            is_renewable=True,
        )
        weekly_plan = RecurringPlan(
            name="Weekly Starter",
            billing_period="weekly",
            billing_period_count=1,
            is_closable=True,
            is_pausable=True,
            is_renewable=True,
        )
        db.session.add_all([monthly_plan, quarterly_plan, yearly_plan, weekly_plan])
        db.session.flush()
        print("✅ Recurring plans created.")

        # ── 6. PRODUCTS ───────────────────────────────────────────────────────
        products_data = [
            ("CRM Software Suite", "service", 1200, 600, "Full-featured CRM with contacts, deals, and reporting."),
            ("HR Management System", "service", 1800, 900, "Comprehensive HR module with payroll and attendance."),
            ("Cloud Storage Pro", "service", 499, 100, "Secure cloud storage with 99.9% uptime guarantee."),
            ("Accounting Module", "service", 950, 400, "GST-compliant accounting with invoicing and reports."),
            ("E-Commerce Platform", "service", 2500, 1200, "Multi-store e-commerce with payment gateway integration."),
            ("Analytics Dashboard", "service", 799, 300, "Real-time analytics with custom charts and exports."),
            ("Support Helpdesk", "goods", 350, 150, "Multi-channel support ticket management system."),
            ("Email Marketing Tool", "goods", 599, 250, "Bulk email campaigns with A/B testing and analytics."),
        ]
        products = []
        for name, ptype, sales, cost, desc in products_data:
            p = Product(
                name=name,
                product_type=ptype,
                sales_price=sales,
                cost_price=cost,
                description=desc,
            )
            p.taxes = [gst18]
            db.session.add(p)
            products.append(p)
        db.session.flush()

        # Add variants to first 3 products
        for i, p in enumerate(products[:3]):
            db.session.add(ProductVariant(
                product_id=p.id,
                attribute_id=brand_attr.id,
                attribute_value_id=brand_vals[i % 3].id,
                extra_price=brand_vals[i % 3].default_extra_price,
            ))

        # Add recurring prices
        for p in products:
            db.session.add(ProductRecurringPrice(
                product_id=p.id,
                recurring_plan_id=monthly_plan.id,
                price=p.sales_price,
                min_qty=1,
                start_date=date.today(),
            ))
            db.session.add(ProductRecurringPrice(
                product_id=p.id,
                recurring_plan_id=yearly_plan.id,
                price=round(float(p.sales_price) * 10, 2),  # 2 months free on annual
                min_qty=1,
                start_date=date.today(),
            ))

        db.session.flush()
        print("✅ Products with variants & recurring prices created.")

        # ── 7. PAYMENT TERMS ─────────────────────────────────────────────────
        immediate = PaymentTerm(name="Immediate Payment", early_discount_percentage=0)
        net30 = PaymentTerm(name="Net 30 Days", early_discount_percentage=2)
        net15 = PaymentTerm(name="Net 15 Days", early_discount_percentage=1)
        db.session.add_all([immediate, net30, net15])
        db.session.flush()

        db.session.add(PaymentTermLine(payment_term_id=immediate.id, due_type="percentage", due_value=100, after_days=0))
        db.session.add(PaymentTermLine(payment_term_id=net30.id, due_type="percentage", due_value=100, after_days=30))
        db.session.add(PaymentTermLine(payment_term_id=net15.id, due_type="percentage", due_value=50, after_days=15))
        db.session.add(PaymentTermLine(payment_term_id=net15.id, due_type="percentage", due_value=50, after_days=30))
        db.session.flush()
        print("✅ Payment terms created.")

        # ── 8. QUOTATION TEMPLATES ────────────────────────────────────────────
        qt1 = QuotationTemplate(
            name="SaaS Starter Pack",
            validity_days=30,
            recurring_plan_id=monthly_plan.id,
            last_forever=False,
            end_after_count=12,
            end_after_unit="month",
        )
        qt2 = QuotationTemplate(
            name="Enterprise Annual Bundle",
            validity_days=14,
            recurring_plan_id=yearly_plan.id,
            last_forever=True,
        )
        db.session.add_all([qt1, qt2])
        db.session.flush()

        db.session.add(QuotationTemplateLine(template_id=qt1.id, product_id=products[0].id, description="CRM Suite - Monthly", quantity=1))
        db.session.add(QuotationTemplateLine(template_id=qt1.id, product_id=products[5].id, description="Analytics Add-on", quantity=1))
        db.session.add(QuotationTemplateLine(template_id=qt2.id, product_id=products[1].id, description="HR Module - Annual", quantity=1))
        db.session.add(QuotationTemplateLine(template_id=qt2.id, product_id=products[3].id, description="Accounting - Annual", quantity=1))
        db.session.flush()
        print("✅ Quotation templates created.")

        # ── 9. DISCOUNTS ──────────────────────────────────────────────────────
        disc1 = Discount(
            name="WELCOME10",
            discount_type="percentage",
            value=10,
            min_purchase=500,
            min_quantity=1,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
            limit_usage=True,
            usage_limit=100,
            created_by=admin.id,
        )
        disc2 = Discount(
            name="FLAT500",
            discount_type="fixed",
            value=500,
            min_purchase=2000,
            min_quantity=2,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=180),
            limit_usage=False,
            created_by=admin.id,
        )
        disc3 = Discount(
            name="ANNUAL20",
            discount_type="percentage",
            value=20,
            min_purchase=5000,
            min_quantity=1,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
            limit_usage=True,
            usage_limit=50,
            created_by=admin.id,
        )
        db.session.add_all([disc1, disc2, disc3])
        db.session.flush()
        print("✅ Discounts created.")

        # ── 10. SUBSCRIPTIONS ─────────────────────────────────────────────────
        today = date.today()
        sub_configs = [
            # (customer_contact, plan, status, salesperson)
            (contacts[3], monthly_plan, "active", internal1.id),       # Alice - active monthly
            (contacts[4], quarterly_plan, "active", internal1.id),      # Bob - active quarterly
            (contacts[5], yearly_plan, "confirmed", internal2.id),      # Carol - confirmed annual
            (contacts[6], monthly_plan, "quotation_sent", internal2.id),# Dave - quotation sent
            (contacts[7], weekly_plan, "closed", admin.id),             # Eve - closed
            (contacts[3], yearly_plan, "active", internal1.id),         # Alice - second sub
            (contacts[4], monthly_plan, "draft", internal1.id),         # Bob - draft
        ]

        subscriptions = []
        sub_counter = 1
        for cust_contact, plan, status, salesperson_id in sub_configs:
            sub_num = f"S{sub_counter:04d}"
            sub_counter += 1
            start = today - timedelta(days=30 * (len(subscriptions) % 4 + 1))

            sub = Subscription(
                subscription_number=sub_num,
                customer_id=cust_contact.id,
                plan_id=plan.id,
                quotation_template_id=qt1.id if sub_counter % 2 == 0 else None,
                payment_term_id=immediate.id,
                salesperson_id=salesperson_id,
                status=status,
                start_date=start if status not in ("draft", "quotation") else None,
                order_date=start if status not in ("draft", "quotation") else None,
                next_invoice_date=compute_next_invoice_date(today, plan.billing_period, plan.billing_period_count) if status == "active" else None,
                created_by=admin.id,
            )
            db.session.add(sub)
            db.session.flush()

            # Add 2 order lines per subscription
            prod_a = products[(sub_counter - 1) % len(products)]
            prod_b = products[sub_counter % len(products)]

            for prod in [prod_a, prod_b]:
                sl = SubscriptionLine(
                    subscription_id=sub.id,
                    product_id=prod.id,
                    quantity=1,
                    unit_price=prod.sales_price,
                    discount_pct=10 if status == "active" else 0,
                    tax_ids=[gst18.id],
                )
                db.session.add(sl)

            subscriptions.append(sub)

        db.session.flush()
        print("✅ Subscriptions with order lines created.")

        # ── 11. INVOICES & PAYMENTS ───────────────────────────────────────────
        inv_counter = 1
        for i, sub in enumerate(subscriptions[:5]):  # Generate invoices for first 5
            inv_num = f"INV/{inv_counter:04d}"
            inv_counter += 1
            inv_date = today - timedelta(days=20 - i * 3)
            due_date = inv_date + timedelta(days=30)

            status = "paid" if i < 3 else ("confirmed" if i < 4 else "draft")
            invoice = Invoice(
                invoice_number=inv_num,
                subscription_id=sub.id,
                customer_id=sub.customer_id,
                invoice_date=inv_date,
                due_date=due_date,
                status=status,
            )
            db.session.add(invoice)
            db.session.flush()

            # Copy subscription lines
            for sl in sub.order_lines:
                db.session.add(InvoiceLine(
                    invoice_id=invoice.id,
                    product_id=sl.product_id,
                    description=sl.product.name if sl.product else "Service",
                    quantity=sl.quantity,
                    unit_price=sl.unit_price,
                    discount_pct=sl.discount_pct,
                    tax_ids=sl.tax_ids,
                ))
            db.session.flush()

            # Add payment for paid invoices
            if status == "paid":
                db.session.add(Payment(
                    invoice_id=invoice.id,
                    payment_method="online" if i % 2 == 0 else "cash",
                    amount=invoice.total,
                    payment_date=inv_date + timedelta(days=5),
                    status="completed",
                ))

        db.session.commit()
        print("✅ Invoices & payments created.")
        print()
        print("=" * 60)
        print("🎉 SEED COMPLETE! Login credentials:")
        print("=" * 60)
        print("  Admin:    admin@demo.com    / Admin@123!")
        print("  Internal: john@demo.com     / John@1234!")
        print("  Internal: sara@demo.com     / Sara@1234!")
        print("  Portal:   alice@customer.com / Portal@123!")
        print("  Portal:   bob@customer.com  / Portal@123!")
        print("=" * 60)


if __name__ == "__main__":
    seed()