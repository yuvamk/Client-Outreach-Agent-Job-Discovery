import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/Lead';
import { scrapeGoogleMaps, findEmailsForLead, scrapeGeneralSearch } from '@/lib/scraper';
import { getCountryConfig } from '@/lib/countries';

export async function POST(req: NextRequest) {
    try {
        const { city, category, country } = await req.json();

        if (!country) {
            return NextResponse.json({ error: 'Country is required' }, { status: 400 });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const sendUpdate = (message: string, data?: any) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message, ...data })}\n\n`));
                };

                try {
                    await dbConnect();
                    sendUpdate('Connected to database.');

                    const config = getCountryConfig(country);
                    const targetCities = city ? [city] : config.cities;
                    const targetCategories = category ? [category] : config.categories;

                    if (!city || !category) {
                        sendUpdate(`Broad country search started for ${country}. Expansion: ${targetCities.length} cities x ${targetCategories.length} categories.`);
                    }

                    let totalSaved = 0;

                    for (const currentCity of targetCities) {
                        for (const currentCategory of targetCategories) {
                            sendUpdate(`--- Searching: ${currentCategory} in ${currentCity} ---`);

                            // Multi-source scraping
                            const mapsLeads = await scrapeGoogleMaps(currentCity, currentCategory, country, (msg) => sendUpdate(msg));
                            const generalLeads = await scrapeGeneralSearch(currentCity, currentCategory, country, (msg) => sendUpdate(msg));

                            const combinedRawLeads = [...mapsLeads, ...generalLeads];

                            for (const leadData of combinedRawLeads) {
                                // STRICT FILTER: Discard if any website is found
                                if (leadData.website && leadData.website.trim() !== '') {
                                    sendUpdate(`Skipping ${leadData.businessName} (Website found: ${leadData.website})`);
                                    continue;
                                }

                                // Skip if business contains common social media strings as their "website"
                                if (leadData.businessName.toLowerCase().includes('facebook') || leadData.businessName.toLowerCase().includes('instagram')) {
                                    continue;
                                }

                                let existingLead = await Lead.findOne({ businessName: leadData.businessName, city: leadData.city });

                                if (!existingLead) {
                                    sendUpdate(`Found lead without website: ${leadData.businessName}`);
                                    const emails = await findEmailsForLead(leadData.businessName, leadData.city, (msg) => sendUpdate(msg));
                                    const email = emails.length > 0 ? emails[0] : '';

                                    const newLead = new Lead({
                                        ...leadData,
                                        email,
                                        hasWebsite: false,
                                        emailStatus: 'pending',
                                        scrapedAt: new Date(),
                                    });
                                    await newLead.save();
                                    totalSaved++;
                                }
                            }
                        }
                    }

                    sendUpdate('Broad multi-source scraping completed.', {
                        done: true,
                        summary: `System discovery finished. Saved ${totalSaved} new leads with no website found.`
                    });
                    controller.close();
                } catch (error: any) {
                    sendUpdate(`Error: ${error.message}`, { error: true });
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('Scraping error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
