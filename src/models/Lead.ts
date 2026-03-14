import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
    businessName: string;
    category: string;
    city: string;
    phone: string;
    email: string;
    website: string;
    hasWebsite: boolean;
    mapsUrl: string;
    emailStatus: 'pending' | 'sent' | 'opened' | 'replied' | 'failed';
    scrapedAt: Date;
    emailSentAt?: Date;
    notes?: string;
}

const LeadSchema: Schema = new Schema({
    businessName: { type: String, required: true },
    category: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
    hasWebsite: { type: Boolean, default: false },
    mapsUrl: { type: String, default: '' },
    emailStatus: {
        type: String,
        enum: ['pending', 'sent', 'opened', 'replied', 'failed'],
        default: 'pending',
    },
    scrapedAt: { type: Date, default: Date.now },
    emailSentAt: { type: Date },
    notes: { type: String, default: '' },
});

// Avoid model recompilation errors during hot reloads
export default mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);
