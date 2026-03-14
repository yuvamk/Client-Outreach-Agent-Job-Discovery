import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobModel from '@/models/Job';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || '';
    const platform = searchParams.get('platform') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sortBy = searchParams.get('sortBy') || 'scraped_at';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);

    // Build query
    const query: Record<string, unknown> = {};
    if (category) query.category = { $regex: new RegExp(category, 'i') };
    if (platform) query.source_platform = { $regex: new RegExp(platform, 'i') };
    if (dateFrom || dateTo) {
      query.scraped_at = {};
      if (dateFrom) (query.scraped_at as Record<string, Date>).$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        (query.scraped_at as Record<string, Date>).$lte = to;
      }
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      scraped_at: { scraped_at: -1 },
      total_score: { total_score: -1 },
      posted_timestamp: { posted_timestamp: -1 },
      match_score: { match_score: -1 },
    };
    const sort = sortMap[sortBy] ?? { scraped_at: -1 };

    const [jobs, total] = await Promise.all([
      JobModel.find(query).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      JobModel.countDocuments(query),
    ]);

    // Get unique categories & platforms for filter dropdowns
    const [categories, platforms] = await Promise.all([
      JobModel.distinct('category'),
      JobModel.distinct('source_platform'),
    ]);

    return NextResponse.json({
      jobs,
      total,
      page,
      pages: Math.ceil(total / limit),
      filters: { categories: categories.filter(Boolean), platforms: platforms.filter(Boolean) },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('[jobs/list]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
