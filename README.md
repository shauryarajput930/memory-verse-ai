# MemoryVerse AI — Spatial Digital Identity & Archive

**Your Digital Identity, Unscattered.**

MemoryVerse AI is a modern, full-stack spatial identity system built by **Shaurya Rajput** to turn fragmented academic and professional documents—certificates, resumes, hackathon passes, project reports, and GitHub repositories—into a structured, searchable spatial knowledge repository.

---

## 🌟 Key Features

- **⚡ Instant File Archive & Auto-Fill:** Upload any document or certificate (PDF/PNG/JPG). File name is automatically assigned as the document title for direct instant submission.
- **👤 Profile & Identity Customization:** Edit and update your Full Name directly inside the Profile section with instant, real-time reflection across the top navigation bar and dashboard without requiring a page refresh.
- **🔐 Complete Password Management:** 
  - **Forgot Password Flow:** Self-service email recovery link dispatch via Supabase Auth from the Sign In view.
  - **Change Password:** Dedicated "Security & Password" card inside Profile & Settings for logged-in users with client-side length and match validation.
  - **Set New Password Modal:** Automatic recovery detection when following email reset links.
  - **Password Visibility Toggles:** Clean eye icon (`Eye` / `EyeOff`) toggles for effortless verification.
- **🚪 Sign Out Confirmation Modal:** Custom glassmorphism confirmation modal preventing accidental sign-outs.
- **✏️ Post-Upload Inline Edit:** Seamlessly edit document titles, categories (*Projects, Skills, Certifications, Internships, Achievements, Academics*), dates, and summaries after document archiving.
- **🗑️ Glassmorphic Confirmation Modal:** Custom animated glassmorphism delete modal for safe document removal.
- **🐙 GitHub Repository Auto-Sync:** Type any GitHub username to automatically pull top public repositories into your spatial portfolio with AI categorization and relationship discovery.
- **🏷️ Intelligent Auto-Categorization:** Uses Groq LLM inference (`llama-3.3-70b-versatile`) with fallbacks (`llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it`) to parse document text into structured metadata.
- **🔗 Knowledge Graph & Relationship Engine:** Automatically discovers semantic connections between documents using pgvector cosine similarity and LLM verification.
- **⏳ Interactive Chronological Timeline:** Automatically plots documents by year along a glowing 3D spatial timeline rod.
- **🎙️ Semantic Smart & Voice Search:** Search your entire portfolio with natural language queries or voice search, powered by HuggingFace embeddings (`all-MiniLM-L6-v2`) and AI response synthesis.
- **🔒 Flexible Authentication:** Supports Email/Password authentication as well as GitHub and Google OAuth login powered by Supabase Auth.
- **🖼️ Reliable Cloud Media Storage:** Uploads original high-res assets to Cloudinary. PDFs are explicitly routed as `raw` resources to guarantee public, unblocked access and prevent 401 ACL delivery restrictions. Includes client-side fallback rendering for legacy files.
- **🛡️ Browser Extension Resilience:** Global capture-phase error filtering in `<head>` that isolates external Chrome extension timeouts from interrupting the Next.js runtime.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router, React 19, Tailwind CSS, Lucide Icons, Glassmorphic Design System) — Deployed on **Netlify**
- **Backend:** FastAPI (Python 3.11/3.13), Uvicorn, Pydantic, PyMuPDF, PyTesseract — Deployed on **Render**
- **Database & Auth:** Supabase (PostgreSQL with `pgvector` extension & Supabase Auth)
- **AI & Inference:** Groq API (`llama-3.3-70b-versatile`), HuggingFace `sentence-transformers` (`all-MiniLM-L6-v2`)
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
FRONTEND_URL=https://memory-verse-ai.netlify.app
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
NEXT_PUBLIC_SITE_URL=https://memory-verse-ai.netlify.app
NEXT_PUBLIC_API_URL=https://memory-verse-ai.onrender.com
```

Start Next.js dev server:
```bash
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

---

## 🌐 Production Deployment Guide

### A. Render (FastAPI Backend)
- **Runtime**: `Docker` (Uses `Dockerfile` with CPU-only PyTorch and Tesseract OCR)
- **Root Directory**: `backend`
- **Memory Tuning**: Lazy loading for `SentenceTransformer` keeps startup RAM < 120 MB (fits comfortably in Free Tier 512 MB).
- **Environment Variables**:
  - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
  - `GROQ_API_KEY`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `FRONTEND_URL` (Set to your Netlify production domain: `https://memory-verse-ai.netlify.app`)

### B. Netlify (Next.js Frontend)
- **Framework**: `Next.js`
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
  - `NEXT_PUBLIC_SITE_URL` (Set to your canonical Netlify production domain: `https://memory-verse-ai.netlify.app`)
  - `NEXT_PUBLIC_API_URL` (Set to your Render backend URL, e.g. `https://memory-verse-ai-3yvh.onrender.com`)

---

## 🔐 Google & GitHub OAuth Configuration

To enable Google Login or GitHub Login:
1. Go to your **Supabase Dashboard** -> **Authentication** -> **URL Configuration**.
2. Set **Site URL** to your production domain (`https://memory-verse-ai.netlify.app`).
3. Add `https://memory-verse-ai.netlify.app/**` and `http://localhost:3000/**` to **Redirect URLs**.
4. Go to **Authentication** -> **Providers**, select **Google** (or GitHub), and toggle **Enable Provider**.
5. In **Google Cloud Console**:
   - Under your OAuth 2.0 Web Client, add `https://<your-supabase-project-id>.supabase.co/auth/v1/callback` to **Authorized redirect URIs**.
   - Add `http://localhost:3000` and `https://memory-verse-ai.netlify.app` to **Authorized JavaScript origins**.
6. Paste your **Client ID** and **Client Secret** into the Supabase Google Provider dashboard and click **Save**.

---

## 👤 Developer
**Shaurya Rajput**

---

## 📄 License
This project is licensed under the MIT License.