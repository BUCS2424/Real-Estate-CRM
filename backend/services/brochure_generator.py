"""
Brochure Generator Service
Generates personalized property brochures in multiple formats (PDF)
"""
import os
import io
import uuid
import qrcode
from datetime import datetime
from typing import Optional, Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from PIL import Image as PILImage


# Brand colors
NAVY = colors.HexColor('#0a1628')
GOLD = colors.HexColor('#d4af37')
AMBER = colors.HexColor('#fbbf24')
WHITE = colors.white
LIGHT_GRAY = colors.HexColor('#f5f5f5')


def calculate_lead_score(lead: dict) -> dict:
    """
    Calculate a lead score based on available information.
    Returns score (0-100) and breakdown.
    """
    score = 0
    breakdown = {}
    
    # Address completeness (15 points)
    address_score = 0
    if lead.get('address'): address_score += 5
    if lead.get('city'): address_score += 3
    if lead.get('state'): address_score += 2
    if lead.get('zip_code'): address_score += 3
    if lead.get('county'): address_score += 2
    breakdown['address'] = min(address_score, 15)
    score += breakdown['address']
    
    # Property details (20 points)
    property_score = 0
    if lead.get('property_type'): property_score += 4
    if lead.get('bedrooms'): property_score += 3
    if lead.get('bathrooms'): property_score += 3
    if lead.get('sqft'): property_score += 4
    if lead.get('year_built'): property_score += 3
    if lead.get('parcel_id'): property_score += 3
    breakdown['property'] = min(property_score, 20)
    score += breakdown['property']
    
    # Value information (20 points)
    value_score = 0
    if lead.get('estimated_value'): value_score += 10
    if lead.get('tax_assessed_value'): value_score += 5
    if lead.get('last_sale_price'): value_score += 3
    if lead.get('last_sale_date'): value_score += 2
    breakdown['value'] = min(value_score, 20)
    score += breakdown['value']
    
    # Owner information (25 points)
    owner_score = 0
    if lead.get('owner_name'): owner_score += 10
    if lead.get('owner_mailing_address'): owner_score += 5
    if lead.get('owner_phone'): owner_score += 5
    if lead.get('owner_email'): owner_score += 5
    breakdown['owner'] = min(owner_score, 25)
    score += breakdown['owner']
    
    # Tax collector data (10 points)
    tax_score = 0
    if lead.get('tax_land_value'): tax_score += 3
    if lead.get('tax_building_value'): tax_score += 3
    if lead.get('homestead') is not None: tax_score += 2
    if lead.get('annual_taxes'): tax_score += 2
    breakdown['tax'] = min(tax_score, 10)
    score += breakdown['tax']
    
    # Status bonus (10 points)
    status_scores = {
        'new': 2,
        'contacted': 4,
        'qualified': 8,
        'nurturing': 6,
        'converted': 10,
        'not_interested': 0
    }
    breakdown['status'] = status_scores.get(lead.get('status', 'new'), 0)
    score += breakdown['status']
    
    # Determine rating
    if score >= 80:
        rating = 'Excellent'
        rating_color = 'green'
    elif score >= 60:
        rating = 'Good'
        rating_color = 'blue'
    elif score >= 40:
        rating = 'Fair'
        rating_color = 'yellow'
    else:
        rating = 'Needs Data'
        rating_color = 'red'
    
    return {
        'score': min(score, 100),
        'rating': rating,
        'rating_color': rating_color,
        'breakdown': breakdown,
        'max_score': 100
    }


def generate_qr_code(url: str) -> io.BytesIO:
    """Generate QR code for a URL"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#0a1628", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


def generate_single_page_brochure(lead: dict, agent_info: dict, landing_page_url: Optional[str] = None) -> io.BytesIO:
    """
    Generate a single-page flyer (8.5x11) brochure.
    Returns PDF as BytesIO buffer.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=NAVY,
        alignment=TA_CENTER,
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=GOLD,
        alignment=TA_CENTER,
        spaceAfter=20,
        fontName='Helvetica-Oblique'
    )
    
    heading_style = ParagraphStyle(
        'Heading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=NAVY,
        spaceBefore=15,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=11,
        textColor=NAVY,
        spaceAfter=6,
        fontName='Helvetica'
    )
    
    owner_style = ParagraphStyle(
        'Owner',
        parent=styles['Normal'],
        fontSize=14,
        textColor=NAVY,
        alignment=TA_CENTER,
        spaceBefore=20,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    # Build content
    story = []
    
    # Header - Personalized greeting
    owner_name = lead.get('owner_name', 'Homeowner')
    story.append(Paragraph(f"Dear {owner_name},", owner_style))
    story.append(Spacer(1, 10))
    
    # Property Address as title
    address = lead.get('address', 'Your Property')
    city_state = f"{lead.get('city', '')}, {lead.get('state', 'FL')} {lead.get('zip_code', '')}"
    
    story.append(Paragraph(address, title_style))
    story.append(Paragraph(city_state, subtitle_style))
    story.append(Spacer(1, 20))
    
    # Intro paragraph
    intro_text = f"""
    We've been closely monitoring the real estate market in {lead.get('city', 'your area')} 
    and believe your property at {address} presents an excellent opportunity. 
    Based on our analysis, here's what makes your property stand out:
    """
    story.append(Paragraph(intro_text.strip(), body_style))
    story.append(Spacer(1, 15))
    
    # Property Details Table
    story.append(Paragraph("Property Highlights", heading_style))
    
    # Build property data table
    prop_data = []
    if lead.get('property_type'):
        prop_data.append(['Property Type:', lead['property_type'].replace('_', ' ').title()])
    if lead.get('bedrooms') and lead.get('bathrooms'):
        prop_data.append(['Bedrooms / Bathrooms:', f"{lead['bedrooms']} beds / {lead['bathrooms']} baths"])
    if lead.get('sqft'):
        prop_data.append(['Square Feet:', f"{lead['sqft']:,} sq ft"])
    if lead.get('year_built'):
        prop_data.append(['Year Built:', str(lead['year_built'])])
    if lead.get('lot_size'):
        prop_data.append(['Lot Size:', f"{lead['lot_size']} acres"])
    
    if prop_data:
        prop_table = Table(prop_data, colWidths=[2*inch, 4*inch])
        prop_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('TEXTCOLOR', (0, 0), (-1, -1), NAVY),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, GOLD),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ]))
        story.append(prop_table)
    
    story.append(Spacer(1, 20))
    
    # Value Section
    if lead.get('estimated_value'):
        story.append(Paragraph("Estimated Market Value", heading_style))
        value_text = f"${lead['estimated_value']:,.0f}"
        value_style = ParagraphStyle(
            'Value',
            parent=styles['Normal'],
            fontSize=32,
            textColor=GOLD,
            alignment=TA_CENTER,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        story.append(Paragraph(value_text, value_style))
        
        if lead.get('sqft') and lead.get('estimated_value'):
            price_per_sqft = lead['estimated_value'] / lead['sqft']
            story.append(Paragraph(f"(${price_per_sqft:,.0f} per sq ft)", subtitle_style))
        
        story.append(Spacer(1, 15))
    
    # Call to Action
    story.append(Paragraph("Ready to Learn More?", heading_style))
    cta_text = """
    I'd love to discuss the current market conditions and how we can help you maximize 
    the value of your property. Whether you're considering selling now or in the future, 
    a no-obligation consultation could provide valuable insights.
    """
    story.append(Paragraph(cta_text.strip(), body_style))
    story.append(Spacer(1, 20))
    
    # Agent Info and QR Code section
    agent_data = []
    
    # Agent details
    agent_name = agent_info.get('name', 'Your Real Estate Professional')
    agent_phone = agent_info.get('phone', '')
    agent_email = agent_info.get('email', '')
    agent_title = agent_info.get('title', 'Real Estate Specialist')
    
    agent_col = f"""
    <b>{agent_name}</b><br/>
    {agent_title}<br/>
    <br/>
    Phone: {agent_phone}<br/>
    Email: {agent_email}
    """
    
    agent_cell = Paragraph(agent_col, body_style)
    
    # QR Code if landing page URL provided
    if landing_page_url:
        try:
            qr_buffer = generate_qr_code(landing_page_url)
            qr_image = Image(qr_buffer, width=1.2*inch, height=1.2*inch)
            qr_cell = qr_image
        except:
            qr_cell = Paragraph("Scan QR code to view online", body_style)
    else:
        qr_cell = Paragraph("", body_style)
    
    contact_table = Table([[agent_cell, qr_cell]], colWidths=[5*inch, 1.5*inch])
    contact_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(contact_table)
    
    story.append(Spacer(1, 20))
    
    # Footer with branding
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.gray,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )
    story.append(Paragraph("Hidden Haven Realty | Luxury Real Estate Specialists", footer_style))
    if landing_page_url:
        story.append(Paragraph(f"View this property online: {landing_page_url}", footer_style))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_postcard_brochure(lead: dict, agent_info: dict, landing_page_url: Optional[str] = None) -> io.BytesIO:
    """
    Generate a postcard-style brochure (6x4).
    Returns PDF as BytesIO buffer.
    """
    from reportlab.lib.pagesizes import landscape
    
    # Postcard size: 6" x 4"
    POSTCARD = (6*inch, 4*inch)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=POSTCARD,
        rightMargin=0.3*inch,
        leftMargin=0.3*inch,
        topMargin=0.3*inch,
        bottomMargin=0.3*inch
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'Title',
        fontSize=14,
        textColor=NAVY,
        alignment=TA_CENTER,
        spaceAfter=5,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'Body',
        fontSize=9,
        textColor=NAVY,
        spaceAfter=3,
        fontName='Helvetica'
    )
    
    small_style = ParagraphStyle(
        'Small',
        fontSize=8,
        textColor=colors.gray,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )
    
    story = []
    
    # Compact header
    owner_name = lead.get('owner_name', 'Homeowner')
    address = lead.get('address', 'Your Property')
    
    story.append(Paragraph(f"Dear {owner_name},", body_style))
    story.append(Paragraph(f"<b>{address}</b>", title_style))
    story.append(Spacer(1, 5))
    
    # Quick stats
    stats = []
    if lead.get('bedrooms'):
        stats.append(f"{lead['bedrooms']} Beds")
    if lead.get('bathrooms'):
        stats.append(f"{lead['bathrooms']} Baths")
    if lead.get('sqft'):
        stats.append(f"{lead['sqft']:,} SF")
    if stats:
        story.append(Paragraph(" | ".join(stats), small_style))
    
    # Value
    if lead.get('estimated_value'):
        value_style = ParagraphStyle(
            'Value',
            fontSize=18,
            textColor=GOLD,
            alignment=TA_CENTER,
            spaceBefore=5,
            spaceAfter=5,
            fontName='Helvetica-Bold'
        )
        story.append(Paragraph(f"${lead['estimated_value']:,.0f}", value_style))
    
    story.append(Spacer(1, 5))
    
    # CTA
    story.append(Paragraph("Interested in knowing your home's true value?", body_style))
    story.append(Paragraph(f"Contact: {agent_info.get('phone', '')}", body_style))
    
    story.append(Spacer(1, 10))
    story.append(Paragraph("Hidden Haven Realty", small_style))
    
    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_trifold_brochure(lead: dict, agent_info: dict, landing_page_url: Optional[str] = None) -> io.BytesIO:
    """
    Generate a tri-fold brochure layout.
    For now, returns a multi-section single page that can be printed and folded.
    """
    # For tri-fold, we'll create a landscape letter page
    from reportlab.lib.pagesizes import landscape
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=0.25*inch,
        leftMargin=0.25*inch,
        topMargin=0.25*inch,
        bottomMargin=0.25*inch
    )
    
    styles = getSampleStyleSheet()
    
    # For tri-fold, create 3 panels side by side
    panel_width = (11*inch - 0.5*inch) / 3  # ~3.5" per panel
    
    title_style = ParagraphStyle(
        'Title',
        fontSize=12,
        textColor=NAVY,
        alignment=TA_CENTER,
        spaceAfter=5,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'Body',
        fontSize=9,
        textColor=NAVY,
        spaceAfter=3,
        fontName='Helvetica'
    )
    
    # Build panels
    story = []
    
    owner_name = lead.get('owner_name', 'Homeowner')
    address = lead.get('address', 'Your Property')
    city_state = f"{lead.get('city', '')}, {lead.get('state', 'FL')}"
    
    # Panel 1: Cover
    panel1 = f"""
    <b>EXCLUSIVE OPPORTUNITY</b><br/><br/>
    {address}<br/>
    {city_state}<br/><br/>
    <i>Prepared for:</i><br/>
    <b>{owner_name}</b>
    """
    
    # Panel 2: Property Details
    details = []
    if lead.get('property_type'):
        details.append(f"Type: {lead['property_type'].replace('_', ' ').title()}")
    if lead.get('bedrooms'):
        details.append(f"Bedrooms: {lead['bedrooms']}")
    if lead.get('bathrooms'):
        details.append(f"Bathrooms: {lead['bathrooms']}")
    if lead.get('sqft'):
        details.append(f"Sq Ft: {lead['sqft']:,}")
    if lead.get('year_built'):
        details.append(f"Year Built: {lead['year_built']}")
    
    panel2 = f"""
    <b>PROPERTY DETAILS</b><br/><br/>
    {'<br/>'.join(details)}
    """
    
    # Panel 3: Value & Contact
    value_text = f"${lead.get('estimated_value', 0):,.0f}" if lead.get('estimated_value') else "Contact for Valuation"
    panel3 = f"""
    <b>ESTIMATED VALUE</b><br/>
    <font size="16" color="#d4af37">{value_text}</font><br/><br/>
    <b>CONTACT</b><br/>
    {agent_info.get('name', '')}<br/>
    {agent_info.get('phone', '')}<br/>
    {agent_info.get('email', '')}
    """
    
    # Create table with 3 columns
    panel_data = [
        [Paragraph(panel1, body_style), Paragraph(panel2, body_style), Paragraph(panel3, body_style)]
    ]
    
    panel_table = Table(panel_data, colWidths=[panel_width, panel_width, panel_width])
    panel_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 20),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 20),
        ('LINEAFTER', (0, 0), (1, -1), 0.5, colors.gray),
    ]))
    
    story.append(panel_table)
    
    doc.build(story)
    buffer.seek(0)
    return buffer


async def generate_brochure(
    lead: dict, 
    agent_info: dict, 
    template: str = 'flyer',
    landing_page_url: Optional[str] = None
) -> tuple[io.BytesIO, str]:
    """
    Generate a brochure for a property lead.
    
    Args:
        lead: Property lead data
        agent_info: Agent information (name, phone, email, title, photo)
        template: 'flyer', 'postcard', or 'trifold'
        landing_page_url: Optional URL to include as QR code
    
    Returns:
        Tuple of (PDF buffer, filename)
    """
    generators = {
        'flyer': generate_single_page_brochure,
        'postcard': generate_postcard_brochure,
        'trifold': generate_trifold_brochure
    }
    
    generator = generators.get(template, generate_single_page_brochure)
    buffer = generator(lead, agent_info, landing_page_url)
    
    # Generate filename
    address_slug = lead.get('address', 'property').lower().replace(' ', '-')[:30]
    filename = f"brochure-{address_slug}-{template}.pdf"
    
    return buffer, filename
