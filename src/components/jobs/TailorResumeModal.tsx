'use client';

import { useState, useRef } from 'react';
import { X, Loader2, Download, ExternalLink, AlertCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { RankedJob } from '@/lib/jobRanker';
import type { TailoredResume } from '@/app/api/resume/tailor/route';

interface Props {
  job: RankedJob;
  resumeText: string;
  onClose: () => void;
}

type Phase = 'idle' | 'generating' | 'done' | 'error';

export default function TailorResumeModal({ job, resumeText, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [tailored, setTailored] = useState<TailoredResume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    setPhase('generating');
    setError(null);
    try {
      const res = await fetch('/api/resume/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, job }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tailoring failed');
      setTailored(data.tailored);
      setPhase('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPhase('error');
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Resume — ${tailored?.name || ''} — ${job.title} at ${job.company}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 11pt; color: #1a1a1a; background: white; padding: 0.6in; max-width: 8.5in; margin: 0 auto; }
    h1 { font-size: 22pt; font-weight: bold; letter-spacing: -0.5px; color: #111; }
    h2 { font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #4a5568; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; margin-top: 18px; margin-bottom: 8px; }
    h3 { font-size: 11pt; font-weight: bold; color: #1a202c; }
    .contact { font-size: 9.5pt; color: #555; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 12px; }
    .contact a { color: #3b82f6; text-decoration: none; }
    .summary { font-size: 10.5pt; line-height: 1.6; color: #374151; background: #f8fafc; border-left: 3px solid #3b82f6; padding: 10px 14px; border-radius: 2px; margin-top: 8px; }
    .exp-header { display: flex; justify-content: space-between; align-items: baseline; }
    .exp-sub { font-size: 9.5pt; color: #6b7280; font-style: italic; margin-bottom: 4px; }
    ul { padding-left: 16px; margin: 4px 0 10px; }
    li { font-size: 10pt; line-height: 1.55; color: #374151; margin-bottom: 2px; }
    .skill-group { margin-bottom: 4px; font-size: 10pt; }
    .skill-label { font-weight: bold; color: #374151; }
    .edu-header { display: flex; justify-content: space-between; }
    .project-name { font-weight: bold; font-size: 10.5pt; }
    .project-tech { font-size: 9pt; color: #6366f1; }
    .tailored-badge { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    @media print {
      body { padding: 0.5in; }
      @page { margin: 0.5in; size: letter; }
    }
  </style>
</head>
<body>
  ${printContent}
  <div class="tailored-badge">✨ Tailored by Kinetic AI for ${job.title} at ${job.company}</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl my-4 border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950/30 dark:to-blue-950/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">AI Resume Tailor</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                {job.title} · {job.company}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Idle state */}
          {phase === 'idle' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/40 dark:to-blue-900/40 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-violet-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Tailor Resume for this Job</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  Gemini AI will rewrite your resume sections — summary, experience bullets, and skills — to specifically highlight what matters for <strong>{job.title}</strong> at <strong>{job.company}</strong>.
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 font-medium">✅ 100% truthful — only reorganizes your existing content</p>
              </div>
              <button onClick={generate}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98]">
                ✨ Generate Tailored Resume
              </button>
            </div>
          )}

          {/* Generating */}
          {phase === 'generating' && (
            <div className="text-center py-12 space-y-4">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 animate-pulse opacity-20" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/40 dark:to-blue-900/40 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">Tailoring your resume…</p>
                <p className="text-sm text-slate-400 mt-1">Gemini is analyzing the job requirements and customizing each section</p>
              </div>
              <div className="flex justify-center gap-2 flex-wrap text-xs text-slate-400">
                {['Reading job requirements…', 'Rewriting summary…', 'Optimizing bullet points…', 'Matching skills…'].map((s, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Tailoring failed</p>
                  <p className="text-xs text-red-500 mt-0.5">{error}</p>
                </div>
              </div>
              <button onClick={generate}
                className="w-full py-2.5 rounded-xl border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                Retry
              </button>
            </div>
          )}

          {/* Done — resume preview */}
          {phase === 'done' && tailored && (
            <div className="space-y-4">
              {/* Action bar */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex-1">✅ Resume tailored! Download or apply below.</span>
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <a href={job.apply_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
                  <ExternalLink className="w-3.5 h-3.5" /> Apply Now
                </a>
              </div>

              {/* Tailoring notes (collapsible) */}
              {tailored.tailoring_notes && (
                <div className="border border-violet-200 dark:border-violet-800 rounded-xl overflow-hidden">
                  <button onClick={() => setShowNotes(n => !n)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-violet-50 dark:bg-violet-950/20 text-left">
                    <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">✨ What Gemini changed</span>
                    {showNotes ? <ChevronUp className="w-3.5 h-3.5 text-violet-400" /> : <ChevronDown className="w-3.5 h-3.5 text-violet-400" />}
                  </button>
                  {showNotes && (
                    <div className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900">
                      {tailored.tailoring_notes}
                    </div>
                  )}
                </div>
              )}

              {/* Resume preview */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resume Preview</span>
                </div>
                <div className="p-6 bg-white max-h-[60vh] overflow-y-auto" ref={printRef}>
                  {/* Name + Contact */}
                  <h1 style={{ fontSize: '22pt', fontWeight: 'bold', fontFamily: 'Georgia, serif', color: '#111' }}>{tailored.name}</h1>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px', fontSize: '9.5pt', color: '#555', fontFamily: 'Georgia, serif' }}>
                    {tailored.contact.email && <span>{tailored.contact.email}</span>}
                    {tailored.contact.phone && <span>{tailored.contact.phone}</span>}
                    {tailored.contact.location && <span>{tailored.contact.location}</span>}
                    {tailored.contact.linkedin && <span style={{ color: '#3b82f6' }}>{tailored.contact.linkedin}</span>}
                    {tailored.contact.github && <span style={{ color: '#3b82f6' }}>{tailored.contact.github}</span>}
                    {tailored.contact.website && <span style={{ color: '#3b82f6' }}>{tailored.contact.website}</span>}
                  </div>

                  {/* Summary */}
                  {tailored.summary && (
                    <>
                      <SectionHead>Professional Summary</SectionHead>
                      <p style={{ fontSize: '10.5pt', lineHeight: 1.6, color: '#374151', background: '#f8fafc', borderLeft: '3px solid #3b82f6', padding: '10px 14px', fontFamily: 'Georgia, serif' }}>
                        {tailored.summary}
                      </p>
                    </>
                  )}

                  {/* Experience */}
                  {tailored.experience?.length > 0 && (
                    <>
                      <SectionHead>Experience</SectionHead>
                      {tailored.experience.map((exp, i) => (
                        <div key={i} style={{ marginBottom: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '11pt', fontFamily: 'Georgia, serif' }}>{exp.title}</span>
                            <span style={{ fontSize: '9pt', color: '#6b7280', fontFamily: 'Georgia, serif' }}>{exp.duration}</span>
                          </div>
                          <div style={{ fontSize: '9.5pt', color: '#6b7280', fontStyle: 'italic', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>
                            {exp.company}{exp.location ? ` · ${exp.location}` : ''}
                          </div>
                          <ul style={{ paddingLeft: '16px', margin: '4px 0' }}>
                            {exp.bullets.map((b, j) => (
                              <li key={j} style={{ fontSize: '10pt', lineHeight: 1.55, color: '#374151', marginBottom: '2px', fontFamily: 'Georgia, serif' }}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Projects */}
                  {tailored.projects && tailored.projects.length > 0 && (
                    <>
                      <SectionHead>Projects</SectionHead>
                      {tailored.projects.map((p, i) => (
                        <div key={i} style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '10.5pt', fontFamily: 'Georgia, serif' }}>{p.name}</span>
                            {p.link && <span style={{ fontSize: '8.5pt', color: '#3b82f6', fontFamily: 'Georgia, serif' }}>{p.link}</span>}
                          </div>
                          <div style={{ fontSize: '9pt', color: '#6366f1', marginBottom: '2px', fontFamily: 'Georgia, serif' }}>
                            {p.technologies.join(' · ')}
                          </div>
                          <p style={{ fontSize: '10pt', color: '#374151', lineHeight: 1.5, fontFamily: 'Georgia, serif' }}>{p.description}</p>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Skills */}
                  {tailored.skills && (
                    <>
                      <SectionHead>Skills</SectionHead>
                      <div style={{ fontFamily: 'Georgia, serif' }}>
                        {tailored.skills.technical?.length > 0 && (
                          <div style={{ marginBottom: '4px', fontSize: '10pt' }}>
                            <span style={{ fontWeight: 'bold', color: '#374151' }}>Technical: </span>
                            <span style={{ color: '#4b5563' }}>{tailored.skills.technical.join(', ')}</span>
                          </div>
                        )}
                        {tailored.skills.tools && tailored.skills.tools.length > 0 && (
                          <div style={{ marginBottom: '4px', fontSize: '10pt' }}>
                            <span style={{ fontWeight: 'bold', color: '#374151' }}>Tools: </span>
                            <span style={{ color: '#4b5563' }}>{tailored.skills.tools.join(', ')}</span>
                          </div>
                        )}
                        {tailored.skills.soft && tailored.skills.soft.length > 0 && (
                          <div style={{ marginBottom: '4px', fontSize: '10pt' }}>
                            <span style={{ fontWeight: 'bold', color: '#374151' }}>Soft Skills: </span>
                            <span style={{ color: '#4b5563' }}>{tailored.skills.soft.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Education */}
                  {tailored.education?.length > 0 && (
                    <>
                      <SectionHead>Education</SectionHead>
                      {tailored.education.map((e, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontFamily: 'Georgia, serif' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>{e.degree}</span>
                            <span style={{ color: '#6b7280', fontSize: '9.5pt' }}> · {e.institution}</span>
                            {e.gpa && <span style={{ color: '#6b7280', fontSize: '9pt' }}> · GPA: {e.gpa}</span>}
                          </div>
                          <span style={{ color: '#6b7280', fontSize: '9pt' }}>{e.year}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Certifications */}
                  {tailored.certifications && tailored.certifications.length > 0 && (
                    <>
                      <SectionHead>Certifications</SectionHead>
                      <ul style={{ paddingLeft: '16px', fontFamily: 'Georgia, serif' }}>
                        {tailored.certifications.map((c, i) => (
                          <li key={i} style={{ fontSize: '10pt', color: '#374151', marginBottom: '2px' }}>{c}</li>
                        ))}
                      </ul>
                    </>
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

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px',
      color: '#4a5568', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px',
      marginTop: '18px', marginBottom: '8px', fontFamily: 'Georgia, serif',
    }}>
      {children}
    </h2>
  );
}
