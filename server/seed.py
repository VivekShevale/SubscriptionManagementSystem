"""
seed.py
Comprehensive Data Seeder
--------------------------
Injects realistic, time-spread data from Jan 2024 to Apr 2026.

Creates:
  - 1 Admin + 8 Internal users + 191 Portal/customer users  (= 200 users)
  - 200 Contacts (one per user)
  - 4 Taxes, 5 Attributes with values
  - 8 Recurring Plans, 6 Payment Terms, 12 Quotation Templates, 15 Discounts
  - 520 Products across 10 categories with variants & recurring prices
  - ~450 Subscriptions spanning Jan-2024 → Apr-2026
  - ~650 Invoices with matching Invoice Lines
  - ~500 Payments (mix of cash / online / razorpay)

Run:
    python seed.py        (from server/ directory with venv active)
"""

import os, sys, random
from datetime import date, timedelta, datetime, timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from app import create_app, db
from app.models import (
    User, Contact, Tax, Attribute, AttributeValue,
    Product, ProductVariant, ProductRecurringPrice,
    RecurringPlan, RecurringPlanProduct,
    QuotationTemplate, QuotationTemplateLine,
    PaymentTerm, PaymentTermLine,
    Discount, Subscription, SubscriptionLine,
    Invoice, InvoiceLine, Payment,
)
from app.utils.helpers import hash_password, compute_next_invoice_date

random.seed(42)
app = create_app()

# ── helpers ───────────────────────────────────────────────────────────────────

def rand_date(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))

def fmt_sub(n: int) -> str:
    return f"S{n:04d}"

def fmt_inv(n: int) -> str:
    return f"INV/{n:04d}"

START = date(2024, 1, 1)
END   = date(2026, 4, 5)   # today-ish

# ─────────────────────────────────────────────────────────────────────────────

def seed():
    with app.app_context():
        db.drop_all()
        db.create_all()
        print("🗄️  Database reset complete.")

        # ── 1. USERS ─────────────────────────────────────────────────────────
        PASS_INTERNAL = hash_password("Internal@123!")
        PASS_PORTAL   = hash_password("Portal@123!")

        admin = User(login_id="admin1", email="admin@demo.com",
                     password_hash=hash_password("Admin@123!"),
                     role="admin", is_active=True)
        db.session.add(admin)
        db.session.flush()

        # 8 internal users
        internal_data = [
            ("john_int", "john@demo.com"),
            ("sara_int", "sara@demo.com"),
            ("raj_int",  "raj@demo.com"),
            ("priya_in", "priya@demo.com"),
            ("arjun_in", "arjun@demo.com"),
            ("meera_in", "meera@demo.com"),
            ("karan_in", "karan@demo.com"),
            ("nisha_in", "nisha@demo.com"),
        ]
        internals = []
        for login_id, email in internal_data:
            u = User(login_id=login_id, email=email,
                     password_hash=PASS_INTERNAL,
                     role="internal", is_active=True, created_by=admin.id)
            db.session.add(u)
            internals.append(u)
        db.session.flush()

        # 191 portal users → total 200
        FIRST_NAMES = [
            "Aarav","Aditya","Akash","Amit","Ananya","Ankit","Ankita","Arjun",
            "Aryan","Asmita","Avni","Ayaan","Bhavya","Chirag","Deepak","Deepika",
            "Dhruv","Divya","Farhan","Gaurav","Harshit","Himani","Ishaan","Isha",
            "Jatin","Jay","Jyoti","Kabir","Kajal","Karan","Kavya","Kishore",
            "Komal","Krish","Lakshmi","Lavanya","Manish","Mansi","Maya","Mihir",
            "Mohan","Mohit","Muskan","Naman","Neha","Nikhil","Nikita","Nitin",
            "Pankaj","Payal","Pooja","Pradeep","Preethi","Priya","Rahul","Raj",
            "Rajesh","Rajan","Ravi","Rekha","Rhea","Rohit","Ruchi","Sachin",
            "Sagar","Sakshi","Saloni","Sandeep","Sandhya","Sanjay","Sapna",
            "Sarita","Seema","Shivam","Shreya","Shruti","Shubham","Simran",
            "Sneha","Sonal","Subhash","Sunil","Supriya","Swati","Tanvi","Tarun",
            "Uday","Umesh","Vaibhav","Vanessa","Vanita","Vikas","Vikram","Vipul",
            "Vishal","Vivek","Yash","Yogesh","Zara","Zoya","Arun","Bindu","Charu",
        ]
        LAST_NAMES = [
            "Sharma","Verma","Gupta","Singh","Patel","Joshi","Mehta","Shah",
            "Kumar","Rao","Reddy","Nair","Pillai","Iyer","Chaudhary","Malhotra",
            "Kapoor","Bose","Ghosh","Das","Chatterjee","Mukherjee","Sinha","Roy",
            "Thakur","Pandey","Mishra","Tiwari","Dubey","Saxena","Agarwal",
            "Banerjee","Desai","Kulkarni","Jain","Khanna","Arora","Batra",
            "Dutta","Srivastava",
        ]
        CITIES = [
            "Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Pune","Ahmedabad",
            "Kolkata","Jaipur","Lucknow","Chandigarh","Surat","Nagpur","Indore",
            "Bhopal","Coimbatore","Kochi","Visakhapatnam","Patna","Vadodara",
        ]

        used_logins = set(["admin1"] + [d[0] for d in internal_data])
        used_emails = set(["admin@demo.com"] + [d[1] for d in internal_data])
        portal_users = []

        for i in range(191):
            fn = FIRST_NAMES[i % len(FIRST_NAMES)]
            ln = LAST_NAMES[i % len(LAST_NAMES)]
            base_login = (fn[:4] + ln[:4]).lower()
            login_id = base_login
            suffix = 1
            while login_id in used_logins or len(login_id) < 6:
                login_id = f"{base_login}{suffix}"
                suffix += 1
            used_logins.add(login_id)

            email = f"{fn.lower()}.{ln.lower()}{i}@customer.com"
            while email in used_emails:
                email = f"{fn.lower()}.{ln.lower()}{i}_{suffix}@customer.com"
                suffix += 1
            used_emails.add(email)

            u = User(login_id=login_id[:12], email=email,
                     password_hash=PASS_PORTAL,
                     role="portal", is_active=random.random() > 0.05,
                     created_by=admin.id)
            db.session.add(u)
            portal_users.append(u)

        db.session.flush()
        print(f"✅ Users created: 1 admin + {len(internals)} internal + {len(portal_users)} portal = {1+len(internals)+len(portal_users)} total")

        # ── 2. CONTACTS ───────────────────────────────────────────────────────
        all_staff = [admin] + internals
        all_portal = portal_users
        contacts = []

        staff_contact_data = [
            ("Admin User",      "admin@demo.com",  "+91-9000000001", "123 Admin Street",   "Mumbai",      admin),
            ("John Internal",   "john@demo.com",   "+91-9000000002", "456 Office Lane",    "Delhi",       internals[0]),
            ("Sara Internal",   "sara@demo.com",   "+91-9000000003", "789 Work Ave",       "Bangalore",   internals[1]),
            ("Raj Internal",    "raj@demo.com",    "+91-9000000004", "12 Tech Park",       "Hyderabad",   internals[2]),
            ("Priya Internal",  "priya@demo.com",  "+91-9000000005", "34 Business Hub",   "Chennai",     internals[3]),
            ("Arjun Internal",  "arjun@demo.com",  "+91-9000000006", "56 Corp Tower",     "Pune",        internals[4]),
            ("Meera Internal",  "meera@demo.com",  "+91-9000000007", "78 Enterprise Zone","Ahmedabad",   internals[5]),
            ("Karan Internal",  "karan@demo.com",  "+91-9000000008", "90 IT Corridor",    "Kolkata",     internals[6]),
            ("Nisha Internal",  "nisha@demo.com",  "+91-9000000009", "11 Software Park",  "Jaipur",      internals[7]),
        ]
        for name, email, phone, address, city, user in staff_contact_data:
            c = Contact(name=name, email=email, phone=phone,
                        address=address, city=city, country="India",
                        user_id=user.id)
            db.session.add(c)
            contacts.append(c)

        for i, u in enumerate(portal_users):
            fn = FIRST_NAMES[i % len(FIRST_NAMES)]
            ln = LAST_NAMES[i % len(LAST_NAMES)]
            city = CITIES[i % len(CITIES)]
            phone_num = 9876500000 + i
            email_parts = u.email.split("@")
            c = Contact(
                name=f"{fn} {ln}",
                email=u.email,
                phone=f"+91-{phone_num}",
                address=f"{random.randint(1,999)} {ln} Nagar",
                city=city,
                country="India",
                user_id=u.id,
            )
            db.session.add(c)
            contacts.append(c)

        db.session.flush()
        # portal contacts only (for subscription customer assignment)
        portal_contacts = contacts[len(staff_contact_data):]
        print(f"✅ Contacts created: {len(contacts)}")

        # ── 3. TAXES ──────────────────────────────────────────────────────────
        gst18   = Tax(name="GST 18%",           computation="percentage", amount=18)
        gst12   = Tax(name="GST 12%",           computation="percentage", amount=12)
        gst5    = Tax(name="GST 5%",            computation="percentage", amount=5)
        gst28   = Tax(name="GST 28%",           computation="percentage", amount=28)
        svc50   = Tax(name="Service Charge ₹50",computation="fixed",      amount=50)
        db.session.add_all([gst18, gst12, gst5, gst28, svc50])
        db.session.flush()
        taxes_by_category = {
            "SaaS":       [gst18],
            "Cloud":      [gst18],
            "Security":   [gst18],
            "Analytics":  [gst18],
            "Finance":    [gst12],
            "HR":         [gst18],
            "Marketing":  [gst18],
            "ERP":        [gst18],
            "Support":    [gst12],
            "DevTools":   [gst18],
        }
        print("✅ Taxes created.")

        # ── 4. ATTRIBUTES ─────────────────────────────────────────────────────
        tier_attr   = Attribute(name="Tier")
        storage_attr= Attribute(name="Storage")
        users_attr  = Attribute(name="User Seats")
        region_attr = Attribute(name="Region")
        support_attr= Attribute(name="Support Level")
        db.session.add_all([tier_attr, storage_attr, users_attr, region_attr, support_attr])
        db.session.flush()

        tier_vals = [
            AttributeValue(attribute_id=tier_attr.id, value="Starter",    default_extra_price=0),
            AttributeValue(attribute_id=tier_attr.id, value="Professional",default_extra_price=500),
            AttributeValue(attribute_id=tier_attr.id, value="Enterprise",  default_extra_price=1500),
        ]
        storage_vals = [
            AttributeValue(attribute_id=storage_attr.id, value="10 GB",  default_extra_price=0),
            AttributeValue(attribute_id=storage_attr.id, value="50 GB",  default_extra_price=299),
            AttributeValue(attribute_id=storage_attr.id, value="100 GB", default_extra_price=599),
            AttributeValue(attribute_id=storage_attr.id, value="500 GB", default_extra_price=1499),
            AttributeValue(attribute_id=storage_attr.id, value="1 TB",   default_extra_price=2999),
        ]
        users_vals = [
            AttributeValue(attribute_id=users_attr.id, value="5 Users",   default_extra_price=0),
            AttributeValue(attribute_id=users_attr.id, value="25 Users",  default_extra_price=800),
            AttributeValue(attribute_id=users_attr.id, value="100 Users", default_extra_price=2500),
            AttributeValue(attribute_id=users_attr.id, value="Unlimited", default_extra_price=5000),
        ]
        region_vals = [
            AttributeValue(attribute_id=region_attr.id, value="India",   default_extra_price=0),
            AttributeValue(attribute_id=region_attr.id, value="US East", default_extra_price=400),
            AttributeValue(attribute_id=region_attr.id, value="EU West", default_extra_price=600),
        ]
        support_vals = [
            AttributeValue(attribute_id=support_attr.id, value="Email Only",   default_extra_price=0),
            AttributeValue(attribute_id=support_attr.id, value="Email + Chat", default_extra_price=200),
            AttributeValue(attribute_id=support_attr.id, value="24/7 Phone",   default_extra_price=800),
        ]
        all_attr_vals = tier_vals + storage_vals + users_vals + region_vals + support_vals
        db.session.add_all(all_attr_vals)
        db.session.flush()
        print("✅ Attributes created.")

        # ── 5. RECURRING PLANS ────────────────────────────────────────────────
        plans = [
            RecurringPlan(name="Weekly Starter",      billing_period="weekly",  billing_period_count=1,  is_closable=True,  is_pausable=True,  is_renewable=True),
            RecurringPlan(name="Monthly Basic",       billing_period="monthly", billing_period_count=1,  is_closable=True,  is_pausable=True,  is_renewable=True),
            RecurringPlan(name="Monthly Standard",    billing_period="monthly", billing_period_count=1,  is_closable=True,  is_pausable=True,  is_renewable=True),
            RecurringPlan(name="Monthly Pro",         billing_period="monthly", billing_period_count=1,  is_closable=True,  is_pausable=False, is_renewable=True),
            RecurringPlan(name="Quarterly Standard",  billing_period="monthly", billing_period_count=3,  is_closable=True,  is_pausable=False, is_renewable=True),
            RecurringPlan(name="Quarterly Pro",       billing_period="monthly", billing_period_count=3,  is_closable=False, is_pausable=False, is_renewable=True),
            RecurringPlan(name="Annual Basic",        billing_period="yearly",  billing_period_count=1,  is_closable=False, is_pausable=False, is_renewable=True),
            RecurringPlan(name="Annual Enterprise",   billing_period="yearly",  billing_period_count=1,  is_closable=False, is_pausable=False, is_renewable=True),
        ]
        db.session.add_all(plans)
        db.session.flush()
        (weekly, monthly_basic, monthly_std, monthly_pro,
         quarterly_std, quarterly_pro, annual_basic, annual_ent) = plans
        print("✅ Recurring plans created.")

        # ── 6. PAYMENT TERMS ─────────────────────────────────────────────────
        pt_immediate = PaymentTerm(name="Immediate",         early_discount_percentage=0)
        pt_net7      = PaymentTerm(name="Net 7 Days",        early_discount_percentage=0)
        pt_net15     = PaymentTerm(name="Net 15 Days",       early_discount_percentage=1)
        pt_net30     = PaymentTerm(name="Net 30 Days",       early_discount_percentage=2)
        pt_net45     = PaymentTerm(name="Net 45 Days",       early_discount_percentage=3)
        pt_split     = PaymentTerm(name="50/50 Split",       early_discount_percentage=0)
        db.session.add_all([pt_immediate, pt_net7, pt_net15, pt_net30, pt_net45, pt_split])
        db.session.flush()

        for pt, days, pct in [
            (pt_immediate, 0,  100), (pt_net7, 7, 100),
            (pt_net15, 15, 100),     (pt_net30, 30, 100), (pt_net45, 45, 100),
        ]:
            db.session.add(PaymentTermLine(payment_term_id=pt.id, due_type="percentage", due_value=pct, after_days=days))
        db.session.add(PaymentTermLine(payment_term_id=pt_split.id, due_type="percentage", due_value=50, after_days=0))
        db.session.add(PaymentTermLine(payment_term_id=pt_split.id, due_type="percentage", due_value=50, after_days=30))
        db.session.flush()
        print("✅ Payment terms created.")

        # ── 7. PRODUCTS (520) ─────────────────────────────────────────────────
        PRODUCT_CATALOG = {
            "SaaS": [
                ("CRM Essentials",           999,   450, "Contact management, deal tracking, pipeline views."),
                ("CRM Professional",        1999,   900, "Advanced CRM with automation, scoring and AI insights."),
                ("CRM Enterprise",          4999,  2000, "Full CRM suite — unlimited contacts, custom modules."),
                ("Sales Automation Suite",  1499,   700, "Automate follow-ups, quotes and order workflows."),
                ("Customer Portal",          799,   350, "Self-service portal for customers to manage accounts."),
                ("Lead Management Pro",     1299,   600, "Capture, nurture and convert leads with smart scoring."),
                ("Pipeline Tracker",         499,   200, "Visual Kanban pipeline for sales teams."),
                ("Quote Builder",            699,   300, "Generate professional quotes in seconds."),
                ("Contract Manager",        1199,   550, "Manage contracts, renewals and e-signatures."),
                ("Partner Portal",          2499,  1200, "Onboard and manage channel partners seamlessly."),
                ("Territory Management",    1799,   850, "Assign territories, set targets and track performance."),
                ("Opportunity Tracker",      899,   400, "Track all sales opportunities and forecast revenue."),
                ("SaaS Starter Pack",        599,   250, "Basic SaaS toolkit for small teams."),
                ("Revenue Intelligence",    3499,  1500, "AI-driven revenue forecasting and insights."),
                ("Customer Success Hub",    2199,  1000, "Track customer health, renewals and NPS scores."),
                ("Account-Based Marketing",  1699,   750, "Target and engage high-value accounts at scale."),
                ("Deal Room",               1099,   500, "Collaborative deal rooms for faster closing."),
                ("SaaS Metrics Dashboard",   899,   400, "Track MRR, churn, LTV and expansion revenue."),
                ("Onboarding Automation",   1399,   650, "Guide new customers through setup automatically."),
                ("Renewal Manager",          999,   450, "Alert, automate and track subscription renewals."),
                ("Customer Feedback Loop",   599,   250, "Collect, analyse and act on customer feedback."),
                ("Product Tour Builder",     799,   350, "Create interactive product walkthroughs."),
                ("Usage Analytics",         1199,   550, "Track feature adoption and engagement metrics."),
                ("Churn Predictor",         2499,  1100, "ML-powered churn risk scoring and alerts."),
                ("In-App Messaging",         999,   450, "Send targeted in-app messages and tooltips."),
                ("Community Platform",      1599,   700, "Build a community around your SaaS product."),
                ("Changelog Manager",        399,   150, "Announce product updates and collect reactions."),
                ("Feature Request Board",    499,   200, "Gather and prioritise customer feature requests."),
                ("SaaS Billing Engine",     2999,  1300, "Metered, seat-based and hybrid billing models."),
                ("Affiliate Tracker",        799,   350, "Manage affiliates, commissions and payouts."),
                ("Referral Engine",          699,   300, "Run referral programmes to grow virally."),
                ("Trial Manager",            499,   200, "Manage free trials, extensions and conversions."),
                ("Licence Manager",         1299,   600, "Issue, validate and revoke software licences."),
                ("White-Label Portal",      3499,  1500, "Full white-label customer-facing portal."),
                ("SaaS Health Monitor",      899,   400, "Uptime, latency and error-rate monitoring."),
                ("Integration Hub",         1799,   800, "Connect your SaaS to 200+ third-party apps."),
                ("Webhook Manager",          599,   250, "Build and manage outbound webhooks easily."),
                ("API Gateway",             2499,  1100, "Secure, rate-limited API gateway for your product."),
                ("Multi-Tenant Manager",    3999,  1800, "Isolate tenant data and customise per account."),
                ("Data Residency Control",  4999,  2200, "Host customer data in their chosen geography."),
                ("SaaS Sandbox",             499,   200, "Safe sandbox environment for demos and testing."),
                ("Version Control Bridge",   699,   300, "Connect code repos to your product roadmap."),
                ("Release Notes Builder",    399,   150, "Auto-generate release notes from commits."),
                ("Downtime Page Builder",    299,   100, "Maintain branded status and downtime pages."),
                ("SSO Manager",             1499,   650, "SAML/OIDC single sign-on for enterprise customers."),
                ("SCIM Provisioning",       1899,   850, "Automate user provisioning via SCIM 2.0."),
                ("Audit Log Viewer",         799,   350, "Immutable audit trail for compliance."),
                ("Data Export Scheduler",    499,   200, "Schedule and deliver automated data exports."),
                ("GDPR Toolkit",            1299,   600, "Consent management, DSR handling and DPA tools."),
                ("SOC2 Compliance Kit",     2999,  1300, "Automated evidence collection for SOC2 audits."),
                ("Pen Test Manager",        3499,  1500, "Manage penetration tests and findings."),
            ],
            "Cloud": [
                ("Cloud Storage Basic",      299,   100, "5 GB secure cloud storage with versioning."),
                ("Cloud Storage Pro",        599,   200, "50 GB storage with advanced sharing controls."),
                ("Cloud Storage Business",   999,   400, "200 GB with team folders and admin controls."),
                ("Cloud Storage Enterprise",1999,   800, "Unlimited storage with geo-replication."),
                ("Object Storage S3",        799,   300, "S3-compatible object storage for developers."),
                ("File Sync & Share",         499,   200, "Desktop sync across devices with mobile apps."),
                ("Backup as a Service",       699,   280, "Automated daily backups with 30-day retention."),
                ("Disaster Recovery",        2499,  1000, "Failover and recovery in under 1 hour RTO."),
                ("CDN Pro",                   899,   350, "Edge caching and delivery across 50 PoPs."),
                ("Cloud VPN",                 399,   150, "Secure encrypted VPN for remote teams."),
                ("Virtual Desktop",          1299,   550, "Cloud-hosted Windows/Linux virtual desktops."),
                ("Cloud PBX",                 999,   400, "Hosted phone system with 100 extensions."),
                ("Video Conferencing",        799,   300, "HD video meetings with recording and transcription."),
                ("Live Streaming Platform",  2199,   950, "Stream live events to millions of viewers."),
                ("Serverless Functions",      599,   220, "Event-driven compute — pay per invocation."),
                ("Container Registry",        399,   150, "Private Docker image registry with scanning."),
                ("Kubernetes Manager",       1799,   750, "Managed Kubernetes with auto-scaling."),
                ("Cloud Database MySQL",      699,   280, "Managed MySQL with automated backups."),
                ("Cloud Database PostgreSQL", 799,   320, "Managed Postgres with read replicas."),
                ("Cloud Database MongoDB",    999,   400, "Managed MongoDB Atlas-style cluster."),
                ("Redis Cache",               499,   200, "Managed Redis for sessions and caching."),
                ("Elasticsearch Service",    1299,   550, "Managed ELK stack for log analytics."),
                ("Message Queue",             699,   280, "RabbitMQ/Kafka-style managed message broker."),
                ("Cloud Load Balancer",       599,   230, "Distribute traffic intelligently across servers."),
                ("DNS Manager",               299,   100, "Fast, reliable managed DNS with DNSSEC."),
                ("SSL Certificate Manager",   399,   150, "Auto-renewing SSL certificates for all domains."),
                ("DDoS Protection",          1499,   650, "Always-on volumetric and application-layer DDoS mitigation."),
                ("WAF Pro",                  1799,   800, "Web application firewall with custom rules."),
                ("Cloud Monitoring",          699,   280, "Metrics, logs and alerts in one unified view."),
                ("Log Management",            899,   350, "Centralised log ingestion and search at scale."),
                ("Cloud Cost Manager",        799,   320, "Spot overspend and optimise cloud costs."),
                ("Cloud Migration Kit",      3499,  1500, "Guided tools to migrate workloads to the cloud."),
                ("Hybrid Cloud Bridge",      2999,  1300, "Connect on-premise data centres to the cloud."),
                ("Multi-Cloud Manager",      3999,  1750, "Manage AWS, GCP and Azure from one console."),
                ("Cloud Governance Suite",   4499,  2000, "Policy-as-code for cloud compliance and security."),
                ("Infrastructure as Code",   1999,   900, "Terraform/Pulumi templates for common stacks."),
                ("CI/CD Pipeline",           1299,   550, "Automated build, test and deploy pipelines."),
                ("Feature Flag Service",      599,   230, "Safe feature rollouts with instant kill-switch."),
                ("A/B Testing Platform",      899,   380, "Server-side A/B and multivariate testing."),
                ("Edge Config",               399,   150, "Low-latency config delivery at the edge."),
                ("Secrets Manager",           699,   280, "Encrypted storage and rotation for API keys."),
                ("Cloud Sandbox",             499,   200, "Isolated environment for demos and staging."),
                ("Cloud Bursting",           1499,   650, "Automatically burst workloads to public cloud."),
                ("FinOps Dashboard",          999,   420, "Real-time cloud spend tracking by team and project."),
                ("Cloud Native Network",     2499,  1100, "SD-WAN and zero-trust network for cloud-first teams."),
                ("Observability Suite",      1899,   850, "Traces, metrics and logs with OpenTelemetry."),
                ("SLO Manager",               799,   320, "Define, track and alert on service-level objectives."),
                ("Incident Manager",          999,   420, "On-call scheduling, escalation and postmortems."),
                ("Chaos Engineering",        1499,   650, "Inject controlled failures to test resilience."),
                ("Cloud Compliance Checker",  1299,   550, "Auto-scan cloud resources for compliance gaps."),
                ("Green Cloud Tracker",       399,   150, "Measure and offset your cloud carbon footprint."),
            ],
            "Security": [
                ("Endpoint Protection",      999,   420, "Next-gen antivirus for laptops and servers."),
                ("Identity Manager",        1499,   650, "SSO, MFA and lifecycle management."),
                ("Zero Trust Access",       2499,  1100, "Identity-based access without VPN."),
                ("SIEM Pro",               4999,  2200, "Correlate logs and detect threats in real time."),
                ("Vulnerability Scanner",  1299,   550, "Continuous scanning for CVEs and misconfigs."),
                ("Patch Manager",           999,   420, "Automated OS and application patching."),
                ("Password Manager Teams", 699,    280, "Secure password vault for business teams."),
                ("Dark Web Monitor",        799,   320, "Alert when company credentials appear on the dark web."),
                ("Phishing Simulator",      899,   380, "Test and train employees against phishing."),
                ("Security Awareness LMS", 1199,   500, "Gamified security awareness training platform."),
                ("Data Loss Prevention",   2999,  1300, "Block sensitive data leaving the organisation."),
                ("Cloud Security Posture",  1999,   880, "Continuously assess your cloud security posture."),
                ("Container Security",     1499,   650, "Scan images and protect running containers."),
                ("API Security Gateway",   2199,   950, "Discover, test and protect your APIs."),
                ("Bot Manager",            1299,   550, "Detect and block malicious bot traffic."),
                ("Fraud Detection",        2999,  1300, "ML-powered transaction fraud detection."),
                ("Compliance Automation",  3499,  1500, "Automate ISO 27001, PCI-DSS and HIPAA controls."),
                ("Risk Register",           999,   420, "Track, score and remediate IT risks."),
                ("Third-Party Risk",       1799,   800, "Assess and monitor vendor security posture."),
                ("Digital Forensics Kit",  4999,  2200, "Investigate incidents and collect evidence."),
                ("Secure Email Gateway",    799,   320, "Block spam, malware and advanced email threats."),
                ("Web Filtering",           599,   240, "Restrict employee access to risky websites."),
                ("Network Detection",      2499,  1100, "Detect lateral movement and C2 traffic."),
                ("Privileged Access Mgmt", 3499,  1500, "Vault, rotate and audit privileged credentials."),
                ("DevSecOps Pipeline",     1999,   880, "Embed security scans into your CI/CD."),
                ("Bug Bounty Platform",    2999,  1300, "Run a managed bug bounty programme."),
                ("Red Team as a Service",  9999,  4500, "Continuous adversary simulation by experts."),
                ("SOC as a Service",       7999,  3500, "24/7 managed security operations centre."),
                ("Threat Intelligence",    2499,  1100, "Curated IOC feeds and threat actor profiles."),
                ("Security Scorecard",     1299,   550, "Rate your security posture vs peers."),
                ("Cloud WAF",              1599,   700, "Managed web application firewall with CDN."),
                ("Mobile Threat Defense",  1299,   550, "Protect iOS and Android devices."),
                ("IoT Security Gateway",   2999,  1300, "Protect connected devices on your network."),
                ("OT/SCADA Security",      7499,  3300, "Protect industrial control systems."),
                ("Secure SDLC Platform",   2199,   950, "Integrate security throughout development lifecycle."),
                ("Cryptography Service",   1499,   650, "Hardware-backed key management and encryption."),
                ("Certificate Lifecycle",   999,   420, "Track, renew and revoke TLS certificates."),
                ("Security Metrics Board",  799,   320, "Report security KPIs to the board."),
                ("Insider Threat Detector",3499,  1500, "Behavioural analytics to spot insider threats."),
                ("Supply Chain Security",  2999,  1300, "Scan open source deps for known vulnerabilities."),
                ("SBOM Manager",           1299,   550, "Generate and track software bill of materials."),
                ("Data Masking Service",   1999,   880, "Mask sensitive data in non-production environments."),
                ("Cloud Pen Test",         4999,  2200, "Automated pen-test for cloud-hosted apps."),
                ("Runtime Protection",     2499,  1100, "Block zero-days at runtime with RASP."),
                ("Secure Code Review",     1999,   880, "AI-assisted code review for vulnerabilities."),
                ("Cyber Insurance Portal",  999,   420, "Manage cyber insurance applications and claims."),
                ("GDPR DPO Assistant",     1499,   650, "Tools and workflows for the Data Protection Officer."),
                ("Breach Response Kit",    3999,  1750, "Playbooks and tools for incident response."),
                ("Security Training API",   799,   320, "Embed security training in your own LMS."),
                ("Hardware Key Support",   1999,   880, "YubiKey and FIDO2 hardware token management."),
            ],
            "Analytics": [
                ("Analytics Starter",       499,   190, "Basic dashboards and reports for small teams."),
                ("Analytics Pro",          1299,   550, "Advanced visualisations with custom dimensions."),
                ("Analytics Enterprise",   3499,  1500, "Unlimited users, data sources and white-labelling."),
                ("Real-Time Dashboard",     999,   420, "Live streaming dashboards updating every second."),
                ("Business Intelligence",  2499,  1100, "Drag-and-drop BI with SQL and no-code modes."),
                ("Data Warehouse",         3999,  1750, "Managed columnar data warehouse for analytics."),
                ("ETL Pipeline Builder",   1999,   880, "Extract, transform and load from 100+ sources."),
                ("Data Catalog",           1499,   650, "Discover, document and govern your data assets."),
                ("ML Model Deployment",    2999,  1300, "Deploy and monitor machine learning models."),
                ("Predictive Analytics",   3499,  1500, "Forecast trends with AutoML pipelines."),
                ("Natural Language Query",  1999,   880, "Ask questions in plain English, get SQL answers."),
                ("Report Scheduler",        599,   230, "Auto-deliver reports to inboxes on a schedule."),
                ("Embedded Analytics",     2499,  1100, "Embed dashboards directly into your product."),
                ("Customer Journey Map",   1299,   550, "Visualise every touchpoint across the funnel."),
                ("Cohort Analysis Tool",    899,   380, "Understand retention by sign-up and behaviour cohorts."),
                ("Attribution Engine",     1799,   800, "Multi-touch marketing attribution modelling."),
                ("Revenue Analytics",      1999,   880, "Track MRR, ARR, expansion and churn."),
                ("Product Analytics",      1299,   550, "See how users interact with every feature."),
                ("Web Analytics",           699,   280, "Privacy-first web traffic and conversion analytics."),
                ("Mobile Analytics",        799,   320, "Track app sessions, funnels and crashes."),
                ("Search Analytics",        599,   230, "Understand what users search for in your product."),
                ("Survey Analytics",        699,   280, "Analyse open-text and Likert-scale survey data."),
                ("Social Media Analytics",  799,   320, "Track engagement across LinkedIn, Twitter and more."),
                ("SEO Analytics Suite",     999,   420, "Rankings, backlinks and content-gap analysis."),
                ("Ad Performance Monitor", 1299,   550, "Unify Google, Meta and LinkedIn ad data."),
                ("Email Analytics",         599,   230, "Open, click, bounce and unsubscribe tracking."),
                ("E-Commerce Analytics",   1499,   650, "GMV, basket size, CAC and LTV for online stores."),
                ("Supply Chain Analytics", 2499,  1100, "Demand forecasting and inventory optimisation."),
                ("HR Analytics",           1299,   550, "Headcount, attrition and performance insights."),
                ("Financial Analytics",    2999,  1300, "P&L, cashflow and budget vs actual dashboards."),
                ("Operations Analytics",   1999,   880, "Throughput, downtime and OEE tracking."),
                ("IoT Data Analytics",     2499,  1100, "Ingest and analyse sensor and device data."),
                ("Log Analytics",          1299,   550, "Parse, search and visualise application logs."),
                ("A/B Test Analyser",       899,   380, "Statistical significance and impact estimation."),
                ("Geospatial Analytics",   1999,   880, "Map-based visualisation of location data."),
                ("Graph Analytics",        2499,  1100, "Network and relationship analytics at scale."),
                ("Text Analytics",         1499,   650, "Sentiment, topic and entity extraction."),
                ("Image Analytics",        2999,  1300, "ML-powered image classification and tagging."),
                ("Time Series Analytics",  1799,   800, "Analyse metrics over time with anomaly detection."),
                ("Edge Analytics",         2199,   950, "Process and visualise IoT data at the edge."),
                ("Streaming Analytics",    2999,  1300, "Real-time analytics on event streams."),
                ("Data Quality Monitor",    999,   420, "Detect and alert on data drift and anomalies."),
                ("Data Lineage Tracker",   1499,   650, "Trace data from source to dashboard."),
                ("Metadata Manager",        799,   320, "Manage tags, owners and descriptions for all datasets."),
                ("Query Optimiser",         999,   420, "Automatically tune slow SQL queries."),
                ("Data Sharing Platform",  1999,   880, "Share datasets securely with partners."),
                ("Carbon Analytics",        799,   320, "Track and report your organisation's carbon footprint."),
                ("Compliance Analytics",   1499,   650, "Audit trail and compliance reporting dashboards."),
                ("Customer 360 Platform",  3499,  1500, "Single view of every customer across systems."),
                ("KPI Command Centre",     1999,   880, "Track all your business KPIs in one place."),
            ],
            "Finance": [
                ("Accounting Basic",        799,   320, "Double-entry bookkeeping for small businesses."),
                ("Accounting Pro",         1999,   880, "Full accounting with GST, TDS and audit trail."),
                ("Accounting Enterprise",  4999,  2200, "Multi-entity, multi-currency accounting."),
                ("Invoicing Plus",          499,   190, "Professional invoices with online payment links."),
                ("Expense Manager",         699,   280, "Capture receipts, approve expenses, sync to ERP."),
                ("Budgeting Tool",          999,   420, "Create, track and reforecast budgets in real time."),
                ("Cash Flow Planner",       899,   380, "Weekly cash flow forecast for 13 weeks ahead."),
                ("Bank Reconciliation",     599,   230, "Auto-match bank transactions to journal entries."),
                ("Payroll Manager",        1499,   650, "Calculate salary, deductions, TDS and payslips."),
                ("Payroll Enterprise",     3499,  1500, "Multi-state payroll with compliance automation."),
                ("Tax Filing Assistant",   1299,   550, "Auto-generate GSTR-1, GSTR-3B and ITR returns."),
                ("GST Reconciliation",      999,   420, "Reconcile GSTR-2A with purchase register."),
                ("E-Invoice Generator",     699,   280, "IRN and QR-code e-invoicing as per GST rules."),
                ("EWaybill Manager",        499,   190, "Generate and track e-way bills for goods movement."),
                ("Financial Consolidation",3999,  1750, "Consolidate financials across entities and currencies."),
                ("Treasury Management",    2999,  1300, "Manage cash positions, FX and short-term investments."),
                ("Accounts Payable",        999,   420, "Three-way matching and automated vendor payments."),
                ("Accounts Receivable",     999,   420, "Collections, aging reports and automated reminders."),
                ("Fixed Asset Manager",     799,   320, "Track assets, depreciation schedules and disposals."),
                ("Project Accounting",     1499,   650, "Time, cost and revenue by project and phase."),
                ("Revenue Recognition",    2499,  1100, "ASC 606 / IFRS 15 revenue recognition automation."),
                ("Subscription Billing",   2999,  1300, "Metered and recurring billing with dunning."),
                ("CPQ (Configure Price Quote)",1999,880, "Complex product configuration and quoting."),
                ("Procurement Manager",    1499,   650, "PO creation, approval workflows and vendor tracking."),
                ("Spend Analytics",         999,   420, "Analyse all company spending by category and vendor."),
                ("Travel & Expense",        799,   320, "Policy enforcement for corporate travel bookings."),
                ("Virtual CFO Dashboard",  2499,  1100, "Board-ready financial dashboards and commentary."),
                ("Financial Modelling",    1999,   880, "Scenario modelling and sensitivity analysis."),
                ("Investor Relations Portal",1499, 650, "Share financials and updates with investors."),
                ("Audit Management",       2499,  1100, "Plan, execute and track internal and external audits."),
                ("Credit Risk Manager",    1999,   880, "Score and monitor customer credit risk."),
                ("Collections Manager",    1299,   550, "Automate debt collection workflows and escalations."),
                ("ERP Finance Bridge",     2999,  1300, "Sync financials with SAP, Oracle or Tally."),
                ("Crypto Payment Gateway",  999,   420, "Accept Bitcoin, Ethereum and stablecoins."),
                ("Multi-Currency Wallet",  1499,   650, "Hold and convert 50+ currencies in real time."),
                ("Cross-Border Payments",  1999,   880, "Send international payments at interbank rates."),
                ("Escrow Service",         1299,   550, "Hold funds securely in milestones-based escrow."),
                ("Factoring Platform",     2999,  1300, "Sell invoices for immediate cash flow."),
                ("Working Capital Loans",  1499,   650, "Data-driven working capital credit decisions."),
                ("Insurance Management",    799,   320, "Track policies, premiums and claims in one place."),
                ("ESG Reporting",          1499,   650, "Automate ESG disclosure and reporting."),
                ("Transfer Pricing",       3499,  1500, "Compliance-ready inter-company pricing analysis."),
                ("Indirect Tax Engine",    2499,  1100, "Calculate VAT, GST and sales tax globally."),
                ("E-Commerce Tax",          999,   420, "Nexus calculation and filing for online sellers."),
                ("Dividend Manager",       1299,   550, "Manage shareholder records and dividend payouts."),
                ("Cap Table Manager",      1499,   650, "Track equity, options and convertibles."),
                ("409A Valuation Tool",    1999,   880, "Automated business valuation for startups."),
                ("ESOP Manager",           1499,   650, "Grant, vest and exercise employee stock options."),
                ("Pension Administration", 2499,  1100, "Manage defined benefit and contribution schemes."),
                ("Regulatory Reporting",   3499,  1500, "File SEBI, RBI and IRDAI regulatory returns."),
            ],
            "HR": [
                ("HRMS Core",               999,   420, "Employee records, org chart and self-service."),
                ("HRMS Enterprise",        3499,  1500, "Full HRMS with workflows and custom fields."),
                ("Recruitment ATS",        1299,   550, "Post jobs, track applicants and schedule interviews."),
                ("Onboarding Automation",   799,   320, "Digital onboarding checklists and e-signatures."),
                ("Performance Management",  999,   420, "OKRs, 360° reviews and calibration sessions."),
                ("Learning Management",    1499,   650, "Host courses, track completions and issue certificates."),
                ("Skills Matrix",           699,   280, "Map employee skills and identify gaps."),
                ("Succession Planning",    1999,   880, "Identify and develop your next generation of leaders."),
                ("Compensation Manager",   1799,   800, "Salary bands, benchmarking and pay equity analysis."),
                ("Benefits Administration",1299,   550, "Manage health, life and retirement benefits."),
                ("Time & Attendance",       699,   280, "Clock-in, shift planning and overtime tracking."),
                ("Leave Manager",           499,   190, "Apply, approve and track all leave types."),
                ("Field Force Tracker",     999,   420, "GPS-based attendance for field employees."),
                ("Workforce Planning",     2499,  1100, "Model headcount, costs and scenarios."),
                ("People Analytics",       1999,   880, "Data-driven insights into your workforce."),
                ("Employee Engagement",     799,   320, "Pulse surveys, recognition and feedback tools."),
                ("DEI Dashboard",           799,   320, "Track diversity, equity and inclusion metrics."),
                ("Whistleblower Portal",    699,   280, "Anonymous reporting with investigation workflows."),
                ("HR Chatbot",              999,   420, "Instant answers to common HR questions."),
                ("Digital Signature",       499,   190, "E-sign employment contracts and policies."),
                ("Document Manager",        599,   230, "Store and version-control all HR documents."),
                ("Compliance Calendar",     699,   280, "Never miss a labour law deadline."),
                ("Global HR Platform",     5999,  2700, "Hire, pay and manage employees in 150+ countries."),
                ("Employer of Record",     7999,  3500, "Legally employ talent abroad without an entity."),
                ("Contractor Management",  1499,   650, "Onboard and pay freelancers and contractors."),
                ("Background Check",        799,   320, "Instant employment, education and criminal checks."),
                ("Reference Check",         499,   190, "Automated structured reference interviews."),
                ("Video Interview",         799,   320, "Async and live video interviews with scorecards."),
                ("Assessment Centre",       999,   420, "Online aptitude, personality and skill tests."),
                ("Offer Letter Builder",    499,   190, "Generate compliant offer letters instantly."),
                ("Relocation Manager",      999,   420, "Coordinate employee relocations end-to-end."),
                ("HR Help Desk",            799,   320, "Ticketing system for HR queries and requests."),
                ("Workforce Mobile App",    499,   190, "Employee self-service on iOS and Android."),
                ("Shift Marketplace",       799,   320, "Employees pick up and swap shifts voluntarily."),
                ("Labour Cost Optimiser",  1999,   880, "Minimise labour costs while meeting demand."),
                ("Gig Worker Platform",    1499,   650, "Engage and pay gig workers compliantly."),
                ("Alumni Network",          599,   230, "Stay connected with former employees."),
                ("Mentor Match",            699,   280, "Pair employees with mentors automatically."),
                ("Career Path Builder",     799,   320, "Show employees their growth options within the org."),
                ("Salary Benchmarking",    1299,   550, "Compare salaries to live market data."),
                ("Total Rewards Statement",  699,   280, "Communicate the full value of your compensation."),
                ("HR Audit Trail",          799,   320, "Immutable log of all HR data changes."),
                ("Org Design Studio",      1999,   880, "Drag-and-drop org design and scenario modelling."),
                ("Employee NPS Tracker",    599,   230, "Measure and track your eNPS score over time."),
                ("HR Data Migration",       999,   420, "Safely migrate employee data from legacy systems."),
                ("Offboarding Manager",     699,   280, "Streamline exits, knowledge transfer and returns."),
                ("Sabbatical Manager",      499,   190, "Plan and manage extended employee leave."),
                ("CHRO Dashboard",         1499,   650, "Executive summary of all key HR metrics."),
                ("HR Policy Builder",       599,   230, "Create, publish and version HR policies."),
            ],
            "Marketing": [
                ("Email Marketing Starter",  499,   190, "Send up to 10,000 emails/month with templates."),
                ("Email Marketing Pro",     1299,   550, "Unlimited sends with automation and A/B testing."),
                ("Marketing Automation",    2499,  1100, "Multi-channel journeys, scoring and CRM sync."),
                ("SMS Marketing",            699,   280, "Bulk and transactional SMS campaigns."),
                ("WhatsApp Business API",   1499,   650, "Automated WhatsApp messaging at scale."),
                ("Push Notification Service",699,   280, "Web and app push with segmentation."),
                ("Social Media Manager",     999,   420, "Schedule, publish and monitor social posts."),
                ("Content Calendar",         599,   230, "Plan and collaborate on marketing content."),
                ("Landing Page Builder",     699,   280, "No-code landing pages with conversion tracking."),
                ("Popup & Form Builder",     499,   190, "Capture leads with beautiful on-site forms."),
                ("SEO Toolkit",              899,   380, "Keyword research, on-page audits and backlink tracking."),
                ("Google Ads Manager",       999,   420, "Automate bidding and optimise ad performance."),
                ("Meta Ads Manager",         999,   420, "Facebook and Instagram ad automation."),
                ("Programmatic Ads DSP",    2999,  1300, "Reach audiences via real-time bidding."),
                ("Influencer Platform",     1999,   880, "Discover, recruit and pay influencers."),
                ("Affiliate Platform",       999,   420, "Launch and manage an affiliate programme."),
                ("Video Marketing Suite",   1499,   650, "Create, host and track marketing videos."),
                ("Podcast Hosting",          499,   190, "Host and distribute your company podcast."),
                ("Webinar Platform",         999,   420, "Live and on-demand webinars with lead capture."),
                ("Event Management",        1499,   650, "Register, badge and engage event attendees."),
                ("Loyalty Programme",        999,   420, "Points, tiers and rewards for repeat customers."),
                ("Gift Card Platform",       699,   280, "Issue and redeem digital and physical gift cards."),
                ("Review Management",        799,   320, "Collect, respond and display customer reviews."),
                ("Reputation Monitor",       699,   280, "Track brand mentions across the web."),
                ("PR Distribution",         1299,   550, "Distribute press releases to 10,000+ journalists."),
                ("Account-Based Marketing",1999,   880, "Personalise outreach for target accounts."),
                ("Intent Data Platform",   2499,  1100, "Identify in-market buyers from intent signals."),
                ("Customer Data Platform",  3499,  1500, "Unify first-party data for precise targeting."),
                ("Marketing Mix Model",     2999,  1300, "Measure ROI across offline and online channels."),
                ("Conversion Rate Optimiser",999,  420, "Test and improve landing page conversions."),
                ("Chat Marketing",           799,   320, "Capture and nurture leads via live chat."),
                ("Chatbot Builder",          999,   420, "No-code chatbot for lead qualification."),
                ("QR Code Generator",        299,   100, "Dynamic QR codes with scan analytics."),
                ("NFC Marketing Kit",        699,   280, "Tap-to-interact NFC campaigns."),
                ("Direct Mail Automation",  1299,   550, "Print and post personalised direct mail."),
                ("Sampling Platform",        999,   420, "Send product samples to targeted consumers."),
                ("Market Research Panel",   1999,   880, "Survey your target audience in 24 hours."),
                ("Brand Tracking",          2499,  1100, "Monthly brand health and share-of-voice surveys."),
                ("Competitive Intelligence",1499,  650, "Monitor competitor pricing and messaging."),
                ("Pricing Intelligence",    1499,  650, "Track competitor prices in real time."),
                ("Social Listening",         999,   420, "Monitor conversations about your brand."),
                ("Campaign Attribution",    1499,  650, "Cross-channel attribution for all campaigns."),
                ("Marketing ROI Tracker",    999,   420, "Prove the revenue impact of every campaign."),
                ("Demand Gen Suite",        2999,  1300, "Coordinated demand generation across channels."),
                ("ABM Orchestration",       3499,  1500, "Orchestrate multi-channel ABM at scale."),
                ("Partner Marketing Portal",1999,   880, "Enable partners to co-market with brand assets."),
                ("Field Marketing Planner",  999,   420, "Plan and measure regional field marketing."),
                ("Sports Sponsorship ROI",  1999,   880, "Measure the business value of sponsorships."),
                ("Creator Marketplace",     1499,   650, "Connect with UGC creators for authentic content."),
            ],
            "ERP": [
                ("ERP Starter",            2999,  1300, "Core ERP for small-to-mid businesses."),
                ("ERP Professional",       7999,  3500, "Full ERP suite with customisation."),
                ("ERP Enterprise",        19999,  9000, "Unlimited users, entities and modules."),
                ("Inventory Management",   1499,   650, "Track stock levels, movements and valuations."),
                ("Warehouse Management",   2499,  1100, "Bin locations, pick-pack-ship and barcode scanning."),
                ("Manufacturing Module",   3499,  1500, "BOMs, work orders and production planning."),
                ("MRP Planning",           2999,  1300, "Material requirements planning and scheduling."),
                ("Quality Management",     1999,   880, "Inspections, non-conformances and CAPA tracking."),
                ("Maintenance Manager",    1499,   650, "Preventive and reactive maintenance scheduling."),
                ("Asset Tracking",          999,   420, "GPS and RFID asset tracking in real time."),
                ("Fleet Management",       1999,   880, "Track vehicles, maintenance and driver behaviour."),
                ("Transport Management",   2499,  1100, "Plan routes, manage carriers and track shipments."),
                ("Order Management",       1499,   650, "Omnichannel order capture, routing and fulfilment."),
                ("Returns Management",      999,   420, "Streamline RMAs, inspections and refunds."),
                ("Demand Planning",        2999,  1300, "Statistical demand forecasting for SKUs."),
                ("S&OP Platform",          3999,  1750, "Sales and operations planning across functions."),
                ("Supplier Portal",        1499,   650, "Collaborate with suppliers on POs and shipments."),
                ("Sourcing Platform",      1999,   880, "RFQ, e-auction and supplier selection."),
                ("Contract Lifecycle",     2499,  1100, "Draft, approve, execute and renew contracts."),
                ("Spend Management",       1999,   880, "Control and optimise all company spend."),
                ("Project Management",     1299,   550, "Tasks, timelines, resources and budgets."),
                ("Resource Planning",      1999,   880, "Match demand to team capacity across projects."),
                ("Field Service",          2499,  1100, "Schedule and dispatch field engineers."),
                ("Customer Service Module",1499,  650, "Cases, SLAs and knowledge base."),
                ("Omnichannel Commerce",   3499,  1500, "Sell across web, mobile, marketplace and in-store."),
                ("Product Information Mgmt",1999,  880, "Centralise and enrich product data for all channels."),
                ("Configure Price Quote",  2999,  1300, "Complex product configuration, pricing and quoting."),
                ("Subscription Management",2499, 1100, "Automate recurring billing and renewals."),
                ("Commission Manager",     1299,   550, "Calculate and pay sales commissions accurately."),
                ("Territory Management",   1499,   650, "Assign and optimise sales territories."),
                ("Document Management",     999,   420, "Store, version and search all company documents."),
                ("Workflow Automation",    1499,   650, "Drag-and-drop workflow builder for any process."),
                ("Form Builder",            499,   190, "No-code custom forms and approvals."),
                ("E-Signature Platform",    799,   320, "Legally binding e-signatures for any document."),
                ("Master Data Management", 2999,  1300, "Single source of truth for customers, products, vendors."),
                ("Data Migration Tool",    1999,   880, "Migrate legacy data to your new ERP safely."),
                ("ERP Analytics",          1999,   880, "Pre-built ERP dashboards and custom reports."),
                ("Mobile ERP App",          999,   420, "Access ERP from iOS and Android."),
                ("ERP Integration Bus",    2499,  1100, "Connect ERP to 200+ third-party systems."),
                ("Offline Mode Sync",       999,   420, "Work without internet; sync when back online."),
                ("Role-Based Access Control",799,  320, "Fine-grained permissions for every ERP module."),
                ("ERP Sandbox",             799,   320, "Test configurations before going live."),
                ("Change Management Kit",  1499,   650, "Guides, training and rollout tools for ERP projects."),
                ("ERP Health Monitor",      999,   420, "Performance and error monitoring for your ERP."),
                ("Customisation Studio",   2999,  1300, "No-code ERP customisation and extension builder."),
                ("Multi-Language Pack",     499,   190, "Translate your ERP interface into 30+ languages."),
                ("Multi-Currency Engine",   999,   420, "Handle transactions in 150+ currencies."),
                ("Intercompany Module",    2499,  1100, "Automate intercompany transactions and eliminations."),
                ("Local Compliance Pack",  1999,   880, "Country-specific tax, payroll and regulatory rules."),
                ("ERP Training Academy",   1299,   550, "Video courses and certification for your ERP."),
            ],
            "Support": [
                ("Help Desk Starter",       499,   190, "Email-based ticketing for small teams."),
                ("Help Desk Pro",          1299,   550, "Multi-channel support with SLAs and automations."),
                ("Help Desk Enterprise",   3499,  1500, "Unlimited agents, custom objects and sandbox."),
                ("Live Chat Pro",           699,   280, "Real-time chat with routing and bot handoff."),
                ("AI Chatbot",            1999,   880, "GPT-powered chatbot that resolves 60% of tickets."),
                ("Knowledge Base",          599,   230, "SEO-optimised help centre with smart search."),
                ("Community Forum",         799,   320, "Peer-to-peer support community platform."),
                ("Status Page",             299,   100, "Public incident communication and uptime history."),
                ("Feedback Widget",         399,   150, "In-product feedback collection widget."),
                ("CSAT & NPS Surveys",      699,   280, "Measure satisfaction after every interaction."),
                ("Call Centre Software",   1499,   650, "Cloud call centre with IVR and recording."),
                ("Video Support",           999,   420, "Co-browsing and video calls for complex issues."),
                ("Social Support Hub",      799,   320, "Manage Twitter, Facebook and Instagram DMs as tickets."),
                ("WhatsApp Support",        999,   420, "Handle customer queries over WhatsApp."),
                ("SMS Support",             699,   280, "Two-way SMS conversations with customers."),
                ("Email Management",        699,   280, "Shared inbox with collision detection and canned replies."),
                ("Ticket Routing Engine",   999,   420, "AI-powered ticket routing to the right agent."),
                ("SLA Manager",             799,   320, "Define, track and escalate SLA breaches."),
                ("Escalation Manager",      799,   320, "Automatic escalation rules based on ticket priority."),
                ("Agent Assist AI",        1999,   880, "Real-time AI suggestions for agents."),
                ("Quality Assurance",       999,   420, "Score, coach and improve agent performance."),
                ("Workforce Management",   1999,   880, "Forecast demand and schedule support agents."),
                ("Support Analytics",       999,   420, "Volume, CSAT, AHT and backlog dashboards."),
                ("Self-Service Portal",     799,   320, "Branded portal for customers to manage tickets."),
                ("Ticket Deflection",       999,   420, "Suggest KB articles before customers submit tickets."),
                ("Macro & Template Engine",  499,   190, "One-click responses for common queries."),
                ("Multilingual Support",   1499,   650, "Real-time translation for global support teams."),
                ("Support API",             799,   320, "Integrate support data into any system."),
                ("Field Service Dispatch",  1999,   880, "Schedule on-site support visits and track engineers."),
                ("RMA Management",          799,   320, "Returns, repairs and replacements workflow."),
                ("Warranty Tracker",        699,   280, "Track product warranties and entitlements."),
                ("Entitlement Manager",     999,   420, "Control which customers get what level of support."),
                ("Support Gamification",    699,   280, "Badges and leaderboards to motivate support teams."),
                ("Help Widget SDK",         499,   190, "Embed help anywhere with a JavaScript snippet."),
                ("Support CRM Sync",        799,   320, "Bi-directional sync between support and CRM."),
                ("Incident Management",    1299,   550, "War-room tools for major incident response."),
                ("Change Management",       999,   420, "ITSM change request workflows and approvals."),
                ("CMDB",                   1999,   880, "Configuration management database for IT assets."),
                ("Service Catalogue",       999,   420, "Self-service IT request portal with approvals."),
                ("IT Asset Management",    1499,   650, "Track hardware, software licences and contracts."),
                ("Patch Compliance",        999,   420, "Ensure all devices are up to date and compliant."),
                ("Remote Desktop Support",  999,   420, "Secure remote access for IT troubleshooting."),
                ("MDM for Support",         999,   420, "Manage mobile devices used by support teams."),
                ("Customer Thermometer",    499,   190, "One-click email satisfaction ratings."),
                ("Predictive Support",     2499,  1100, "Detect issues before customers complain."),
                ("Proactive Notifications",  699,   280, "Alert customers to issues before they notice."),
                ("Support Cost Analyser",   799,   320, "Calculate and reduce cost per ticket."),
                ("Support ROI Dashboard",   799,   320, "Show the business value of great support."),
            ],
            "DevTools": [
                ("Code Review Tool",        799,   320, "AI-assisted code review with inline comments."),
                ("CI/CD Pro",              1299,   550, "Automated pipelines for build, test and deploy."),
                ("Container Platform",     2499,  1100, "Kubernetes-native developer platform."),
                ("API Testing Suite",       999,   420, "Automated REST, GraphQL and gRPC testing."),
                ("Load Testing",           1299,   550, "Simulate millions of concurrent users."),
                ("Error Tracking",          699,   280, "Real-time exception monitoring with stack traces."),
                ("Log Aggregator",          899,   380, "Centralise and search logs from all services."),
                ("APM Agent",              1499,   650, "Distributed tracing and performance monitoring."),
                ("Database Monitoring",    1299,   550, "Query performance and schema change tracking."),
                ("Dependency Auditor",      699,   280, "Scan for vulnerabilities in open source deps."),
                ("Secret Scanner",          799,   320, "Detect leaked secrets in code repositories."),
                ("DAST Scanner",           1499,   650, "Dynamic application security testing."),
                ("SAST Tool",              1299,   550, "Static code analysis for security issues."),
                ("Mobile App Testing",     1499,   650, "Test on 500+ real devices in the cloud."),
                ("Browser Testing",        1299,   550, "Cross-browser automated UI tests."),
                ("Visual Testing",         1099,   460, "Catch visual regressions pixel-by-pixel."),
                ("Test Management",         899,   380, "Plan, execute and track test cycles."),
                ("Documentation Platform",  599,   230, "Beautiful API docs from OpenAPI specs."),
                ("Mock Server",             499,   190, "Mock APIs instantly for frontend development."),
                ("API Design Studio",       799,   320, "Design-first API development with OpenAPI."),
                ("Schema Registry",         799,   320, "Manage and version Avro, Protobuf and JSON schemas."),
                ("GraphQL Explorer",        699,   280, "Interactive GraphQL IDE with collaboration."),
                ("gRPC Toolkit",            799,   320, "Generate clients, test and debug gRPC services."),
                ("Data Faker",              499,   190, "Generate realistic fake data for tests."),
                ("Migration Manager",       999,   420, "Automated database migration with rollback."),
                ("Seed Data Manager",       599,   230, "Manage test data seeds across environments."),
                ("Environment Manager",     799,   320, "Spin up and destroy dev environments on demand."),
                ("IDE Plugin Pack",         499,   190, "Productivity plugins for VS Code and JetBrains."),
                ("Team Git Insights",       799,   320, "Visualise team contributions and code health."),
                ("Code Search",             599,   230, "Semantic code search across all repositories."),
                ("Dependency Graph",        699,   280, "Visualise service-to-service dependencies."),
                ("Architecture Diagrams",   799,   320, "Auto-generated system architecture diagrams."),
                ("On-Call Manager",         999,   420, "PagerDuty-style on-call schedules and alerts."),
                ("Runbook Automation",     1299,   550, "Automate repetitive ops tasks with runbooks."),
                ("Chaos Toolkit",           999,   420, "Inject failures and measure system resilience."),
                ("Rollback Manager",        999,   420, "One-click rollback to any previous deployment."),
                ("Blue-Green Deployer",    1299,   550, "Zero-downtime blue-green deployments."),
                ("Canary Release Manager", 1499,   650, "Gradually roll out changes with automatic rollback."),
                ("Service Mesh",           2499,  1100, "Istio-style service mesh for microservices."),
                ("Internal Developer Portal",2999, 1300, "Golden paths and self-service for engineering teams."),
                ("Platform Engineering Kit",3499, 1500, "Tools to build and maintain an internal dev platform."),
                ("Open Source Governance",  999,   420, "Track and comply with open source licences."),
                ("Tech Debt Tracker",       799,   320, "Quantify and prioritise technical debt."),
                ("Engineering Metrics",     999,   420, "DORA metrics and engineering productivity insights."),
                ("Dev Experience Survey",   599,   230, "Measure and improve developer happiness."),
                ("Hackathon Platform",      999,   420, "Run virtual hackathons with judging and prizes."),
                ("Pair Programming Tool",   699,   280, "Real-time collaborative coding environment."),
                ("Code Snippet Manager",    299,   100, "Team-shared library of reusable code snippets."),
                ("Dev Sandbox",             799,   320, "Isolated sandbox environments per developer."),
                ("SLA Simulator",           999,   420, "Model the impact of SLA changes on operations."),
                ("Feature Lifecycle Mgmt", 1299,   550, "Track features from ideation to retirement."),
            ],
        }

        products_list = []
        for category, items in PRODUCT_CATALOG.items():
            cat_taxes = taxes_by_category.get(category, [gst18])
            for name, sales, cost, desc in items:
                p = Product(
                    name=name,
                    product_type="service",
                    sales_price=sales,
                    cost_price=cost,
                    description=desc,
                    is_active=True,
                )
                p.taxes = cat_taxes
                db.session.add(p)
                products_list.append(p)

        db.session.flush()
        print(f"✅ Products created: {len(products_list)}")

        # Add variants to a subset of products (every 4th)
        variant_count = 0
        for i, p in enumerate(products_list):
            if i % 4 == 0:
                av = tier_vals[i % len(tier_vals)]
                db.session.add(ProductVariant(
                    product_id=p.id,
                    attribute_id=tier_attr.id,
                    attribute_value_id=av.id,
                    extra_price=av.default_extra_price,
                ))
                variant_count += 1
            if i % 7 == 0:
                sv = storage_vals[i % len(storage_vals)]
                db.session.add(ProductVariant(
                    product_id=p.id,
                    attribute_id=storage_attr.id,
                    attribute_value_id=sv.id,
                    extra_price=sv.default_extra_price,
                ))
                variant_count += 1

        # Recurring prices for every product on monthly and annual plans
        for p in products_list:
            db.session.add(ProductRecurringPrice(
                product_id=p.id,
                recurring_plan_id=monthly_basic.id,
                price=float(p.sales_price),
                min_qty=1,
                start_date=date(2024, 1, 1),
            ))
            db.session.add(ProductRecurringPrice(
                product_id=p.id,
                recurring_plan_id=annual_basic.id,
                price=round(float(p.sales_price) * 10, 2),  # 2 months free
                min_qty=1,
                start_date=date(2024, 1, 1),
            ))
            # Quarterly for mid-range products
            if float(p.sales_price) >= 999:
                db.session.add(ProductRecurringPrice(
                    product_id=p.id,
                    recurring_plan_id=quarterly_std.id,
                    price=round(float(p.sales_price) * 2.7, 2),
                    min_qty=1,
                    start_date=date(2024, 1, 1),
                ))

        db.session.flush()
        print(f"✅ Product variants ({variant_count}) and recurring prices created.")

        # ── 8. QUOTATION TEMPLATES (12) ───────────────────────────────────────
        saas_prods    = [p for p in products_list if "CRM" in p.name or "Sales" in p.name][:4]
        cloud_prods   = [p for p in products_list if "Cloud" in p.name][:4]
        security_prods= [p for p in products_list if "Security" in p.name or "Endpoint" in p.name][:3]
        hr_prods      = [p for p in products_list if "HRMS" in p.name or "Payroll" in p.name][:3]
        finance_prods = [p for p in products_list if "Accounting" in p.name][:3]
        analytics_prods=[p for p in products_list if "Analytics" in p.name][:3]
        erp_prods     = [p for p in products_list if "ERP" in p.name][:3]
        devtools_prods= [p for p in products_list if "CI/CD" in p.name or "Code" in p.name][:3]
        marketing_prods=[p for p in products_list if "Email Marketing" in p.name or "Marketing Auto" in p.name][:3]
        support_prods = [p for p in products_list if "Help Desk" in p.name][:3]

        templates_cfg = [
            ("SaaS Starter Pack",         30, monthly_basic,  False, 12, "month", saas_prods[:2]),
            ("SaaS Pro Bundle",           14, monthly_pro,    False, 24, "month", saas_prods[:3]),
            ("SaaS Enterprise Suite",     14, annual_ent,     True,  None, None,  saas_prods[:4]),
            ("Cloud Infrastructure Pkg",  30, monthly_std,    False, 12, "month", cloud_prods[:2]),
            ("Cloud Enterprise Pack",     14, annual_ent,     True,  None, None,  cloud_prods[:4]),
            ("Security Essentials",       30, monthly_basic,  False, 12, "month", security_prods[:2]),
            ("Full Security Suite",       14, annual_basic,   True,  None, None,  security_prods),
            ("HR & Payroll Bundle",       30, monthly_std,    False, 12, "month", hr_prods[:2]),
            ("Finance & Accounting Pkg",  30, monthly_std,    False, 12, "month", finance_prods[:2]),
            ("Analytics Platform",        21, quarterly_pro,  False, 4,  "month", analytics_prods[:2]),
            ("Full ERP Implementation",   14, annual_ent,     True,  None, None,  erp_prods),
            ("Developer Toolchain",       30, monthly_basic,  False, 12, "month", devtools_prods[:2]),
        ]

        qt_list = []
        for name, validity, plan, forever, count, unit, prods in templates_cfg:
            qt = QuotationTemplate(
                name=name,
                validity_days=validity,
                recurring_plan_id=plan.id,
                last_forever=forever,
                end_after_count=count,
                end_after_unit=unit,
            )
            db.session.add(qt)
            db.session.flush()
            for prod in prods:
                db.session.add(QuotationTemplateLine(
                    template_id=qt.id,
                    product_id=prod.id,
                    description=prod.name,
                    quantity=1,
                ))
            qt_list.append(qt)
        db.session.flush()
        print(f"✅ Quotation templates created: {len(qt_list)}")

        # ── 9. DISCOUNTS (15) ─────────────────────────────────────────────────
        discounts_cfg = [
            ("WELCOME10",  "percentage", 10,   500,  1, date(2024,1,1),  date(2026,12,31), True,  500),
            ("FLAT500",    "fixed",      500,  2000, 2, date(2024,1,1),  date(2026,6,30),  False, None),
            ("ANNUAL20",   "percentage", 20,   5000, 1, date(2024,1,1),  date(2026,12,31), True,  200),
            ("QUARTER15",  "percentage", 15,   2500, 1, date(2024,4,1),  date(2026,12,31), True,  300),
            ("NEWBIZ25",   "percentage", 25,   1000, 1, date(2024,1,1),  date(2024,12,31), True,  100),
            ("SUMMER5",    "percentage", 5,    0,    1, date(2024,6,1),  date(2024,8,31),  False, None),
            ("DIWALI2024", "percentage", 18,   500,  1, date(2024,10,20),date(2024,11,5),  True,  250),
            ("NEWYEAR25",  "percentage", 12,   999,  1, date(2025,1,1),  date(2025,1,15),  True,  150),
            ("FLAT1000",   "fixed",      1000, 5000, 3, date(2025,1,1),  date(2025,12,31), True,  100),
            ("STARTUP30",  "percentage", 30,   2000, 1, date(2025,3,1),  date(2025,9,30),  True,  75),
            ("ENTERPRISE10","percentage",10,   10000,1, date(2025,1,1),  date(2026,12,31), False, None),
            ("FLASH48",    "percentage", 48,   0,    1, date(2025,7,10), date(2025,7,12),  True,  50),
            ("LOYALTY5",   "percentage", 5,    0,    1, date(2024,1,1),  date(2026,12,31), False, None),
            ("DIWALI2025", "percentage", 18,   500,  1, date(2025,10,18),date(2025,11,3),  True,  300),
            ("APRIL26",    "percentage", 8,    999,  1, date(2026,4,1),  date(2026,4,30),  True,  200),
        ]
        discounts = []
        for name, dtype, val, min_pur, min_qty, start, end, limit, ulimit in discounts_cfg:
            d = Discount(
                name=name, discount_type=dtype, value=val,
                min_purchase=min_pur, min_quantity=min_qty,
                start_date=start, end_date=end,
                limit_usage=limit, usage_limit=ulimit,
                usage_count=0, is_active=True,
                created_by=admin.id,
            )
            db.session.add(d)
            discounts.append(d)
        db.session.flush()
        print(f"✅ Discounts created: {len(discounts)}")

        # ── 10. SUBSCRIPTIONS (~450) ──────────────────────────────────────────
        salespersons = internals  # 8 internal users as salespersons
        payment_terms_pool = [pt_immediate, pt_net7, pt_net15, pt_net30, pt_net45, pt_split]
        plan_weights = [
            (monthly_basic,  0.30),
            (monthly_std,    0.20),
            (monthly_pro,    0.15),
            (quarterly_std,  0.10),
            (quarterly_pro,  0.05),
            (annual_basic,   0.12),
            (annual_ent,     0.05),
            (weekly,         0.03),
        ]

        def pick_plan():
            r = random.random()
            cum = 0
            for pl, w in plan_weights:
                cum += w
                if r < cum:
                    return pl
            return monthly_basic

        # Status distribution per time era
        def pick_status(sub_date: date) -> str:
            age_days = (END - sub_date).days
            if age_days > 450:   # very old — mostly closed or active
                return random.choices(["active","closed","confirmed"], weights=[55,35,10])[0]
            elif age_days > 180: # mid-age
                return random.choices(["active","confirmed","quotation_sent","closed"], weights=[50,25,15,10])[0]
            else:                # recent
                return random.choices(["draft","quotation_sent","confirmed","active"], weights=[15,20,30,35])[0]

        sub_counter = 1
        subscriptions = []

        # Ensure every portal contact gets at least 1-3 subscriptions
        for contact in portal_contacts:
            n_subs = random.randint(1, 3)
            for _ in range(n_subs):
                sub_date = rand_date(START, END)
                plan     = pick_plan()
                status   = pick_status(sub_date)
                sp       = random.choice(salespersons)
                pt       = random.choice(payment_terms_pool)
                disc     = random.choice(discounts + [None, None, None])  # 25% chance
                qt       = random.choice(qt_list + [None, None])

                exp_date = (sub_date + timedelta(days=random.choice([14,21,30,60]))) \
                           if status in ("draft","quotation_sent") else None

                sub = Subscription(
                    subscription_number=fmt_sub(sub_counter),
                    customer_id=contact.id,
                    plan_id=plan.id,
                    quotation_template_id=qt.id if qt else None,
                    payment_term_id=pt.id,
                    salesperson_id=sp.id,
                    status=status,
                    start_date=sub_date if status not in ("draft","quotation","quotation_sent") else None,
                    order_date=sub_date if status not in ("draft","quotation","quotation_sent") else None,
                    expiration_date=exp_date,
                    next_invoice_date=compute_next_invoice_date(END, plan.billing_period, plan.billing_period_count)
                        if status == "active" else None,
                    discount_id=disc.id if disc else None,
                    created_by=sp.id,
                )
                db.session.add(sub)
                db.session.flush()

                # 1-4 product lines per subscription
                n_lines = random.randint(1, 4)
                chosen_prods = random.sample(products_list, min(n_lines, len(products_list)))
                disc_pct = float(disc.value) if disc and disc.discount_type == "percentage" else 0

                for prod in chosen_prods:
                    db.session.add(SubscriptionLine(
                        subscription_id=sub.id,
                        product_id=prod.id,
                        quantity=random.choice([1, 1, 1, 2, 3]),
                        unit_price=float(prod.sales_price),
                        discount_pct=disc_pct,
                        tax_ids=[t.id for t in prod.taxes],
                    ))

                subscriptions.append(sub)
                sub_counter += 1

        db.session.flush()
        print(f"✅ Subscriptions created: {len(subscriptions)}")

        # ── 11. INVOICES & PAYMENTS ───────────────────────────────────────────
        inv_counter = 1
        payment_methods = ["cash", "online", "razorpay"]
        invoices_created = 0
        payments_created = 0

        # Only generate invoices for non-draft subscriptions
        eligible_subs = [s for s in subscriptions if s.status not in ("draft", "quotation_sent")]

        for sub in eligible_subs:
            # How many invoices? Depends on how old the subscription is
            start_d = sub.start_date or sub.order_date or END
            age_months = max(1, ((END - start_d).days) // 30)

            # Monthly: one per month; quarterly: one per quarter; annual: 1-2
            if sub.plan and sub.plan.billing_period == "monthly":
                n_inv = min(age_months, random.randint(1, min(age_months, 10)))
            elif sub.plan and sub.plan.billing_period == "yearly":
                n_inv = random.randint(1, min(2, age_months // 12 + 1))
            elif sub.plan and sub.plan.billing_period == "weekly":
                n_inv = min(age_months * 4, random.randint(1, 8))
            else:  # quarterly
                n_inv = random.randint(1, min(4, age_months // 3 + 1))

            for inv_i in range(n_inv):
                inv_date = rand_date(start_d, END)
                due_days = random.choice([0, 7, 15, 30])
                due_date = inv_date + timedelta(days=due_days)

                # Status logic: older invoices more likely paid
                age_inv = (END - inv_date).days
                if sub.status == "closed":
                    inv_status = random.choices(["paid", "cancelled"], weights=[80, 20])[0]
                elif age_inv > 60:
                    inv_status = random.choices(["paid", "confirmed", "cancelled"], weights=[75, 20, 5])[0]
                elif age_inv > 14:
                    inv_status = random.choices(["paid", "confirmed", "draft"], weights=[50, 40, 10])[0]
                else:
                    inv_status = random.choices(["confirmed", "draft", "paid"], weights=[50, 30, 20])[0]

                invoice = Invoice(
                    invoice_number=fmt_inv(inv_counter),
                    subscription_id=sub.id,
                    customer_id=sub.customer_id,
                    invoice_date=inv_date,
                    due_date=due_date,
                    status=inv_status,
                )
                db.session.add(invoice)
                db.session.flush()
                inv_counter += 1
                invoices_created += 1

                # Copy lines from subscription
                for sl in sub.order_lines:
                    db.session.add(InvoiceLine(
                        invoice_id=invoice.id,
                        product_id=sl.product_id,
                        description=sl.product.name if sl.product else "Service",
                        quantity=float(sl.quantity),
                        unit_price=float(sl.unit_price),
                        discount_pct=float(sl.discount_pct),
                        tax_ids=sl.tax_ids,
                    ))

                db.session.flush()

                # Create payment for paid invoices
                if inv_status == "paid":
                    pay_date = inv_date + timedelta(days=random.randint(0, due_days or 7))
                    method   = random.choices(payment_methods, weights=[30, 35, 35])[0]
                    total_amt = float(invoice.total) if invoice.total else 0

                    rp_oid = f"order_{inv_counter:08d}" if method == "razorpay" else None
                    rp_pid = f"pay_{inv_counter:08d}"   if method == "razorpay" else None
                    rp_sig = f"sig_{inv_counter:016d}"  if method == "razorpay" else None

                    db.session.add(Payment(
                        invoice_id=invoice.id,
                        payment_method=method,
                        amount=total_amt,
                        payment_date=pay_date,
                        status="completed",
                        razorpay_order_id=rp_oid,
                        razorpay_payment_id=rp_pid,
                        razorpay_signature=rp_sig,
                    ))
                    payments_created += 1

        db.session.commit()
        print(f"✅ Invoices created: {invoices_created}")
        print(f"✅ Payments created: {payments_created}")

        print()
        print("=" * 65)
        print("🎉  SEED COMPLETE")
        print("=" * 65)
        print(f"  Users        : {1 + len(internals) + len(portal_users)}"
              f"  (1 admin + {len(internals)} internal + {len(portal_users)} portal)")
        print(f"  Contacts     : {len(contacts)}")
        print(f"  Products     : {len(products_list)}")
        print(f"  Plans        : {len(plans)}")
        print(f"  Templates    : {len(qt_list)}")
        print(f"  Discounts    : {len(discounts)}")
        print(f"  Subscriptions: {len(subscriptions)}")
        print(f"  Invoices     : {invoices_created}")
        print(f"  Payments     : {payments_created}")
        print("=" * 65)
        print("  Admin login  : admin@demo.com      / Admin@123!")
        print("  Internal     : john@demo.com       / Internal@123!")
        print("  Portal       : aarav.sharma0@customer.com / Portal@123!")
        print("=" * 65)


if __name__ == "__main__":
    seed()