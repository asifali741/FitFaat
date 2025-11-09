"""
Convert SDS Document text file to formatted PDF
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import os

class NumberedCanvas(canvas.Canvas):
    """Add page numbers to PDF"""
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        """Add page number to each page."""
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        """Draw page number at bottom of page"""
        self.setFont("Helvetica", 9)
        self.drawRightString(
            letter[0] - inch * 0.75,
            inch * 0.75,
            "Page %d of %d" % (self._pageNumber, page_count)
        )

def create_pdf():
    """Create formatted PDF from text content"""
    
    # Read the text file
    with open('SDS_Document_Content.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Create PDF document
    pdf_filename = "FitFaat_SDS_Document.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=HexColor('#1a1a2e'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading1_style = ParagraphStyle(
        'CustomHeading1',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=HexColor('#16213e'),
        spaceAfter=12,
        spaceBefore=12,
        fontName='Helvetica-Bold',
        alignment=TA_LEFT
    )
    
    heading2_style = ParagraphStyle(
        'CustomHeading2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=HexColor('#0f3460'),
        spaceAfter=10,
        spaceBefore=10,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        alignment=TA_JUSTIFY,
        spaceAfter=12,
        firstLineIndent=0,
        leftIndent=0,
        rightIndent=0,
        leading=14
    )
    
    code_style = ParagraphStyle(
        'Code',
        parent=styles['Code'],
        fontSize=9,
        fontName='Courier',
        textColor=HexColor('#333333'),
        backColor=HexColor('#f5f5f5'),
        leftIndent=20,
        rightIndent=20,
        spaceAfter=10,
        spaceBefore=10
    )
    
    # Title Page
    elements.append(Spacer(1, 2*inch))
    elements.append(Paragraph("FitFaat", title_style))
    elements.append(Paragraph("AI-Powered Health and Fitness Management System", heading2_style))
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("Software Design Document (SDS)", heading2_style))
    elements.append(Spacer(1, 1*inch))
    elements.append(Paragraph("Version 1.0", body_style))
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("Muhammad Asif (221428)", body_style))
    elements.append(Spacer(1, 2*inch))
    elements.append(Paragraph("Bachelor of Science in Software Engineering", body_style))
    elements.append(Paragraph("Air University, Islamabad", body_style))
    elements.append(Paragraph("2021-2025", body_style))
    elements.append(PageBreak())
    
    # Table of Contents
    elements.append(Paragraph("Table of Contents", heading1_style))
    elements.append(Spacer(1, 0.3*inch))
    
    toc_data = [
        ["1.", "Introduction", "3"],
        ["2.", "Design Methodology and Software Process Model", "4"],
        ["3.", "System Overview", "5"],
        ["", "3.1 Architectural Design", "6"],
        ["4.", "Design Models", "8"],
        ["5.", "Data Design", "12"],
        ["", "5.1 Data Dictionary", "14"],
        ["6.", "Human Interface Design", "16"],
        ["", "6.1 Screen Images", "17"],
        ["", "6.2 Screen Objects and Actions", "18"],
        ["7.", "Implementation", "20"],
        ["", "7.1 Algorithms", "20"],
        ["", "7.2 External APIs/SDKs", "23"],
        ["", "7.3 User Interface", "24"],
        ["", "7.4 Deployment", "25"],
        ["8.", "Testing and Evaluation", "26"],
        ["", "8.1 Unit Testing", "26"],
        ["", "8.2 Functional Testing", "27"],
        ["", "8.3 Business Rules Testing", "28"],
        ["", "8.4 Integration Testing", "29"],
    ]
    
    toc_table = Table(toc_data, colWidths=[0.5*inch, 4.5*inch, 0.5*inch])
    toc_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
    ]))
    elements.append(toc_table)
    elements.append(PageBreak())
    
    # Process content sections
    sections = content.split('===============================================================================')
    
    for section in sections:
        if not section.strip():
            continue
            
        lines = section.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            
            if not line:
                continue
            
            # Check for main headings
            if line.startswith('1. INTRODUCTION') or \
               line.startswith('2. DESIGN METHODOLOGY') or \
               line.startswith('3. SYSTEM OVERVIEW') or \
               line.startswith('4. DESIGN MODELS') or \
               line.startswith('5. DATA DESIGN') or \
               line.startswith('6. HUMAN INTERFACE') or \
               line.startswith('7. IMPLEMENTATION') or \
               line.startswith('8. TESTING'):
                elements.append(PageBreak())
                elements.append(Paragraph(line, heading1_style))
                elements.append(Spacer(1, 0.2*inch))
            
            # Check for subheadings
            elif line.startswith('3.1 ') or line.startswith('4.1 ') or \
                 line.startswith('5.1 ') or line.startswith('6.1 ') or \
                 line.startswith('7.1 ') or line.startswith('8.1 ') or \
                 any(line.startswith(f'{i}.{j} ') for i in range(1, 9) for j in range(1, 5)):
                elements.append(Paragraph(line, heading2_style))
                elements.append(Spacer(1, 0.1*inch))
            
            # Check for diagram placeholders
            elif '[DIAGRAM PLACEHOLDER' in line:
                elements.append(Spacer(1, 0.2*inch))
                # Create a box for diagram placeholder
                placeholder_text = line.replace('[DIAGRAM PLACEHOLDER:', '').replace(']', '')
                elements.append(Paragraph(f"<b>[Diagram Required: {placeholder_text}]</b>", 
                                        ParagraphStyle('Placeholder',
                                                     parent=body_style,
                                                     textColor=HexColor('#e74c3c'),
                                                     alignment=TA_CENTER,
                                                     fontSize=10,
                                                     borderWidth=1,
                                                     borderColor=HexColor('#e74c3c'),
                                                     borderPadding=10)))
                elements.append(Spacer(1, 0.2*inch))
            
            # Check for code/algorithm sections
            elif line.startswith('Algorithm:') or line.startswith('Input:') or \
                 line.startswith('Output:') or line.startswith('Complexity:'):
                elements.append(Paragraph(line, code_style))
            
            # Check for numbered lists
            elif line and line[0].isdigit() and '. ' in line[:4]:
                elements.append(Paragraph(line, body_style))
            
            # Check for bullet points
            elif line.startswith('- '):
                bullet_text = "• " + line[2:]
                elements.append(Paragraph(bullet_text, 
                                        ParagraphStyle('Bullet',
                                                     parent=body_style,
                                                     leftIndent=20)))
            
            # Table detection (simple)
            elif '|' in line and line.count('|') > 2:
                # Skip table formatting for now, just add as text
                elements.append(Paragraph(line, code_style))
            
            # Regular body text
            elif line and not line.startswith('COVER PAGE:') and \
                 not line.startswith('===============') and \
                 not line.startswith('INSTRUCTIONS') and \
                 not line.startswith('END OF DOCUMENT'):
                # Clean up the text
                clean_text = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                elements.append(Paragraph(clean_text, body_style))
    
    # Build PDF with custom canvas for page numbers
    doc.build(elements, canvasmaker=NumberedCanvas)
    
    print(f"✅ PDF created successfully: {pdf_filename}")
    print(f"📄 File location: {os.path.abspath(pdf_filename)}")
    return pdf_filename

if __name__ == "__main__":
    try:
        pdf_file = create_pdf()
        print("\n📋 The PDF document has been generated with:")
        print("   • Formatted headings and subheadings")
        print("   • Table of contents")
        print("   • Page numbering")
        print("   • Justified text paragraphs")
        print("   • Placeholder markers for diagrams")
        print("\n💡 Next steps:")
        print("   1. Review the generated PDF")
        print("   2. Add actual diagrams where placeholders are shown")
        print("   3. Submit the final document")
    except Exception as e:
        print(f"❌ Error creating PDF: {e}")
        print("\n🔧 Alternative: Install required library with:")
        print("   pip install reportlab")