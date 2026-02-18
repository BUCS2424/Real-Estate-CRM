"""
Email Samples/Templates Routes
Provides preview samples of all email templates used in the system
"""
from fastapi import APIRouter, Depends
from datetime import datetime
from utils.auth import get_current_user
from models.user import UserRole

router = APIRouter()

def get_sample_data():
    """Generate sample data for email previews"""
    return {
        "sender_name": "Sheila Desautels",
        "sender_title": "Luxury Real Estate Specialist",
        "sender_email": "info@hiddenhavenrealty.com",
        "sender_phone": "(813) 629-7355",
        "recipient_name": "John Smith",
        "recipient_email": "john.smith@example.com",
        "company_name": "Hidden Haven Realty",
        "current_year": datetime.now().year,
        "current_date": datetime.now().strftime("%B %d, %Y"),
    }

@router.get("/samples")
async def get_email_samples(current_user: dict = Depends(get_current_user)):
    """Get all email sample templates for preview"""
    
    data = get_sample_data()
    
    samples = [
        {
            "id": "smart-list",
            "name": "Smart List Email",
            "description": "Sent when sharing a curated list of contacts (lenders, vendors, etc.) with a client",
            "category": "contacts",
            "subject": f"Your Lender List from {data['sender_name']}",
            "html": generate_smart_list_sample(data)
        },
        {
            "id": "smtp-test",
            "name": "SMTP Test Email",
            "description": "Sent when testing SMTP configuration in settings",
            "category": "system",
            "subject": "SMTP Test - Hidden Haven Realty CRM",
            "html": generate_smtp_test_sample(data)
        },
        {
            "id": "brochure-email",
            "name": "Property Brochure Email",
            "description": "Sent when emailing a property brochure to a lead or client",
            "category": "marketing",
            "subject": "Beautiful Property at 123 Ocean Drive - Hidden Haven Realty",
            "html": generate_brochure_email_sample(data)
        },
        {
            "id": "welcome-email",
            "name": "Welcome Email",
            "description": "Sent to new leads when they sign up through the website",
            "category": "automation",
            "subject": f"Welcome to {data['company_name']}!",
            "html": generate_welcome_email_sample(data)
        },
        {
            "id": "booking-confirmation",
            "name": "Booking Confirmation",
            "description": "Sent when a client confirms an appointment booking",
            "category": "bookings",
            "subject": f"Your Appointment is Confirmed - {data['company_name']}",
            "html": generate_booking_confirmation_sample(data)
        },
        {
            "id": "booking-reminder",
            "name": "Booking Reminder",
            "description": "Sent as a reminder before scheduled appointments",
            "category": "bookings",
            "subject": f"Reminder: Your Appointment Tomorrow - {data['company_name']}",
            "html": generate_booking_reminder_sample(data)
        },
        {
            "id": "newsletter",
            "name": "Newsletter Template",
            "description": "Standard newsletter template for marketing campaigns",
            "category": "marketing",
            "subject": "Monthly Market Update - Hidden Haven Realty",
            "html": generate_newsletter_sample(data)
        },
        {
            "id": "lead-notification",
            "name": "New Lead Notification",
            "description": "Sent to agents when a new lead is captured",
            "category": "automation",
            "subject": "New Lead Alert: John Smith",
            "html": generate_lead_notification_sample(data)
        },
    ]
    
    return {"samples": samples}


def generate_smart_list_sample(data):
    """Smart List email template"""
    sample_contacts = """
    <div style="margin-bottom: 20px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #d4a646;">
        <h3 style="color: #1a2744; margin: 0 0 10px 0; font-size: 18px;">Shannon Johnston</h3>
        <p style="margin: 5px 0; color: #666;"><strong>Company:</strong> JPMorgan Chase</p>
        <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> shannon.johnston@jpmchase.com</p>
        <p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> (813) 440-9514</p>
    </div>
    <div style="margin-bottom: 20px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #d4a646;">
        <h3 style="color: #1a2744; margin: 0 0 10px 0; font-size: 18px;">Michael Rodriguez</h3>
        <p style="margin: 5px 0; color: #666;"><strong>Company:</strong> First National Bank</p>
        <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> m.rodriguez@fnb.com</p>
        <p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> (813) 629-7355</p>
    </div>
    """
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Lender List</title>
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; color: #1a2744; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    <div style="background: linear-gradient(135deg, #1a2744 0%, #2a3a5c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #d4a646; margin: 0; font-size: 28px;">{data['company_name']}</h1>
    </div>
    
    <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
        <p style="font-size: 18px; margin-bottom: 20px;">Dear {data['recipient_name']},</p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            I hope this message finds you well! As requested, I'm delighted to share this curated 
            <strong style="color: #d4a646;">Lender List</strong> with you. These are trusted professionals 
            that I personally recommend.
        </p>
        
        <h2 style="color: #1a2744; border-bottom: 2px solid #d4a646; padding-bottom: 10px; margin-top: 30px;">
            Your Lender List (2 Contacts)
        </h2>
        
        {sample_contacts}
        
        <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">
            Please don't hesitate to reach out if you need any additional information or have questions 
            about any of these contacts. I'm always here to help!
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <p style="font-size: 16px;">Best regards,</p>
            <p style="font-size: 16px; font-weight: bold; color: #1a2744;">{data['sender_name']}</p>
            <p style="font-size: 14px; color: #666;">{data['sender_title']}</p>
            <p style="font-size: 14px; color: #666;">{data['sender_phone']}</p>
            <p style="font-size: 14px; color: #d4a646;">{data['sender_email']}</p>
        </div>
    </div>
    
    <div style="background-color: #1a2744; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
        <p style="color: #a0a0a0; font-size: 12px; margin: 0;">
            &copy; {data['current_year']} {data['company_name']} | Luxury Real Estate Services
        </p>
    </div>
</body>
</html>"""


def generate_smtp_test_sample(data):
    """SMTP Test email template"""
    return f"""<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; color: #1a2744; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #1a2744; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #d4a646; margin: 0;">{data['company_name']}</h1>
    </div>
    <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
        <h2 style="color: #1a2744;">SMTP Test Successful!</h2>
        <p>If you're reading this, your SMTP configuration is working correctly.</p>
        <p><strong>From:</strong> {data['sender_email']}</p>
        <p><strong>To:</strong> {data['recipient_email']}</p>
        <p><strong>Server:</strong> smtp.example.com:587</p>
        <p><strong>Time:</strong> {data['current_date']}</p>
    </div>
    <div style="background: #1a2744; padding: 10px; text-align: center; border-radius: 0 0 8px 8px;">
        <p style="color: #888; font-size: 12px; margin: 0;">{data['company_name']} CRM</p>
    </div>
</body>
</html>"""


def generate_brochure_email_sample(data):
    """Property Brochure email template"""
    return f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0a1628; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #1a2744 0%, #2a3a5c 100%); padding: 30px; text-align: center;">
        <h1 style="color: #d4a646; margin: 0; font-size: 24px;">{data['company_name']}</h1>
        <p style="color: #fff; margin: 10px 0 0 0; font-size: 14px;">Luxury Real Estate</p>
    </div>
    
    <div style="padding: 30px; background: #fff;">
        <p style="font-size: 16px;">Dear {data['recipient_name']},</p>
        
        <p>I wanted to share this stunning property with you that I think would be perfect for your needs.</p>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d4a646;">
            <h3 style="color: #1a2744; margin: 0 0 10px 0;">123 Ocean Drive, Miami Beach, FL</h3>
            <p style="margin: 5px 0; color: #666;">4 Beds | 3.5 Baths | 3,500 sqft</p>
            <p style="margin: 5px 0; font-size: 20px; color: #d4a646; font-weight: bold;">$2,500,000</p>
        </div>
        
        <p>I've attached a detailed brochure with all the property information. Please let me know if you'd like to schedule a viewing!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0;">Best regards,</p>
            <p style="font-weight: bold; color: #1a2744; margin: 5px 0;">{data['sender_name']}</p>
            <p style="color: #666; margin: 0; font-size: 14px;">{data['sender_title']}</p>
            <p style="color: #666; margin: 0; font-size: 14px;">{data['sender_phone']} | {data['sender_email']}</p>
        </div>
    </div>
    
    <div style="background: #1a2744; padding: 15px; text-align: center;">
        <p style="color: #888; font-size: 12px; margin: 0;">&copy; {data['current_year']} {data['company_name']}</p>
    </div>
</body>
</html>"""


def generate_welcome_email_sample(data):
    """Welcome email template for new leads"""
    return f"""<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; color: #1a2744; max-width: 600px; margin: 0 auto; padding: 0;">
    <div style="background: linear-gradient(135deg, #1a2744 0%, #2a3a5c 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #d4a646; margin: 0; font-size: 32px;">{data['company_name']}</h1>
        <p style="color: #fff; margin: 15px 0 0 0; font-size: 16px;">Where Luxury Meets Home</p>
    </div>
    
    <div style="padding: 40px 30px; background: #fff;">
        <h2 style="color: #1a2744; margin: 0 0 20px 0;">Welcome, {data['recipient_name']}!</h2>
        
        <p style="font-size: 16px; line-height: 1.8;">
            Thank you for your interest in {data['company_name']}. We're thrilled to have you join our community of discerning property seekers.
        </p>
        
        <p style="font-size: 16px; line-height: 1.8;">
            Whether you're looking to buy your dream home or sell your current property, our team of luxury real estate specialists is here to guide you every step of the way.
        </p>
        
        <div style="background: linear-gradient(135deg, #d4a646 0%, #b8962e 100%); padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
            <p style="color: #1a2744; font-size: 18px; margin: 0; font-weight: bold;">Ready to get started?</p>
            <p style="color: #1a2744; font-size: 14px; margin: 10px 0 0 0;">Browse our exclusive listings or schedule a consultation today.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.8;">
            In the meantime, feel free to explore our website or reach out directly. We're here to answer any questions you may have.
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0;">Warm regards,</p>
            <p style="font-weight: bold; color: #1a2744; margin: 10px 0 5px 0;">{data['sender_name']}</p>
            <p style="color: #666; margin: 0; font-size: 14px;">{data['sender_title']}</p>
            <p style="color: #d4a646; margin: 5px 0; font-size: 14px;">{data['sender_phone']}</p>
        </div>
    </div>
    
    <div style="background: #1a2744; padding: 20px; text-align: center;">
        <p style="color: #d4a646; font-size: 14px; margin: 0 0 10px 0;">Follow Us</p>
        <p style="color: #888; font-size: 12px; margin: 0;">&copy; {data['current_year']} {data['company_name']} | All Rights Reserved</p>
    </div>
</body>
</html>"""


def generate_booking_confirmation_sample(data):
    """Booking confirmation email template"""
    return f"""<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; color: #1a2744; max-width: 600px; margin: 0 auto; padding: 0;">
    <div style="background: #1a2744; padding: 30px; text-align: center;">
        <h1 style="color: #d4a646; margin: 0;">{data['company_name']}</h1>
    </div>
    
    <div style="padding: 30px; background: #fff;">
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: #22c55e; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: #fff; font-size: 30px;">✓</span>
            </div>
            <h2 style="color: #1a2744; margin: 20px 0 0 0;">Appointment Confirmed!</h2>
        </div>
        
        <p style="font-size: 16px;">Dear {data['recipient_name']},</p>
        
        <p style="font-size: 16px; line-height: 1.6;">
            Your appointment has been successfully confirmed. Here are the details:
        </p>
        
        <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #d4a646;">
            <p style="margin: 0 0 10px 0;"><strong>Date:</strong> Friday, March 15, 2026</p>
            <p style="margin: 0 0 10px 0;"><strong>Time:</strong> 2:00 PM - 2:30 PM</p>
            <p style="margin: 0 0 10px 0;"><strong>Duration:</strong> 30 minutes</p>
            <p style="margin: 0 0 10px 0;"><strong>Type:</strong> Property Consultation</p>
            <p style="margin: 0;"><strong>With:</strong> {data['sender_name']}</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6;">
            If you need to reschedule or cancel, please let us know at least 24 hours in advance.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <p style="color: #666; font-size: 14px; margin: 0;">{data['sender_name']} | {data['sender_phone']}</p>
        </div>
    </div>
    
    <div style="background: #1a2744; padding: 15px; text-align: center;">
        <p style="color: #888; font-size: 12px; margin: 0;">&copy; {data['current_year']} {data['company_name']}</p>
    </div>
</body>
</html>"""


def generate_booking_reminder_sample(data):
    """Booking reminder email template"""
    return f"""<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; color: #1a2744; max-width: 600px; margin: 0 auto; padding: 0;">
    <div style="background: #1a2744; padding: 30px; text-align: center;">
        <h1 style="color: #d4a646; margin: 0;">{data['company_name']}</h1>
    </div>
    
    <div style="padding: 30px; background: #fff;">
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: #f59e0b; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: #fff; font-size: 30px;">🔔</span>
            </div>
            <h2 style="color: #1a2744; margin: 20px 0 0 0;">Appointment Reminder</h2>
        </div>
        
        <p style="font-size: 16px;">Hi {data['recipient_name']},</p>
        
        <p style="font-size: 16px; line-height: 1.6;">
            This is a friendly reminder about your upcoming appointment tomorrow:
        </p>
        
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 10px 0; font-size: 18px;"><strong>Tomorrow at 2:00 PM</strong></p>
            <p style="margin: 0 0 10px 0;"><strong>Duration:</strong> 30 minutes</p>
            <p style="margin: 0;"><strong>With:</strong> {data['sender_name']}</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6;">
            We look forward to seeing you! If anything has changed, please let us know as soon as possible.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <p style="color: #666; font-size: 14px; margin: 0;">{data['sender_name']} | {data['sender_phone']}</p>
        </div>
    </div>
    
    <div style="background: #1a2744; padding: 15px; text-align: center;">
        <p style="color: #888; font-size: 12px; margin: 0;">&copy; {data['current_year']} {data['company_name']}</p>
    </div>
</body>
</html>"""


def generate_newsletter_sample(data):
    """Newsletter email template"""
    return f"""<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; color: #1a2744; max-width: 700px; margin: 0 auto; padding: 0;">
    <div style="background: linear-gradient(135deg, #1a2744 0%, #2a3a5c 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #d4a646; margin: 0; font-size: 32px;">{data['company_name']}</h1>
        <p style="color: #fff; margin: 10px 0 0 0; font-size: 14px; letter-spacing: 2px;">MONTHLY MARKET UPDATE</p>
    </div>
    
    <div style="padding: 40px 30px; background: #fff;">
        <h2 style="color: #1a2744; margin: 0 0 20px 0; font-size: 24px;">March 2026 Market Insights</h2>
        
        <p style="font-size: 16px; line-height: 1.8;">
            Dear {data['recipient_name']},
        </p>
        
        <p style="font-size: 16px; line-height: 1.8;">
            Welcome to our monthly market update! Here's what's happening in the luxury real estate market this month.
        </p>
        
        <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #d4a646; margin: 0 0 15px 0;">📈 Market Highlights</h3>
            <ul style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 10px;">Average home prices increased 5.2% year-over-year</li>
                <li style="margin-bottom: 10px;">Inventory remains tight in the luxury segment</li>
                <li style="margin-bottom: 10px;">Waterfront properties seeing highest demand</li>
                <li style="margin-bottom: 0;">Average days on market: 45 days</li>
            </ul>
        </div>
        
        <h3 style="color: #1a2744; margin: 30px 0 20px 0;">Featured Listings</h3>
        
        <div style="display: flex; gap: 20px; margin-bottom: 30px;">
            <div style="flex: 1; background: #f9fafb; padding: 20px; border-radius: 8px; border-top: 3px solid #d4a646;">
                <h4 style="margin: 0 0 10px 0; color: #1a2744;">123 Ocean Drive</h4>
                <p style="margin: 0; color: #666; font-size: 14px;">4 BD | 3.5 BA | 3,500 SF</p>
                <p style="margin: 10px 0 0 0; color: #d4a646; font-weight: bold;">$2,500,000</p>
            </div>
        </div>
        
        <p style="font-size: 16px; line-height: 1.8;">
            Interested in learning more? Reply to this email or give us a call. We'd love to hear from you!
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0;">Best regards,</p>
            <p style="font-weight: bold; color: #1a2744; margin: 10px 0 5px 0;">{data['sender_name']}</p>
            <p style="color: #666; margin: 0; font-size: 14px;">{data['sender_title']}</p>
        </div>
    </div>
    
    <div style="background: #1a2744; padding: 25px; text-align: center;">
        <p style="color: #d4a646; font-size: 14px; margin: 0 0 15px 0;">Stay Connected</p>
        <p style="color: #888; font-size: 12px; margin: 0;">
            You're receiving this because you subscribed to our newsletter.<br/>
            <a href="#" style="color: #d4a646;">Unsubscribe</a> | <a href="#" style="color: #d4a646;">Update Preferences</a>
        </p>
        <p style="color: #666; font-size: 12px; margin: 15px 0 0 0;">&copy; {data['current_year']} {data['company_name']}</p>
    </div>
</body>
</html>"""


def generate_lead_notification_sample(data):
    """New lead notification email template (sent to agents)"""
    return f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #1a2744; max-width: 600px; margin: 0 auto; padding: 0;">
    <div style="background: #1a2744; padding: 20px; text-align: center;">
        <h1 style="color: #d4a646; margin: 0; font-size: 20px;">🔔 New Lead Alert</h1>
    </div>
    
    <div style="padding: 30px; background: #fff;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
            <p style="color: #fff; font-size: 18px; margin: 0; font-weight: bold;">You have a new lead!</p>
        </div>
        
        <h3 style="color: #1a2744; margin: 0 0 20px 0;">Lead Details</h3>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
            <p style="margin: 0 0 10px 0;"><strong>Name:</strong> {data['recipient_name']}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> {data['recipient_email']}</p>
            <p style="margin: 0 0 10px 0;"><strong>Phone:</strong> (813) 629-7355</p>
            <p style="margin: 0 0 10px 0;"><strong>Type:</strong> Buyer</p>
            <p style="margin: 0 0 10px 0;"><strong>Interest:</strong> Waterfront Properties</p>
            <p style="margin: 0;"><strong>Budget:</strong> $1.5M - $2.5M</p>
        </div>
        
        <div style="margin-top: 25px;">
            <p style="margin: 0 0 10px 0;"><strong>Message from Lead:</strong></p>
            <p style="background: #f0f0f0; padding: 15px; border-radius: 8px; font-style: italic; margin: 0;">
                "I'm interested in waterfront properties in the Miami Beach area. Looking to move within the next 3 months."
            </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
            <a href="#" style="display: inline-block; background: #d4a646; color: #1a2744; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">View in CRM</a>
        </div>
    </div>
    
    <div style="background: #f0f0f0; padding: 15px; text-align: center;">
        <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated notification from {data['company_name']} CRM
        </p>
    </div>
</body>
</html>"""
