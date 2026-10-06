"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { API_URL } from "@/lib/api";
import { GlassDatePicker } from "./GlassDatePicker";
import { Edit2, Trash2, X, ChevronDown } from "lucide-react";

interface TimelineItem {
  id: string;
  title: string | null;
  category: string | null;
  event_date: string | null;
  summary: string | null;
  file_url: string | null;
  relationships: {
    target_id: string;
    target_title: string;
    relationship_type: string;
    confidence: number;
  }[];
}

interface TimelineYear {
  year: number | string;
  items: TimelineItem[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Projects: "text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20",
  Skills: "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20",
  Certifications: "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20",
  Internships: "text-[#F97316] bg-[#F97316]/10 border-[#F97316]/20",
  Achievements: "text-[#F43F5E] bg-[#F43F5E]/10 border-[#F43F5E]/20",
  Academics: "text-[#06B6D4] bg-[#06B6D4]/10 border-[#06B6D4]/20",
  FAILED: "text-red-400 bg-red-400/10 border-red-400/20",
};

const formatRelationshipType = (type: string) => {
  if (type === "supporting_evidence") return "Supports Evidence";
  if (type === "related_project") return "Related Project";
  return type.split("_to_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" → ");
};

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

export default function TimelineView({ userId, refreshTrigger = 0 }: { userId: string; refreshTrigger?: number }) {
  const [timeline, setTimeline] = useState<TimelineYear[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [editForm, setEditForm] = useState({ title: "", category: "", summary: "", event_date: "" });
  const [isSaving, setIsSaving] = useState(false);

  const [deletingItem, setDeletingItem] = useState<TimelineItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTimeline = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    try {
      const res = await fetch(`${API_URL}/api/timeline/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTimeline(data.timeline || []);
    } catch (err) {
      console.error("Failed to fetch timeline:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      try {
        const res = await fetch(`${API_URL}/api/timeline/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (isMounted) setTimeline(data.timeline || []);
      } catch (err) {
        console.error("Failed to fetch timeline:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [userId, refreshTrigger]);

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
        fetchTimeline();
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
        fetchTimeline();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-20 animate-in">
        <h3 className="text-2xl font-semibold mb-3 text-white">Your timeline is empty.</h3>
        <p className="text-white/50 max-w-md mx-auto">
          Upload documents to watch your spatial timeline populate automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full relative animate-in">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-3xl font-bold text-white tracking-tight">Timeline</h2>
        <p className="text-white/50 text-sm mt-1">Chronological mapping of your journey</p>
      </div>

      <div className="relative">
        {/* Background Glowing Rod (3D effect) */}
        <div className="absolute left-4 md:left-1/2 md:-ml-[2px] top-0 bottom-0 w-1 bg-linear-to-b from-white/20 via-white/10 to-transparent blur-sm rounded-full -z-10"></div>
        <div className="absolute left-4 md:left-1/2 md:-ml-[1px] top-0 bottom-0 w-[2px] bg-linear-to-b from-white/40 via-white/20 to-transparent rounded-full -z-10"></div>

        <div className="space-y-12">
          {timeline.map((yearGroup) => (
            <div key={String(yearGroup.year)} className="relative z-10 spatial-glass p-5 sm:p-6 md:p-10 ml-6 md:ml-0">
              
              {/* Year Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <span className="text-3xl sm:text-4xl font-black tracking-tighter text-white opacity-90 drop-shadow-lg">
                  {yearGroup.year}
                </span>
                <span className="text-[10px] sm:text-xs font-medium text-white/40 uppercase tracking-widest">{yearGroup.items.length} Entries</span>
              </div>

              {/* Items Grid/List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 sm:gap-y-8">
                {yearGroup.items.map((item) => (
                  <a
                    key={item.id}
                    href={item.file_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col p-4 sm:p-5 spatial-glass-inner spatial-hover group relative overflow-hidden"
                  >
                    
                    {/* Subtle category glow effect on hover */}
                    {item.category && item.category !== "FAILED" && CATEGORY_COLORS[item.category] && (
                       <div className={`absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${CATEGORY_COLORS[item.category].split(' ')[1]}`}></div>
                    )}

                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2 pr-12">
                      <h3 className="font-semibold text-white text-base leading-tight group-hover:text-white/90 transition-colors flex-1 min-w-0 pr-2 truncate" title={item.title || "Untitled"}>
                        {item.title || "Untitled"}
                      </h3>
                      {item.category && item.category !== "FAILED" && (
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${CATEGORY_COLORS[item.category] || "bg-white/5 text-gray-300 border-white/10"}`}>
                          {item.category}
                        </span>
                      )}
                    </div>
                    
                    {item.summary && (
                      <p className="text-sm text-white/50 leading-relaxed line-clamp-2 mt-1">{item.summary}</p>
                    )}
                    
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <span className="text-xs font-medium text-white/30">
                        {item.event_date ? new Date(item.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                      </span>
                      
                      {/* Relationships indicator */}
                      {item.relationships && item.relationships.length > 0 && (
                        <div className="flex -space-x-2">
                           <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md z-10" title={`${item.relationships.length} connections (${item.relationships.map(r => formatRelationshipType(r.relationship_type)).join(', ')})`}>
                              <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                           </div>
                        </div>
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
                ))}
              </div>
            </div>
          ))}
        </div>
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
