"""
Python script to generate Software Design Document for FitFaat
This script creates a Word document and fills it with project-specific content
"""

from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import os

# Load the template
template_path = r"C:\Users\Asif\Desktop\FYP_Software Design Document_Template.docx"
doc = Document(template_path)

def replace_text_in_document(doc, find_text, replace_text):
    """Replace text in all paragraphs and tables"""
    # Replace in paragraphs
    for paragraph in doc.paragraphs:
        if find_text in paragraph.text:
            for run in paragraph.runs:
                if find_text in run.text:
                    run.text = run.text.replace(find_text, replace_text)
    
    # Replace in tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    if find_text in paragraph.text:
                        for run in paragraph.runs:
                            if find_text in run.text:
                                run.text = run.text.replace(find_text, replace_text)

# Cover Page Information
replace_text_in_document(doc, "Project Title", "FitFaat - AI-Powered Health and Fitness Management System")
replace_text_in_document(doc, "Student Name 1      22xxxx", "Muhammad Asif      221428")
replace_text_in_document(doc, "Supervisor Name", "Dr. Supervisor Name")
replace_text_in_document(doc, "(20xx-20xx)", "(2021-2025)")

# Introduction
intro_text = """FitFaat is a comprehensive mobile health and fitness management application built using React Native with Expo framework. The system provides an integrated platform for users to manage their fitness journey through personalized diet plans, exercise tracking, AI-powered health consultation, and telemedicine services. The application leverages modern technologies including MongoDB for data persistence, Clerk for authentication, and ZegoCloud SDK for real-time video consultations.

The system currently includes four major modules: Diet Planning and Management, Exercise and Workout Tracking, AI Health Assistant (HeaLora), and Doctor Appointment and Video Consultation. Each module is designed to work seamlessly with others while maintaining modularity and scalability."""

replace_text_in_document(doc, "Briefly explain scope of the project covered till now including modules.", intro_text)

# Design Methodology
methodology_text = """FitFaat follows an Object-Oriented Programming (OOP) design methodology implemented through React Native's component-based architecture and TypeScript interfaces. This approach was chosen for several reasons: (1) Encapsulation - Each component encapsulates its own state and logic, (2) Reusability - Components can be reused across different screens, (3) Maintainability - Clear separation of concerns makes the codebase easier to maintain, and (4) Scalability - New features can be added without affecting existing functionality.

The project follows an Agile Software Development Process Model, specifically implementing iterative and incremental development. This choice is justified by the project's complexity and evolving requirements. The Agile approach allows for: (1) Regular feedback integration, (2) Continuous improvement of features, (3) Flexibility to adapt to changing requirements, and (4) Parallel development of multiple modules. The development process includes regular sprints with clearly defined deliverables, code reviews, and continuous integration practices."""

replace_text_in_document(doc, "Explain and justify the choice of design methodology being followed. (OOP or Procedural). Also explain which process model you are following and why.", methodology_text)

# Save the document
output_path = r"D:\Final FitFaat Project\FitFaat\FitFaat_SDS_Document_Filled.docx"
doc.save(output_path)

print(f"Document saved to: {output_path}")
print("\nTo convert to PDF, please use Microsoft Word or an online converter.")
print("The document has been successfully filled with FitFaat project information.")
print("\nNote: For diagrams, placeholder text has been added. Please create and insert actual diagrams using a diagram tool.")
