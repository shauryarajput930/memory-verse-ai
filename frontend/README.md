# MemoryVerse AI — Frontend (Next.js 16)

Modern Glassmorphic Spatial UI for **MemoryVerse AI**, developed by **Shaurya Rajput**.

## 🚀 Features

- **Direct Instant Upload:** Auto-sets document title to the uploaded file name with instant submission.
- **Profile Name Customization:** Interactive name editing within Profile & Settings with immediate live reflection in the Top Navbar.
- **Complete Password Management:** 
  - "Forgot password?" self-service email reset link from Sign In.
  - Dedicated "Security & Password" card inside Profile view.
  - Interactive "Set New Password" modal on email recovery link return.
  - Show/hide password visibility toggles (`Eye` / `EyeOff`).
- **Glassmorphic Sign-Out Confirmation:** Modal popup preventing accidental logouts.
- **Glassmorphic Custom Delete Modal:** Custom confirmation modal replacing native browser popups.
- **GitHub Sync & OAuth Auth:** Powered by Supabase Auth with Google & GitHub provider support.
- **Spatial 3D Timeline & Smart Voice Search:** Interactive timeline rendering and natural language query search.
- **Browser Extension Error Isolation:** Early `<head>` error interception protecting the UI from third-party extension timeout errors.

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
NEXT_PUBLIC_SITE_URL=https://memory-verse-ai.netlify.app
NEXT_PUBLIC_API_URL=https://memory-verse-ai-3yvh.onrender.com
```

## 🌐 Deployment (Netlify)

When deploying to Netlify:
- **Root Directory**: `frontend`
- **Framework**: `Next.js`
- Set `NEXT_PUBLIC_SITE_URL` to your production domain (`https://memory-verse-ai.netlify.app`) to ensure auth redirects return to the active production deployment.
