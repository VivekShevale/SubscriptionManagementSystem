"""
app/utils/email.py
Brevo (Sendinblue) Email Service
----------------------------------
Handles all transactional email sending via Brevo API.
Covers: welcome emails, OTP for password reset, invoice sending,
        subscription confirmations, and internal user credentials.
"""

import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException


def get_brevo_client():
    """Initialize and return Brevo API client."""
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = os.getenv("BREVO_API_KEY", "")
    return sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))


SENDER = {
    "name": os.getenv("BREVO_SENDER_NAME", "SubscriptionMS"),
    "email": os.getenv("BREVO_SENDER_EMAIL", "noreply@subscriptionms.com"),
}


def send_email(to_email: str, to_name: str, subject: str, html_content: str) -> bool:
    """
    Generic email sender via Brevo API.
    Returns True on success, False on failure.
    """
    try:
        api = get_brevo_client()
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email, "name": to_name}],
            sender=SENDER,
            subject=subject,
            html_content=html_content,
        )
        api.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print(f"[Email Error] Brevo API exception: {e}")
        return False
    except Exception as e:
        print(f"[Email Error] Unexpected error: {e}")
        return False


def send_otp_email(to_email: str, to_name: str, otp: str) -> bool:
    """
    Send OTP for password reset verification.
    """
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset OTP</h2>
        <p>Hi {to_name},</p>
        <p>Your OTP for password reset is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #1f2937; letter-spacing: 8px; margin: 0;">{otp}</h1>
        </div>
        <p style="color: #6b7280;">This OTP expires in 10 minutes. Do not share it with anyone.</p>
        <hr style="border: 1px solid #e5e7eb;" />
        <p style="color: #9ca3af; font-size: 12px;">SubscriptionMS — Automated Email</p>
    </div>
    """
    return send_email(to_email, to_name, "Password Reset OTP — SubscriptionMS", html)


def send_welcome_email(to_email: str, to_name: str) -> bool:
    """
    Send welcome email to newly registered users.
    """
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to SubscriptionMS! 🎉</h2>
        <p>Hi {to_name},</p>
        <p>Your account has been created successfully. You can now log in and start managing your subscriptions.</p>
        <a href="{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/login"
           style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 16px;">
            Log In Now
        </a>
        <hr style="border: 1px solid #e5e7eb; margin-top: 32px;" />
        <p style="color: #9ca3af; font-size: 12px;">SubscriptionMS — Automated Email</p>
    </div>
    """
    return send_email(to_email, to_name, "Welcome to SubscriptionMS!", html)


def send_internal_user_credentials(to_email: str, login_id: str, temp_password: str) -> bool:
    """
    Send auto-generated credentials to newly created internal users.
    User must reset password on first login.
    """
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Your SubscriptionMS Account</h2>
        <p>An administrator has created an account for you. Here are your login credentials:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Login ID:</strong> {login_id}</p>
            <p><strong>Temporary Password:</strong> {temp_password}</p>
        </div>
        <p style="color: #ef4444;"><strong>⚠️ You will be required to change your password on first login.</strong></p>
        <a href="{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/login"
           style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 16px;">
            Log In Now
        </a>
        <hr style="border: 1px solid #e5e7eb; margin-top: 32px;" />
        <p style="color: #9ca3af; font-size: 12px;">SubscriptionMS — Automated Email</p>
    </div>
    """
    return send_email(to_email, login_id, "Your SubscriptionMS Account Credentials", html)


def send_quotation_email(to_email: str, customer_name: str, subscription_number: str, portal_url: str) -> bool:
    """
    Send subscription quotation to customer for review and confirmation.
    """
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Your Subscription Quotation</h2>
        <p>Dear {customer_name},</p>
        <p>We have prepared a subscription quotation for you: <strong>{subscription_number}</strong></p>
        <p>Please review the details and confirm at your earliest convenience.</p>
        <a href="{portal_url}"
           style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 16px;">
            View Quotation
        </a>
        <hr style="border: 1px solid #e5e7eb; margin-top: 32px;" />
        <p style="color: #9ca3af; font-size: 12px;">SubscriptionMS — Automated Email</p>
    </div>
    """
    return send_email(to_email, customer_name, f"Quotation {subscription_number} — SubscriptionMS", html)


def send_invoice_email(to_email: str, customer_name: str, invoice_number: str, amount_due: float) -> bool:
    """
    Send invoice notification to customer.
    """
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Invoice {invoice_number}</h2>
        <p>Dear {customer_name},</p>
        <p>Please find your invoice details below:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Invoice Number:</strong> {invoice_number}</p>
            <p><strong>Amount Due:</strong> ₹{amount_due:,.2f}</p>
        </div>
        <a href="{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/portal/invoices"
           style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 16px;">
            View & Pay Invoice
        </a>
        <hr style="border: 1px solid #e5e7eb; margin-top: 32px;" />
        <p style="color: #9ca3af; font-size: 12px;">SubscriptionMS — Automated Email</p>
    </div>
    """
    return send_email(to_email, customer_name, f"Invoice {invoice_number} — SubscriptionMS", html)

def send_invoice_paid_email(to_email: str, customer_name: str, invoice_number: str, amount_paid: float, subscription_number: str) -> bool:
    """
    Send payment confirmation email with invoice details to customer after successful payment.
    """
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ Payment Confirmed — Invoice {invoice_number}</h2>
        <p>Dear {customer_name},</p>
        <p>Your payment has been received and your invoice is now marked as <strong>Paid</strong>.</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Subscription:</strong> {subscription_number}</p>
            <p><strong>Invoice Number:</strong> {invoice_number}</p>
            <p><strong>Amount Paid:</strong> ₹{amount_paid:,.2f}</p>
            <p><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">PAID</span></p>
        </div>
        <p>You can view and download your invoice from your portal account.</p>
        <a href="{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/portal/orders"
           style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 16px;">
            View My Orders
        </a>
        <hr style="border: 1px solid #e5e7eb; margin-top: 32px;" />
        <p style="color: #9ca3af; font-size: 12px;">SubscriptionMS — Automated Email</p>
    </div>
    """
    return send_email(to_email, customer_name, f"Payment Confirmed — Invoice {invoice_number}", html)
