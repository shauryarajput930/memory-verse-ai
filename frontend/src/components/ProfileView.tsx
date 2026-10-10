"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { API_URL } from "@/lib/api";
import { User, LogOut, FileText, Activity, Edit2, Check, X, Lock, KeyRound, Eye, EyeOff, Shield } from "lucide-react";

export default function ProfileView({ 
  userId, 
  userEmail, 
  userName, 
  userAvatar, 
  isPasswordUser = true,
  authProvider = "email",
  onSignOut, 
  onNameUpdated 
}: { 
  userId: string; 
  userEmail: string; 
  userName?: string; 
  userAvatar?: string | null; 
  isPasswordUser?: boolean;
  authProvider?: string;
  onSignOut?: () => void; 
  onNameUpdated?: (newName: string) => void; 
}) {
  const [stats, setStats] = useState({
    totalDocs: 0,
    categories: {} as Record<string, number>
  });
  const [loading, setLoading] = useState(true);

  // Name editing state
  const initialName = userName || (userEmail ? userEmail.split('@')[0] : "User");
  const [currentName, setCurrentName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password changing state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (userName) {
      setCurrentName(userName);
    }
  }, [userName]);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/api/timeline/${userId}`, {
          method: "GET",
          headers,
        });

        if (!res.ok) throw new Error(`HTTP status ${res.status}`);

        const data = await res.json();
        const allItems = (data.timeline || []).flatMap((y: { items: Array<{ category?: string }> }) => y.items);
        
        const cats: Record<string, number> = {};
        allItems.forEach((item: { category?: string }) => {
          const c = item.category || "Uncategorized";
          cats[c] = (cats[c] || 0) + 1;
        });

        if (isMounted) {
          setStats({
            totalDocs: allItems.length,
            categories: cats
          });
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Profile stats fetch notice:", e);
        }
        if (isMounted) {
          setStats({ totalDocs: 0, categories: {} });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, [userId]);

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      supabase.auth.signOut();
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editValue.trim();
    if (!trimmed) {
      setSaveError("Name cannot be empty.");
      return;
    }
    if (trimmed === currentName) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      // 1. Update Supabase Auth user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: trimmed,
          name: trimmed,
        },
      });

      if (error) throw error;

      // 2. Sync with backend profiles database table
      try {
        await fetch(`${API_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            email: userEmail,
            full_name: trimmed,
          }),
        });
      } catch (backendErr) {
        console.warn("Backend profile sync notice:", backendErr);
      }

      // 3. Update local state
      setCurrentName(trimmed);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);

      // 4. Notify parent page.tsx to update Navbar in real time
      if (onNameUpdated) {
        onNameUpdated(trimmed);
      }

      // 5. Refresh session
      await supabase.auth.refreshSession();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update name.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in mt-8">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-3xl font-bold text-white tracking-tight">Profile & Settings</h2>
        <p className="text-white/50 text-sm mt-1">Manage your account and view statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="md:col-span-1 spatial-glass p-6 sm:p-8 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(255,255,255,0.15)] overflow-hidden relative">
            {userAvatar ? (
              <img src={userAvatar} alt={currentName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <span className="text-3xl font-black text-white uppercase">{currentName.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Name & Quick Edit Trigger */}
          <div className="flex items-center justify-center gap-2 mb-1 w-full px-2">
            <h3 className="text-xl font-bold text-white truncate" title={currentName}>
              {currentName}
            </h3>
            {!isEditing && (
              <button 
                onClick={() => {
                  setIsEditing(true);
                  setEditValue(currentName);
                  setSaveError(null);
                }}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Edit name"
                aria-label="Edit name"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="text-xs text-white/50 mb-2 truncate w-full" title={userEmail}>{userEmail}</p>
          <p className="text-[10px] text-blue-400/90 mb-6 uppercase tracking-widest font-semibold">MemoryVerse Architect</p>

          {/* Success Banner */}
          {saveSuccess && (
            <div className="w-full mb-4 p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center justify-center gap-1.5 font-medium animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              Name updated successfully!
            </div>
          )}

          {/* Inline Edit Form */}
          {isEditing ? (
            <form onSubmit={handleSaveName} className="w-full mb-6 text-left space-y-3 p-4 bg-white/5 border border-white/10 rounded-2xl animate-in fade-in">
              <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider">
                Edit Display Name
              </label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                disabled={saving}
                required
                placeholder="Enter your full name"
                className="w-full spatial-glass-inner px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm rounded-xl"
                autoFocus
              />
              {saveError && (
                <p className="text-xs text-red-400 font-medium">{saveError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSaveError(null);
                  }}
                  disabled={saving}
                  className="flex-1 py-2 text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editValue.trim()}
                  className="flex-1 py-2 text-xs font-semibold text-[#0B0D17] bg-white hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setIsEditing(true);
                setEditValue(currentName);
                setSaveError(null);
              }}
              className="w-full py-2.5 mb-4 spatial-glass-inner text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border border-white/10"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
              Edit Display Name
            </button>
          )}
          
          <button 
            onClick={handleSignOut}
            className="w-full py-3 spatial-glass-inner text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Right Column: Stats & Security Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Stats Card */}
          <div className="spatial-glass p-6 sm:p-8 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Archive Statistics
            </h3>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="spatial-glass-inner p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg"><FileText className="w-5 h-5 text-white/70" /></div>
                    <span className="font-medium text-white/80">Total Documents</span>
                  </div>
                  <span className="text-2xl font-black text-white">{stats.totalDocs}</span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">By Category</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(stats.categories).sort((a,b) => b[1] - a[1]).map(([cat, count]) => (
                      <div key={cat} className="spatial-glass-inner p-3 rounded-lg flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-bold text-white mb-1">{count}</span>
                        <span className="text-[10px] text-white/50 uppercase font-medium">{cat}</span>
                      </div>
                    ))}
                    {Object.keys(stats.categories).length === 0 && (
                      <p className="text-sm text-white/40 col-span-full text-center py-4">No documents ingested yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Security & Authentication Card */}
          <div className="spatial-glass p-6 sm:p-8 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Security & Authentication
              </h3>
              {isPasswordUser ? (
                !isChangingPassword && (
                  <button
                    onClick={() => {
                      setIsChangingPassword(true);
                      setPasswordError(null);
                      setPasswordSuccess(false);
                    }}
                    className="px-3 py-1.5 spatial-glass-inner text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-white/10"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                    Change Password
                  </button>
                )
              ) : (
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                  {authProvider.toUpperCase()} SECURED
                </span>
              )}
            </div>
            <p className="text-xs text-white/50 mb-6">Manage your account authentication and credentials</p>

            {isPasswordUser ? (
              <>
                {passwordSuccess && (
                  <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-medium animate-in fade-in">
                    <Check className="w-4 h-4 shrink-0" />
                    Password changed successfully! Your new password is now active.
                  </div>
                )}

                {isChangingPassword ? (
                  <form onSubmit={handleUpdatePassword} className="space-y-4 p-5 bg-white/5 border border-white/10 rounded-2xl animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={passwordLoading}
                            required
                            placeholder="Min 6 characters"
                            className="w-full spatial-glass-inner px-3.5 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
                            tabIndex={-1}
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={passwordLoading}
                            required
                            placeholder="Re-enter password"
                            className="w-full spatial-glass-inner px-3.5 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm rounded-xl"
                          />
                        </div>
                      </div>
                    </div>

                    {passwordError && (
                      <p className="text-xs text-red-400 font-medium">{passwordError}</p>
                    )}

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingPassword(false);
                          setPasswordError(null);
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                        disabled={passwordLoading}
                        className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={passwordLoading || !newPassword || !confirmPassword}
                        className="px-5 py-2 text-xs font-semibold text-[#0B0D17] bg-white hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        {passwordLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                        {passwordLoading ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="spatial-glass-inner p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg"><Lock className="w-4 h-4 text-white/70" /></div>
                      <div>
                        <div className="font-medium text-white text-sm">Account Password</div>
                        <div className="text-xs text-white/40">••••••••••••</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsChangingPassword(true);
                        setPasswordError(null);
                        setPasswordSuccess(false);
                      }}
                      className="px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="spatial-glass-inner p-5 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-white/10 rounded-xl">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">
                      Signed in via {authProvider === "google" ? "Google" : authProvider === "github" ? "GitHub" : authProvider}
                    </div>
                    <div className="text-xs text-white/50 mt-0.5">
                      Your account authentication is secured by {authProvider === "google" ? "Google" : authProvider === "github" ? "GitHub" : "your OAuth provider"}. Password updates are managed directly through your {authProvider === "google" ? "Google" : authProvider === "github" ? "GitHub" : "OAuth"} account.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

