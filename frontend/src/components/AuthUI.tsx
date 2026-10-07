"use client";

import { useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";


export default function AuthUI() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(true);



  const getRedirectUrl = () => {
    let url =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" && window.location.origin ? window.location.origin : "") ||
      "https://memory-verse-ai.netlify.app/";


    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    if (!url.endsWith("/")) {
      url = `${url}/`;
    }
    return url;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            throw new Error("Email not confirmed. Please check your email inbox to verify your account before logging in.");
          }
          if (error.message.toLowerCase().includes("invalid login credentials")) {
            throw new Error("Invalid email or password. Please double-check your credentials.");
          }
          throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getRedirectUrl(),
          },
        });
        if (error) throw error;

        if (data?.user && !data.session) {
          setMessage("Account created! Please check your email to confirm your account before logging in.");
          setIsLogin(true);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'github' | 'google') => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: getRedirectUrl(),
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : `An error occurred during ${provider} authentication.`;
      if (msg.toLowerCase().includes("provider is not enabled") || msg.toLowerCase().includes("unsupported provider") || msg.toLowerCase().includes("not configured")) {
        msg = `${provider === 'google' ? 'Google' : 'GitHub'} login is not enabled in your Supabase Console. Please enable the ${provider === 'google' ? 'Google' : 'GitHub'} provider under Authentication → Providers in your Supabase Dashboard.`;
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 animate-in">
      <div className="w-full max-w-md p-10 spatial-glass">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-[14px] bg-white flex items-center justify-center font-bold text-[#0B0D17] text-xl shadow-lg shadow-white/10 mb-5">M</div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">MemoryVerse</h2>
          <p className="text-white/50 text-sm mt-2">
            {isLogin ? "Welcome back to your spatial archive." : "Start building your digital identity."}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full spatial-glass-inner px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full spatial-glass-inner px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
              {message}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              {error}
            </div>
          )}


          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-white text-[#0B0D17] font-semibold rounded-xl hover:bg-gray-200 transition-all focus:outline-none disabled:opacity-50 mt-4 active:scale-[0.98]"
          >
            {loading ? "Processing..." : isLogin ? "Enter Workspace" : "Create Account"}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-400 bg-zinc-950/50">Or continue with</span>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => handleOAuth('github')}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all focus:outline-none flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>
              GitHub
            </button>
            <button
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all focus:outline-none flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
              Google
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
