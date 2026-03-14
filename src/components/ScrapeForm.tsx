'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

export default function ScrapeForm({ onScraped, onProgress }: { onScraped: () => void, onProgress: (msg: string) => void }) {
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('India');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!country) return;

    setLoading(true);
    onProgress('Agent initialized...');
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, category, country }),
      });

      if (!res.ok) throw new Error('Scrape request failed');
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.message) onProgress(data.message);
            if (data.done) {
              onScraped();
              setCity('');
              setCategory('');
            }
          }
        }
      }
    } catch (error: any) {
      alert(error.message);
      onProgress(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase px-1">Country</label>
          <input
            type="text"
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full md:w-32"
            required
          />
        </div>
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase px-1">City (Optional)</label>
          <input
            type="text"
            placeholder="Search all cities"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full md:w-40"
          />
        </div>
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase px-1">Category (Optional)</label>
          <input
            type="text"
            placeholder="Search all types"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full md:w-40"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 h-[42px] w-full md:w-auto mt-auto"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          Scrape
        </button>
      </form>
      {!city && !category && (
        <p className="text-[10px] text-blue-500 font-medium px-2">
          Note: Empty city or category will trigger a broad search across major cities.
        </p>
      )}
    </div>
  );
}
