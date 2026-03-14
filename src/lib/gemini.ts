import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generatePersonalizedEmail(businessName: string, category: string, city: string) {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            You are Yuvam Kumar, the lead at Kinetic, a boutique digital agency specializing in premium web presence for local businesses.
            
            Write a short, high-impact, and non-spammy outreach email to the owner of "${businessName}", a ${category} in ${city}.
            
            Context:
            - Business Name: ${businessName}
            - Category: ${category}
            - Location: ${city}
            - Problem: They currently have NO professional website found on Google, which is costing them customers to competitors who are online.
            
            Guidelines:
            1. Organization Name: Kinetic
            2. Personal Sign-off: Yuvam Kumar
            3. Contact Details: 8650825573 | yuvamk6@gmail.com
            4. Goal: Grab their attention by showing you understand their business niche (${category}) and offer to help them dominate the ${city} market with a modern web presence.
            5. Tone: Professional, exclusive (not desperate), and helpful.
            6. Constraints: Maximum 120 words.
            7. Output: ONLY the body text of the email. Do NOT include a subject line or any markdown bolding like **. Just clean, professional text that can be inserted into an HTML template.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        return null;
    }
}
