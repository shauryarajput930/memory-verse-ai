# MemoryVerse AI — Spatial Digital Identity & Archive

**Your Digital Identity, Unscattered.**

MemoryVerse AI is a modern, full-stack spatial identity system built by **Shaurya Rajput** to turn fragmented academic and professional documents—certificates, resumes, hackathon passes, project reports, and GitHub repositories—into a structured, searchable spatial knowledge repository.

---

## 🌟 Key Features

- **⚡ Instant AI Certificate Auto-Read & Summary:** Drag & drop any certificate (PDF/PNG/JPG) or paste a link to trigger instant AI analysis (`/api/documents/analyze-preview`). Automatically reads certificate text and populates the **Summary Section**, Title, Category, and Event Date before saving.
- **✏️ Customize Details Before Archive:** Interactive glassmorphism drawer allowing users to customize document titles, select visual category pills (*Projects, Skills, Certifications, Internships, Achievements, Academics*), pick event dates, and refine AI summaries with a live **Re-Detect** option.
- **🗑️ Glassmorphic Confirmation Modal:** Custom animated glassmorphism delete modal replaces generic browser popups for safe document removal.
- **🐙 GitHub Repository Auto-Sync:** Type any GitHub username to automatically pull top public repositories into your spatial portfolio with AI categorization and relationship discovery.
- **🏷️ Intelligent Auto-Categorization:** Uses Groq LLM inference (`qwen/qwen3.8-27b`) with fallbacks (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`) to parse document text into structured metadata.
- **🔗 Knowledge Graph & Relationship Engine:** Automatically discovers semantic connections between documents using pgvector cosine similarity and LLM verification.
- **⏳ Interactive Chronological Timeline:** Automatically plots documents by year along a glowing 3D spatial timeline rod.
- **🎙️ Semantic Smart & Voice Search:** Search your entire portfolio with natural language queries or voice search, powered by HuggingFace embeddings (`all-MiniLM-L6-v2`) and AI response synthesis.
- **🔒 Flexible Authentication:** Supports Email/Password authentication as well as GitHub and Google OAuth login powered by Supabase Auth.
- **🖼️ Cloud Media Storage:** Uploads original high-res assets to Cloudinary with optimized format handling for PDFs and images.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router, React 19, Tailwind CSS, Lucide Icons, Glassmorphic Design System)
- **Backend:** FastAPI (Python 3.13), Uvicorn, Pydantic, PyMuPDF, PyTesseract
- **Database & Auth:** Supabase (PostgreSQL with `pgvector` extension & Supabase Auth)
- **AI & Inference:** Groq API (`qwen/qwen3.8-27b`), HuggingFace `sentence-transformers` (`all-MiniLM-L6-v2`)
- **Cloud Media:** Cloudinary API

---

## 🚀 Quick Start & Setup Guide

### Prerequisites
- Node.js (v18 or higher)
- Python (3.10 or higher)
- *(Optional)* Tesseract-OCR installed on your system PATH for image OCR.

---

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/MemoryVerse-AI.git
cd MemoryVerse-AI
```

---

### 2. Backend Setup (FastAPI)
```bash
cd backend

# Create & activate Python environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create `.env` inside `backend/` based on `backend/.env.example`:
```env
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_SECRET_KEY=your-supabase-secret-key
GROQ_API_KEY=gsk_your_groq_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FRONTEND_URL=http://localhost:3000
```

Start the FastAPI server:
```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend runs on `http://127.0.0.1:8000`.*

---

### 3. Frontend Setup (Next.js)
```bash
cd ../frontend

# Install dependencies
npm install
```

Create `.env.local` inside `frontend/`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start Next.js dev server:
```bash
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

---

## 🔐 Google & GitHub OAuth Configuration

To enable Google Login or GitHub Login:
1. Go to your **Supabase Dashboard** -> **Authentication** -> **Providers**.
2. Select **Google** (or GitHub) and toggle **Enable Provider**.
3. Paste your **Client ID** and **Client Secret** obtained from Google Cloud Console / GitHub Developer Settings.
4. In Google Cloud Console, set Authorized Redirect URI to:
   `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`
5. Save changes in Supabase Console.

---

## 👤 Developer
**Shaurya Rajput**

---

## 📄 License
This project is licensed under the MIT License.