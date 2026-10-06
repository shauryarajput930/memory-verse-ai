"""
Module 2 — Intelligent Categorization

Takes raw_text from a document and uses Groq (Llama 3.3 70B) to produce structured metadata:
category, title, issuer, event_date, skills_mentioned, summary.
Then generates an embedding and updates the Supabase row.
"""

from services.llm import call_llm_json
from services.embeddings import get_embedding
from config import supabase

SYSTEM_PROMPT = (
    "You are a document classification engine for a student's digital portfolio (User: Shaurya Rajput). "
    "Read the text/filename context provided and extract structured metadata. "
    "IMPORTANT: OCR might misspell the user's name due to stylized certificate fonts (e.g. 'Shaurya Raj' or 'S Rajput' instead of 'Shaurya Rajput'). Always correct any obvious OCR typos in your output (especially the user's name). "
    "If the extracted text is minimal, empty, or from an image certificate, infer the title, category, and a professional 1-2 sentence summary from the filename and available keywords. "
    "NEVER state in the summary that OCR is missing, text could not be extracted, or details are unavailable. Always provide a clean, professional summary representing the document/certificate for Shaurya Rajput. "
    "Only output valid JSON matching the schema below. Do not include any other text.\n\n"
    "Schema:\n"
    "{\n"
    '  "category": one of ["Projects", "Skills", "Certifications", "Internships", "Achievements", "Academics"],\n'
    '  "title": short descriptive title,\n'
    '  "issuer": organization/institution name if present, else null,\n'
    '  "event_date": date in YYYY-MM-DD format if determinable, else null,\n'
    '  "skills_mentioned": list of skill/technology keywords found in the text,\n'
    '  "summary": 1-2 sentence plain-English summary of what this document represents\n'
    "}"
)


def categorize_document(doc_id: str, raw_text: str) -> dict:
    """
    Categorize a document using Groq and update the Supabase row.
    Returns the structured metadata dict.
    """
    # 1. Call Groq for classification
    metadata = call_llm_json(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=f"Classify this document:\n\n{raw_text[:4000]}",
    )

    # Fallback to prevent silent "Untitled/null" docs in UI on LLM failure
    if not metadata:
        metadata = {}

    # Category Normalization
    raw_cat = str(metadata.get("category", "")).lower().strip()
    
    ALLOWED_CATEGORIES = {
        "projects": "Projects",
        "skills": "Skills",
        "certifications": "Certifications",
        "internships": "Internships",
        "achievements": "Achievements",
        "academics": "Academics"
    }
    
    # Simple mapping for common variations
    mapping = {
        "project": "Projects",
        "skill": "Skills",
        "cert": "Certifications",
        "certification": "Certifications",
        "internship": "Internships",
        "achievement": "Achievements",
        "academic": "Academics",
        "course": "Academics",
        "award": "Achievements"
    }
    
    if raw_cat in ALLOWED_CATEGORIES:
        final_cat = ALLOWED_CATEGORIES[raw_cat]
    elif raw_cat in mapping:
        final_cat = mapping[raw_cat]
    else:
        # FAILED flag for frontend retry banner
        final_cat = "FAILED"
    
    metadata["title"] = metadata.get("title") or "Untitled Document"
    metadata["category"] = final_cat
    metadata["summary"] = metadata.get("summary") or "AI processing failed or no clear information found."
    metadata["skills_mentioned"] = metadata.get("skills_mentioned") or []

    # 2. Generate embedding from summary + skills
    skills_str = ", ".join(metadata.get("skills_mentioned", []))
    embed_text = f"{metadata.get('summary', '')} Skills: {skills_str}"
    embedding = get_embedding(embed_text)

    import re
    
    event_date = metadata.get("event_date")
    if event_date and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(event_date)):
        event_date = None

    # 3. Update Supabase row
    update_data = {
        "category": metadata.get("category"),
        "title": metadata.get("title"),
        "issuer": metadata.get("issuer"),
        "event_date": event_date,
        "summary": metadata.get("summary"),
        "embedding": embedding,
    }

    supabase.table("documents").update(update_data).eq("id", doc_id).execute()

    return metadata
