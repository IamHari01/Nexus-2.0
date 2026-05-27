import { NextResponse } from 'next/server';
import { DBManager } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'clear') {
      await DBManager.clearAllMatchResults();
      return NextResponse.json({ success: true, message: 'All match results cleared.' });
    }

    const jobs = await DBManager.getJobs();
    const matches = await DBManager.getMatchResults();
    const latestAnalysis = await DBManager.getLatestAnalysis();

    // Compute dynamic dashboard stats
    const totalJobsFetched = jobs.length;
    const matchScores = matches.map(m => m.score);
    const averageMatchScore = matchScores.length > 0 
      ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length) 
      : 0;
    const highMatchesCount = matches.filter(m => m.score >= 75).length;

    // Aggregate skills statistics
    const skillsMatchedMap: Record<string, number> = {};
    const skillsMissingMap: Record<string, number> = {};

    for (const m of matches) {
      if (m.matched_skills) {
        for (const s of m.matched_skills) {
          skillsMatchedMap[s] = (skillsMatchedMap[s] || 0) + 1;
        }
      }
      if (m.missing_skills) {
        for (const s of m.missing_skills) {
          skillsMissingMap[s] = (skillsMissingMap[s] || 0) + 1;
        }
      }
    }

    const topSkillsMatched = Object.entries(skillsMatchedMap)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topMissingSkills = Object.entries(skillsMissingMap)
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
