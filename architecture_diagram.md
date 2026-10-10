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
    
    subgraph Frontend [Next.js App Router]
        NextJS[Next.js UI & Spatial Views]:::frontend
        UploadUI[Pre-Upload Auto-Detect UI]:::frontend
        ProfileUI[Profile & Settings: Edit Name / Password]:::frontend
        AuthUI[Auth UI: Sign In, Sign Up, Forgot Password]:::frontend
        RecoveryModal[Password Recovery Modal]:::frontend
        Timeline[Chronological Spatial Timeline]:::frontend
    end
    
    subgraph Backend [FastAPI Backend]
        FastAPI[FastAPI Server]:::backend
        OCR[PyMuPDF / PyTesseract OCR]:::backend
        AuthRouter[Auth Router: /api/auth/register]:::backend
        EmbeddingEngine[Sentence Transformers \n all-MiniLM-L6-v2]:::ai
    end
    
    subgraph AI_Services [External AI/Storage]
        Groq[Groq API: llama-3.3-70b-versatile \n NLP Extraction & Summaries]:::ai
        Cloudinary[Cloudinary \n Raw PDFs & Images]:::database
        GitHubAPI[GitHub REST API]:::backend
    end
    
    subgraph Database [Supabase]
        SupabaseAuth[Supabase Auth & Session]:::database
        Postgres[(PostgreSQL Documents & Profiles)]:::database
        PGVector[(pgvector Index)]:::database
    end

    %% Auth & User Operations
    User -->|Sign In / Sign Up / Forgot Password| AuthUI
    AuthUI -->|Auth / Password Reset Request| SupabaseAuth
    User -->|Reset Link Click| RecoveryModal
    RecoveryModal -->|Set New Password| SupabaseAuth
    User -->|Edit Name / Change Password| ProfileUI
    ProfileUI -->|Update Metadata & Password| SupabaseAuth
    ProfileUI -->|Sync Profile| AuthRouter
    AuthRouter -->|Upsert Profile| Postgres

    %% Workflow Connections
    User -->|Uploads File/URL/GitHub| UploadUI
    UploadUI -->|1. Auto-Detect Preview| FastAPI
    UploadUI -->|Multipart Form Data| FastAPI
    
    FastAPI -->|2. Store Original (raw PDF)| Cloudinary
    FastAPI -->|Fetch GitHub Repos| GitHubAPI
    FastAPI -->|3. Extract Text| OCR
    OCR -->|Raw Text| FastAPI
    
    FastAPI -->|4. Text & Filename Context| Groq
    Groq -->|Structured JSON \n Title, Date, Summary, Category| FastAPI
    
    FastAPI -->|5. Generate Vector| EmbeddingEngine
    EmbeddingEngine -->|384D Embedding Vector| FastAPI
    
    FastAPI -->|6. Store Metadata & Vector| Postgres
    Postgres --> PGVector
    
    FastAPI -->|7. Cosine Similarity Search| PGVector
    PGVector -->|Similar Documents| FastAPI
    
    FastAPI -->|8. Deduce Relationship| Groq
    Groq -->|Relationship Explanation| FastAPI
    
    FastAPI -->|9. Store Relationships| Postgres
    
    FastAPI -->|Response| NextJS
    NextJS -->|Displays Knowledge Graph & Spatial Timeline| User
```
