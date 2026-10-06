"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { API_URL } from "@/lib/api";

interface MatchedDocument {
  id: string;
  title: string | null;
  category: string | null;
  file_url: string | null;
  summary: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  Projects: "text-[#3B82F6] border-[#3B82F6]/30 bg-[#3B82F6]/10",
  Skills: "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10",
  Certifications: "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10",
  Internships: "text-[#F97316] border-[#F97316]/30 bg-[#F97316]/10",
  Achievements: "text-[#F43F5E] border-[#F43F5E]/30 bg-[#F43F5E]/10",
  Academics: "text-[#06B6D4] border-[#06B6D4]/30 bg-[#06B6D4]/10",
};

export default function SmartSearch({ userId }: { userId: string }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [docs, setDocs] = useState<MatchedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
          submitSearch(transcript);
        };
        
        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setQuery("");
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const submitSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setAnswer("");
    setDocs([]);
    stopSpeaking();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/api/search`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      const data = await res.json();
      const finalAnswer = data.answer || "";
      setAnswer(finalAnswer);
      setDocs(data.matched_documents || []);

      if (finalAnswer && typeof window !== "undefined" && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(finalAnswer);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    } catch {
      setAnswer("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch(query);
  };

  return (
    <div className="w-full">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative group">
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center spatial-glass-inner p-1 sm:p-1.5 gap-2 sm:gap-0 focus-within:ring-1 focus-within:ring-white/20 transition-all duration-300">
          <div className="flex-1 flex items-center">
            <svg className="w-5 h-5 text-gray-400 ml-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask your archive..."
              className="w-full bg-transparent text-white placeholder-gray-500 px-4 py-3 text-sm md:text-lg focus:outline-none min-h-[44px]"
            />
            {/* Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-full mr-2 transition-all shrink-0 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              title="Voice Search"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 sm:py-2.5 sm:mr-1 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white text-sm font-medium rounded-xl sm:rounded-[16px] transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
            ) : (
              "Search"
            )}
          </button>
        </div>
      </form>

      {/* Results Container */}
      {(hasSearched && (loading || answer || docs.length > 0)) && (
        <div className="mt-6 pt-6 border-t border-white/10 animate-in relative">
          
          {loading && (
             <div className="flex items-center space-x-3 text-gray-400">
               <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
               <span className="text-sm">Synthesizing answer...</span>
             </div>
          )}

          {/* Stop Audio Button */}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="absolute top-6 right-0 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/50 hover:text-white transition-colors flex items-center gap-2 text-xs font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
              Stop Audio
            </button>
          )}

          {/* AI Answer */}
          {!loading && answer && (
            <div className="mb-6 flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-lg ${isSpeaking ? 'bg-blue-500/20 border border-blue-500/50 shadow-blue-500/20 animate-pulse' : 'bg-white/10 border border-white/20 shadow-white/5'}`}>
                <svg className={`w-4 h-4 ${isSpeaking ? 'text-blue-400' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-base text-gray-200 leading-relaxed font-light pr-24">{answer}</p>
            </div>
          )}

          {/* Matched Documents Grid */}
          {!loading && docs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
              {docs.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 spatial-glass-inner hover:bg-white/5 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white group-hover:text-blue-200 transition-colors">{doc.title || "Untitled"}</h4>
                      {doc.summary && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{doc.summary}</p>
                      )}
                    </div>
                  </div>
                  {doc.category && (
                    <div className="mt-3">
                      <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${CATEGORY_COLORS[doc.category] || "bg-white/5 text-gray-300 border-white/10"}`}>
                        {doc.category}
                      </span>
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && docs.length === 0 && !answer && (
            <p className="text-sm text-gray-500">No matching documents found.</p>
          )}
        </div>
      )}
    </div>
  );
}
