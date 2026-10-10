# Architecture Overview

## Data Flow Diagram

```mermaid
flowchart TD
    %% Actors
    User([User])
    
    %% Next.js Frontend (Netlify)
    subgraph Frontend [Next.js Client — Netlify]
        UI[Upload UI / Timeline / Smart Search / Library / Profile]
        AuthGuard[Supabase Auth & JWT Layer]
        SafeUrl[getSafeFileUrl Sanitizer]
        PassModal[Password Recovery Modal]
    end

    %% FastAPI Backend Core (Render)
    subgraph Backend [FastAPI Backend — Render Docker]
        Auth[JWT & Session Dependency]
        Ingest[ingestion.py / archive / github-sync]
        AuthRouter[auth.py / register / me / verify]
        Cat[categorization.py]
        Rel[relationships.py]
        Time[timeline.py]
        Srch[search.py]
    end

    %% External Services
    subgraph External [External Services]
        OCR[PyMuPDF / PyTesseract OCR]
        Cloudinary[(Cloudinary Storage: raw PDFs & images)]
        Groq[Groq API: llama-3.3-70b-versatile]
        Embed[HF MiniLM Local Embedding]
        GitHubAPI[GitHub REST API]
    end

    %% Database
    subgraph Database [Supabase PostgreSQL]
        Docs[(Documents Table)]
        Rels[(Relationships Table)]
        Profiles[(Profiles Table)]
        pgvector[(pgvector Extension)]
    end

    %% Flow
    User -->|Uploads File/URL/GitHub Sync| UI
    UI -->|Requests| AuthGuard
    AuthGuard -->|Bearer Token| Auth
    
    Auth -->|Validated| Ingest
    UI -->|Registration / Profile Name Update| AuthRouter
    AuthRouter -->|Upsert User Profile| Profiles
    
    Ingest -->|Raw File| OCR
    OCR -->|Extracted Text| Ingest
    Ingest -->|File Bytes (resource_type='raw' for PDFs)| Cloudinary
    Ingest -->|Fetch Repos| GitHubAPI
    
    Ingest -->|Text + Filename Context| Cat
    Cat -->|Prompt| Groq
    Groq -->|Structured JSON Summary| Cat
    
    Cat -->|Metadata| Ingest
    Ingest -->|Content| Embed
    Embed -->|Vector| Ingest
    
    Ingest -->|Insert Document| Docs
    Docs -.->|Trigger pgvector| pgvector
    
    Ingest -->|Invoke Engine| Rel
    Rel -->|Similarity Search| pgvector
    pgvector -->|Potential Matches| Rel
    Rel -->|Verify Connection| Groq
    Groq -->|Confirmed Links| Rel
    Rel -->|Insert Link| Rels
    
    UI -->|GET /timeline| Time
    Time -->|Fetch Chronological| Docs
    
    UI -->|GET /search| Srch
    Srch -->|Query String| Embed
    Embed -->|Query Vector| Srch
    Srch -->|Vector Match| pgvector
    pgvector -->|Ranked Results| Srch

    UI -->|Opens Document| SafeUrl
    SafeUrl -->|Bypasses 401 ACL| Cloudinary

    User -->|Email Reset Link Click| PassModal
    PassModal -->|supabase.auth.updateUser| AuthGuard
```

## Step-by-Step Flow

When a user interacts with the application, their request is routed through a modern decoupled pipeline:

1. **Authentication, Profile Management & Password Security:** 
   - All requests from the Next.js client hit Supabase Auth & JWT validation first. 
   - When a user signs up, their **Full Name** and email are saved into `auth.users` metadata and synced to the `profiles` table via `/api/auth/register`.
   - Users can update their **Full Name** in `ProfileView`, instantly updating the Top Navbar and profile avatar without reloading.
   - Self-service **Forgot Password** sends an authenticated recovery link. When clicked, `onAuthStateChange('PASSWORD_RECOVERY')` triggers the **Set New Password** modal in `page.tsx`. Logged-in users can also change their password directly in the Profile security card.
2. **Dynamic Onboarding & On-Screen Notifications:** 
   - First-time registrations trigger a **"Congratulations, [User Name]!"** modal.
   - Returning user logins trigger a **"Welcome Back, [User Name]!"** modal.
   - Google & GitHub OAuth triggers live browser redirection to provider sign-in screens.
3. **Direct File Ingestion & Auto-Fill (`ingestion.py`):** Dropping a file automatically uses the filename as title for instant archive creation. PyMuPDF / PyTesseract extracts raw text, uploads source assets to **Cloudinary**, and saves document metadata into **Supabase**.
4. **Cloudinary Raw Delivery & Safe Fallback:** PDFs are uploaded as `resource_type="raw"` to bypass Cloudinary's default image ACL blocks (`401 deny or ACL failure`). Legacy `/image/upload/*.pdf` URLs are converted dynamically via `getSafeFileUrl()` to high-definition raster previews (`.png`).
5. **Categorization & Structuring (`categorization.py`):** The raw text is processed by `categorization.py` using **Groq LLM** (`llama-3.3-70b-versatile` with fallbacks) to determine category pills (*Projects, Skills, Certifications, Internships, Achievements, Academics*) and event dates.
6. **Vector Embeddings (`embeddings.py`):** Processed document text is run through a local HuggingFace `sentence-transformer` model (`all-MiniLM-L6-v2`) to generate a 384-dimensional semantic embedding vector. The model is lazy-loaded on demand to keep container memory under 120 MB on Render.
7. **Relationship Engine (`relationships.py`):** Once saved in Supabase, `relationships.py` performs a similarity search using `pgvector`. It feeds potential matches to Groq for logical verification. Confirmed connections are indexed into the `relationships` table.
8. **Retrieval (`timeline.py` & `search.py`):** The Next.js frontend fetches processed data via `timeline.py` (chronological sorting) and `search.py` (cosine-similarity matching against `pgvector`).
