# MemoryVerse AI — Frontend (Next.js 16)

Modern Glassmorphic Spatial UI for **MemoryVerse AI**, developed by **Shaurya Rajput**.

## 🚀 Features

- **Instant Pre-Upload AI Preview:** Auto-detects certificate summaries, titles, categories, and dates.
- **Glassmorphic Custom Delete Modal:** Custom confirmation modal replacing native browser popups.
- **GitHub Sync & OAuth Auth:** Powered by Supabase Auth with Google & GitHub provider support.
- **Spatial 3D Timeline & Smart Voice Search:** Interactive timeline rendering and natural language query search.

## 🛠️ Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

## ⚙️ Environment Variables

Create `.env.local` inside `frontend/`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## 🌐 Deployment (Vercel)

When deploying to Vercel:
- **Root Directory**: `frontend`
- **Framework**: `Next.js`
- Set `NEXT_PUBLIC_SITE_URL` to your production domain (`https://memory-verse-ai-gray.vercel.app`) to ensure auth redirects return to the active production deployment.

