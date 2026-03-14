'use client';

import { useEffect, useRef } from 'react';
import { Terminal, Loader2, CheckCircle, AlertCircle, Database, Cpu, Search, Trophy } from 'lucide-react';

export interface ActivityLog {
  id: number;
  phase: string;
  message: string;
  timestamp: Date;
  type: 'status' | 'scraped' | 'matching' | 'error' | 'result';
  meta?: Record<string, unknown>;
}

interface Props {
  logs: ActivityLog[];
  isActive: boolean;
}

const PHASE_ICONS: Record<string, React.ReactNode> = {
  db: <Database className="w-3.5 h-3.5 text-blue-400" />,
  scraping: <Search className="w-3.5 h-3.5 text-cyan-400" />,
  matching: <Cpu className="w-3.5 h-3.5 text-violet-400" />,
  ranking: <Trophy className="w-3.5 h-3.5 text-amber-400" />,
  saving: <Database className="w-3.5 h-3.5 text-emerald-400" />,
  done: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
};

const TYPE_BG: Record<string, string> = {
  status: 'text-slate-300',
  scraped: 'text-cyan-300',
  matching: 'text-violet-300',
  error: 'text-red-400',
  result: 'text-emerald-300',
};

export default function LiveActivityFeed({ logs, isActive }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80" />
          <div className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
        </div>
        <div className="flex items-center gap-2 ml-2">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-500 font-mono">job-scraper — live output</span>
        </div>
        {isActive && (
          <div className="ml-auto flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
            <span className="text-[10px] text-emerald-400 font-mono font-bold">RUNNING</span>
          </div>
        )}
        {!isActive && logs.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
            <span className="text-[10px] text-slate-500 font-mono">IDLE</span>
          </div>
        )}
      </div>

      {/* Log output */}
      <div className="h-52 overflow-y-auto p-3 font-mono text-[11px] space-y-1 scrollbar-thin">
        {logs.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-600 py-4 justify-center">
            <Terminal className="w-4 h-4" />
            <span>Waiting for search to start…</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-600 shrink-0 tabular-nums">
                {log.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="shrink-0">
                {log.type === 'error'
                  ? <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />
                  : (PHASE_ICONS[log.phase] ?? <div className="w-3.5 h-3.5" />)}
              </span>
              <span className={TYPE_BG[log.type] ?? 'text-slate-400'}>
                {log.message}
              </span>
              {/* Progress indicator for matching */}
              {log.type === 'matching' && log.meta?.index !== undefined && (
                <span className="ml-auto shrink-0 text-[10px] text-violet-500 tabular-nums">
                  {String(log.meta.index)}/{String(log.meta.total ?? '?')}
                </span>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Mini progress bar */}
      {isActive && (
        <div className="h-0.5 bg-slate-800">
          <div className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 animate-pulse w-full" />
        </div>
      )}
    </div>
  );
}
