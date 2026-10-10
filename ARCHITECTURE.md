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
        Cache[services/cache.py Redis Service]
    end

    %% External Services
    subgraph External [External Services]
        OCR[PyMuPDF / PyTesseract OCR]
        Cloudinary[(Cloudinary Storage: raw PDFs & images)]
        Groq[Groq API: llama-3.3-70b-versatile]
        Embed[HF MiniLM Local Embedding]
        GitHubAPI[GitHub REST API]
        Redis[(Redis Cloud / Cache: 1-Hour TTL)]
    end

    %% Database & Storage
    subgraph Database [Supabase Cloud]
        Docs[(Documents Table)]
        Rels[(Relationships Table)]
        Profiles[(Profiles Table)]
        pgvector[(pgvector Extension)]
        Storage[(Supabase Storage: documents Bucket)]
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
    Ingest -->|Primary: Store File Bytes| Storage
    Ingest -.->|Fallback Upload| Cloudinary
    Ingest -->|Fetch Repos| GitHubAPI
    
    Ingest -->|Text + Filename Context| Cat
    Cat -->|Prompt| Groq
    Groq -->|Structured JSON Summary| Cat
    
    Cat -->|Metadata| Ingest
    Ingest -->|Content| Embed
    Embed -->|Vector| Ingest
    
    Ingest -->|Insert Document| Docs
    Docs -.->|Trigger pgvector| pgvector
    Ingest -->|Invalidate User Cache| Cache
    Cache -->|Purge Keys| Redis
    
    Ingest -->|Invoke Engine| Rel
    Rel -->|Similarity Search| pgvector
    pgvector -->|Potential Matches| Rel
    Rel -->|Verify Connection| Groq
    Groq -->|Confirmed Links| Rel
    Rel -->|Insert Link| Rels
    
    UI -->|GET /timeline| Time
    Time -->|Fetch Chronological| Docs
    
    UI -->|POST /api/search| Srch
    Srch -->|1. Check Cache| Cache
    Cache <-->|Read / Write Cached Response (1h TTL)| Redis
    Srch -->|2. Cache Miss: Query Vector| Embed
    Embed -->|Query Vector| Srch
    Srch -->|3. Vector Match| pgvector
    pgvector -->|Ranked Results| Srch
    Srch -->|4. Synthesize Answer| Groq

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
   - **Conditional Password Management:**
     - Users who authenticated with **Email & Password** have access to the "Security & Password" card to change passwords with real-time length and match validation.
     - Users who authenticated via **OAuth (Google / GitHub)** see an "OAuth Secured" status indicator; password changes are managed directly by their OAuth provider.
   - Self-service **Forgot Password** sends an authenticated recovery link. When clicked, `onAuthStateChange('PASSWORD_RECOVERY')` triggers the **Set New Password** modal in `page.tsx`.
2. **Dynamic Onboarding & On-Screen Notifications:** 
   - First-time registrations trigger a **"Congratulations, [User Name]!"** modal.
   - Returning user logins trigger a **"Welcome Back, [User Name]!"** modal.
   - Google & GitHub OAuth triggers live browser redirection to provider sign-in screens.
3. **Direct File Ingestion & Storage (`ingestion.py`):** Dropping a file automatically uses the filename as title for instant archive creation. PyMuPDF / PyTesseract extracts raw text, uploads source assets directly to **Supabase Storage** (public `documents` bucket) for guaranteed 200 OK delivery without 401 ACL blocks, with Cloudinary maintained as fallback.
4. **Resilient Document Access:** Documents stored in Supabase Storage are delivered over Cloudflare CDN directly in the browser as `application/pdf`. Legacy Cloudinary files are safely handled with `getSafeFileUrl()`.
5. **Categorization & Structuring (`categorization.py`):** The raw text is processed by `categorization.py` using **Groq LLM** (`llama-3.3-70b-versatile` with fallbacks) to determine category pills (*Projects, Skills, Certifications, Internships, Achievements, Academics*) and event dates.
6. **Vector Embeddings (`embeddings.py`):** Processed document text is run through a local HuggingFace `sentence-transformer` model (`all-MiniLM-L6-v2`) to generate a 384-dimensional semantic embedding vector. The model is lazy-loaded on demand to keep container memory under 120 MB on Render.
7. **Relationship Engine (`relationships.py`):** Once saved in Supabase, `relationships.py` performs a similarity search using `pgvector`. It feeds potential matches to Groq for logical verification. Confirmed connections are indexed into the `relationships` table.
8. **Redis-Accelerated Smart Retrieval (`search.py` & `cache.py`):** 
   - Incomming search queries first probe **Redis** via `services/cache.py` using a deterministic key (`rag:search:{user_id}:{hash}`).
   - **Cache HIT:** Sub-millisecond response returned directly with `X-Cache: HIT`, saving Groq LLM tokens and eliminating vector search latency.
   - **Cache MISS:** Evaluates vector cosine similarity on `pgvector`, synthesizes answer with Groq LLM, and caches the result in Redis with a 1-hour expiration (`REDIS_CACHE_TTL=3600`).
   - **Automatic Invalidation:** Whenever documents are uploaded, edited, or deleted, `cache_service.invalidate_user_search_cache(user_id)` automatically purges stale queries.
   - **Graceful Degradation:** A circuit breaker protects the app if Redis goes offline, falling back directly to database queries without errors or timeout penalties.

