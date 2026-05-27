import { Job, JobMatchResult, MultiAgentResult } from './job-types';
import fs from 'fs';
import path from 'path';

const LOCAL_DB_PATH = path.join(process.cwd(), 'src/lib/db-fallback.json');

// Initialize local JSON DB structure if it doesn't exist
function ensureLocalDbExists() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    try {
      fs.writeFileSync(
        LOCAL_DB_PATH,
        JSON.stringify({ jobs: [], matches: [] }, null, 2),
        'utf-8'
      );
    } catch (e) {
      console.error('Failed to initialize local JSON database file:', e);
    }
  }
}

// Local JSON file database helper functions
function readLocalDb(): { jobs: Job[]; matches: JobMatchResult[]; latestAnalysis?: MultiAgentResult | null } {
  ensureLocalDbExists();
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(data || '{"jobs":[],"matches":[],"latestAnalysis":null}');
  } catch (err) {
    console.error('Error reading local database file:', err);
    return { jobs: [], matches: [] };
  }
}

function writeLocalDb(data: { jobs: Job[]; matches: JobMatchResult[]; latestAnalysis?: MultiAgentResult | null }) {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local database file:', err);
  }
}

// Global Firebase Firestore database instance placeholder
let firestoreDb: any = null;

try {
  // Dynamically load Firebase SDK on server-side to avoid client bundling conflicts
  const hasFirebaseConfig = 
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (hasFirebaseConfig && typeof window === 'undefined') {
    const { initializeApp, getApps, getApp } = require('firebase/app');
    const { getFirestore } = require('firebase/firestore');

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firestoreDb = getFirestore(app);
    console.log('Firebase Firestore Database Client Initialized.');
  }
} catch (e) {
  console.warn('Firebase initialization skipped, using local JSON database fallback.', e);
}

// Unified Database Manager Class
export class DBManager {
  /**
   * Save fetched jobs, avoiding duplicates by job ID
   */
  static async saveJobs(jobs: Job[]): Promise<void> {
    if (firestoreDb) {
      try {
        const { doc, setDoc } = require('firebase/firestore');
        for (const job of jobs) {
          const jobRef = doc(firestoreDb, 'jobs', job.id);
          await setDoc(jobRef, job, { merge: true });
        }
        return;
      } catch (e) {
        console.error('Firestore saveJobs error, writing to local fallback:', e);
      }
    }

    // Fallback to local file
    const data = readLocalDb();
    const existingIds = new Set(data.jobs.map(j => j.id));
    
    let added = 0;
    for (const job of jobs) {
      if (!existingIds.has(job.id)) {
        data.jobs.push(job);
        existingIds.add(job.id);
        added++;
      }
    }
    
    if (added > 0) {
      writeLocalDb(data);
      console.log(`Saved ${added} new jobs to local database.`);
    }
  }

  /**
   * Fetch jobs with optional filtering
   */
  static async getJobs(): Promise<Job[]> {
    if (firestoreDb) {
      try {
        const { collection, getDocs } = require('firebase/firestore');
        const jobsCol = collection(firestoreDb, 'jobs');
        const snapshot = await getDocs(jobsCol);
        const jobsList: Job[] = [];
        snapshot.forEach((doc: any) => {
          jobsList.push(doc.data() as Job);
        });
        return jobsList;
      } catch (e) {
        console.error('Firestore getJobs error, loading local fallback:', e);
      }
    }

    // Fallback
    const data = readLocalDb();
    return data.jobs;
  }

  /**
   * Save a single match result
   */
  static async saveMatchResult(match: JobMatchResult): Promise<void> {
    if (firestoreDb) {
      try {
        const { doc, setDoc } = require('firebase/firestore');
        const matchRef = doc(firestoreDb, 'matches', match.job_id);
        await setDoc(matchRef, match, { merge: true });
        return;
      } catch (e) {
        console.error('Firestore saveMatchResult error, writing local fallback:', e);
      }
    }

    // Fallback
    const data = readLocalDb();
    data.matches = data.matches.filter(m => m.job_id !== match.job_id);
    data.matches.unshift(match);
    writeLocalDb(data);
  }

  /**
   * Fetch all match results sorted by match score
   */
  static async getMatchResults(): Promise<JobMatchResult[]> {
    if (firestoreDb) {
      try {
        const { collection, getDocs, query, orderBy } = require('firebase/firestore');
        const matchesCol = collection(firestoreDb, 'matches');
        // Simple query without compound order requirements
        const snapshot = await getDocs(matchesCol);
        const matchesList: JobMatchResult[] = [];
        snapshot.forEach((doc: any) => {
          matchesList.push(doc.data() as JobMatchResult);
        });
        return matchesList.sort((a, b) => b.score - a.score);
      } catch (e) {
        console.error('Firestore getMatchResults error, loading local fallback:', e);
      }
    }

    // Fallback
    const data = readLocalDb();
    return data.matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Save the complete latest multi-agent analysis result
   */
  static async saveLatestAnalysis(result: MultiAgentResult): Promise<void> {
    if (firestoreDb) {
      try {
        const { doc, setDoc } = require('firebase/firestore');
        const docRef = doc(firestoreDb, 'analysis', 'latest');
        await setDoc(docRef, result);
        return;
      } catch (e) {
        console.error('Firestore saveLatestAnalysis error, writing to local fallback:', e);
      }
    }

    // Fallback
    const data = readLocalDb();
    data.latestAnalysis = result;
    writeLocalDb(data);
  }

  /**
   * Retrieve the latest multi-agent analysis result
   */
  static async getLatestAnalysis(): Promise<MultiAgentResult | null> {
    if (firestoreDb) {
      try {
        const { doc, getDoc } = require('firebase/firestore');
        const docRef = doc(firestoreDb, 'analysis', 'latest');
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          return snapshot.data() as MultiAgentResult;
        }
        return null;
      } catch (e) {
        console.error('Firestore getLatestAnalysis error, loading local fallback:', e);
      }
    }

    // Fallback
    const data = readLocalDb();
    return data.latestAnalysis || null;
  }

  /**
   * Clear all match results history and latest analysis
   */
  static async clearAllMatchResults(): Promise<void> {
    if (firestoreDb) {
      try {
        const { collection, getDocs, deleteDoc, doc } = require('firebase/firestore');
        const matchesCol = collection(firestoreDb, 'matches');
        const snapshot = await getDocs(matchesCol);
        for (const document of snapshot.docs) {
          await deleteDoc(doc(firestoreDb, 'matches', document.id));
        }
        
        // Also clear latest analysis
        try {
          await deleteDoc(doc(firestoreDb, 'analysis', 'latest'));
        } catch (err) {
          console.warn('Could not clear latest analysis document in Firestore:', err);
        }
        return;
      } catch (e) {
        console.error('Firestore clearAllMatchResults error, clearing local fallback:', e);
      }
    }

    // Fallback
    const data = readLocalDb();
    data.matches = [];
    data.latestAnalysis = null;
    writeLocalDb(data);
  }
}
