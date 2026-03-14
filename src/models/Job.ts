import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  title: string;
  company: string;
  location: string;
  posted_date: string;
  posted_timestamp: number;
  applicant_count?: number;
  experience_required?: string;
  salary?: string;
  skills_required: string[];
  job_description: string;
  apply_link: string;
  source_platform: string;
  job_type: string;
  is_vibe_coder_friendly: boolean;
  category: string; // derived from search role
  // AI matching
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  recommendation: string;
  one_line_reason: string;
  // ranking
  total_score: number;
  recency_score: number;
  applicant_score: number;
  // meta
  search_role: string;
  search_location: string;
  scraped_at: Date;
}

const JobSchema = new Schema<IJob>({
  title: { type: String, required: true },
  company: { type: String, default: '' },
  location: { type: String, default: 'Remote' },
  posted_date: { type: String, default: '' },
  posted_timestamp: { type: Number, default: 0 },
  applicant_count: { type: Number },
  experience_required: { type: String },
  salary: { type: String },
  skills_required: [{ type: String }],
  job_description: { type: String, default: '' },
  apply_link: { type: String, required: true, unique: true },
  source_platform: { type: String, default: '' },
  job_type: { type: String, default: 'Full-time' },
  is_vibe_coder_friendly: { type: Boolean, default: false },
  category: { type: String, default: '' },
  // AI
  match_score: { type: Number, default: 50 },
  matching_skills: [{ type: String }],
  missing_skills: [{ type: String }],
  recommendation: { type: String, default: 'Good Fit' },
  one_line_reason: { type: String, default: '' },
  // Ranking
  total_score: { type: Number, default: 0 },
  recency_score: { type: Number, default: 0 },
  applicant_score: { type: Number, default: 0 },
  // Meta
  search_role: { type: String, default: '' },
  search_location: { type: String, default: '' },
  scraped_at: { type: Date, default: Date.now },
});

// Indexes for fast filter queries
JobSchema.index({ scraped_at: -1 });
JobSchema.index({ category: 1 });
JobSchema.index({ source_platform: 1 });
JobSchema.index({ total_score: -1 });
JobSchema.index({ posted_timestamp: -1 });

export default mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
