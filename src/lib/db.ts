import { Job, JobMatchResult, MultiAgentResult } from './job-types';
import dbConnect from './mongodb';
import UserData from '@/models/UserData';
import { redis } from './redis';

export class DBManager {
  static async getUserData(userId: string) {
    await dbConnect();
    let userData = await UserData.findOne({ userId });
    if (!userData) {
      userData = await UserData.create({ userId, jobs: [], matches: [], latestAnalysis: null });
    }
    return userData;
  }

  static getCacheKey(userId: string, key: string) {
    return `user:${userId}:${key}`;
  }

  static async invalidateCache(userId: string, key: string) {
    try {
      await redis.del(this.getCacheKey(userId, key));
    } catch (e) {
      console.error('Redis delete error', e);
    }
  }

  static async saveJobs(userId: string, jobs: Job[]): Promise<void> {
    const userData = await this.getUserData(userId);
    const existingIds = new Set(userData.jobs.map((j: any) => j.id));
    
    let added = 0;
    for (const job of jobs) {
      if (!existingIds.has(job.id)) {
        userData.jobs.push(job);
        existingIds.add(job.id);
        added++;
      }
    }
    
    if (added > 0) {
      await userData.save();
      await this.invalidateCache(userId, 'jobs');
    }
  }

  static async getJobs(userId: string): Promise<Job[]> {
    try {
      const cached = await redis.get(this.getCacheKey(userId, 'jobs'));
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error('Redis get error', e);
    }

    const userData = await this.getUserData(userId);
    
    try {
      await redis.set(this.getCacheKey(userId, 'jobs'), JSON.stringify(userData.jobs), 'EX', 3600); // 1 hour cache
    } catch (e) {
      console.error('Redis set error', e);
    }
    
    return userData.jobs;
  }

  static async saveMatchResult(userId: string, match: JobMatchResult): Promise<void> {
    const userData = await this.getUserData(userId);
    userData.matches = userData.matches.filter((m: any) => m.job_id !== match.job_id);
    userData.matches.unshift(match);
    await userData.save();
    
    await this.invalidateCache(userId, 'matches');
  }

  static async getMatchResults(userId: string): Promise<JobMatchResult[]> {
    try {
      const cached = await redis.get(this.getCacheKey(userId, 'matches'));
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error('Redis get error', e);
    }

    const userData = await this.getUserData(userId);
    const matches = userData.matches.sort((a: any, b: any) => b.score - a.score);
    
    try {
      await redis.set(this.getCacheKey(userId, 'matches'), JSON.stringify(matches), 'EX', 3600);
    } catch (e) {
      console.error('Redis set error', e);
    }

    return matches;
  }

  static async saveLatestAnalysis(userId: string, result: MultiAgentResult): Promise<void> {
    const userData = await this.getUserData(userId);
    userData.latestAnalysis = result;
    await userData.save();
    
    await this.invalidateCache(userId, 'latestAnalysis');
  }

  static async getLatestAnalysis(userId: string): Promise<MultiAgentResult | null> {
    try {
      const cached = await redis.get(this.getCacheKey(userId, 'latestAnalysis'));
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error('Redis get error', e);
    }

    const userData = await this.getUserData(userId);
    const latestAnalysis = userData.latestAnalysis || null;

    if (latestAnalysis) {
      try {
        await redis.set(this.getCacheKey(userId, 'latestAnalysis'), JSON.stringify(latestAnalysis), 'EX', 3600);
      } catch (e) {
        console.error('Redis set error', e);
      }
    }

    return latestAnalysis;
  }

  static async clearAllMatchResults(userId: string): Promise<void> {
    const userData = await this.getUserData(userId);
    userData.matches = [];
    userData.latestAnalysis = null;
    await userData.save();
    
    await this.invalidateCache(userId, 'matches');
    await this.invalidateCache(userId, 'latestAnalysis');
  }
}
