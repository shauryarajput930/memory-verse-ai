"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { API_URL } from "@/lib/api";
import { User, LogOut, FileText, Activity } from "lucide-react";

export default function ProfileView({ userId, userEmail }: { userId: string, userEmail: string }) {
  const [stats, setStats] = useState({
    totalDocs: 0,
    categories: {} as Record<string, number>
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      try {
        const res = await fetch(`${API_URL}/api/timeline/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const allItems = data.timeline.flatMap((y: any) => y.items);
        
        const cats: Record<string, number> = {};
        allItems.forEach((item: any) => {
          const c = item.category || "Uncategorized";
          cats[c] = (cats[c] || 0) + 1;
        });

        setStats({
          totalDocs: allItems.length,
          categories: cats
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId]);

  const handleSignOut = () => {
    supabase.auth.signOut();
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
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <User className="w-10 h-10 text-white/50" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1 truncate w-full">{userEmail}</h3>
          <p className="text-xs text-white/40 mb-8 uppercase tracking-widest font-medium">MemoryVerse Architect</p>
          
          <button 
            onClick={handleSignOut}
            className="w-full py-3 spatial-glass-inner text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Stats Card */}
        <div className="md:col-span-2 spatial-glass p-6 sm:p-8 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Archive Statistics
          </h3>
          
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
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
      </div>
    </div>
  );
}
