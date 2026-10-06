# MemoryVerse AI - Thought Process

## 1. The Problem
During my college journey, I realized that students generate a massive amount of valuable digital artifacts: certificates, internship offer letters, resumes, and project reports. However, these documents are scattered across Google Drive, local folders, and emails. Existing cloud storage solutions (like Dropbox or Drive) just store files—they don't understand the **context** of a student's journey. It becomes incredibly difficult to connect a specific skill learned in 2023 to a project built in 2024 and an internship secured in 2025.

## 2. The Solution
As the developer of **MemoryVerse AI** (**Shaurya Rajput**), I decided to build a system that shifts the paradigm from "cloud storage" to a "spatial digital identity." The goal was to build a zero-touch pipeline where a user simply drops a file or pastes a link, and AI instantly handles the pre-upload summary reading, categorization, and semantic relationship mapping.

## 3. Technology Choices & Architecture

### Frontend (Next.js & Tailwind CSS)
I chose Next.js for its fast rendering and App Router capabilities. The UI was designed with a glassmorphism design system to feel modern, responsive, and spatial—featuring instant pre-upload metadata drawer editing, category pills, custom date pickers, and glassmorphic delete confirmation modals.

### Backend (FastAPI & Python)
Python was the natural choice for the backend due to its rich AI ecosystem. FastAPI provides sub-second async performance, crucial when handling PDF text extraction, OCR parsing, Cloudinary asset uploads, and Groq LLM inference.

### Data Ingestion & Pre-Upload AI Auto-Detect (PyMuPDF / PyTesseract + Groq `llama-3.3-70b-versatile`)
Instead of forcing users to manually enter tags or summaries, dropping a file triggers `/api/documents/analyze-preview`. PyMuPDF / PyTesseract extracts raw text, which is paired with filename context and passed to Groq's high-speed inference API running `llama-3.3-70b-versatile` (with fallbacks `llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it`). The LLM returns structured JSON containing title, category, event date, and a 1-2 sentence plain-English summary pre-filled in the summary drawer.

### The Relationship Engine (HuggingFace + Supabase pgvector)
For every uploaded document, the system generates a 384-dimensional vector embedding using `all-MiniLM-L6-v2` from `sentence-transformers`. 

These embeddings are stored in Supabase using the `pgvector` extension. When a new document is ingested, the system performs a cosine similarity search against all existing user documents. If similarity exceeds the threshold, a relationship is formed and explained by the LLM.

## 4. Key Challenges Overcome
* **OCR Graceful Fallback:** When image certificates had low resolution or Tesseract wasn't installed on Windows, LLMs previously complained about missing OCR data. I resolved this by feeding document filename heuristics and title context into the prompt, guaranteeing clean, accurate summaries.
* **Format & Extension Fixes:** Prevented double extensions (`.pdf.pdf`) on Cloudinary uploads by passing explicit format properties and public IDs.
* **Supabase Secret Key Compatibility:** Patched regex handling in Supabase client initialization to support new `sb_secret_...` format keys smoothly.
* **Render Free Tier Memory Tuning (<512 MB RAM):** Prevented backend container startup crashes by switching Render deployment to `env: docker` (with CPU-only PyTorch) and converting `SentenceTransformer` loading to lazy execution on demand. Container cold-start RAM was reduced from >500 MB to under 120 MB.
* **Vercel SSG Prerendering Fix:** Prevented static build export failures (`Error: supabaseUrl is required`) by using safe fallback initializers during module evaluation so Next.js static page generation succeeds cleanly.
* **Auth Redirect `404 DEPLOYMENT_NOT_FOUND` Fix:** Resolved Vercel edge 404 errors after login by introducing dynamic origin resolution (`NEXT_PUBLIC_SITE_URL` / `window.location.origin`), guaranteeing authentication redirects always return to the active production domain.

## 5. Future Roadmap
* **Auto-Resume Generation:** Using the connected timeline and relationship graph to automatically generate tailored resumes for specific job applications based on semantic matching.
* **Skill Gap Analysis:** Identifying missing skills based on the user's career goals and their current uploaded timeline.

