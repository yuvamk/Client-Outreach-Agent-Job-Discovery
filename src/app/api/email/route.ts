import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/Lead';
import { sendOutreachEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { leadId, bulk, custom } = body;
        await dbConnect();

        if (bulk) {
            const leads = await Lead.find({ emailStatus: 'pending', email: { $ne: '' } });

            let sentCount = 0;
            for (const lead of leads) {
                if (sentCount >= 50) break; // Daily limit safety

                try {
                    await sendOutreachEmail({
                        to: lead.email,
                        subject: `Question about ${lead.businessName}`,
                        businessName: lead.businessName,
                        category: lead.category,
                        city: lead.city,
                    });

                    lead.emailStatus = 'sent';
                    lead.emailSentAt = new Date();
                    await lead.save();
                    sentCount++;

                    // Delay between emails
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                } catch (err) {
                    console.error(`Failed to send email to ${lead.email}:`, err);
                    lead.emailStatus = 'failed';
                    await lead.save();
                }
            }

            return NextResponse.json({ message: `Sent ${sentCount} emails.` });
        } else if (custom) {
            const { businessName, city, to, category } = body;

            await sendOutreachEmail({
                to,
                subject: `Question about ${businessName}`,
                businessName,
                category: category || 'Business',
                city,
            });

            return NextResponse.json({ message: 'Custom outreach email sent' });
        } else {
            const lead = await Lead.findById(leadId);
            if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
            if (!lead.email) return NextResponse.json({ error: 'Lead has no email' }, { status: 400 });

            await sendOutreachEmail({
                to: lead.email,
                subject: `Question about ${lead.businessName}`,
                businessName: lead.businessName,
                category: lead.category,
                city: lead.city,
            });

            lead.emailStatus = 'sent';
            lead.emailSentAt = new Date();
            await lead.save();

            return NextResponse.json({ message: 'Email sent' });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
