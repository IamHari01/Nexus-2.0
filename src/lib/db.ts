import { Job, JobMatchResult, MultiAgentResult } from './job-types';
import dbConnect from './mongodb';
import UserData from '@/models/UserData';
import { redis } from './redis';
import { logger } from './logger';
import { env } from './env';

export class DBManager {
  static async getUserData(userId: string) {
    try {
      await dbConnect();
      let userData = await UserData.findOne({ userId });
      if (!userData) {
        userData = await UserData.create({ userId, jobs: [], matches: [], latestAnalysis: null });
      }
      return userData;
    } catch (e) {
      logger.error('MongoDB getUserData failed', e);
      throw new Error('Database connection failed');
    }
  }

  static getCacheKey(userId: string, key: string) {
    return `user:${userId}:${key}`;
  }

  static async invalidateCache(userId: string, key: string) {
    try {
      if (env.REDIS_URL) {
        await redis.del(this.getCacheKey(userId, key));
      }
    } catch (e) {
      logger.warn('Redis cache invalidation failed', e);
    }
  }

  static async saveJobs(userId: string, jobs: Job[]): Promise<void> {
    try {
      const userData = await this.getUserData(userId);
      if (userData.save) {
        const existingIds = new Set(userData.jobs.map((j: { id: string }) => j.id));
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
    } catch (e) {
      logger.error('MongoDB saveJobs failed', e);
      throw new Error('Database connection failed');
    }
  }

  static async getJobs(userId: string): Promise<Job[]> {
    try {
      if (env.REDIS_URL) {
        const cached = await redis.get(this.getCacheKey(userId, 'jobs'));
        if (cached) return JSON.parse(cached);
      }
      const userData = await this.getUserData(userId);
      const jobs = userData.jobs || [];
      if (env.REDIS_URL) {
        await redis.set(this.getCacheKey(userId, 'jobs'), JSON.stringify(jobs), 'EX', 3600);
      }
      return jobs;
    } catch (e) {
      logger.error('MongoDB/Redis getJobs failed', e);
      throw new Error('Database connection failed');
    }
  }

  static async saveMatchResult(userId: string, match: JobMatchResult): Promise<void> {
    try {
      const userData = await this.getUserData(userId);
      if (userData.save) {
        userData.matches = (userData.matches || []).filter((m: { job_id: string }) => m.job_id !== match.job_id);
        userData.matches.unshift(match);
        await userData.save();
        await this.invalidateCache(userId, 'matches');
      }
    } catch (e) {
      logger.error('MongoDB saveMatchResult failed', e);
      throw new Error('Database connection failed');
    }
  }

  static async getMatchResults(userId: string): Promise<JobMatchResult[]> {
    try {
      if (env.REDIS_URL) {
        const cached = await redis.get(this.getCacheKey(userId, 'matches'));
        if (cached) return JSON.parse(cached);
      }
      const userData = await this.getUserData(userId);
      const matches = (userData.matches || []).sort((a: { score: number }, b: { score: number }) => b.score - a.score);
      if (env.REDIS_URL) {
        await redis.set(this.getCacheKey(userId, 'matches'), JSON.stringify(matches), 'EX', 3600);
      }
      return matches;
    } catch (e) {
      logger.error('MongoDB/Redis getMatchResults failed', e);
      throw new Error('Database connection failed');
    }
  }

  static async saveLatestAnalysis(userId: string, result: MultiAgentResult): Promise<void> {
    try {
      const userData = await this.getUserData(userId);
      if (userData.save) {
        userData.latestAnalysis = result;
        await userData.save();
        await this.invalidateCache(userId, 'latestAnalysis');
      }
    } catch (e) {
      logger.error('MongoDB saveLatestAnalysis failed', e);
      throw new Error('Database connection failed');
    }
  }

  static async getLatestAnalysis(userId: string): Promise<MultiAgentResult | null> {
    try {
      if (env.REDIS_URL) {
        const cached = await redis.get(this.getCacheKey(userId, 'latestAnalysis'));
        if (cached) return JSON.parse(cached);
      }
      const userData = await this.getUserData(userId);
      const latestAnalysis = userData.latestAnalysis || null;
      if (env.REDIS_URL && latestAnalysis) {
        await redis.set(this.getCacheKey(userId, 'latestAnalysis'), JSON.stringify(latestAnalysis), 'EX', 3600);
      }
      return latestAnalysis;
    } catch (e) {
      logger.error('MongoDB/Redis getLatestAnalysis failed', e);
      throw new Error('Database connection failed');
    }
  }

  static async clearAllMatchResults(userId: string): Promise<void> {
    try {
      const userData = await this.getUserData(userId);
      if (userData.save) {
        userData.matches = [];
        userData.latestAnalysis = null;
        await userData.save();
        await this.invalidateCache(userId, 'matches');
        await this.invalidateCache(userId, 'latestAnalysis');
      }
    } catch (e) {
      logger.error('MongoDB clearAllMatchResults failed', e);
      throw new Error('Database connection failed');
    }
  }
}
