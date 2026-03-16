import dbConnect from './mongodb';
import mongoose from 'mongoose';

const InstinctSchema = new mongoose.Schema({
  type: { type: String, enum: ['like', 'dislike'], required: true },
  pattern: { type: String, required: true }, // e.g. "Early-stage startups", "PHP roles"
  reason: { type: String },
  confidence: { type: Number, default: 0.1 },
  sourceJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  createdAt: { type: Date, default: Date.now },
});

const InstinctModel = mongoose.models.Instinct || mongoose.model('Instinct', InstinctSchema);

export class InstinctStore {
  /**
   * Records a user preference and extracts a pattern
   */
  static async recordPreference(jobId: string, type: 'like' | 'dislike', role: string) {
    await dbConnect();
    
    // In a real system, we'd use LLM to extract the REASON why this job was liked/disliked.
    // For this POC, we'll store the association and we can refine it with a background task.
    
    // Simple mock pattern extraction logic for now
    const pattern = `Preference based on Job ${jobId} for role ${role}`;
    
    await InstinctModel.create({
      type,
      pattern,
      sourceJobId: jobId,
    });
  }

  /**
   * Gets active instincts as a text block for prompts
   */
  static async getActiveInstincts(): Promise<string> {
    await dbConnect();
    const instincts = await InstinctModel.find().sort({ confidence: -1 }).limit(10).lean();
    
    if (instincts.length === 0) return "No learned instincts yet.";
    
    return instincts.map(i => `- [${i.type.toUpperCase()}] ${i.pattern}`).join('\n');
  }
}
