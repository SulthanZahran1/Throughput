import type { MetaState } from '../engine/types';

// Default to relative /api, allow override via env
const API_BASE = import.meta.env.VITE_API_URL || '';

interface ApiClient {
  getMeta: (deviceId: string) => Promise<MetaState | null>;
  updateMeta: (deviceId: string, data: Partial<MetaState>) => Promise<MetaState | null>;
  submitRun: (run: RunSubmission) => Promise<{ success: boolean } | null>;
}

export interface RunSubmission {
  deviceId: string;
  seed: number;
  difficulty: 'normal' | 'hard' | 'brutal';
  shiftsSurvived: number;
  totalOrdersCompleted: number;
  totalOrdersFailed: number;
  finalHp: number;
  maxHp: number;
  score: number;
  cratesEarned: number;
  upgradesHeld: string[];
  won: boolean;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      console.warn(`[API] ${options.method || 'GET'} ${path} failed:`, response.status, response.statusText);
      return null;
    }

    return await response.json() as T;
  } catch (err) {
    // Silent/offline-friendly failures — do not block gameplay
    console.warn('[API] Request failed (offline?):', err);
    return null;
  }
}

export const api: ApiClient = {
  getMeta: (deviceId: string): Promise<MetaState | null> => {
    return request<MetaState>(`/api/meta?deviceId=${encodeURIComponent(deviceId)}`);
  },

  updateMeta: (deviceId: string, data: Partial<MetaState>): Promise<MetaState | null> => {
    return request<MetaState>(`/api/meta?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  submitRun: (run: RunSubmission): Promise<{ success: boolean } | null> => {
    return request<{ success: boolean }>('/api/runs', {
      method: 'POST',
      body: JSON.stringify(run),
    });
  },
};
