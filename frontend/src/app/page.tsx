"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import UploadUI from "@/components/UploadUI";
import TimelineView from "@/components/TimelineView";
import SmartSearch from "@/components/SmartSearch";
import AuthUI from "@/components/AuthUI";
import LibraryView from "@/components/LibraryView";
import ProfileView from "@/components/ProfileView";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeView, setActiveView] = useState<"home" | "library" | "profile">("home");

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.location.hash === "#library") {
        setActiveView("library");
      } else if (window.location.hash === "#profile") {
        setActiveView("profile");
      }
    }
  }, []);

  const handleNav = (view: "home" | "library" | "profile") => {
    setActiveView(view);
    if (typeof window !== "undefined") {
      window.location.hash = view === "home" ? "" : view;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white"><div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div></div>;
  }

  if (!session) {
    return <AuthUI />;
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  return (
    <main className="min-h-screen">
      {/* ── Top Navbar ──────────────────────────────────────────────────────── */}
      <nav className="w-full fixed top-0 z-50 bg-[#0A0A0F]/80 backdrop-blur-3xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-[10px] bg-white flex items-center justify-center shadow-lg shadow-white/10 shrink-0">
              <span className="font-bold text-[#0A0A0F] text-sm tracking-tighter">MV</span>
            </div>
            <span className="font-semibold text-base sm:text-lg tracking-tight text-white truncate max-w-[120px] sm:max-w-none">
              MemoryVerse
            </span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm font-medium text-white/50">
            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-6">
              <button onClick={() => handleNav("home")} className={`transition-colors ${activeView === "home" ? "text-white" : "hover:text-white"}`}>Dashboard</button>
              <button onClick={() => handleNav("library")} className={`transition-colors ${activeView === "library" ? "text-white" : "hover:text-white"}`}>Library</button>
            </div>
            
            {/* User Profile / Sign Out */}
            <div className="flex items-center md:pl-4 md:border-l border-white/10">
              <button onClick={() => handleNav("profile")} className={`w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center mr-3 transition-colors ${activeView === "profile" ? "ring-2 ring-white/50" : ""}`}>
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </button>
              <button 
                onClick={() => handleNav("profile")} 
                className={`text-xs mr-4 hidden md:block max-w-[150px] lg:max-w-none truncate hover:text-white transition-colors cursor-pointer ${activeView === "profile" ? "text-white" : ""}`}
              >
                {userEmail}
              </button>
              <button 
                onClick={() => supabase.auth.signOut()} 
                className="text-xs md:text-sm text-red-400 hover:text-red-300 transition-colors bg-red-400/10 md:bg-transparent px-3 py-1.5 md:p-0 rounded-lg md:rounded-none hidden md:block"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile Bottom Navigation ──────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0F]/90 backdrop-blur-xl border-t border-white/10 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          <button onClick={() => handleNav("home")} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeView === "home" ? "text-white" : "text-white/40"}`}>
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[10px] font-medium tracking-wide">Dashboard</span>
          </button>
          <button onClick={() => handleNav("library")} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeView === "library" ? "text-white" : "text-white/40"}`}>
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            <span className="text-[10px] font-medium tracking-wide">Library</span>
          </button>
          <button onClick={() => handleNav("profile")} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeView === "profile" ? "text-white" : "text-white/40"}`}>
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px] font-medium tracking-wide">Profile</span>
          </button>
        </div>
      </div>

      {/* ── Conditional Views ──────────────────────────────────────────── */}
      <div className="pt-20 md:pt-24 pb-24 md:pb-12 max-w-[1600px] mx-auto px-4 sm:px-6">
        {activeView === "home" ? (
          <div className="animate-in flex flex-col gap-6">
            
            {/* Bento Grid Top Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Hero & Search (Span 2) */}
              <div className="lg:col-span-2 spatial-glass p-6 sm:p-8 md:p-12 flex flex-col justify-between min-h-[350px] md:min-h-[400px]">
                <div className="mb-8 md:mb-12 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-[11px] text-white/70 mb-6 font-medium uppercase tracking-widest mx-auto md:mx-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                    VisionOS Workspace
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-4">
                    Your Knowledge,<br className="hidden sm:block"/>Spatially Organized.
                  </h1>
                  <p className="text-sm sm:text-base md:text-lg text-white/50 max-w-xl leading-relaxed mx-auto md:mx-0">
                    A multi-dimensional archive that connects your documents, certificates, and projects automatically.
                  </p>
                </div>
                
                <div className="mt-auto w-full">
                  <SmartSearch userId={userId} />
                </div>
              </div>

              {/* Upload Tile (Span 1) */}
              <div className="lg:col-span-1 spatial-glass p-6 sm:p-8 flex flex-col min-h-[350px] md:min-h-[400px]">
                <UploadUI userId={userId} onUploadSuccess={() => setRefreshTrigger((prev) => prev + 1)} />
              </div>
            </div>

            {/* Timeline Row (Full Width) */}
            <div className="spatial-glass p-4 sm:p-8 md:p-12">
              <TimelineView userId={userId} refreshTrigger={refreshTrigger} />
            </div>
          </div>
        ) : activeView === "library" ? (
          <LibraryView userId={userId} />
        ) : (
          <ProfileView userId={userId} userEmail={userEmail} />
        )}
      </div>
    </main>
  );
}
