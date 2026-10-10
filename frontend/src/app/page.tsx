"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import UploadUI from "@/components/UploadUI";
import TimelineView from "@/components/TimelineView";
import SmartSearch from "@/components/SmartSearch";
import AuthUI from "@/components/AuthUI";
import LibraryView from "@/components/LibraryView";
import ProfileView from "@/components/ProfileView";
import { LogOut, Lock, KeyRound, Check } from "lucide-react";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeView, setActiveView] = useState<"home" | "library" | "profile">("home");
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [welcomeModal, setWelcomeModal] = useState<{ show: boolean; isNewUser: boolean; userName: string } | null>(null);
  const [customName, setCustomName] = useState<string | null>(null);

  // Password Recovery state
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirm, setRecoveryConfirm] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const handleNav = (view: "home" | "library" | "profile") => {
    setActiveView(view);
    if (typeof window !== "undefined") {
      window.location.hash = view === "home" ? "" : view;
    }
  };

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setIsSigningOut(false);
      setShowSignOutModal(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    const user = session.user;
    const sessionKey = `welcome_shown_${user.id}`;

    if (typeof window !== "undefined" && !sessionStorage.getItem(sessionKey)) {
      const storedType = localStorage.getItem("memoryverse_welcome_type");
      const storedName = localStorage.getItem("memoryverse_user_name");

      const metadata = user.user_metadata || {};
      const nameToDisplay = 
        storedName || 
        metadata.full_name || 
        metadata.name || 
        metadata.user_name || 
        metadata.preferred_username || 
        (user.email ? user.email.split("@")[0] : "User");

      const createdAtTime = new Date(user.created_at).getTime();
      const isRecentlyCreated = (Date.now() - createdAtTime) < 25000;
      const isNew = storedType === "new" || isRecentlyCreated;

      setWelcomeModal({
        show: true,
        isNewUser: isNew,
        userName: nameToDisplay,
      });

      sessionStorage.setItem(sessionKey, "true");
      localStorage.removeItem("memoryverse_welcome_type");
      localStorage.removeItem("memoryverse_user_name");
    }
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      if (hash === "#library") setActiveView("library");
      else if (hash === "#profile") setActiveView("profile");
      else if (hash.includes("type=recovery") || hash.includes("reset-password")) {
        setShowPasswordResetModal(true);
      }
    }

    const timeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2500);

    try {
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (isMounted) {
            setSession(session);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Supabase auth session error:", err);
          if (isMounted) setLoading(false);
        })
        .finally(() => clearTimeout(timeout));

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (isMounted) setSession(session);
        if (event === "PASSWORD_RECOVERY") {
          setShowPasswordResetModal(true);
        }
      });

      return () => {
        isMounted = false;
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    } catch (err) {
      console.error("Supabase client error:", err);
      if (isMounted) setLoading(false);
      clearTimeout(timeout);
    }
  }, []);

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryPassword.length < 6) {
      setRecoveryError("Password must be at least 6 characters long.");
      return;
    }
    if (recoveryPassword !== recoveryConfirm) {
      setRecoveryError("Passwords do not match.");
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: recoveryPassword,
      });
      if (error) throw error;

      setRecoverySuccess(true);
      setTimeout(() => {
        setShowPasswordResetModal(false);
        setRecoverySuccess(false);
        setRecoveryPassword("");
        setRecoveryConfirm("");
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }, 2500);
    } catch (err: unknown) {
      setRecoveryError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-white p-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-white/50 tracking-widest uppercase">Loading MemoryVerse...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthUI />;
  }

  const userId = session.user.id;
  const userEmail = session.user.email || "";
  const metadata = session.user.user_metadata || {};
  const baseUserName = 
    metadata.full_name || 
    metadata.name || 
    metadata.user_name || 
    metadata.preferred_username || 
    (userEmail ? userEmail.split('@')[0] : "User");
  const userName = customName || baseUserName;
  const userAvatar = metadata.avatar_url || metadata.picture || null;

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
              <button 
                onClick={() => handleNav("profile")} 
                className={`w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center mr-3 transition-colors overflow-hidden ${activeView === "profile" ? "ring-2 ring-white/50" : ""}`}
                title={userName}
              >
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-xs text-white uppercase">{userName.charAt(0)}</span>
                )}
              </button>
              <button 
                onClick={() => handleNav("profile")} 
                className={`text-xs mr-4 hidden md:block max-w-[150px] lg:max-w-none truncate hover:text-white transition-colors cursor-pointer ${activeView === "profile" ? "text-white font-medium" : ""}`}
              >
                {userName}
              </button>
              <button 
                onClick={() => setShowSignOutModal(true)} 
                className="text-xs md:text-sm text-red-400 hover:text-red-300 transition-colors bg-red-400/10 md:bg-transparent px-3 py-1.5 md:p-0 rounded-lg md:rounded-none hidden md:block cursor-pointer"
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
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className={`w-5 h-5 rounded-full object-cover mb-1 border ${activeView === "profile" ? "border-white" : "border-white/40"}`} />
            ) : (
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )}
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
          <ProfileView 
            userId={userId} 
            userEmail={userEmail} 
            userName={userName} 
            userAvatar={userAvatar} 
            onSignOut={() => setShowSignOutModal(true)} 
            onNameUpdated={(newName) => setCustomName(newName)}
          />
        )}
      </div>

      {/* ── Sign Out Confirmation Modal ───────────────────────────────── */}
      {showSignOutModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar">
          <div className="min-h-full flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/70 backdrop-blur-md" 
              onClick={() => !isSigningOut && setShowSignOutModal(false)}
            ></div>
            <div className="relative z-10 spatial-glass bg-[#0A0A0F]/95 w-full max-w-sm p-6 sm:p-8 rounded-3xl border border-red-500/20 shadow-[0_10px_40px_rgba(239,68,68,0.15)] animate-in fade-in zoom-in-95 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
                <LogOut className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sign Out</h3>
              <p className="text-sm text-white/60 mb-6 leading-relaxed">
                Are you sure you want to sign out of MemoryVerse?
              </p>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowSignOutModal(false)}
                  disabled={isSigningOut}
                  className="flex-1 py-3 text-sm font-medium bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleConfirmSignOut}
                  disabled={isSigningOut}
                  className="flex-1 py-3 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-500/25"
                >
                  {isSigningOut ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : null}
                  {isSigningOut ? "Signing Out..." : "Sign Out"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Welcome / Onboarding Modal ───────────────────────────────── */}
      {welcomeModal?.show && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar">
          <div className="min-h-full flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/75 backdrop-blur-md" 
              onClick={() => setWelcomeModal(null)}
            ></div>
            <div className="relative z-10 spatial-glass bg-[#0A0A0F]/95 w-full max-w-md p-8 sm:p-10 rounded-3xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 text-center">
              {welcomeModal.isNewUser ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 border border-emerald-400/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
                    <span className="text-3xl">🎉</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Congratulations!</h3>
                  <p className="text-sm sm:text-base text-white/80 mb-8 leading-relaxed">
                    Congratulations, <span className="text-emerald-400 font-bold">{welcomeModal.userName}</span>! Your account has been successfully created.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/30 border border-blue-400/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(59,130,246,0.25)]">
                    <span className="text-3xl">✨</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Welcome Back!</h3>
                  <p className="text-sm sm:text-base text-white/80 mb-8 leading-relaxed">
                    Welcome back, <span className="text-blue-400 font-bold">{welcomeModal.userName}</span>! Glad to see you again.
                  </p>
                </>
              )}

              <button 
                type="button"
                onClick={() => setWelcomeModal(null)}
                className="w-full py-3.5 text-sm font-bold bg-white text-[#0A0A0F] rounded-xl hover:bg-gray-200 transition-all shadow-lg shadow-white/10 active:scale-[0.98] cursor-pointer"
              >
                {welcomeModal.isNewUser ? "Explore Workspace" : "Go to Dashboard"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Password Recovery / Reset Modal ──────────────────────────── */}
      {showPasswordResetModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar">
          <div className="min-h-full flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-md" 
              onClick={() => !recoveryLoading && !recoverySuccess && setShowPasswordResetModal(false)}
            ></div>
            <div className="relative z-10 spatial-glass bg-[#0A0A0F]/95 w-full max-w-md p-8 sm:p-10 rounded-3xl border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-5 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.25)]">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-white text-center mb-2 tracking-tight">Set New Password</h3>
              <p className="text-sm text-white/60 text-center mb-6 leading-relaxed">
                Enter your new password to regain full access to your account.
              </p>

              {recoverySuccess ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-2xl flex items-center justify-center gap-2 font-medium animate-in fade-in">
                  <Check className="w-5 h-5 shrink-0" />
                  Password updated! Redirecting to dashboard...
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={recoveryPassword}
                      onChange={(e) => setRecoveryPassword(e.target.value)}
                      disabled={recoveryLoading}
                      required
                      placeholder="Minimum 6 characters"
                      className="w-full spatial-glass-inner px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400/50 transition-all text-sm rounded-xl"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={recoveryConfirm}
                      onChange={(e) => setRecoveryConfirm(e.target.value)}
                      disabled={recoveryLoading}
                      required
                      placeholder="Re-enter password"
                      className="w-full spatial-glass-inner px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400/50 transition-all text-sm rounded-xl"
                    />
                  </div>

                  {recoveryError && (
                    <p className="text-xs text-red-400 font-medium">{recoveryError}</p>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={recoveryLoading || !recoveryPassword || !recoveryConfirm}
                      className="w-full py-3.5 px-6 bg-white text-[#0B0D17] font-bold rounded-xl hover:bg-gray-200 transition-all focus:outline-none disabled:opacity-50 active:scale-[0.98] cursor-pointer shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                    >
                      {recoveryLoading ? (
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      {recoveryLoading ? "Updating Password..." : "Set New Password"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
