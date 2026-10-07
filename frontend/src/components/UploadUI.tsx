"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Sparkles,
  Tag,
  Calendar,
  FileText,
  X,
  RefreshCw,
  Code2,
  Zap,
  Award,
  Building2,
  Trophy,
  GraduationCap,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { API_URL } from "@/lib/api";
import { GlassDatePicker } from "./GlassDatePicker";

const CATEGORY_PILLS = [
  {
    name: "Auto AI Detect",
    icon: Sparkles,
    iconColor: "text-purple-400",
    activeClass:
      "bg-linear-to-r from-blue-500/30 to-purple-500/30 border-blue-400/60 text-blue-200 shadow-lg shadow-blue-500/20",
  },
  {
    name: "Projects",
    icon: Code2,
    iconColor: "text-blue-400",
    activeClass:
      "bg-[#3B82F6]/30 border-[#3B82F6]/70 text-blue-200 shadow-lg shadow-[#3B82F6]/20",
  },
  {
    name: "Skills",
    icon: Zap,
    iconColor: "text-emerald-400",
    activeClass:
      "bg-[#10B981]/30 border-[#10B981]/70 text-emerald-200 shadow-lg shadow-[#10B981]/20",
  },
  {
    name: "Certifications",
    icon: Award,
    iconColor: "text-amber-400",
    activeClass:
      "bg-[#F59E0B]/30 border-[#F59E0B]/70 text-amber-200 shadow-lg shadow-[#F59E0B]/20",
  },
  {
    name: "Internships",
    icon: Building2,
    iconColor: "text-orange-400",
    activeClass:
      "bg-[#F97316]/30 border-[#F97316]/70 text-orange-200 shadow-lg shadow-[#F97316]/20",
  },
  {
    name: "Achievements",
    icon: Trophy,
    iconColor: "text-rose-400",
    activeClass:
      "bg-[#F43F5E]/30 border-[#F43F5E]/70 text-rose-200 shadow-lg shadow-[#F43F5E]/20",
  },
  {
    name: "Academics",
    icon: GraduationCap,
    iconColor: "text-cyan-400",
    activeClass:
      "bg-[#06B6D4]/30 border-[#06B6D4]/70 text-cyan-200 shadow-lg shadow-[#06B6D4]/20",
  },
];


export default function UploadUI({ userId, onUploadSuccess }: { userId: string; onUploadSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  
  // Custom Pre-Upload Metadata
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState("Auto AI Detect");
  const [customDate, setCustomDate] = useState("");
  const [customSummary, setCustomSummary] = useState("");
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const formatNetworkError = (err: unknown, defaultMsg: string): string => {
    if (err instanceof Error) {
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        return "Backend API service is currently unreachable. Please verify backend deployment status.";
      }
      return err.message;
    }
    return defaultMsg;
  };

  const handleAutoDetect = async (fileToAnalyze: File | null, urlToAnalyze: string) => {
    if (!fileToAnalyze && !urlToAnalyze) return;
    
    setAiAnalyzing(true);
    setError("");
    setShowEditDetails(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const formData = new FormData();
      if (fileToAnalyze) formData.append("file", fileToAnalyze);
      if (urlToAnalyze) formData.append("url", urlToAnalyze);

      const res = await fetch(`${API_URL}/api/documents/analyze-preview`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.title) setCustomTitle(data.title);
        if (data.category) setCustomCategory(data.category);
        if (data.event_date) setCustomDate(data.event_date);
        if (data.summary) setCustomSummary(data.summary);
      } else {
        let errorMessage = "AI Auto-Detect server error";
        try {
          const errData = await res.json();
          if (errData.detail) errorMessage = errData.detail;
        } catch {
          // Keep default if JSON fails
        }
        setError(errorMessage);
      }
    } catch (e) {
      console.error("AI preview auto-detect error:", e);
      setError(formatNetworkError(e, "AI Auto-Detect service is currently unreachable."));
    } finally {
      setAiAnalyzing(false);
    }
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit. Please upload a smaller file.");
        setFile(null);
        e.target.value = '';
        return;
      }
      setError("");
      setFile(selectedFile);
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      setCustomTitle(cleanName);
      setShowEditDetails(true);

      // Instant AI Reading & Auto Summary Detection
      handleAutoDetect(selectedFile, "");
    }
  };

  const resetForm = () => {
    setFile(null);
    setUrl("");
    setCustomTitle("");
    setCustomCategory("Auto AI Detect");
    setCustomDate("");
    setCustomSummary("");
    setShowEditDetails(false);
    setAiAnalyzing(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !url) {
      setError("Please provide either a file or a URL link.");
      return;
    }
    
    setError("");
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    if (file) formData.append("file", file);
    if (url) formData.append("url", url);
    formData.append("user_id", userId);

    if (customTitle.trim()) formData.append("title", customTitle.trim());
    if (customCategory.trim() && customCategory !== "Auto AI Detect") formData.append("category", customCategory.trim());
    if (customDate.trim()) formData.append("event_date", customDate.trim());
    if (customSummary.trim()) formData.append("summary", customSummary.trim());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = "Failed to upload document";
        try {
          const errData = await res.json();
          if (errData.detail) errorMessage = errData.detail;
        } catch {
          // Keep default if JSON fails
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setResult(data);
      resetForm();
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: unknown) {
      setError(formatNetworkError(err, "An error occurred during upload."));
    } finally {
      setLoading(false);
    }

  };

  const handleGithubSync = async () => {
    if (!githubUsername) {
      setError("Please enter a GitHub username.");
      return;
    }
    setError("");
    setGithubLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/api/documents/github`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: githubUsername })
      });

      if (!res.ok) {
        let errorMessage = "Failed to sync GitHub repos";
        try {
          const errData = await res.json();
          if (errData.detail) errorMessage = errData.detail;
        } catch {
          // Keep default if JSON fails
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setResult(data);
      setGithubUsername("");
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: unknown) {
      setError(formatNetworkError(err, "An error occurred during GitHub sync."));
    } finally {
      setGithubLoading(false);
    }

  };

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className={`flex-1 flex flex-col transition-all duration-500 ${result ? 'blur-md opacity-30 pointer-events-none' : ''}`}>
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Upload Document</h2>
            <p className="text-gray-400 text-sm mt-1">Add to your spatial archive</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5 shadow-inner">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>

        <form onSubmit={handleUpload} className="flex-1 flex flex-col space-y-4">
          
          {/* File Drop Zone (Inner Glass) */}
          <div className="relative group min-h-[110px]">
            <div className="absolute inset-0 spatial-glass-inner flex flex-col items-center justify-center text-center cursor-pointer hover:bg-black/40 transition-colors border border-white/10 hover:border-white/20 rounded-2xl">
              <svg className="w-7 h-7 text-white/50 mb-2 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-300 font-medium">Drag & drop or click to upload</p>
              <p className="text-xs text-gray-500 mt-0.5">PDF, PNG, JPG (10MB max)</p>
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleFileChange}
                accept=".pdf,image/png,image/jpeg"
              />
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl backdrop-blur-md">
              <div className="flex items-center gap-2.5 truncate">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-sm text-blue-200 truncate font-medium">{file.name}</span>
              </div>
              <button 
                type="button" 
                onClick={() => { setFile(null); setCustomTitle(""); }}
                className="text-blue-400 hover:text-blue-300 p-1 hover:bg-blue-500/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* URL Input */}
          <div>
            <input
              type="url"
              placeholder="Or paste a web link (e.g. Medium, Github, Paper)"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (e.target.value) handleAutoDetect(null, e.target.value);
              }}
              className="w-full spatial-glass-inner px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:bg-black/50 transition-all text-sm rounded-xl"
            />
          </div>

          {/* ── Modern Glassmorphic Pre-Upload Details Card ──────────────── */}
          <div className="pt-2 border-t border-white/10 animate-in">
            <button
              type="button"
              onClick={() => setShowEditDetails(!showEditDetails)}
              className="flex items-center justify-between w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-medium text-white/80 hover:text-white"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span>Customize Details Before Archive</span>

                <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 font-normal">Optional</span>
              </div>
              {showEditDetails ? <ChevronUp className="w-4 h-4 text-white/60"/> : <ChevronDown className="w-4 h-4 text-white/60"/>}
            </button>

            {showEditDetails && (
              <div className="mt-3 p-4 space-y-4 rounded-2xl bg-linear-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl border border-white/15 shadow-2xl text-xs animate-in fade-in zoom-in-95">
                
                {/* AI Badge & Re-Analyze Button Banner */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-3.5 h-3.5 text-purple-400 shrink-0 ${aiAnalyzing ? 'animate-spin' : ''}`} />
                    <span>{aiAnalyzing ? "Reading Certificate & Generating Summary..." : "AI Auto-Detect Summary Enabled"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutoDetect(file, url)}
                    disabled={aiAnalyzing || (!file && !url)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[10px] font-semibold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${aiAnalyzing ? 'animate-spin' : ''}`} />
                    <span>Re-Detect</span>
                  </button>
                </div>

                {/* Title */}
                <div>
                  <label className="flex items-center gap-1.5 text-white/70 font-medium mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    Document Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter short descriptive title..."
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-white/30 focus:outline-none focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/40 transition-all"
                  />
                </div>

                {/* Visual Category Pills */}
                <div>
                  <label className="flex items-center gap-1.5 text-white/70 font-medium mb-2">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    Category Selection
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_PILLS.map((pill) => {
                      const isSelected = customCategory === pill.name;
                      const IconComponent = pill.icon;
                      return (
                        <button
                          key={pill.name}
                          type="button"
                          onClick={() => setCustomCategory(pill.name)}
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            isSelected
                              ? pill.activeClass
                              : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <IconComponent
                            className={`w-3.5 h-3.5 ${
                              isSelected ? "text-current" : pill.iconColor
                            }`}
                          />
                          <span>{pill.name}</span>
                        </button>
                      );
                    })}

                  </div>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="flex items-center gap-1.5 text-white/70 font-medium mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Event / Achievement Date
                  </label>
                  <GlassDatePicker
                    value={customDate}
                    onChange={(val) => setCustomDate(val)}
                  />
                </div>

                {/* Summary Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 text-white/70 font-medium">
                      <Edit3 className="w-3.5 h-3.5 text-rose-400" />
                      Summary Section
                    </label>
                    {aiAnalyzing && (
                      <span className="text-[10px] text-purple-400 animate-pulse font-mono">Auto-detecting...</span>
                    )}
                  </div>
                  <textarea
                    placeholder="AI Auto-Detect summary will appear here..."
                    value={customSummary}
                    onChange={(e) => setCustomSummary(e.target.value)}
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-white/30 focus:outline-none focus:border-rose-400/60 focus:ring-1 focus:ring-rose-400/40 resize-none transition-all leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || githubLoading}
            className="w-full py-3.5 px-4 bg-linear-to-r from-blue-500/20 via-white/10 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 backdrop-blur-xl border border-white/20 text-white font-medium rounded-xl transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processing Spatial Map...</span>
              </div>
            ) : (
              <span>Add to Archive</span>
            )}
          </button>
          
          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-white/10 w-full"></div>
            <span className="bg-transparent px-3 text-xs text-white/40 absolute" style={{ background: '#0A0A0F' }}>OR</span>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Sync GitHub Username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              className="w-full spatial-glass-inner px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:bg-black/50 transition-all text-sm rounded-xl"
            />
            <button
              type="button"
              onClick={handleGithubSync}
              disabled={githubLoading || loading}
              className="w-full py-2.5 bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>
              {githubLoading ? "Syncing Top Repos..." : "Sync GitHub Repos"}
            </button>
          </div>
        </form>
      </div>

      {/* Success Result */}
      {result && (
        <div className="absolute inset-[-2rem] z-20 flex flex-col items-center justify-center p-6 animate-in text-center rounded-[28px] overflow-hidden">
          
          {/* Simple translucent background layer */}
          <div className="absolute inset-0 bg-[#0A0A0F]/20"></div>
          
          {/* Content Layer */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-white font-bold mb-2">Ingested Successfully</h3>
            <p className="text-sm text-gray-400 mb-6">AI has mapped this to your timeline.</p>
            <button 
              onClick={() => setResult(null)}
              className="px-6 py-2 bg-white/10 border border-white/10 rounded-full text-sm text-white hover:bg-white/20 transition-colors"
            >
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


