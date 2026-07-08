import { Job, JobMatchResult, MultiAgentResult } from './job-types';
import dbConnect from './mongodb';
import UserData from '@/models/UserData';
import { redis } from './redis';
import fs from 'fs';
import path from 'path';

const DB_FALLBACK_FILE = path.join(process.cwd(), 'src/lib/db-fallback.json');

// In-memory cache for fallback
let fallbackData: any = null;

function loadFallbackData() {
  if (fallbackData) return fallbackData;
  try {
    if (fs.existsSync(DB_FALLBACK_FILE)) {
      const data = fs.readFileSync(DB_FALLBACK_FILE, 'utf-8');
      fallbackData = JSON.parse(data);
    }
  } catch (e) {
    console.warn('Error reading fallback db', e);
  }
  if (!fallbackData) fallbackData = { users: {} };
  return fallbackData;
}

function saveFallbackData() {
  try {
    fs.writeFileSync(DB_FALLBACK_FILE, JSON.stringify(fallbackData, null, 2));
  } catch (e) {
    console.warn('Error writing fallback db', e);
  }
}

function getFallbackUser(userId: string) {
  const data = loadFallbackData();
  if (!data.users) data.users = {};
  if (!data.users[userId]) {
    data.users[userId] = { jobs: [], matches: [], latestAnalysis: null };
  }
  return data.users[userId];
}

async function useMongo() {
  return process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<username>');
}

export class DBManager {
  static async getUserData(userId: string) {
    if (await useMongo()) {
      try {
        await dbConnect();
        let userData = await UserData.findOne({ userId });
        if (!userData) {
          userData = await UserData.create({ userId, jobs: [], matches: [], latestAnalysis: null });
        }
        return userData;
      } catch (e) {
        console.warn('MongoDB getUserData failed, using fallback', e);
      }
    }
    return getFallbackUser(userId);
  }

  static getCacheKey(userId: string, key: string) {
    return `user:${userId}:${key}`;
  }

  static async invalidateCache(userId: string, key: string) {
    if (await useMongo()) {
      try {
        await redis.del(this.getCacheKey(userId, key));
      } catch (e) {
        // ignore
      }
    }
  }

  static async saveJobs(userId: string, jobs: Job[]): Promise<void> {
    if (await useMongo()) {
      try {
        const userData = await this.getUserData(userId);
        if (userData.save) {
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
          return;
        }
      } catch (e) {
        console.warn('MongoDB saveJobs failed, using fallback', e);
      }
    }
    
    // Fallback
    const user = getFallbackUser(userId);
    const existingIds = new Set(user.jobs.map((j: any) => j.id || j.job_id));
    for (const job of jobs) {
      if (!existingIds.has(job.id)) {
        user.jobs.push(job);
        existingIds.add(job.id);
      }
    }
    saveFallbackData();
  }

  static async getJobs(userId: string): Promise<Job[]> {
    if (await useMongo()) {
      try {
        const cached = await redis.get(this.getCacheKey(userId, 'jobs'));
        if (cached) return JSON.parse(cached);
        const userData = await this.getUserData(userId);
        await redis.set(this.getCacheKey(userId, 'jobs'), JSON.stringify(userData.jobs || []), 'EX', 3600);
        return userData.jobs || [];
      } catch (e) {
        console.warn('MongoDB/Redis getJobs failed, using fallback', e);
      }
    }
    
    return getFallbackUser(userId).jobs || [];
  }

  static async saveMatchResult(userId: string, match: JobMatchResult): Promise<void> {
    if (await useMongo()) {
      try {
        const userData = await this.getUserData(userId);
        if (userData.save) {
          userData.matches = (userData.matches || []).filter((m: any) => m.job_id !== match.job_id);
          userData.matches.unshift(match);
          await userData.save();
          await this.invalidateCache(userId, 'matches');
          return;
        }
      } catch (e) {
        console.warn('MongoDB saveMatchResult failed, using fallback', e);
      }
    }
    
    const user = getFallbackUser(userId);
    user.matches = (user.matches || []).filter((m: any) => m.job_id !== match.job_id);
    user.matches.unshift(match);
    saveFallbackData();
  }

  static async getMatchResults(userId: string): Promise<JobMatchResult[]> {
    if (await useMongo()) {
      try {
        const cached = await redis.get(this.getCacheKey(userId, 'matches'));
        if (cached) return JSON.parse(cached);
        const userData = await this.getUserData(userId);
        const matches = (userData.matches || []).sort((a: any, b: any) => b.score - a.score);
        await redis.set(this.getCacheKey(userId, 'matches'), JSON.stringify(matches), 'EX', 3600);
        return matches;
      } catch (e) {
        console.warn('MongoDB/Redis getMatchResults failed, using fallback', e);
      }
    }
    
    return (getFallbackUser(userId).matches || []).sort((a: any, b: any) => b.score - a.score);
  }

  static async saveLatestAnalysis(userId: string, result: MultiAgentResult): Promise<void> {
    if (await useMongo()) {
      try {
        const userData = await this.getUserData(userId);
        if (userData.save) {
          userData.latestAnalysis = result;
          await userData.save();
          await this.invalidateCache(userId, 'latestAnalysis');
          return;
        }
      } catch (e) {
        console.warn('MongoDB saveLatestAnalysis failed, using fallback', e);
      }
    }
    
    const user = getFallbackUser(userId);
    user.latestAnalysis = result;
    saveFallbackData();
  }

  static async getLatestAnalysis(userId: string): Promise<MultiAgentResult | null> {
    if (await useMongo()) {
      try {
        const cached = await redis.get(this.getCacheKey(userId, 'latestAnalysis'));
        if (cached) return JSON.parse(cached);
        const userData = await this.getUserData(userId);
        const latestAnalysis = userData.latestAnalysis || null;
        if (latestAnalysis) {
          await redis.set(this.getCacheKey(userId, 'latestAnalysis'), JSON.stringify(latestAnalysis), 'EX', 3600);
        }
        return latestAnalysis;
      } catch (e) {
        console.warn('MongoDB/Redis getLatestAnalysis failed, using fallback', e);
      }
    }
    
    return getFallbackUser(userId).latestAnalysis || null;
  }

  static async clearAllMatchResults(userId: string): Promise<void> {
    if (await useMongo()) {
      try {
        const userData = await this.getUserData(userId);
        if (userData.save) {
          userData.matches = [];
          userData.latestAnalysis = null;
          await userData.save();
          await this.invalidateCache(userId, 'matches');
          await this.invalidateCache(userId, 'latestAnalysis');
          return;
        }
      } catch (e) {
        console.warn('MongoDB clearAllMatchResults failed, using fallback', e);
      }
    }
    
    const user = getFallbackUser(userId);
    user.matches = [];
    user.latestAnalysis = null;
    saveFallbackData();
  }
}
