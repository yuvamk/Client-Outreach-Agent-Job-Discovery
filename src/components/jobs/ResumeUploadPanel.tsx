'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, X, RefreshCw, CheckCircle, Loader2, AlertCircle, Plus, Trash2, Edit2, Check } from 'lucide-react';
import type { ResumeProfile, WorkExperience } from '@/lib/resumeParser';

interface Props {
  profile: ResumeProfile | null;
  onProfileChange: (profile: ResumeProfile | null) => void;
  onResumeTextChange?: (text: string | null) => void;
}

const SENIORITY_COLOR = {
  Junior: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Mid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Senior: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

export default function ResumeUploadPanel({ profile, onProfileChange, onResumeTextChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [editingExperienceId, setEditingExperienceId] = useState<number | null>(null);
  const [tempExperience, setTempExperience] = useState<WorkExperience | null>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await fetch('/api/resume', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse resume');
      onProfileChange(data.profile);
      if (data.resumeText) onResumeTextChange?.(data.resumeText);
    } catch (err: unknown) {
      setError((err as Error).message);
      onProfileChange(null);
      onResumeTextChange?.(null);
    } finally {
      setLoading(false);
    }
  }, [onProfileChange, onResumeTextChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleEditExperience = (index: number) => {
    if (!profile) return;
    setEditingExperienceId(index);
    setTempExperience({ ...profile.work_experience[index] });
  };

  const handleSaveExperience = () => {
    if (!profile || editingExperienceId === null || !tempExperience) return;
    const newWorkExperience = [...profile.work_experience];
    newWorkExperience[editingExperienceId] = tempExperience;
    onProfileChange({ ...profile, work_experience: newWorkExperience });
    setEditingExperienceId(null);
    setTempExperience(null);
  };

  const handleDeleteExperience = (index: number) => {
    if (!profile) return;
    const newWorkExperience = profile.work_experience.filter((_, i) => i !== index);
    onProfileChange({ ...profile, work_experience: newWorkExperience });
  };

  const handleAddExperience = () => {
    if (!profile) return;
    const newExp: WorkExperience = {
      company: 'New Company',
      title: 'New Position',
      duration: 'Start - End',
      description: 'Describe your role and achievements...'
    };
    onProfileChange({ ...profile, work_experience: [newExp, ...profile.work_experience] });
    setEditingExperienceId(0);
    setTempExperience(newExp);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Resume Analysis</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Upload PDF or DOCX — AI extracts your profile</p>
        </div>
        {profile && (
          <label className="ml-auto cursor-pointer flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Re-analyze
            <input type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={onFileChange} />
          </label>
        )}
      </div>

      <div className="p-5">
        {!profile && (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-200 ${
              dragging
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20 scale-[1.01]'
                : 'border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Analyzing resume...</p>
                  <p className="text-xs text-slate-400 mt-1">Gemini AI is extracting your profile</p>
                </div>
              </>
            ) : (
              <>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-violet-100 dark:bg-violet-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <Upload className={`w-7 h-7 ${dragging ? 'text-violet-600' : 'text-slate-400'}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Drag & drop your resume
                  </p>
                  <p className="text-xs text-slate-400 mt-1">or <span className="text-violet-600 dark:text-violet-400 font-medium">browse files</span> — PDF, DOCX supported</p>
                </div>
              </>
            )}
            <input type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={onFileChange} disabled={loading} />
          </label>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {profile && (
          <div className="space-y-6">
            {/* Header / Personal Info */}
            <div className="flex items-start justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {profile.name || fileName || 'Resume'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {profile.email && <span>{profile.email}</span>}
                  {profile.phone && <span>{profile.phone}</span>}
                  {profile.location && <span>{profile.location}</span>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {profile.years_of_experience} years exp · {profile.industry_domains?.slice(0, 2).join(', ')}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SENIORITY_COLOR[profile.seniority_level] || SENIORITY_COLOR['Mid']}`}>
                {profile.seniority_level}
              </span>
            </div>

            {/* Work Experience Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Work Experience</p>
                <button 
                  onClick={handleAddExperience}
                  className="flex items-center gap-1 text-[10px] font-bold text-violet-600 hover:text-violet-700 uppercase"
                >
                  <Plus className="w-3 h-3" /> Add More
                </button>
              </div>
              
              <div className="space-y-3">
                {profile.work_experience.map((exp, index) => (
                  <div key={index} className="group relative p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 transition-all bg-white dark:bg-slate-900 shadow-sm">
                    {editingExperienceId === index ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white"
                            value={tempExperience?.title}
                            onChange={(e) => setTempExperience(prev => prev ? { ...prev, title: e.target.value } : null)}
                            placeholder="Job Title"
                          />
                          <input 
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white"
                            value={tempExperience?.company}
                            onChange={(e) => setTempExperience(prev => prev ? { ...prev, company: e.target.value } : null)}
                            placeholder="Company"
                          />
                        </div>
                        <input 
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white"
                          value={tempExperience?.duration}
                          onChange={(e) => setTempExperience(prev => prev ? { ...prev, duration: e.target.value } : null)}
                          placeholder="Duration (e.g. 2021 - Present)"
                        />
                        <textarea 
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white min-h-[80px]"
                          value={tempExperience?.description}
                          onChange={(e) => setTempExperience(prev => prev ? { ...prev, description: e.target.value } : null)}
                          placeholder="Role description and achievements..."
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingExperienceId(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                          <button onClick={handleSaveExperience} className="px-3 py-1.5 text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 rounded-lg flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" /> Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{exp.title}</h4>
                            <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">{exp.company}</p>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">{exp.duration}</p>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {exp.description}
                        </p>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button onClick={() => handleEditExperience(index)} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-violet-600 shadow-sm">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteExperience(index)} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-red-500 shadow-sm">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Stack */}
            {profile.tech_stack?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tech Stack</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.tech_stack.slice(0, 14).map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Skills */}
            {profile.key_skills?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Key Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.key_skills.slice(0, 10).map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { onProfileChange(null); setFileName(null); onResumeTextChange?.(null); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors py-1"
            >
              <X className="w-3.5 h-3.5" /> Clear resume & reset search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
