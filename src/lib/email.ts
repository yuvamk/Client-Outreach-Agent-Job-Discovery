import nodemailer from 'nodemailer';
import { generatePersonalizedEmail } from './gemini';

export interface EmailOptions {
    to: string;
    subject: string;
    businessName: string;
    category: string;
    city: string;
}

export async function sendOutreachEmail(options: EmailOptions) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    // Try to generate personalized AI content
    const aiBody = await generatePersonalizedEmail(options.businessName, options.category, options.city);

    const formattedBody = aiBody ? aiBody.replace(/\n/g, '<br/>') : `
        I noticed that <strong>${options.businessName}</strong> doesn't have a professional website yet. 
        In today's market in ${options.city}, having a premium online presence is the best way to stand out.
        <br/><br/>
        I'd love to help you build something that reflects the quality of your work.
    `;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .email-container {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
                padding: 30px;
                text-align: center;
                color: white;
            }
            .content {
                padding: 30px;
                line-height: 1.6;
                color: #334155;
            }
            .footer {
                padding: 20px;
                background-color: #f8fafc;
                border-top: 1px solid #e2e8f0;
                font-size: 12px;
                color: #64748b;
                text-align: center;
            }
            .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #2563eb;
                color: white !important;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin-top: 20px;
            }
            .kinetic-logo {
                font-size: 24px;
                font-weight: 800;
                letter-spacing: -0.5px;
            }
        </style>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f1f5f9;">
        <div class="email-container">
            <div class="header">
                <div class="kinetic-logo">KINETIC</div>
                <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">Premium Digital Experiences</div>
            </div>
            <div class="content">
                ${formattedBody}
                <br/><br/>
                Looking forward to your thoughts,
                <br/>
                <strong>Yuvam Kumar</strong>
                <br/>
                Founder, Kinetic
                <br/><br/>
                <a href="mailto:yuvamk6@gmail.com" class="button">Let's Connect</a>
            </div>
            <div class="footer">
                Kinetic Digital Agency<br/>
                Contact: +91 8650825573 | Email: yuvamk6@gmail.com<br/>
                Helping local businesses dominate the digital space.
            </div>
        </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
        from: `"Yuvam Kumar | Kinetic" <${process.env.GMAIL_USER}>`,
        to: options.to,
        subject: options.subject || `Elevating ${options.businessName}'s potential`,
        html: htmlTemplate,
    });

    return info;
}
