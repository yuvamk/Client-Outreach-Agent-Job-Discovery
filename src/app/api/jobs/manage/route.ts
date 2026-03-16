import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobModel from '@/models/Job';
import { InstinctStore } from '@/lib/InstinctStore';

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get('deleteAll') === 'true';
    const id = searchParams.get('id');

    if (deleteAll) {
      const result = await JobModel.deleteMany({});
      return NextResponse.json({ 
        message: 'All jobs deleted successfully', 
        count: result.deletedCount 
      });
    }

    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const deletedJob = await JobModel.findByIdAndDelete(id);
    if (!deletedJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Record this as a "dislike" instinct (ECC Learning)
    try {
      await InstinctStore.recordPreference(id, 'dislike', deletedJob.title);
    } catch (err) {
      console.error('Failed to record instinct:', err);
    }

    return NextResponse.json({ message: 'Job deleted successfully' });
  } catch (err: unknown) {
    console.error('[manage/DELETE] error:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Failed to delete job' 
    }, { status: 500 });
  }
}
