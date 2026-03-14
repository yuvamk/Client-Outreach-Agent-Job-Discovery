import puppeteer, { Page } from 'puppeteer';

export interface ScrapedLead {
    businessName: string;
    category: string;
    city: string;
    phone: string;
    website: string;
    mapsUrl: string;
}

export async function scrapeGoogleMaps(city: string, category: string, country: string = '', onProgress?: (msg: string) => void): Promise<ScrapedLead[]> {
    const location = country ? `${city}, ${country}` : city;
    const query = `${category} in ${location}`;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

    onProgress?.(`Starting deep scrape for ${category} in ${location}...`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'networkidle2' });
        await autoScroll(page);

        const itemHandles = await page.$$('a.hfpxzc');
        onProgress?.(`Detected ${itemHandles.length} listings in list. Starting deep verification...`);

        const leads: ScrapedLead[] = [];

        for (let i = 0; i < itemHandles.length; i++) {
            try {
                await page.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), itemHandles[i]);
                await new Promise(r => setTimeout(r, 500));

                const businessName = await page.evaluate(el => el.getAttribute('aria-label') || '', itemHandles[i]);

                onProgress?.(`Verifying [${i + 1}/${itemHandles.length}]: ${businessName}...`);

                await page.evaluate(el => (el as HTMLElement).click(), itemHandles[i]);
                await new Promise(r => setTimeout(r, 2000)); // Increased wait for side panel

                const details = await page.evaluate(() => {
                    const findValue = (selectors: string[], attr: string = 'text') => {
                        for (const selector of selectors) {
                            const els = document.querySelectorAll(selector);
                            for (const el of Array.from(els)) {
                                if (attr === 'text') {
                                    const val = el.textContent?.trim() || '';
                                    if (val) return val;
                                }
                                if (attr === 'href') {
                                    const val = (el as HTMLAnchorElement).href || '';
                                    if (val) return val;
                                }
                            }
                        }
                        return '';
                    };

                    // Robust Website Extraction
                    let website = findValue(['a[data-item-id="authority"]', 'a[aria-label^="Website:"]', 'a[aria-label="Website"]'], 'href');
                    if (website.includes('google.com/maps') || website.includes('search?q=')) website = '';

                    // Robust Phone Extraction using Regex fallback
                    let phone = findValue(['button[data-item-id^="phone"]', 'button[aria-label^="Phone:"]', 'button[aria-label^="Call"]', 'div[aria-label^="Phone:"]']);

                    if (!phone) {
                        // Regex fallback: Search the whole panel text for phone patterns
                        const panel = document.querySelector('div[role="main"]') || document.body;
                        const panelText = panel.textContent || '';
                        const phoneRegex = /(?:\+91[\-\s]?)?[6-9]\d{4}[\s]?\d{5}|(?:\d{3,5}[\-\s]?\d{6,8})/;
                        const match = panelText.match(phoneRegex);
                        if (match) phone = match[0];
                    }

                    return { website, phone };
                });

                leads.push({
                    businessName,
                    category,
                    city,
                    phone: details.phone,
                    website: details.website,
                    mapsUrl: await page.evaluate(el => (el as HTMLAnchorElement).href, itemHandles[i]),
                });

                await new Promise(r => setTimeout(r, 300));
            } catch (err) {
                console.error(`Error processing lead ${i}:`, err);
            }
        }

        onProgress?.(`Deep verification finished. Passed ${leads.length} leads to qualification filter.`);
        return leads;
    } finally {
        await browser.close();
    }
}

export async function scrapeGeneralSearch(city: string, category: string, country: string = '', onProgress?: (msg: string) => void): Promise<ScrapedLead[]> {
    const location = country ? `${city}, ${country}` : city;
    const query = `${category} ${location} contact phone number -site:facebook.com -site:instagram.com -site:linkedin.com`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    onProgress?.(`Performing broad search for ${category} in ${location}...`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const results: ScrapedLead[] = await page.evaluate((city, category) => {
            const leads: ScrapedLead[] = [];
            const snippets = document.querySelectorAll('.g, .MjjYud');

            snippets.forEach((snippet) => {
                const title = snippet.querySelector('h3')?.textContent || '';
                const text = snippet.textContent || '';
                const phoneRegex = /(?:\+91[\-\s]?)?[6-9]\d{4}[\s]?\d{5}|(?:\d{3,5}[\-\s]?\d{6,8})/;
                const phoneMatch = text.match(phoneRegex);
                const phone = phoneMatch ? phoneMatch[0] : '';

                if (title && phone && !title.toLowerCase().includes('website')) {
                    leads.push({
                        businessName: title,
                        category,
                        city,
                        phone,
                        website: '',
                        mapsUrl: '',
                    });
                }
            });

            return leads;
        }, city, category);

        onProgress?.(`Found ${results.length} potential leads from general search.`);
        return results;
    } finally {
        await browser.close();
    }
}

async function autoScroll(page: Page) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight || totalHeight > 5000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

export async function findEmailsForLead(businessName: string, city: string, onProgress?: (msg: string) => void): Promise<string[]> {
    onProgress?.(`Searching for contact emails for ${businessName}...`);
    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        const query = `"${businessName}" ${city} contact email -site:google.com`;
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);

        const content = await page.content();
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = content.match(emailRegex) || [];

        const emails = Array.from(new Set(matches.filter(email =>
            !email.endsWith('.png') &&
            !email.endsWith('.jpg') &&
            !email.includes('example.com') &&
            !email.includes('sentry.io') &&
            !email.includes('google.com') &&
            !email.includes('wixpress.com')
        )));

        if (emails.length > 0) {
            onProgress?.(`Found ${emails.length} potential email(s).`);
        }

        return emails;
    } catch (error) {
        console.error(`Error finding email for ${businessName}:`, error);
        return [];
    } finally {
        await browser.close();
    }
}
