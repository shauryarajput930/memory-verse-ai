# MemoryVerse AI — Backend (FastAPI Service)

High-performance Python FastAPI service for **MemoryVerse AI**, providing document extraction, AI summarization, semantic embeddings, knowledge graph relationships, and Supabase integration.

---

## 🌟 Architecture & Features

- **📄 Document Parsing & Extraction:** Multi-format file parsing supporting PDF text extraction (`PyMuPDF`) and OCR for image files (`PyTesseract`).
- **🤖 Groq LLM Inference:** Powered by Groq's ultra-fast API using `llama-3.3-70b-versatile` with automatic fallbacks (`llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it`) to extract structured title, category, event date, and summaries.
- **🧠 Semantic Embeddings:** Local sentence transformer embeddings using `all-MiniLM-L6-v2` for vector similarity matching and smart search.
- **🔗 Spatial Knowledge Graph:** Automatic relationship discovery between portfolio items (projects, certificates, skills, internships) using cosine similarity on `pgvector`.
- **☁️ Cloud Storage Integration:** Automatic document upload to Cloudinary with secure URL generation.
- **🔐 Supabase Service Role Integration:** Server-side database access using Supabase Python SDK.

---

## 📁 Directory Structure

```text
backend/
├── api/
│   └── index.py            # Vercel/Serverless adapter entrypoint
├── routers/
│   ├── ingestion.py        # /api/archive document ingestion & preview endpoints
│   ├── timeline.py         # /api/timeline timeline fetch, update, delete endpoints
│   ├── search.py           # /api/search vector & natural language search endpoints
│   └── auth.py             # Auth status helper endpoints
├── services/
│   ├── llm.py              # Groq LLM wrapper with fallback handling
│   ├── ocr.py              # PDF/Image text extraction service
│   ├── embeddings.py       # SentenceTransformer lazy-loaded vector generator
│   └── relationship.py     # Graph relationship matching engine
├── config.py               # Supabase & Cloudinary client initialization
├── dependencies.py         # Auth header validation & session helpers
├── main.py                 # FastAPI application setup & CORS configuration
├── supabase_schema.sql     # PostgreSQL database schema & pgvector functions
├── Dockerfile              # Production Docker build container for Render
├── render.yaml             # Render infrastructure blueprint
└── requirements.txt        # Python dependency requirements
```

---

## 🛠️ API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` / `/api/health` | System health check and uptime ping |
| `POST` | `/api/archive` | Ingest document, upload to Cloudinary, run LLM analysis & save |
| `POST` | `/api/documents/analyze-preview` | AI pre-upload text extraction and summary generation |
| `GET` | `/api/timeline/{user_id}` | Fetch user items grouped chronologically by year |
| `PUT` | `/api/documents/{item_id}` | Update document title, category, summary, or date |
| `DELETE` | `/api/documents/{item_id}` | Delete document and remove related graph links |
| `POST` | `/api/search` | Natural language semantic search across portfolio |
| `POST` | `/api/github-sync` | Sync public GitHub repositories into portfolio |

---

## ⚙️ Environment Variables

Create `.env` inside `backend/`:

```env
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_SECRET_KEY=your-supabase-secret-key
GROQ_API_KEY=gsk_your_groq_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FRONTEND_URL=https://memory-verse-ai.netlify.app
```

---

## 🚀 Local Setup & Development

### 1. Create Virtual Environment
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Start Development Server
```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 🌐 Production Deployment (Render)

- **Environment**: Docker (`Dockerfile`)
- **Memory Optimization**: SentenceTransformers embedding model is lazy-loaded on demand to maintain startup memory usage under 120MB (fitting comfortably within Render Free Tier limits).
- **CORS Configuration**: Configured in `main.py` to allow requests from `https://memory-verse-ai.netlify.app`.
