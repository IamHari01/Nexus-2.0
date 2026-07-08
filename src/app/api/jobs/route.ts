import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DBManager } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'clear') {
      await DBManager.clearAllMatchResults(userId);
      return NextResponse.json({ success: true, message: 'All match results cleared.' });
    }

    const jobs = await DBManager.getJobs(userId);
    const matches = await DBManager.getMatchResults(userId);
    const latestAnalysis = await DBManager.getLatestAnalysis(userId);

    // Compute dynamic dashboard stats
    const totalJobsFetched = jobs.length;
    const matchScores = matches.map(m => m.score);
    const averageMatchScore = matchScores.length > 0 
      ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length) 
      : 0;
    const highMatchesCount = matches.filter(m => m.score >= 75).length;

    // Aggregate skills statistics using Map for O(N) single-pass
    const skillsMatchedMap = new Map<string, number>();
    const skillsMissingMap = new Map<string, number>();

    for (const m of matches) {
      if (m.matched_skills) {
        for (const s of m.matched_skills) {
          skillsMatchedMap.set(s, (skillsMatchedMap.get(s) || 0) + 1);
        }
      }
      if (m.missing_skills) {
        for (const s of m.missing_skills) {
          skillsMissingMap.set(s, (skillsMissingMap.get(s) || 0) + 1);
        }
      }
    }

    const topSkillsMatched = Array.from(skillsMatchedMap.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topMissingSkills = Array.from(skillsMissingMap.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const stats = {
      totalJobsFetched,
      averageMatchScore,
      highMatchesCount,
      topSkillsMatched,
      topMissingSkills,
    };

    return NextResponse.json({
      success: true,
      jobs,
      matches,
      stats,
      latestAnalysis,
    });
  } catch (err: any) {
    console.error('API Error in GET /api/jobs:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
