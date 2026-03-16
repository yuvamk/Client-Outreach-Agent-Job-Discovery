'use client';

import { useState, useEffect } from 'react';
import ScrapeForm from '@/components/ScrapeForm';
import LeadsTable from '@/components/LeadsTable';
import StatsCards from '@/components/StatsCards';
import ManualOutreach from '@/components/ManualOutreach';
import { Search, Loader2, Send } from 'lucide-react';

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 50));
  };

  const handleBulkSend = async () => {
    if (!confirm('Are you sure you want to send emails to all pending leads? (Max 50/day)')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true }),
      });
      const data = await res.json();
      alert(data.message || 'Bulk send completed');
      fetchLeads();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Search className="w-8 h-8 text-blue-600" />
              Client Outreach Agent
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Find and email local businesses without websites.
            </p>
          </div>
          <ScrapeForm onScraped={fetchLeads} onProgress={addLog} />
        </div>

        {/* Stats Row */}
        <StatsCards leads={leads} />

        {/* Live Activity & Custom Outreach Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="lg:col-span-1">
             <ManualOutreach onSent={fetchLeads} />
          </div>
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[350px]">
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-500 uppercase">Live Activity</span>
            </div>
            <div className="p-3 overflow-y-auto space-y-1 font-mono text-[10px] text-slate-600 dark:text-slate-400">
              {logs.length === 0 ? (
                <p className="italic opacity-50 text-center py-4">No recent activity.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
                    <span>{log}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Leads</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={handleBulkSend}
                disabled={loading || !Array.isArray(leads) || leads.filter((l: any) => l.emailStatus === 'pending' && l.email).length === 0}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Bulk Send Pending
              </button>
              {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
            </div>
          </div>
          <LeadsTable leads={leads} onUpdate={fetchLeads} />
        </div>
      </div>
    </main>
  );
}
