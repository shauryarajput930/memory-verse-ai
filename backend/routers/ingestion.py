"""
Module 1 — AI Data Ingestion (with Module 2+3 chaining)

POST /api/documents/upload
Accepts a file (PDF/image) or URL, extracts text, uploads to Cloudinary,
inserts into Supabase, then automatically runs categorization + relationship discovery.
"""

import io
import os
import re
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from pydantic import BaseModel
from typing import Optional, List
import cloudinary.uploader
import httpx
from bs4 import BeautifulSoup

from config import supabase
from dependencies import get_current_user
from services.categorization import categorize_document
from services.relationships import find_related_documents
from services.cache import cache_service

router = APIRouter(prefix="/api/documents", tags=["documents"])

# ── Response Models ──────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: str
    file_url: str
    file_type: str
    raw_text: str
    category: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    relationships_found: int = 0

class AnalyzePreviewResponse(BaseModel):
    title: str
    category: str
    event_date: Optional[str] = None
    summary: str

class RetryRequest(BaseModel):
    doc_ids: list[str]


# ── Text Extraction Helpers ──────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    import fitz
    import pytesseract
    from PIL import Image
    import io
    import os
    import shutil
    import gc
    
    tesseract_available = False
    env_tesseract = os.getenv("TESSERACT_PATH")
    if env_tesseract and os.path.exists(env_tesseract):
        pytesseract.pytesseract.tesseract_cmd = env_tesseract
        tesseract_available = True
    elif shutil.which("tesseract"):
        tesseract_available = True
    else:
        tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        if os.path.exists(tesseract_path):
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
            tesseract_available = True

    text_parts = []
    ocr_count = 0
    try:
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            for page in doc:
                page_text = page.get_text().strip()
                if page_text:
                    text_parts.append(page_text)
                    
                # Only perform heavy image OCR if page text is minimal and OCR count < 2
                if tesseract_available and len(page_text) < 50 and ocr_count < 2:
                    image_list = page.get_images(full=True)
                    for img in image_list[:2]:
                        xref = img[0]
                        try:
                            base_image = doc.extract_image(xref)
                            image_bytes = base_image["image"]
                            with Image.open(io.BytesIO(image_bytes)) as image:
                                img_text = pytesseract.image_to_string(image).strip()
                                if img_text:
                                    text_parts.append(img_text)
                            ocr_count += 1
                        except Exception as e:
                            print(f"Failed to OCR image in PDF: {e}")
    except Exception as e:
        print(f"PDF extraction warning: {e}")
    finally:
        gc.collect()

    return "\n".join(text_parts).strip()


def extract_text_from_image(file_bytes: bytes) -> str:
    try:
        from PIL import Image
        import pytesseract
        import shutil
        import os
        
        env_tesseract = os.getenv("TESSERACT_PATH")
        if env_tesseract and os.path.exists(env_tesseract):
            pytesseract.pytesseract.tesseract_cmd = env_tesseract
        elif not shutil.which("tesseract"):
            tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
            if os.path.exists(tesseract_path):
                pytesseract.pytesseract.tesseract_cmd = tesseract_path
            else:
                return ""
            
        image = Image.open(io.BytesIO(file_bytes))
        extracted = pytesseract.image_to_string(image).strip()
        return extracted
    except Exception:
        return ""


async def extract_text_from_url(url: str) -> str:
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)[:5000]


# ── Cloudinary Upload ────────────────────────────────────────────────────────

def upload_to_cloudinary(file_bytes: bytes, filename: str, file_ext: str) -> str:
    base_name = os.path.splitext(filename)[0]
    fmt = file_ext.lstrip(".").lower()
    is_pdf = (fmt == "pdf")
    
    try:
        if is_pdf:
            # PDFs must use 'raw' resource_type to bypass Cloudinary image PDF ACL restrictions
            upload_kwargs = {
                "folder": "memoryverse",
                "resource_type": "raw",
                "public_id": f"{base_name}.pdf",
                "access_mode": "public",
                "overwrite": True,
            }
        else:
            upload_kwargs = {
                "folder": "memoryverse",
                "resource_type": "image",
                "public_id": base_name,
                "access_mode": "public",
                "overwrite": True,
            }
            if fmt:
                upload_kwargs["format"] = fmt

        result = cloudinary.uploader.upload(file_bytes, **upload_kwargs)
        return result["secure_url"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cloudinary upload failed: {str(e)}")


def upload_document_storage(file_bytes: bytes, filename: str, file_ext: str) -> str:
    """
    Primary: Upload to Supabase Storage ('documents' public bucket).
    Guarantees 200 OK unblocked public access for PDFs & images with zero Cloudinary ACL issues.
    Fallback: Uploads to Cloudinary if Supabase storage encounter issues.
    """
    clean_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', filename)
    timestamp = int(time.time())
    unique_path = f"uploads/{timestamp}_{clean_name}"
    content_type = "application/pdf" if file_ext.lower() == ".pdf" else "image/jpeg"
    if file_ext.lower() == ".png":
        content_type = "image/png"

    try:
        supabase.storage.from_("documents").upload(
            unique_path,
            file_bytes,
            {"content-type": content_type, "upsert": "true"},
        )
        public_url = supabase.storage.from_("documents").get_public_url(unique_path)
        if public_url:
            return public_url.rstrip("?")
    except Exception as e:
        print(f"Supabase storage upload notice: {e}, falling back to Cloudinary...")

    # Fallback to Cloudinary
    return upload_to_cloudinary(file_bytes, filename, file_ext)



# ── Main Upload Endpoint ─────────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}


@router.post("/upload", response_model=DocumentResponse)
@router.post("/archive", response_model=DocumentResponse)
async def upload_document(

    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    summary: Optional[str] = Form(None),
    event_date: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user),
):
    if not file and not url:
        raise HTTPException(status_code=400, detail="Provide either a file or a URL.")

    raw_text = ""
    file_url = ""
    file_type = ""

    # ── File path ────────────────────────────────────────────────────────
    if file:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
            )
        
        file_bytes = await file.read()
        
        # Server-side File Size Validation (10 MB max)
        MAX_FILE_SIZE = 10 * 1024 * 1024
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds the 10MB limit.",
            )

        if ext == ".pdf":
            file_type = "pdf"
            raw_text = extract_text_from_pdf(file_bytes)
        else:
            file_type = "image"
            raw_text = extract_text_from_image(file_bytes)

        if not raw_text:
            raw_text = f"[No text could be extracted from {file.filename}]"

        file_url = upload_document_storage(file_bytes, file.filename or "document", ext)

    # ── URL path ─────────────────────────────────────────────────────────
    elif url:
        file_type = "link"
        try:
            raw_text = await extract_text_from_url(url)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not fetch URL: {e}")
        file_url = url

    # ── Insert into Supabase ─────────────────────────────────────────────
    row = {
        "user_id": user_id,
        "file_url": file_url,
        "file_type": file_type,
        "raw_text": raw_text,
    }
    result = supabase.table("documents").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to insert document.")

    inserted = result.data[0]
    doc_id = inserted["id"]

    # ── Chain Module 2: Categorization ───────────────────────────────────
    metadata = {}
    try:
        metadata = categorize_document(doc_id, raw_text)
    except Exception as e:
        print(f"Categorization failed for {doc_id}: {e}")

    # Apply user pre-upload overrides if provided
    user_overrides = {}
    if title and title.strip():
        metadata["title"] = title.strip()
        user_overrides["title"] = title.strip()
    if category and category.strip() and category != "Auto AI Detect":
        metadata["category"] = category.strip()
        user_overrides["category"] = category.strip()
    if summary and summary.strip():
        metadata["summary"] = summary.strip()
        user_overrides["summary"] = summary.strip()
    if event_date and event_date.strip():
        metadata["event_date"] = event_date.strip()
        user_overrides["event_date"] = event_date.strip()

    if user_overrides:
        supabase.table("documents").update(user_overrides).eq("id", doc_id).execute()

    # ── Chain Module 3: Relationship Discovery ───────────────────────────
    relationships_found = 0
    try:
        relations = find_related_documents(doc_id, user_id)
        relationships_found = len(relations)
    except Exception as e:
        print(f"Relationship discovery failed for {doc_id}: {e}")

    import gc
    gc.collect()

    # Invalidate cached search queries for this user so fresh documents appear
    cache_service.invalidate_user_search_cache(user_id)

    return DocumentResponse(
        id=doc_id,
        file_url=inserted["file_url"],
        file_type=inserted["file_type"],
        raw_text=inserted["raw_text"][:500],
        category=metadata.get("category"),
        title=metadata.get("title"),
        summary=metadata.get("summary"),
        relationships_found=relationships_found,
    )


@router.post("/analyze-preview", response_model=AnalyzePreviewResponse)
async def analyze_preview(
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user),
):
    """
    Extracts text from a file/URL and runs Groq AI to auto-detect title, category, event_date, and summary
    for pre-filling the pre-upload edit form.
    """
    if not file and not url:
        raise HTTPException(status_code=400, detail="Provide either a file or a URL.")

    raw_text = ""
    if file:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'.")
        file_bytes = await file.read()
        if ext == ".pdf":
            raw_text = extract_text_from_pdf(file_bytes)
        else:
            raw_text = extract_text_from_image(file_bytes)
    elif url:
        try:
            raw_text = await extract_text_from_url(url)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not fetch URL: {e}")

    doc_filename = file.filename if file else (url or "Certificate Document")
    clean_filename = os.path.splitext(doc_filename)[0].replace("_", " ").replace("-", " ")

    user_prompt_content = f"Filename: {doc_filename}\nExtracted Document Text:\n{raw_text[:4000]}"

    from services.categorization import SYSTEM_PROMPT
    from services.llm import call_llm_json

    metadata = call_llm_json(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=f"Classify this document and generate a clear 1-2 sentence summary:\n\n{user_prompt_content}",
    )
    if not metadata:
        metadata = {}

    cat = metadata.get("category", "")
    raw_cat = str(cat).lower().strip()
    
    ALLOWED_CATEGORIES = {
        "projects": "Projects", "skills": "Skills", "certifications": "Certifications",
        "internships": "Internships", "achievements": "Achievements", "academics": "Academics"
    }
    final_cat = ALLOWED_CATEGORIES.get(raw_cat, "Certifications")

    title = metadata.get("title") or clean_filename.title()
    summary = metadata.get("summary")
    if not summary or "failed" in summary.lower():
        summary = f"Certificate document for '{title}', auto-detected and added to spatial timeline."

    event_date = metadata.get("event_date")

    import re
    if event_date and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(event_date)):
        event_date = None

    return AnalyzePreviewResponse(
        title=title,
        category=final_cat,
        event_date=event_date,
        summary=summary
    )

@router.post("/retry")
async def retry_categorization(req: RetryRequest, user_id: str = Depends(get_current_user)):
    """
    Re-runs the categorization and relationship pipeline for a list of document IDs
    that previously failed.
    """
    if not req.doc_ids:
        raise HTTPException(status_code=400, detail="No document IDs provided.")

    results = []
    
    # Fetch documents to get their raw_text and user_id
    docs = supabase.table("documents").select("id, user_id, raw_text").in_("id", req.doc_ids).execute()
    
    if not docs.data:
        raise HTTPException(status_code=404, detail="Documents not found.")

    for doc in docs.data:
        doc_id = doc["id"]
        doc_user_id = doc["user_id"]
        raw_text = doc["raw_text"]
        
        # Verify ownership
        if doc_user_id != user_id:
            results.append({"id": doc_id, "status": "failed", "error": "Unauthorized"})
            continue
        
        # 1. Retry Categorization
        metadata = {}
        try:
            metadata = categorize_document(doc_id, raw_text)
        except Exception as e:
            print(f"Retry categorization failed for {doc_id}: {e}")
            
        # 2. Retry Relationships
        relationships_found = 0
        try:
            relations = find_related_documents(doc_id, user_id)
            relationships_found = len(relations)
        except Exception as e:
            print(f"Retry relationships failed for {doc_id}: {e}")
            
        results.append({
            "id": doc_id,
            "status": "success" if metadata.get("category") != "FAILED" else "failed",
            "category": metadata.get("category"),
            "relationships_found": relationships_found
        })
        
    cache_service.invalidate_user_search_cache(user_id)
    return {"results": results}

class GithubRepoRequest(BaseModel):
    username: str

@router.post("/github")
async def ingest_github_repos(req: GithubRepoRequest, user_id: str = Depends(get_current_user)):
    """
    Fetches the user's top 3 recently updated public repositories using the GitHub API.
    Constructs synthetic documents, saves them to Supabase, and runs categorization + relationships.
    """
    if not req.username:
        raise HTTPException(status_code=400, detail="GitHub username is required.")

    # 1. Fetch from GitHub API
    github_api_url = f"https://api.github.com/users/{req.username}/repos?sort=updated&per_page=3"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(github_api_url, headers={"Accept": "application/vnd.github.v3+json"})
            response.raise_for_status()
            repos = response.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch from GitHub: {str(e)}")
            
    if not repos:
        return {"message": "No repositories found for this user.", "results": []}

    results = []
    for repo in repos:
        name = repo.get("name", "Unknown Repository")
        description = repo.get("description") or "No description provided."
        language = repo.get("language") or "Unknown"
        html_url = repo.get("html_url", "")
        updated_at = repo.get("updated_at", "")
        
        # 2. Construct synthetic raw_text
        raw_text = f"GitHub Repository: {name}\nPrimary Language: {language}\nLast Updated: {updated_at}\nURL: {html_url}\nDescription: {description}"
        
        # 3. Save to database
        row = {
            "user_id": user_id,
            "file_url": html_url,
            "file_type": "url",
            "raw_text": raw_text,
        }
        
        insert_res = supabase.table("documents").insert(row).execute()
        if not insert_res.data:
            print(f"Failed to insert repo {name}")
            continue
            
        doc_id = insert_res.data[0]["id"]
        
        # 4. Chain Categorization
        metadata = {}
        try:
            metadata = categorize_document(doc_id, raw_text)
        except Exception as e:
            print(f"Categorization failed for repo {name}: {e}")

        # 5. Chain Relationship Discovery
        relationships_found = 0
        try:
            relations = find_related_documents(doc_id, user_id)
            relationships_found = len(relations)
        except Exception as e:
            print(f"Relationship discovery failed for repo {name}: {e}")
            
        results.append({
            "id": doc_id,
            "name": name,
            "category": metadata.get("category"),
            "relationships_found": relationships_found
        })
        
    cache_service.invalidate_user_search_cache(user_id)
    return {"message": f"Successfully ingested {len(results)} repositories.", "results": results}

class DeleteRequest(BaseModel):
    doc_ids: list[str]

@router.post("/delete")
async def delete_documents(req: DeleteRequest, user_id: str = Depends(get_current_user)):
    """
    Deletes documents and their associated relationships.
    """
    if not req.doc_ids:
        raise HTTPException(status_code=400, detail="No document IDs provided.")
        
    # Verify ownership before deleting
    docs = supabase.table("documents").select("id, user_id").in_("id", req.doc_ids).execute()
    if not docs.data:
        return {"message": "No documents found to delete."}
        
    valid_ids = [doc["id"] for doc in docs.data if doc["user_id"] == user_id]
    
    if not valid_ids:
        raise HTTPException(status_code=403, detail="Unauthorized to delete these documents.")
        
    # Delete from documents table
    res = supabase.table("documents").delete().in_("id", valid_ids).execute()
    
    cache_service.invalidate_user_search_cache(user_id)
    return {"message": f"Successfully deleted {len(valid_ids)} documents.", "deleted_ids": valid_ids}

class UpdateDocumentRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    event_date: Optional[str] = None

@router.put("/{doc_id}")
async def update_document(doc_id: str, req: UpdateDocumentRequest, user_id: str = Depends(get_current_user)):
    """
    Update document metadata (title, category, summary, event_date).
    """
    # Verify ownership
    docs = supabase.table("documents").select("user_id").eq("id", doc_id).execute()
    if not docs.data or docs.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized or document not found.")

    update_data = req.model_dump(exclude_unset=True) # use model_dump in pydantic v2
    if not update_data:
        return {"message": "No fields to update."}

    res = supabase.table("documents").update(update_data).eq("id", doc_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update document.")

    cache_service.invalidate_user_search_cache(user_id)
    return {"message": "Document updated successfully", "document": res.data[0]}

