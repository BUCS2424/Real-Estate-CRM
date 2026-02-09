"""
Foldable Brochure Generator Service
Generates beautifully designed 2-page foldable property brochures
Page 1: Front Cover (right) + Back Cover (left) - when folded
Page 2: Inside Left + Inside Right - when opened
"""
import os
import io
import uuid
import random
from datetime import datetime
from typing import Optional, Dict, Any, List
import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import httpx


# Brand colors - Luxury Real Estate Theme
NAVY = colors.HexColor('#0a1628')
DARK_NAVY = colors.HexColor('#050d18')
NAVY_BLUE = colors.HexColor('#1a365d')
GOLD = colors.HexColor('#d4af37')
LIGHT_GOLD = colors.HexColor('#f5e6b8')
AMBER = colors.HexColor('#fbbf24')
WHITE = colors.white
CREAM = colors.HexColor('#fdf8f0')
OFF_WHITE = colors.HexColor('#f5f5f0')
LIGHT_GRAY = colors.HexColor('#f8f9fa')
MEDIUM_GRAY = colors.HexColor('#6b7280')
DARK_GRAY = colors.HexColor('#374151')
CHARCOAL = colors.HexColor('#1f2937')


# Property title generators
TITLE_TEMPLATES = [
    "Your Dream Awaits at {address}",
    "Discover {address}",
    "Welcome Home to {address}",
    "Experience Living at {address}",
    "The Perfect Home: {address}",
    "Luxury Living at {address}",
    "{address}: Where Dreams Begin",
    "Make {address} Your Home",
    "Exceptional Living at {address}",
    "A Place to Call Home: {address}",
]

TAGLINE_TEMPLATES = [
    "Luxury, comfort, and convenience",
    "Where quality meets comfort",
    "Your perfect home starts here",
    "Experience exceptional living",
    "Designed for modern living",
    "A home beyond compare",
    "Where memories are made",
    "Your sanctuary awaits",
    "Live the life you deserve",
    "Elegance in every detail",
]


def generate_property_title(address: str) -> str:
    """Generate a catchy title for the property"""
    template = random.choice(TITLE_TEMPLATES)
    # Extract just the street address without city/state
    street = address.split(',')[0].strip() if ',' in address else address
    return template.format(address=street.title())


def generate_tagline() -> str:
    """Generate a tagline for the brochure"""
    return random.choice(TAGLINE_TEMPLATES)


def generate_qr_code(url: str, size: int = 200) -> io.BytesIO:
    """Generate QR code for a URL"""
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=8, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0a1628", back_color="#f5e6b8")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


def draw_rounded_rect(c, x, y, width, height, radius, fill_color=None, stroke_color=None, stroke_width=1):
    """Draw a rounded rectangle"""
    c.saveState()
    if fill_color:
        c.setFillColor(fill_color)
    if stroke_color:
        c.setStrokeColor(stroke_color)
        c.setLineWidth(stroke_width)
    
    p = c.beginPath()
    p.moveTo(x + radius, y)
    p.lineTo(x + width - radius, y)
    p.arcTo(x + width - radius, y, x + width, y + radius, radius)
    p.lineTo(x + width, y + height - radius)
    p.arcTo(x + width, y + height - radius, x + width - radius, y + height, radius)
    p.lineTo(x + radius, y + height)
    p.arcTo(x + radius, y + height, x, y + height - radius, radius)
    p.lineTo(x, y + radius)
    p.arcTo(x, y + radius, x + radius, y, radius)
    p.close()
    
    if fill_color and stroke_color:
        c.drawPath(p, fill=1, stroke=1)
    elif fill_color:
        c.drawPath(p, fill=1, stroke=0)
    elif stroke_color:
        c.drawPath(p, fill=0, stroke=1)
    
    c.restoreState()


def draw_image_placeholder(c, x, y, width, height, label="Image"):
    """Draw a placeholder for images"""
    # Draw checkered pattern
    c.saveState()
    c.setFillColor(colors.HexColor('#e5e7eb'))
    c.rect(x, y, width, height, fill=1, stroke=0)
    
    # Draw diagonal lines for placeholder effect
    c.setStrokeColor(colors.HexColor('#d1d5db'))
    c.setLineWidth(0.5)
    
    step = 20
    for i in range(0, int(width + height), step):
        x1 = x + max(0, i - height)
        y1 = y + min(i, height)
        x2 = x + min(i, width)
        y2 = y + max(0, i - width)
        c.line(x1, y1, x2, y2)
    
    # Draw label
    c.setFillColor(colors.HexColor('#9ca3af'))
    c.setFont('Helvetica', 10)
    c.drawCentredString(x + width/2, y + height/2 - 5, label)
    
    c.restoreState()


def draw_property_image(c, x, y, width, height, image_url: str = None, label: str = "Property Image"):
    """Draw a property image or placeholder"""
    if image_url:
        try:
            # Try to load the image
            response = httpx.get(image_url, timeout=10)
            if response.status_code == 200:
                img_buffer = io.BytesIO(response.content)
                img = ImageReader(img_buffer)
                c.drawImage(img, x, y, width, height, preserveAspectRatio=True, anchor='c')
                return
        except Exception as e:
            print(f"Failed to load image: {e}")
    
    # Draw placeholder if no image
    draw_image_placeholder(c, x, y, width, height, label)


def generate_foldable_brochure_page1(
    lead: dict,
    agent_info: dict,
    branding: dict = None,
    landing_page_url: Optional[str] = None,
    property_images: List[str] = None
) -> io.BytesIO:
    """
    Generate Page 1 of the foldable brochure (Front + Back Cover)
    
    Layout when printed (landscape 11x8.5):
    |  BACK COVER (left)  |  FRONT COVER (right)  |
    
    When folded, Front Cover is on front, Back Cover is on back
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(letter))
    width, height = landscape(letter)  # 11" x 8.5"
    
    half_width = width / 2
    
    # Property info
    address = lead.get('address', 'Beautiful Property')
    city = lead.get('city', '')
    state = lead.get('state', 'FL')
    owner_name = lead.get('owner_name', 'Homeowner')
    
    # Generate dynamic title and tagline
    property_title = generate_property_title(address)
    tagline = generate_tagline()
    
    # Branding info
    if branding:
        company_name = branding.get('company_name', 'Hidden Haven Realty')
        company_phone = branding.get('phone', agent_info.get('phone', '(555) 123-4567'))
        company_website = branding.get('website', 'www.hiddenhaven.com')
        company_address = branding.get('address', 'Tampa, FL')
        logo_url = branding.get('logo_url')
    else:
        company_name = 'Hidden Haven Realty'
        company_phone = agent_info.get('phone', '(555) 123-4567')
        company_website = 'www.hiddenhaven.com'
        company_address = 'Tampa, FL'
        logo_url = None
    
    # ============================================
    # LEFT SIDE - BACK COVER (Dark Navy Background)
    # ============================================
    
    # Navy background for back cover
    c.setFillColor(NAVY)
    c.rect(0, 0, half_width, height, fill=1, stroke=0)
    
    # Subtle gradient overlay at top
    for i in range(20):
        alpha = 0.02 * (20 - i)
        c.setFillColor(colors.Color(0, 0, 0, alpha))
        c.rect(0, height - (i * height/20), half_width, height/20, fill=1, stroke=0)
    
    # "WHY CHOOSE US" Section
    y_pos = height - 0.8*inch
    
    c.setFont('Helvetica-Bold', 24)
    c.setFillColor(WHITE)
    c.drawString(0.5*inch, y_pos, "Why Choose Us")
    
    y_pos -= 0.5*inch
    c.setFont('Helvetica', 11)
    c.setFillColor(colors.HexColor('#cbd5e1'))
    
    description_lines = [
        "We don't just sell homes—we build relationships.",
        "Our commitment to quality and customer",
        "satisfaction ensures every homeowner feels",
        "truly at home. Let us help you find yours."
    ]
    
    for line in description_lines:
        c.drawString(0.5*inch, y_pos, line)
        y_pos -= 0.22*inch
    
    # Banner - "Your Perfect Home Starts Here"
    y_pos -= 0.4*inch
    banner_height = 0.5*inch
    banner_width = half_width - 1*inch
    
    draw_rounded_rect(c, 0.5*inch, y_pos - banner_height/2, banner_width, banner_height, 
                     radius=5, fill_color=colors.HexColor('#1e3a5f'))
    
    c.setFont('Helvetica-Bold', 12)
    c.setFillColor(LIGHT_GOLD)
    c.drawCentredString(0.5*inch + banner_width/2, y_pos - 5, "Your Perfect Home Starts Here")
    
    # Property Image Placeholder (smaller, on back)
    y_pos -= 1.8*inch
    img_width = half_width - 1*inch
    img_height = 1.5*inch
    
    if property_images and len(property_images) > 1:
        draw_property_image(c, 0.5*inch, y_pos, img_width, img_height, property_images[1], "Property Feature")
    else:
        draw_image_placeholder(c, 0.5*inch, y_pos, img_width, img_height, "Property Feature")
    
    # QR Code
    y_pos -= 1.5*inch
    qr_size = 0.9*inch
    
    # QR code background circle
    c.setFillColor(LIGHT_GOLD)
    c.circle(0.5*inch + qr_size/2 + 0.1*inch, y_pos + qr_size/2, qr_size/2 + 0.15*inch, fill=1, stroke=0)
    
    # Generate and draw QR code
    if landing_page_url:
        try:
            qr_buffer = generate_qr_code(landing_page_url)
            qr_img = ImageReader(qr_buffer)
            c.drawImage(qr_img, 0.5*inch + 0.1*inch, y_pos, qr_size, qr_size)
        except:
            pass
    
    # Contact Info
    c.setFont('Helvetica', 10)
    c.setFillColor(WHITE)
    contact_x = 0.5*inch + qr_size + 0.4*inch
    c.drawString(contact_x, y_pos + qr_size - 0.1*inch, f"📞 {company_phone}")
    c.drawString(contact_x, y_pos + qr_size - 0.35*inch, f"🌐 {company_website}")
    c.drawString(contact_x, y_pos + qr_size - 0.6*inch, f"📍 {company_address}")
    
    # Vertical text "Schedule a visit today!" on right edge of back cover
    c.saveState()
    c.setFillColor(LIGHT_GOLD)
    c.setFont('Helvetica-Bold', 10)
    c.translate(half_width - 0.35*inch, 1*inch)
    c.rotate(90)
    c.drawString(0, 0, "• Schedule a visit today!")
    c.restoreState()
    
    # ============================================
    # RIGHT SIDE - FRONT COVER (Cream Background)
    # ============================================
    
    # Cream/Off-white background
    c.setFillColor(OFF_WHITE)
    c.rect(half_width, 0, half_width, height, fill=1, stroke=0)
    
    # Subtle geometric pattern in background (top right)
    c.saveState()
    c.setStrokeColor(colors.HexColor('#e8e4d9'))
    c.setLineWidth(40)
    c.line(width - 2*inch, height - 0.5*inch, width - 0.5*inch, height - 2*inch)
    c.setLineWidth(20)
    c.line(width - 2.5*inch, height - 0.3*inch, width - 0.3*inch, height - 2.5*inch)
    c.restoreState()
    
    # Vertical separator line
    c.setStrokeColor(colors.HexColor('#d1d5db'))
    c.setLineWidth(1)
    c.line(half_width + 0.1*inch, 0.5*inch, half_width + 0.1*inch, height - 0.5*inch)
    
    # Logo area (top left of front cover)
    logo_x = half_width + 0.5*inch
    logo_y = height - 0.9*inch
    
    if logo_url:
        try:
            response = httpx.get(logo_url, timeout=10)
            if response.status_code == 200:
                logo_buffer = io.BytesIO(response.content)
                logo_img = ImageReader(logo_buffer)
                c.drawImage(logo_img, logo_x, logo_y, 1.2*inch, 0.6*inch, preserveAspectRatio=True)
        except:
            # Draw text logo
            c.setFont('Helvetica-Bold', 16)
            c.setFillColor(NAVY)
            c.drawString(logo_x, logo_y + 0.2*inch, company_name.upper())
    else:
        # Draw text logo with icon
        c.setFillColor(NAVY)
        c.setFont('Helvetica-Bold', 18)
        c.drawString(logo_x, logo_y + 0.15*inch, "HIDDEN HAVEN")
        c.setFont('Helvetica', 10)
        c.setFillColor(GOLD)
        c.drawString(logo_x, logo_y, "REALTY")
    
    # Year/Date (top right)
    c.setFont('Helvetica', 10)
    c.setFillColor(MEDIUM_GRAY)
    c.drawRightString(width - 0.5*inch, height - 0.6*inch, datetime.now().strftime("%Y"))
    
    # Main Headline
    headline_y = height - 2.2*inch
    c.setFont('Helvetica-Bold', 28)
    c.setFillColor(CHARCOAL)
    
    # Split title into lines if too long
    title_words = property_title.split()
    line1 = []
    line2 = []
    
    for word in title_words:
        if len(' '.join(line1 + [word])) < 25:
            line1.append(word)
        else:
            line2.append(word)
    
    c.drawString(half_width + 0.5*inch, headline_y, ' '.join(line1))
    if line2:
        c.drawString(half_width + 0.5*inch, headline_y - 0.4*inch, ' '.join(line2))
        headline_y -= 0.4*inch
    
    # Tagline
    c.setFont('Helvetica-Oblique', 12)
    c.setFillColor(MEDIUM_GRAY)
    c.drawString(half_width + 0.5*inch, headline_y - 0.4*inch, tagline)
    
    # Large Property Images
    img_start_y = headline_y - 1*inch
    main_img_height = 3.5*inch
    main_img_width = half_width - 1*inch
    
    # Main large image
    if property_images and len(property_images) > 0:
        draw_property_image(c, half_width + 0.5*inch, img_start_y - main_img_height, 
                          main_img_width, main_img_height, property_images[0], "Main Property Photo")
    else:
        draw_image_placeholder(c, half_width + 0.5*inch, img_start_y - main_img_height, 
                              main_img_width, main_img_height, "Main Property Photo")
    
    # Property Address at bottom
    c.setFont('Helvetica', 10)
    c.setFillColor(DARK_GRAY)
    full_address = f"{address}, {city}, {state}" if city else f"{address}, {state}"
    c.drawCentredString(half_width + half_width/2, 0.5*inch, full_address)
    
    # Gold accent line at bottom
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.line(half_width + 1*inch, 0.35*inch, width - 1*inch, 0.35*inch)
    
    c.save()
    buffer.seek(0)
    return buffer


def generate_foldable_brochure_page2(
    lead: dict,
    agent_info: dict,
    branding: dict = None,
    property_images: List[str] = None
) -> io.BytesIO:
    """
    Generate Page 2 of the foldable brochure (Inside panels)
    
    Layout when printed (landscape 11x8.5):
    |  INSIDE LEFT  |  INSIDE RIGHT  |
    
    This is what you see when you open the brochure
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(letter))
    width, height = landscape(letter)
    
    half_width = width / 2
    
    # Property info
    address = lead.get('address', 'Beautiful Property')
    city = lead.get('city', '')
    state = lead.get('state', 'FL')
    bedrooms = lead.get('bedrooms', '-')
    bathrooms = lead.get('bathrooms', '-')
    sqft = lead.get('sqft', '-')
    year_built = lead.get('year_built', '-')
    estimated_value = lead.get('estimated_value')
    property_type = lead.get('property_type', 'Single Family')
    lot_size = lead.get('lot_size', '-')
    owner_name = lead.get('owner_name', 'Homeowner')
    
    # Agent info
    agent_name = agent_info.get('name', 'Your Agent')
    agent_phone = agent_info.get('phone', '')
    agent_email = agent_info.get('email', '')
    agent_title = agent_info.get('title', 'Real Estate Specialist')
    
    # ============================================
    # INSIDE LEFT - Property Details
    # ============================================
    
    # Light background
    c.setFillColor(colors.HexColor('#fafafa'))
    c.rect(0, 0, half_width, height, fill=1, stroke=0)
    
    # Navy header strip
    c.setFillColor(NAVY)
    c.rect(0, height - 1.2*inch, half_width, 1.2*inch, fill=1, stroke=0)
    
    # Gold accent line
    c.setStrokeColor(GOLD)
    c.setLineWidth(3)
    c.line(0, height - 1.2*inch, half_width, height - 1.2*inch)
    
    # Header text
    c.setFont('Helvetica-Bold', 20)
    c.setFillColor(WHITE)
    c.drawCentredString(half_width/2, height - 0.7*inch, "Property Details")
    
    c.setFont('Helvetica', 10)
    c.setFillColor(LIGHT_GOLD)
    c.drawCentredString(half_width/2, height - 1*inch, address)
    
    # Property stats cards
    y_pos = height - 1.8*inch
    card_width = (half_width - 0.8*inch) / 2
    card_height = 0.9*inch
    
    stats = [
        ('Bedrooms', str(bedrooms), '🛏️'),
        ('Bathrooms', str(bathrooms), '🛁'),
        ('Square Feet', f"{sqft:,}" if isinstance(sqft, (int, float)) else sqft, '📐'),
        ('Year Built', str(year_built), '📅'),
    ]
    
    for i, (label, value, icon) in enumerate(stats):
        row = i // 2
        col = i % 2
        x = 0.4*inch + col * (card_width + 0.2*inch)
        y = y_pos - row * (card_height + 0.15*inch)
        
        # Card background
        draw_rounded_rect(c, x, y - card_height, card_width, card_height, 
                         radius=8, fill_color=WHITE)
        
        # Card border
        draw_rounded_rect(c, x, y - card_height, card_width, card_height, 
                         radius=8, stroke_color=colors.HexColor('#e5e7eb'), stroke_width=1)
        
        # Icon and value
        c.setFont('Helvetica-Bold', 20)
        c.setFillColor(NAVY)
        c.drawCentredString(x + card_width/2, y - 0.35*inch, value)
        
        c.setFont('Helvetica', 9)
        c.setFillColor(MEDIUM_GRAY)
        c.drawCentredString(x + card_width/2, y - 0.6*inch, label)
    
    # Estimated Value section
    if estimated_value:
        y_pos = y_pos - 2.2*inch
        
        c.setFont('Helvetica-Bold', 12)
        c.setFillColor(GOLD)
        c.drawString(0.4*inch, y_pos, "✦ ESTIMATED MARKET VALUE")
        
        y_pos -= 0.5*inch
        
        # Value box
        value_box_width = half_width - 0.8*inch
        value_box_height = 0.8*inch
        
        draw_rounded_rect(c, 0.4*inch, y_pos - value_box_height, value_box_width, value_box_height,
                         radius=8, fill_color=colors.HexColor('#f0fdf4'))
        draw_rounded_rect(c, 0.4*inch, y_pos - value_box_height, value_box_width, value_box_height,
                         radius=8, stroke_color=colors.HexColor('#22c55e'), stroke_width=2)
        
        c.setFont('Helvetica-Bold', 28)
        c.setFillColor(colors.HexColor('#166534'))
        c.drawCentredString(0.4*inch + value_box_width/2, y_pos - 0.5*inch, f"${estimated_value:,.0f}")
        
        y_pos -= value_box_height + 0.2*inch
        
        if sqft and isinstance(sqft, (int, float)) and sqft > 0:
            price_per_sqft = estimated_value / sqft
            c.setFont('Helvetica', 10)
            c.setFillColor(MEDIUM_GRAY)
            c.drawCentredString(0.4*inch + value_box_width/2, y_pos, f"${price_per_sqft:,.0f} per square foot")
    
    # Additional Details
    y_pos -= 0.6*inch
    c.setFont('Helvetica-Bold', 12)
    c.setFillColor(GOLD)
    c.drawString(0.4*inch, y_pos, "✦ ADDITIONAL DETAILS")
    
    y_pos -= 0.35*inch
    details = [
        ('Property Type', property_type.replace('_', ' ').title() if property_type else '-'),
        ('Lot Size', f"{lot_size} acres" if lot_size and lot_size != '-' else '-'),
    ]
    
    c.setFont('Helvetica', 10)
    for label, value in details:
        c.setFillColor(DARK_GRAY)
        c.drawString(0.4*inch, y_pos, f"{label}:")
        c.setFillColor(NAVY)
        c.drawString(1.8*inch, y_pos, str(value))
        y_pos -= 0.25*inch
    
    # ============================================
    # INSIDE RIGHT - Images & Agent Contact
    # ============================================
    
    # Light cream background
    c.setFillColor(OFF_WHITE)
    c.rect(half_width, 0, half_width, height, fill=1, stroke=0)
    
    # Navy header strip
    c.setFillColor(NAVY)
    c.rect(half_width, height - 1.2*inch, half_width, 1.2*inch, fill=1, stroke=0)
    
    # Gold accent line
    c.setStrokeColor(GOLD)
    c.setLineWidth(3)
    c.line(half_width, height - 1.2*inch, width, height - 1.2*inch)
    
    # Header text
    c.setFont('Helvetica-Bold', 20)
    c.setFillColor(WHITE)
    c.drawCentredString(half_width + half_width/2, height - 0.7*inch, "Property Gallery")
    
    c.setFont('Helvetica', 10)
    c.setFillColor(LIGHT_GOLD)
    c.drawCentredString(half_width + half_width/2, height - 1*inch, "Explore your future home")
    
    # Image gallery (2x2 grid)
    img_start_y = height - 1.6*inch
    img_width = (half_width - 0.7*inch) / 2
    img_height = 1.8*inch
    
    for i in range(4):
        row = i // 2
        col = i % 2
        x = half_width + 0.3*inch + col * (img_width + 0.1*inch)
        y = img_start_y - (row + 1) * (img_height + 0.1*inch)
        
        if property_images and i < len(property_images):
            draw_property_image(c, x, y, img_width, img_height, property_images[i], f"Photo {i+1}")
        else:
            draw_image_placeholder(c, x, y, img_width, img_height, f"Photo {i+1}")
    
    # Agent Contact Section
    y_pos = img_start_y - 4.2*inch
    
    c.setFont('Helvetica-Bold', 12)
    c.setFillColor(GOLD)
    c.drawString(half_width + 0.3*inch, y_pos, "✦ YOUR REAL ESTATE PROFESSIONAL")
    
    y_pos -= 0.4*inch
    
    # Agent card
    agent_card_width = half_width - 0.6*inch
    agent_card_height = 1.3*inch
    
    draw_rounded_rect(c, half_width + 0.3*inch, y_pos - agent_card_height, 
                     agent_card_width, agent_card_height, radius=10, fill_color=WHITE)
    draw_rounded_rect(c, half_width + 0.3*inch, y_pos - agent_card_height, 
                     agent_card_width, agent_card_height, radius=10, 
                     stroke_color=GOLD, stroke_width=2)
    
    # Agent info
    c.setFont('Helvetica-Bold', 14)
    c.setFillColor(NAVY)
    c.drawString(half_width + 0.5*inch, y_pos - 0.35*inch, agent_name)
    
    c.setFont('Helvetica', 10)
    c.setFillColor(GOLD)
    c.drawString(half_width + 0.5*inch, y_pos - 0.55*inch, agent_title)
    
    c.setFont('Helvetica', 10)
    c.setFillColor(DARK_GRAY)
    c.drawString(half_width + 0.5*inch, y_pos - 0.85*inch, f"📞 {agent_phone}")
    c.drawString(half_width + 0.5*inch, y_pos - 1.05*inch, f"✉️ {agent_email}")
    
    # Footer message
    c.setFont('Helvetica-Oblique', 9)
    c.setFillColor(MEDIUM_GRAY)
    c.drawCentredString(half_width + half_width/2, 0.4*inch, 
                       f"Prepared exclusively for {owner_name}")
    
    c.save()
    buffer.seek(0)
    return buffer


async def generate_foldable_brochure(
    lead: dict,
    agent_info: dict,
    branding: dict = None,
    landing_page_url: Optional[str] = None,
    property_images: List[str] = None
) -> io.BytesIO:
    """
    Generate a complete 2-page foldable brochure
    Returns a single PDF with both pages
    """
    from PyPDF2 import PdfMerger
    
    # Generate both pages
    page1_buffer = generate_foldable_brochure_page1(lead, agent_info, branding, landing_page_url, property_images)
    page2_buffer = generate_foldable_brochure_page2(lead, agent_info, branding, property_images)
    
    # Merge into single PDF
    merger = PdfMerger()
    merger.append(page1_buffer)
    merger.append(page2_buffer)
    
    output_buffer = io.BytesIO()
    merger.write(output_buffer)
    merger.close()
    
    output_buffer.seek(0)
    return output_buffer


# Keep the existing single-page brochure functions for backwards compatibility
def generate_single_page_brochure_with_address(lead: dict, agent_info: dict, landing_page_url: Optional[str] = None) -> io.BytesIO:
    """Generate the original single-page flyer brochure"""
    # Import from the existing implementation
    from services.brochure_generator import generate_single_page_brochure_with_address as original_generator
    return original_generator(lead, agent_info, landing_page_url)
