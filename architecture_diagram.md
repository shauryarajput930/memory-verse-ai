# MemoryVerse AI - Architecture & Workflow

You can view this diagram by pasting the code below into [Mermaid Live Editor](https://mermaid.live).

```mermaid
graph TD
    %% Styling
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:white;
    classDef backend fill:#10b981,stroke:#047857,stroke-width:2px,color:white;
    classDef ai fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:white;
    classDef database fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:white;
    
    %% Components
    User((User))
    
    subgraph Frontend ["Next.js App Router"]
        NextJS["Next.js UI & Spatial Views"]:::frontend
        UploadUI["Pre-Upload Auto-Detect UI"]:::frontend
        ProfileUI["Profile & Settings: Edit Name / Conditional Password"]:::frontend
        AuthUI["Auth UI: Sign In, Sign Up, Forgot Password, Google & GitHub OAuth"]:::frontend
        RecoveryModal["Password Recovery Modal"]:::frontend
        Timeline["Chronological Spatial Timeline"]:::frontend
        SmartSearch["Smart Search UI"]:::frontend
    end
    
    subgraph Backend ["FastAPI Backend"]
        FastAPI["FastAPI Server"]:::backend
        OCR["PyMuPDF / PyTesseract OCR"]:::backend
        AuthRouter["Auth Router: /api/auth/register"]:::backend
        CacheService["Redis Cache Service <br/> 1h TTL & Circuit Breaker"]:::backend
        EmbeddingEngine["Sentence Transformers <br/> all-MiniLM-L6-v2"]:::ai
    end
    
    subgraph AI_Services ["External AI / Storage / Cache"]
        Groq["Groq API: llama-3.3-70b-versatile <br/> NLP Extraction & Summaries"]:::ai
        Storage["Supabase Storage & Cloudinary <br/> Raw PDFs & Images"]:::database
        GitHubAPI["GitHub REST API"]:::backend
        RedisCache[("Redis Cloud Cache <br/> 1-Hour TTL")]:::database
    end
    
    subgraph Database ["Supabase"]
        SupabaseAuth["Supabase Auth & Session"]:::database
        Postgres[("PostgreSQL Documents & Profiles")]:::database
        PGVector[("pgvector Index")]:::database
    end

    %% Auth & User Operations
    User -->|"Sign In / Sign Up / Forgot Password"| AuthUI
    AuthUI -->|"Auth / Password Reset Request"| SupabaseAuth
    User -->|"Reset Link Click"| RecoveryModal
    RecoveryModal -->|"Set New Password"| SupabaseAuth
    User -->|"Edit Name / Change Password for Email Users"| ProfileUI
    ProfileUI -->|"Update Metadata & Password"| SupabaseAuth
    ProfileUI -->|"Sync Profile"| AuthRouter
    AuthRouter -->|"Upsert Profile"| Postgres

    %% Workflow Connections
    User -->|"Uploads File / URL / GitHub"| UploadUI
    UploadUI -->|"1. Auto-Detect Preview"| FastAPI
    UploadUI -->|"Multipart Form Data"| FastAPI
    
    FastAPI -->|"2. Store Original Document"| Storage
    FastAPI -->|"Fetch GitHub Repos"| GitHubAPI
    FastAPI -->|"3. Extract Text"| OCR
    OCR -->|"Raw Text"| FastAPI
    
    FastAPI -->|"4. Text & Metadata Context"| Groq
    Groq -->|"Structured JSON: Title, Date, Summary, Category"| FastAPI
    
    FastAPI -->|"5. Generate Vector"| EmbeddingEngine
    EmbeddingEngine -->|"384D Embedding Vector"| FastAPI
    
    FastAPI -->|"6. Store Metadata & Vector"| Postgres
    Postgres --> PGVector
    FastAPI -->|"Invalidate User Search Cache"| CacheService
    CacheService -->|"Purge Stale Keys"| RedisCache
    
    FastAPI -->|"7. Cosine Similarity Search"| PGVector
    PGVector -->|"Similar Documents"| FastAPI
    
    FastAPI -->|"8. Deduce Relationship"| Groq
    Groq -->|"Relationship Explanation"| FastAPI
    
    FastAPI -->|"9. Store Relationships"| Postgres
    
    %% Retrieval & Caching Flow
    User -->|"RAG Smart Search Query"| SmartSearch
    SmartSearch -->|"POST /api/search"| FastAPI
    FastAPI -->|"Check Cache"| CacheService
    CacheService <-->|"Cache HIT / Set 1h TTL"| RedisCache
    
    FastAPI -->|"Response"| NextJS
    NextJS -->|"Displays Knowledge Graph & Spatial Timeline"| User
```
