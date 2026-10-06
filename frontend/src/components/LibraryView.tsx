"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link as LinkIcon, FileText, Download, CheckCircle, Search, Filter, ArrowUpDown, ChevronDown, RefreshCw, AlertTriangle, Edit2, Trash2, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { API_URL } from "@/lib/api";
import { GlassDatePicker } from "./GlassDatePicker";

interface DocumentRelationship {
  target_id: string;
  target_title: string;
  relationship_type: string;
  confidence: number;
}

interface TimelineItem {
  id: string;
  title: string | null;
  category: string | null;
  event_date: string | null;
  summary: string | null;
  file_url: string | null;
  file_type: string | null;
  relationships: DocumentRelationship[];
}

interface TimelineYear {
  year: number | string;
  items: TimelineItem[];
}

interface TimelineResponse {
  timeline: TimelineYear[];
}

interface LibraryViewProps {
  userId: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Projects: "text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/30 shadow-[#3B82F6]/20",
  Skills: "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30 shadow-[#10B981]/20",
  Certifications: "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30 shadow-[#F59E0B]/20",
  Internships: "text-[#F97316] bg-[#F97316]/10 border-[#F97316]/30 shadow-[#F97316]/20",
  Achievements: "text-[#F43F5E] bg-[#F43F5E]/10 border-[#F43F5E]/30 shadow-[#F43F5E]/20",
  Academics: "text-[#06B6D4] bg-[#06B6D4]/10 border-[#06B6D4]/30 shadow-[#06B6D4]/20",
  FAILED: "text-red-400 bg-red-400/10 border-red-400/20",
};

function CustomDropdown({ options, value, onChange }: { options: {label: string, value: string}[], value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="spatial-glass-inner px-4 py-3 text-sm text-white focus:outline-none focus:bg-black/40 flex items-center gap-2 cursor-pointer transition-all min-w-[150px] justify-between min-h-[44px]"
      >
        <span className="truncate">{selectedOption.label}</span>
        <svg className={`w-4 h-4 text-white/50 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 w-full min-w-[160px] spatial-glass bg-[#0A0A0F]/90 backdrop-blur-3xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-white/10 ${value === opt.value ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:text-white'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModalSelect({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full bg-[#1A1A24] border border-white/10 rounded-xl px-4 py-3 text-white text-base flex justify-between items-center focus:outline-none focus:border-white/30 transition-all"
      >
        <span>{value || "Select Category"}</span>
        <ChevronDown className={`w-5 h-5 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-[#1A1A24] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-white/5 ${value === opt ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:text-white'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LibraryView({ userId }: LibraryViewProps) {
  const [data, setData] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("newest");
  
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [editForm, setEditForm] = useState({ title: "", category: "", summary: "", event_date: "" });
  const [isSaving, setIsSaving] = useState(false);

  const [deletingItem, setDeletingItem] = useState<TimelineItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/api/timeline/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const allItems = data.timeline.flatMap((year: any) => year.items);
      setData(allItems);
    } catch (err) {
      console.error("Failed to load library:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleRetry = async (docIds: string[]) => {
    setRetryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/api/documents/retry`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ doc_ids: docIds })
      });
      if (res.ok) {
        fetchLibrary();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRetryLoading(false);
    }
  };

  const handleDismiss = async (docIds: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/api/documents/delete`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ doc_ids: docIds })
      });
      if (res.ok) {
        fetchLibrary();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (item: TimelineItem, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditingItem(item);
    setEditForm({
      title: item.title || "Untitled Document",
      category: item.category && item.category !== "FAILED" ? item.category : "Projects",
      summary: item.summary || "",
      event_date: item.event_date ? item.event_date.split('T')[0] : new Date().toISOString().split('T')[0]
    });
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API_URL}/api/documents/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setEditingItem(null);
        fetchLibrary();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (item: TimelineItem, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDeletingItem(item);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API_URL}/api/documents/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ doc_ids: [deletingItem.id] })
      });
      if (res.ok) {
        setDeletingItem(null);
        fetchLibrary();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  const failedDocs = data.filter(d => d.category === "FAILED");

  if (data.length === 0) {
    return (
      <div className="text-center py-32 max-w-2xl mx-auto animate-in spatial-glass p-12">
        <h3 className="text-3xl font-bold mb-4 text-white tracking-tight">Archive is empty.</h3>
        <p className="text-white/50 text-lg">
          Upload documents to build your spatial knowledge graph.
        </p>
      </div>
    );
  }

  // Filtering
  let filteredDocs = data;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredDocs = filteredDocs.filter(d => 
      d.title?.toLowerCase().includes(q) || 
      d.summary?.toLowerCase().includes(q)
    );
  }
  if (selectedCategory !== "All") {
    filteredDocs = filteredDocs.filter(d => d.category === selectedCategory);
  }

  // Sorting
  filteredDocs.sort((a, b) => {
    if (sortOption === "a-z") {
      return (a.title || "").localeCompare(b.title || "");
    }
    const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
    const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
    if (sortOption === "newest") {
      return dateB - dateA;
    } else {
      return dateA - dateB;
    }
  });

  // Group filtered & sorted docs by category
  const categorized: Record<string, TimelineItem[]> = {};
  filteredDocs.forEach((item) => {
    const cat = item.category || "Uncategorized";
    if (!categorized[cat]) {
      categorized[cat] = [];
    }
    categorized[cat].push(item);
  });

  return (
    <div className="w-full animate-in">
      <div className="mb-12 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-bold mb-3 text-white tracking-tight drop-shadow-sm">
            Spatial Library
          </h2>
          <p className="text-white/50 text-lg">All your documents, categorized in glass containers.</p>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="spatial-glass-inner pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:bg-black/40 w-full sm:w-64 transition-all"
            />
          </div>

          <CustomDropdown 
            options={[
              { label: "All Categories", value: "All" },
              ...Object.keys(CATEGORY_COLORS).map(c => ({ label: c, value: c }))
            ]}
            value={selectedCategory}
            onChange={setSelectedCategory}
          />

          <CustomDropdown 
            options={[
              { label: "Newest First", value: "newest" },
              { label: "Oldest First", value: "oldest" },
              { label: "Alphabetical (A-Z)", value: "a-z" }
            ]}
            value={sortOption}
            onChange={setSortOption}
          />
        </div>
      </div>

      {/* Retry Banner (Spatial Style) */}
      {failedDocs.length > 0 && (
        <div className="mb-10 spatial-glass border-red-500/30 bg-red-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-[0_8px_32px_0_rgba(239,68,68,0.1)] gap-4 sm:gap-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
               <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
            </div>
            <span className="text-white font-medium">{failedDocs.length} document(s) couldn't be processed by the AI.</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => handleRetry(failedDocs.map(d => d.id))}
              disabled={retryLoading}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-white font-medium rounded-xl transition-all border border-red-500/30 disabled:opacity-50 text-sm whitespace-nowrap"
            >
              {retryLoading ? "Retrying..." : "Retry Processing"}
            </button>
            <button 
              onClick={() => handleDismiss(failedDocs.map(d => d.id))}
              className="px-4 py-2.5 text-white/50 hover:text-white transition-all text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Bento Grid for Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {Object.entries(categorized)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, items]) => {
            // Span logic: if a category has > 4 items, let it span 2 columns if on tablet/desktop.
            const spanClass = items.length > 4 ? "md:col-span-2 xl:col-span-2" : "md:col-span-1 xl:col-span-1";
            const colorClass = CATEGORY_COLORS[category] || "text-gray-300 bg-gray-500/10 border-gray-500/30 shadow-gray-500/20";
            
            return (
              <div key={category} className={`spatial-glass p-6 md:p-8 relative overflow-hidden group ${spanClass}`}>
                
                {/* Top glow based on category color */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] ${colorClass.split(' ')[1]} shadow-[0_0_20px_var(--tw-shadow-color)] ${colorClass.split(' ')[3]}`}></div>

                <div className="flex items-center justify-start gap-4 mb-8 sticky top-0 md:static bg-[#0A0A0F]/20 md:bg-transparent backdrop-blur-md md:backdrop-blur-none p-2 md:p-0 -mx-2 md:mx-0 -mt-2 md:mt-0 rounded-lg md:rounded-none z-10">
                  <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                    {category}
                  </h3>
                  <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-widest ${colorClass.split(' ')[0]} ${colorClass.split(' ')[1]} ${colorClass.split(' ')[2]}`}>
                     {items.length}
                  </div>
                </div>

                <div className={`grid grid-cols-1 ${items.length > 4 ? "md:grid-cols-2" : "md:grid-cols-1"} gap-6`}>
                  {items.map((item) => {
                    let previewUrl = item.file_url;
                    if (item.file_type === 'pdf' && previewUrl?.includes('res.cloudinary.com')) {
                      previewUrl = previewUrl.replace('/raw/upload/', '/image/upload/');
                      previewUrl = previewUrl.replace(/\.pdf$/i, '.jpg');
                    } else if (item.file_type === 'pdf') {
                      previewUrl = null;
                    }

                    return (
                      <a
                        key={item.id}
                        href={item.file_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="spatial-glass-inner spatial-hover group relative p-4 flex gap-4 h-32"
                      >
                         {/* Preview Thumbnail */}
                        <div className="w-20 h-full rounded-xl overflow-hidden bg-black/40 border border-white/5 shrink-0 relative flex items-center justify-center">
                           {(item.file_type === 'image' || (item.file_type === 'pdf' && previewUrl)) ? (
                             <>
                               {/* eslint-disable-next-line @next/next/no-img-element */}
                               <img 
                                 src={previewUrl!} 
                                 alt="Preview" 
                                 className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all" 
                                 onError={(e) => {
                                   e.currentTarget.style.display = 'none';
                                   if (e.currentTarget.nextElementSibling) {
                                     e.currentTarget.nextElementSibling.classList.remove('hidden');
                                   }
                                 }}
                               />
                               <svg className="w-8 h-8 text-white/30 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                               </svg>
                             </>
                           ) : (
                             <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                             </svg>
                           )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col py-1">
                          <h4 className="font-semibold text-white text-sm truncate mb-1 pr-12">
                            {item.title || "Untitled"}
                          </h4>
                          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                            {item.summary || "No summary available."}
                          </p>
                          {item.event_date && (
                             <p className="text-[10px] text-white/30 mt-auto font-medium tracking-widest uppercase">
                               {new Date(item.event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                             </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => openEditModal(item, e)} className="p-1.5 bg-black/40 hover:bg-black/60 rounded-md text-white/70 hover:text-white backdrop-blur-md">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => openDeleteModal(item, e)} className="p-1.5 bg-black/40 hover:bg-red-500/80 rounded-md text-white/70 hover:text-white backdrop-blur-md">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* Edit Modal */}
      {editingItem && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingItem(null)}></div>
            <div className="relative z-10 spatial-glass bg-[#0A0A0F]/90 w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Edit Document</h3>
              <button onClick={() => setEditingItem(null)} className="text-white/50 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Title</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-white/30 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Category</label>
                <ModalSelect 
                  value={editForm.category} 
                  onChange={(val) => setEditForm({...editForm, category: val})} 
                  options={Object.keys(CATEGORY_COLORS).filter(c => c !== 'FAILED')} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Date</label>
                <GlassDatePicker 
                  value={editForm.event_date ? editForm.event_date.split('T')[0] : ''} 
                  onChange={val => setEditForm({...editForm, event_date: val})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Summary</label>
                <textarea value={editForm.summary} onChange={e => setEditForm({...editForm, summary: e.target.value})} rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-white/30 resize-none transition-all" />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setEditingItem(null)} className="px-5 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleUpdate} disabled={isSaving} className="px-5 py-2.5 text-sm bg-white text-black font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2 transition-all">
                {isSaving ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div> : null}
                Save Changes
              </button>
            </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal Popup */}
      {deletingItem && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingItem(null)}></div>
            <div className="relative z-10 spatial-glass bg-[#0A0A0F]/95 w-full max-w-sm p-6 rounded-3xl border border-red-500/20 shadow-[0_10px_40px_rgba(239,68,68,0.15)] animate-in fade-in zoom-in-95 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Document?</h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Are you sure you want to delete <span className="text-white font-medium">&quot;{deletingItem.title || "Untitled"}&quot;</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingItem(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 text-sm font-medium bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : null}
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
