'use client';

import { useState } from 'react';
import { Mail, Globe, MapPin, Trash2, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';

export default function LeadsTable({ leads, onUpdate }: { leads: any[]; onUpdate: () => void }) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const categories = Array.from(new Set(leads.map(l => l.category))).filter(Boolean);

  const filteredLeads = leads.filter(lead => {
    const matchesCategory = !filterCategory || lead.category === filterCategory;
    
    // Ensure accurate date comparison by ignoring time
    if (!filterDate) return matchesCategory;
    try {
      const d = new Date(lead.scrapedAt);
      if (isNaN(d.getTime())) return false;
      const leadDate = d.toISOString().split('T')[0];
      const matchesDate = leadDate === filterDate;
      return matchesCategory && matchesDate;
    } catch {
      return false;
    }
  });

  const sendEmail = async (leadId: string) => {
    setSendingId(leadId);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onUpdate();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSendingId(null);
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      onUpdate();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'replied': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Category:</label>
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Date:</label>
          <input 
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 outline-none"
          />
        </div>
        <button 
          onClick={() => { setFilterCategory(''); setFilterDate(''); }}
          className="text-xs text-blue-600 hover:underline"
        >
          Reset Filters
        </button>
        <div className="ml-auto text-xs text-slate-500">
          Showing {filteredLeads.length} of {leads.length} leads
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Business</th>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Contact</th>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Status</th>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredLeads.map((lead) => (
            <tr key={lead._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <td className="p-4">
                <div className="font-medium text-slate-900 dark:text-white">{lead.businessName}</div>
                <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {lead.city} • {lead.category}
                </div>
              </td>
              <td className="p-4">
                <div className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Mail className="w-3 h-3 text-slate-400" /> {lead.email || 'No email found'}
                </div>
                {lead.phone && (
                  <div className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 mt-1">
                    <span className="text-slate-400 text-xs font-bold">📞</span> {lead.phone}
                  </div>
                )}
                <div className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 mt-1">
                  <Globe className="w-3 h-3 text-slate-400" /> 
                  <a href={lead.mapsUrl} target="_blank" className="text-blue-500 hover:underline flex items-center gap-1">
                    Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2 text-sm capitalize">
                  {getStatusIcon(lead.emailStatus)}
                  {lead.emailStatus}
                </div>
              </td>
              <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => sendEmail(lead._id)}
                    disabled={sendingId === lead._id || !lead.email}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50 transition-colors"
                    title="Send Email"
                  >
                    <Mail className={`w-5 h-5 ${sendingId === lead._id ? 'animate-pulse' : ''}`} />
                  </button>
                  <button
                    onClick={() => deleteLead(lead._id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={4} className="p-12 text-center text-slate-500 dark:text-slate-400">
                No leads found. Start by scraping a city and category.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
}
