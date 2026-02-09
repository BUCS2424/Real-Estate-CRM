"""
Brochure Generator Service
Generates beautifully designed property brochures in PDF format (8.5x11)
"""
import os
import io
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, Flowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics import renderPDF


# Brand colors - Luxury Real Estate Theme
NAVY = colors.HexColor('#0a1628')
DARK_NAVY = colors.HexColor('#050d18')
GOLD = colors.HexColor('#d4af37')
LIGHT_GOLD = colors.HexColor('#f5e6b8')
AMBER = colors.HexColor('#fbbf24')
WHITE = colors.white
CREAM = colors.HexColor('#fdf8f0')
LIGHT_GRAY = colors.HexColor('#f8f9fa')
MEDIUM_GRAY = colors.HexColor('#6b7280')
DARK_GRAY = colors.HexColor('#374151')


def calculate_lead_score(lead: dict) -> dict:
    """Calculate a lead score based on available information."""
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
        'new': 2, 'contacted': 4, 'qualified': 8,
        'nurturing': 6, 'converted': 10, 'not_interested': 0
    }
    breakdown['status'] = status_scores.get(lead.get('status', 'new'), 0)
    score += breakdown['status']
    
    if score >= 80:
        rating, rating_color = 'Excellent', 'green'
    elif score >= 60:
        rating, rating_color = 'Good', 'blue'
    elif score >= 40:
        rating, rating_color = 'Fair', 'yellow'
    else:
        rating, rating_color = 'Needs Data', 'red'
    
    return {
        'score': min(score, 100), 'rating': rating,
        'rating_color': rating_color, 'breakdown': breakdown, 'max_score': 100
    }


def generate_qr_code(url: str) -> io.BytesIO:
    """Generate QR code for a URL"""
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=8, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0a1628", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


class GradientBackground(Flowable):
    """Custom flowable for gradient background header"""
    def __init__(self, width, height, color1, color2):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.color1 = color1
        self.color2 = color2
    
    def draw(self):
        # Draw gradient effect using multiple rectangles
        steps = 50
        for i in range(steps):
            ratio = i / steps
            r = self.color1.red + (self.color2.red - self.color1.red) * ratio
            g = self.color1.green + (self.color2.green - self.color1.green) * ratio
            b = self.color1.blue + (self.color2.blue - self.color1.blue) * ratio
            self.canv.setFillColor(colors.Color(r, g, b))
            y = self.height - (i * self.height / steps)
            self.canv.rect(0, y - self.height/steps, self.width, self.height/steps + 1, fill=1, stroke=0)


def draw_luxury_background(canvas, doc):
    """Draw the luxury background on each page"""
    width, height = letter
    
    # Navy gradient header (top 2.5 inches)
    header_height = 2.5 * inch
    steps = 30
    for i in range(steps):
        ratio = i / steps
        r = 0.039 + (0.020 - 0.039) * ratio  # From #0a1628 to #050d18
        g = 0.086 + (0.051 - 0.086) * ratio
        b = 0.157 + (0.094 - 0.157) * ratio
        canvas.setFillColor(colors.Color(r, g, b))
        y = height - (i * header_height / steps)
        canvas.rect(0, y - header_height/steps, width, header_height/steps + 1, fill=1, stroke=0)
    
    # Gold accent line under header
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(3)
    canvas.line(0, height - header_height, width, height - header_height)
    
    # Subtle gold corner accents
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(2)
    
    # Top left corner
    canvas.line(0, height - 0.3*inch, 0.5*inch, height - 0.3*inch)
    canvas.line(0.3*inch, height, 0.3*inch, height - 0.5*inch)
    
    # Top right corner  
    canvas.line(width, height - 0.3*inch, width - 0.5*inch, height - 0.3*inch)
    canvas.line(width - 0.3*inch, height, width - 0.3*inch, height - 0.5*inch)
    
    # Bottom decorative gold line
    canvas.setStrokeColor(LIGHT_GOLD)
    canvas.setLineWidth(1)
    canvas.line(0.5*inch, 0.7*inch, width - 0.5*inch, 0.7*inch)
    
    # Footer background
    canvas.setFillColor(colors.Color(0.039, 0.086, 0.157, 0.05))  # Very light navy
    canvas.rect(0, 0, width, 0.8*inch, fill=1, stroke=0)


def generate_single_page_brochure(lead: dict, agent_info: dict, landing_page_url: Optional[str] = None) -> io.BytesIO:
    """Generate a beautifully designed single-page flyer (8.5x11) brochure."""
    buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.6*inch,
        leftMargin=0.6*inch,
        topMargin=2.7*inch,  # Leave room for header background
        bottomMargin=1*inch
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    header_title_style = ParagraphStyle(
        'HeaderTitle',
        fontSize=32,
        textColor=WHITE,
        alignment=TA_CENTER,
        spaceAfter=5,
        fontName='Helvetica-Bold',
        leading=38
    )
    
    header_subtitle_style = ParagraphStyle(
        'HeaderSubtitle',
        fontSize=14,
        textColor=LIGHT_GOLD,
        alignment=TA_CENTER,
        spaceAfter=5,
        fontName='Helvetica-Oblique'
    )
    
    greeting_style = ParagraphStyle(
        'Greeting',
        fontSize=16,
        textColor=NAVY,
        alignment=TA_LEFT,
        spaceBefore=15,
        spaceAfter=15,
        fontName='Helvetica-Bold'
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        fontSize=14,
        textColor=GOLD,
        alignment=TA_LEFT,
        spaceBefore=20,
        spaceAfter=10,
        fontName='Helvetica-Bold',
        borderWidth=0,
        borderPadding=0,
        leading=18
    )
    
    body_style = ParagraphStyle(
        'Body',
        fontSize=11,
        textColor=DARK_GRAY,
        spaceAfter=8,
        fontName='Helvetica',
        leading=16
    )
    
    value_style = ParagraphStyle(
        'Value',
        fontSize=36,
        textColor=NAVY,
        alignment=TA_CENTER,
        spaceBefore=10,
        spaceAfter=5,
        fontName='Helvetica-Bold'
    )
    
    value_label_style = ParagraphStyle(
        'ValueLabel',
        fontSize=12,
        textColor=MEDIUM_GRAY,
        alignment=TA_CENTER,
        spaceAfter=15,
        fontName='Helvetica'
    )
    
    footer_style = ParagraphStyle(
        'Footer',
        fontSize=9,
        textColor=MEDIUM_GRAY,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )
    
    # Build content
    story = []
    
    owner_name = lead.get('owner_name', 'Homeowner')
    address = lead.get('address', 'Your Property')
    city = lead.get('city', '')
    state = lead.get('state', 'FL')
    zip_code = lead.get('zip_code', '')
    city_state = f"{city}, {state} {zip_code}".strip(', ')
    
    # Personalized greeting
    story.append(Paragraph(f"Dear {owner_name},", greeting_style))
    
    # Intro paragraph
    intro_text = f"""
    We've been closely monitoring the real estate market in <b>{city or 'your area'}</b> 
    and noticed that your property presents an exceptional opportunity. Our team at 
    <b>Hidden Haven Realty</b> specializes in maximizing property values for homeowners 
    like yourself. Here's what we've discovered about your property:
    """
    story.append(Paragraph(intro_text.strip(), body_style))
    
    # Property Highlights Section
    story.append(Paragraph("✦ PROPERTY HIGHLIGHTS", section_title_style))
    
    # Build property details table with styling
    prop_data = []
    if lead.get('property_type'):
        prop_data.append(['Property Type', lead['property_type'].replace('_', ' ').title()])
    if lead.get('bedrooms') and lead.get('bathrooms'):
        prop_data.append(['Bedrooms / Bathrooms', f"{lead['bedrooms']} Beds  •  {lead['bathrooms']} Baths"])
    elif lead.get('bedrooms'):
        prop_data.append(['Bedrooms', f"{lead['bedrooms']} Beds"])
    if lead.get('sqft'):
        prop_data.append(['Living Space', f"{lead['sqft']:,} Square Feet"])
    if lead.get('year_built'):
        prop_data.append(['Year Built', str(lead['year_built'])])
    if lead.get('lot_size'):
        prop_data.append(['Lot Size', f"{lead['lot_size']} Acres"])
    if lead.get('parcel_id'):
        prop_data.append(['Parcel ID', lead['parcel_id']])
    
    if prop_data:
        prop_table = Table(prop_data, colWidths=[2.2*inch, 4.5*inch])
        prop_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f4f8')),
            ('TEXTCOLOR', (0, 0), (0, -1), NAVY),
            ('TEXTCOLOR', (1, 0), (1, -1), DARK_GRAY),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LINEBELOW', (0, 0), (-1, -2), 1, colors.HexColor('#e5e7eb')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(prop_table)
    
    # Estimated Value Section
    if lead.get('estimated_value'):
        story.append(Paragraph("✦ ESTIMATED MARKET VALUE", section_title_style))
        
        # Value display box
        value_text = f"${lead['estimated_value']:,.0f}"
        story.append(Paragraph(value_text, value_style))
        
        if lead.get('sqft') and lead.get('estimated_value'):
            price_per_sqft = lead['estimated_value'] / lead['sqft']
            story.append(Paragraph(f"${price_per_sqft:,.0f} per square foot", value_label_style))
        
        # Tax value comparison if available
        if lead.get('tax_assessed_value'):
            tax_text = f"County Tax Assessment: ${lead['tax_assessed_value']:,.0f}"
            story.append(Paragraph(tax_text, value_label_style))
    
    # Call to Action
    story.append(Paragraph("✦ LET'S CONNECT", section_title_style))
    
    cta_text = """
    I would be honored to provide you with a complimentary, no-obligation market analysis 
    of your property. Whether you're considering selling now or simply want to understand 
    your options, I'm here to help you make informed decisions about your most valuable asset.
    """
    story.append(Paragraph(cta_text.strip(), body_style))
    
    story.append(Spacer(1, 20))
    
    # Agent Contact Section with QR Code
    agent_name = agent_info.get('name', 'Your Real Estate Professional')
    agent_phone = agent_info.get('phone', '')
    agent_email = agent_info.get('email', '')
    agent_title = agent_info.get('title', 'Luxury Real Estate Specialist')
    
    agent_text = f"""
    <b>{agent_name}</b><br/>
    <font color="#d4af37">{agent_title}</font><br/><br/>
    📞  {agent_phone}<br/>
    ✉️  {agent_email}
    """
    
    agent_para = Paragraph(agent_text, body_style)
    
    # QR Code
    if landing_page_url:
        try:
            qr_buffer = generate_qr_code(landing_page_url)
            qr_image = Image(qr_buffer, width=1.1*inch, height=1.1*inch)
            qr_label = Paragraph("<font size='8'>Scan for more info</font>", 
                               ParagraphStyle('QRLabel', fontSize=8, textColor=MEDIUM_GRAY, alignment=TA_CENTER))
            qr_cell = Table([[qr_image], [qr_label]], colWidths=[1.3*inch])
            qr_cell.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
        except:
            qr_cell = Paragraph("", body_style)
    else:
        qr_cell = Paragraph("", body_style)
    
    # Contact table
    contact_table = Table([[agent_para, qr_cell]], colWidths=[5*inch, 1.5*inch])
    contact_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#faf9f7')),
        ('PADDING', (0, 0), (-1, -1), 15),
        ('ROUNDEDCORNERS', [5, 5, 5, 5]),
    ]))
    story.append(contact_table)
    
    story.append(Spacer(1, 25))
    
    # Footer
    story.append(Paragraph("HIDDEN HAVEN REALTY  •  Luxury Real Estate Specialists", footer_style))
    if landing_page_url:
        story.append(Paragraph(f"View online: {landing_page_url}", footer_style))
    
    # Build PDF with custom background
    doc.build(story, onFirstPage=draw_luxury_header, onLaterPages=draw_luxury_header)
    buffer.seek(0)
    return buffer


def draw_luxury_header(canvas, doc):
    """Draw luxury header with property address"""
    width, height = letter
    
    # Draw background
    draw_luxury_background(canvas, doc)
    
    # Get lead data from doc (we'll pass it via a workaround)
    # For now, draw placeholder header content
    canvas.saveState()
    
    # Header text area (centered in the navy section)
    header_center_y = height - 1.25*inch
    
    # "EXCLUSIVE PROPERTY OPPORTUNITY" tagline
    canvas.setFont('Helvetica', 10)
    canvas.setFillColor(LIGHT_GOLD)
    canvas.drawCentredString(width/2, height - 0.6*inch, "EXCLUSIVE PROPERTY OPPORTUNITY")
    
    # Gold decorative line
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1)
    line_width = 1.5*inch
    canvas.line(width/2 - line_width/2, height - 0.75*inch, width/2 + line_width/2, height - 0.75*inch)
    
    canvas.restoreState()


def generate_single_page_brochure_with_address(lead: dict, agent_info: dict, landing_page_url: Optional[str] = None) -> io.BytesIO:
    """Generate brochure with proper address in header"""
    buffer = io.BytesIO()
    
    # Create canvas first to draw custom header
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Draw background
    draw_luxury_background(c, None)
    
    # Header content
    address = lead.get('address', 'Your Property')
    city = lead.get('city', '')
    state = lead.get('state', 'FL')
    city_state = f"{city}, {state}" if city else state
    
    # "EXCLUSIVE PROPERTY OPPORTUNITY" tagline
    c.setFont('Helvetica', 10)
    c.setFillColor(LIGHT_GOLD)
    c.drawCentredString(width/2, height - 0.55*inch, "EXCLUSIVE PROPERTY OPPORTUNITY")
    
    # Gold decorative line
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    line_width = 1.8*inch
    c.line(width/2 - line_width/2, height - 0.7*inch, width/2 + line_width/2, height - 0.7*inch)
    
    # Property Address (large)
    c.setFont('Helvetica-Bold', 28)
    c.setFillColor(WHITE)
    c.drawCentredString(width/2, height - 1.2*inch, address.upper())
    
    # City, State
    c.setFont('Helvetica-Oblique', 14)
    c.setFillColor(LIGHT_GOLD)
    c.drawCentredString(width/2, height - 1.55*inch, city_state)
    
    # Gold accent under address
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.line(width/2 - 1*inch, height - 1.75*inch, width/2 + 1*inch, height - 1.75*inch)
    
    # Now draw the body content
    # Greeting
    owner_name = lead.get('owner_name', 'Homeowner')
    y_pos = height - 2.9*inch
    
    c.setFont('Helvetica-Bold', 16)
    c.setFillColor(NAVY)
    c.drawString(0.6*inch, y_pos, f"Dear {owner_name},")
    
    # Intro paragraph
    y_pos -= 0.35*inch
    c.setFont('Helvetica', 11)
    c.setFillColor(DARK_GRAY)
    
    intro_lines = [
        f"We've been closely monitoring the real estate market in {city or 'your area'} and noticed",
        "that your property presents an exceptional opportunity. Our team at Hidden Haven Realty",
        "specializes in maximizing property values for homeowners like yourself."
    ]
    for line in intro_lines:
        c.drawString(0.6*inch, y_pos, line)
        y_pos -= 0.2*inch
    
    # Property Highlights Section
    y_pos -= 0.3*inch
    c.setFont('Helvetica-Bold', 13)
    c.setFillColor(GOLD)
    c.drawString(0.6*inch, y_pos, "✦ PROPERTY HIGHLIGHTS")
    
    y_pos -= 0.35*inch
    c.setFont('Helvetica', 11)
    
    # Property details
    details = []
    if lead.get('property_type'):
        details.append(('Property Type:', lead['property_type'].replace('_', ' ').title()))
    if lead.get('bedrooms') and lead.get('bathrooms'):
        details.append(('Beds / Baths:', f"{lead['bedrooms']} Beds  •  {lead['bathrooms']} Baths"))
    if lead.get('sqft'):
        details.append(('Living Space:', f"{lead['sqft']:,} Sq Ft"))
    if lead.get('year_built'):
        details.append(('Year Built:', str(lead['year_built'])))
    if lead.get('lot_size'):
        details.append(('Lot Size:', f"{lead['lot_size']} Acres"))
    
    for label, value in details:
        c.setFillColor(NAVY)
        c.setFont('Helvetica-Bold', 10)
        c.drawRightString(2.5*inch, y_pos, label)
        c.setFillColor(DARK_GRAY)
        c.setFont('Helvetica', 11)
        c.drawString(2.7*inch, y_pos, value)
        y_pos -= 0.25*inch
    
    # Estimated Value
    if lead.get('estimated_value'):
        y_pos -= 0.3*inch
        c.setFont('Helvetica-Bold', 13)
        c.setFillColor(GOLD)
        c.drawString(0.6*inch, y_pos, "✦ ESTIMATED MARKET VALUE")
        
        y_pos -= 0.5*inch
        c.setFont('Helvetica-Bold', 36)
        c.setFillColor(NAVY)
        value_text = f"${lead['estimated_value']:,.0f}"
        c.drawCentredString(width/2, y_pos, value_text)
        
        y_pos -= 0.3*inch
        if lead.get('sqft'):
            c.setFont('Helvetica', 11)
            c.setFillColor(MEDIUM_GRAY)
            price_per_sqft = lead['estimated_value'] / lead['sqft']
            c.drawCentredString(width/2, y_pos, f"${price_per_sqft:,.0f} per square foot")
    
    # Call to Action
    y_pos -= 0.5*inch
    c.setFont('Helvetica-Bold', 13)
    c.setFillColor(GOLD)
    c.drawString(0.6*inch, y_pos, "✦ LET'S CONNECT")
    
    y_pos -= 0.35*inch
    c.setFont('Helvetica', 11)
    c.setFillColor(DARK_GRAY)
    cta_lines = [
        "I would be honored to provide you with a complimentary, no-obligation market",
        "analysis of your property. Whether you're considering selling now or simply want",
        "to understand your options, I'm here to help you make informed decisions."
    ]
    for line in cta_lines:
        c.drawString(0.6*inch, y_pos, line)
        y_pos -= 0.2*inch
    
    # Agent Contact Box
    y_pos -= 0.4*inch
    box_height = 1.2*inch
    
    # Draw contact box background
    c.setFillColor(colors.HexColor('#faf9f7'))
    c.roundRect(0.6*inch, y_pos - box_height + 0.2*inch, width - 1.2*inch, box_height, 5, fill=1, stroke=0)
    
    # Agent info
    agent_name = agent_info.get('name', 'Your Real Estate Professional')
    agent_phone = agent_info.get('phone', '')
    agent_email = agent_info.get('email', '')
    agent_title = agent_info.get('title', 'Luxury Real Estate Specialist')
    
    text_y = y_pos - 0.1*inch
    c.setFont('Helvetica-Bold', 12)
    c.setFillColor(NAVY)
    c.drawString(0.8*inch, text_y, agent_name)
    
    text_y -= 0.2*inch
    c.setFont('Helvetica', 10)
    c.setFillColor(GOLD)
    c.drawString(0.8*inch, text_y, agent_title)
    
    text_y -= 0.3*inch
    c.setFont('Helvetica', 10)
    c.setFillColor(DARK_GRAY)
    c.drawString(0.8*inch, text_y, f"📞  {agent_phone}")
    text_y -= 0.2*inch
    c.drawString(0.8*inch, text_y, f"✉️  {agent_email}")
    
    # QR Code
    if landing_page_url:
        try:
            qr_buffer = generate_qr_code(landing_page_url)
            from reportlab.lib.utils import ImageReader
            qr_img = ImageReader(qr_buffer)
            qr_size = 0.9*inch
            c.drawImage(qr_img, width - 1.5*inch - qr_size, y_pos - box_height + 0.35*inch, 
                       width=qr_size, height=qr_size)
            c.setFont('Helvetica', 7)
            c.setFillColor(MEDIUM_GRAY)
            c.drawCentredString(width - 1.5*inch - qr_size/2, y_pos - box_height + 0.2*inch, "Scan for more info")
        except Exception as e:
            print(f"QR Code error: {e}")
    
    # Footer
    c.setFont('Helvetica', 9)
    c.setFillColor(MEDIUM_GRAY)
    c.drawCentredString(width/2, 0.5*inch, "HIDDEN HAVEN REALTY  •  Luxury Real Estate Specialists")
    if landing_page_url:
        c.setFont('Helvetica', 8)
        c.drawCentredString(width/2, 0.35*inch, f"View online: {landing_page_url}")
    
    c.save()
    buffer.seek(0)
    return buffer


def generate_postcard_brochure(lead: dict, agent_info: dict, landing_page_url: Optional[str] = None) -> io.BytesIO:
    """Generate a postcard-style brochure (6x4)."""
    from reportlab.lib.pagesizes import landscape
    POSTCARD = (6*inch, 4*inch)
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=POSTCARD)
    width, height = POSTCARD
    
    # Navy header
    c.setFillColor(NAVY)
    c.rect(0, height - 1*inch, width, 1*inch, fill=1, stroke=0)
    
    # Gold line
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.line(0, height - 1*inch, width, height - 1*inch)
    
    # Address
    address = lead.get('address', 'Property')
    c.setFont('Helvetica-Bold', 14)
    c.setFillColor(WHITE)
    c.drawCentredString(width/2, height - 0.6*inch, address)
    
    # Owner
    owner_name = lead.get('owner_name', 'Homeowner')
    c.setFont('Helvetica', 9)
    c.setFillColor(DARK_GRAY)
    c.drawString(0.3*inch, height - 1.3*inch, f"Dear {owner_name},")
    
    # Stats
    y = height - 1.6*inch
    c.setFont('Helvetica', 8)
    stats = []
    if lead.get('bedrooms'): stats.append(f"{lead['bedrooms']} Beds")
    if lead.get('bathrooms'): stats.append(f"{lead['bathrooms']} Baths")
    if lead.get('sqft'): stats.append(f"{lead['sqft']:,} SF")
    if stats:
        c.drawString(0.3*inch, y, " | ".join(stats))
    
    # Value
    if lead.get('estimated_value'):
        c.setFont('Helvetica-Bold', 20)
        c.setFillColor(GOLD)
        c.drawCentredString(width/2, height - 2.2*inch, f"${lead['estimated_value']:,.0f}")
    
    # Contact
    c.setFont('Helvetica', 8)
    c.setFillColor(DARK_GRAY)
    c.drawString(0.3*inch, 0.5*inch, f"Contact: {agent_info.get('phone', '')}")
    c.drawRightString(width - 0.3*inch, 0.5*inch, "Hidden Haven Realty")
    
    c.save()
    buffer.seek(0)
    return buffer


def generate_trifold_brochure(lead: dict, agent_info: dict, landing_page_url: Optional[str] = None) -> io.BytesIO:
    """Generate a tri-fold brochure layout."""
    from reportlab.lib.pagesizes import landscape
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(letter))
    width, height = landscape(letter)
    
    panel_width = width / 3
    
    # Panel divider lines
    c.setStrokeColor(colors.HexColor('#e5e7eb'))
    c.setLineWidth(0.5)
    c.line(panel_width, 0, panel_width, height)
    c.line(panel_width * 2, 0, panel_width * 2, height)
    
    # Panel 1: Cover
    # Navy background
    c.setFillColor(NAVY)
    c.rect(0, height - 2*inch, panel_width, 2*inch, fill=1, stroke=0)
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.line(0, height - 2*inch, panel_width, height - 2*inch)
    
    c.setFont('Helvetica-Bold', 10)
    c.setFillColor(LIGHT_GOLD)
    c.drawCentredString(panel_width/2, height - 0.5*inch, "EXCLUSIVE OPPORTUNITY")
    
    address = lead.get('address', 'Property')
    c.setFont('Helvetica-Bold', 14)
    c.setFillColor(WHITE)
    c.drawCentredString(panel_width/2, height - 1*inch, address[:25])
    
    city_state = f"{lead.get('city', '')}, {lead.get('state', 'FL')}"
    c.setFont('Helvetica', 10)
    c.setFillColor(LIGHT_GOLD)
    c.drawCentredString(panel_width/2, height - 1.3*inch, city_state)
    
    owner = lead.get('owner_name', 'Homeowner')
    c.setFont('Helvetica', 9)
    c.setFillColor(DARK_GRAY)
    c.drawCentredString(panel_width/2, height - 2.5*inch, f"Prepared for: {owner}")
    
    # Panel 2: Details
    c.setFont('Helvetica-Bold', 12)
    c.setFillColor(GOLD)
    c.drawString(panel_width + 0.3*inch, height - 0.5*inch, "PROPERTY DETAILS")
    
    y = height - 0.9*inch
    c.setFont('Helvetica', 10)
    c.setFillColor(DARK_GRAY)
    
    if lead.get('property_type'):
        c.drawString(panel_width + 0.3*inch, y, f"Type: {lead['property_type'].replace('_', ' ').title()}")
        y -= 0.25*inch
    if lead.get('bedrooms'):
        c.drawString(panel_width + 0.3*inch, y, f"Bedrooms: {lead['bedrooms']}")
        y -= 0.25*inch
    if lead.get('bathrooms'):
        c.drawString(panel_width + 0.3*inch, y, f"Bathrooms: {lead['bathrooms']}")
        y -= 0.25*inch
    if lead.get('sqft'):
        c.drawString(panel_width + 0.3*inch, y, f"Square Feet: {lead['sqft']:,}")
        y -= 0.25*inch
    if lead.get('year_built'):
        c.drawString(panel_width + 0.3*inch, y, f"Year Built: {lead['year_built']}")
    
    # Panel 3: Value & Contact
    c.setFont('Helvetica-Bold', 12)
    c.setFillColor(GOLD)
    c.drawString(panel_width * 2 + 0.3*inch, height - 0.5*inch, "ESTIMATED VALUE")
    
    if lead.get('estimated_value'):
        c.setFont('Helvetica-Bold', 24)
        c.setFillColor(NAVY)
        c.drawCentredString(panel_width * 2.5, height - 1.2*inch, f"${lead['estimated_value']:,.0f}")
    
    c.setFont('Helvetica-Bold', 10)
    c.setFillColor(GOLD)
    c.drawString(panel_width * 2 + 0.3*inch, height - 2*inch, "CONTACT")
    
    c.setFont('Helvetica', 9)
    c.setFillColor(DARK_GRAY)
    c.drawString(panel_width * 2 + 0.3*inch, height - 2.3*inch, agent_info.get('name', ''))
    c.drawString(panel_width * 2 + 0.3*inch, height - 2.5*inch, agent_info.get('phone', ''))
    c.drawString(panel_width * 2 + 0.3*inch, height - 2.7*inch, agent_info.get('email', ''))
    
    c.save()
    buffer.seek(0)
    return buffer


async def generate_brochure(
    lead: dict, 
    agent_info: dict, 
    template: str = 'flyer',
    landing_page_url: Optional[str] = None
) -> tuple[io.BytesIO, str]:
    """Generate a brochure for a property lead."""
    generators = {
        'flyer': generate_single_page_brochure_with_address,
        'postcard': generate_postcard_brochure,
        'trifold': generate_trifold_brochure
    }
    
    generator = generators.get(template, generate_single_page_brochure_with_address)
    buffer = generator(lead, agent_info, landing_page_url)
    
    address_slug = lead.get('address', 'property').lower().replace(' ', '-')[:30]
    filename = f"brochure-{address_slug}-{template}.pdf"
    
    return buffer, filename
