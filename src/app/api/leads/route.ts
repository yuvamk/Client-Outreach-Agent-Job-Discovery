import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/Lead';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const city = searchParams.get('city');
        const category = searchParams.get('category');
        const status = searchParams.get('status');

        const filter: any = {};
        if (city) filter.city = new RegExp(city, 'i');
        if (category) filter.category = new RegExp(category, 'i');
        if (status) filter.emailStatus = status;

        const leads = await Lead.find(filter).sort({ scrapedAt: -1 });
        return NextResponse.json(leads);
    } catch (error: any) {
        console.error('Database error:', error);
        return NextResponse.json([]); // Return empty array to prevent frontend crash
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await dbConnect();
        const { id } = await req.json();
        await Lead.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Lead deleted' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
