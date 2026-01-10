/**
 * Firebase Analytics Module
 * Handles analytics persistence to Firebase Realtime Database
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const FIREBASE_CREDENTIALS_PATH = process.env.FIREBASE_CREDENTIALS_PATH || '/app/.credentials/firebase-service-account.json';
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL || 'https://mcp-analytics-49b45-default-rtdb.asia-southeast1.firebasedatabase.app';

export interface Analytics {
  serverStartTime: string;
  totalRequests: number;
  totalToolCalls: number;
  requestsByMethod: Record<string, number>;
  requestsByEndpoint: Record<string, number>;
  toolCalls: Record<string, number>;
  recentToolCalls: Array<{
    tool: string;
    timestamp: string;
    clientIp: string;
    userAgent: string;
  }>;
  clientsByIp: Record<string, number>;
  clientsByUserAgent: Record<string, number>;
  hourlyRequests: Record<string, number>;
  lastUpdated?: string;
}

export class FirebaseAnalytics {
  private db: admin.database.Database | null = null;
  private serverName: string;
  private initialized: boolean = false;

  constructor(serverName: string) {
    this.serverName = serverName;
    this.initialize();
  }

  private initialize(): void {
    try {
      if (!fs.existsSync(FIREBASE_CREDENTIALS_PATH)) {
        console.log(`⚠️ Firebase credentials not found at ${FIREBASE_CREDENTIALS_PATH}`);
        console.log('   Analytics will use local file storage only');
        return;
      }

      const serviceAccount = JSON.parse(fs.readFileSync(FIREBASE_CREDENTIALS_PATH, 'utf-8'));

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: FIREBASE_DATABASE_URL,
        });
      }

      this.db = admin.database();
      this.initialized = true;
      console.log('🔥 Firebase initialized successfully');
      console.log(`   Database: ${FIREBASE_DATABASE_URL}`);
      console.log(`   Path: /mcp-analytics/${this.serverName}`);
    } catch (error) {
      console.error('⚠️ Failed to initialize Firebase:', error);
    }
  }

  isInitialized(): boolean {
    return this.initialized && this.db !== null;
  }

  private sanitizeKey(key: string): string {
    return key.replace(/[.#$\/\[\]]/g, '_');
  }

  private sanitizeAnalytics(analytics: Analytics): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {
      serverStartTime: analytics.serverStartTime,
      totalRequests: analytics.totalRequests,
      totalToolCalls: analytics.totalToolCalls,
      requestsByMethod: {},
      requestsByEndpoint: {},
      toolCalls: {},
      recentToolCalls: analytics.recentToolCalls.slice(0, 50),
      clientsByIp: {},
      clientsByUserAgent: {},
      hourlyRequests: {},
      lastUpdated: new Date().toISOString(),
    };

    for (const [key, value] of Object.entries(analytics.requestsByMethod || {})) {
      (sanitized.requestsByMethod as Record<string, number>)[this.sanitizeKey(key)] = value;
    }

    for (const [key, value] of Object.entries(analytics.requestsByEndpoint || {})) {
      (sanitized.requestsByEndpoint as Record<string, number>)[this.sanitizeKey(key)] = value;
    }

    for (const [key, value] of Object.entries(analytics.toolCalls || {})) {
      (sanitized.toolCalls as Record<string, number>)[this.sanitizeKey(key)] = value;
    }

    for (const [key, value] of Object.entries(analytics.clientsByIp || {})) {
      (sanitized.clientsByIp as Record<string, number>)[this.sanitizeKey(key)] = value;
    }

    for (const [key, value] of Object.entries(analytics.clientsByUserAgent || {})) {
      (sanitized.clientsByUserAgent as Record<string, number>)[this.sanitizeKey(key)] = value;
    }

    for (const [key, value] of Object.entries(analytics.hourlyRequests || {})) {
      (sanitized.hourlyRequests as Record<string, number>)[this.sanitizeKey(key)] = value;
    }

    return sanitized;
  }

  async saveAnalytics(analytics: Analytics): Promise<boolean> {
    if (!this.isInitialized() || !this.db) {
      return false;
    }

    try {
      const sanitized = this.sanitizeAnalytics(analytics);
      await this.db.ref(`mcp-analytics/${this.serverName}`).set(sanitized);
      console.log('💾 Saved analytics to Firebase');
      return true;
    } catch (error) {
      console.error('⚠️ Failed to save analytics to Firebase:', error);
      return false;
    }
  }

  async loadAnalytics(): Promise<Analytics | null> {
    if (!this.isInitialized() || !this.db) {
      return null;
    }

    try {
      const snapshot = await this.db.ref(`mcp-analytics/${this.serverName}`).get();
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('📥 Loaded analytics from Firebase');
        return {
          serverStartTime: data.serverStartTime || new Date().toISOString(),
          totalRequests: data.totalRequests || 0,
          totalToolCalls: data.totalToolCalls || 0,
          requestsByMethod: data.requestsByMethod || {},
          requestsByEndpoint: data.requestsByEndpoint || {},
          toolCalls: data.toolCalls || {},
          recentToolCalls: data.recentToolCalls || [],
          clientsByIp: data.clientsByIp || {},
          clientsByUserAgent: data.clientsByUserAgent || {},
          hourlyRequests: data.hourlyRequests || {},
        };
      }
      return null;
    } catch (error) {
      console.error('⚠️ Failed to load analytics from Firebase:', error);
      return null;
    }
  }
}
