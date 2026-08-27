/**
 * Key Orchestrator — manages a pool of Gemini API keys
 * with round-robin selection, health tracking, and auto-cooldown.
 */

export interface KeyEntry {
  key: string;
  requestCount: number;
  lastError: string | null;
  cooldownUntil: number; // timestamp ms
  isHealthy: boolean;
}

export interface KeyOrchestratorConfig {
  keys: string[];
  cooldownMs?: number; // default 60s
}

class KeyOrchestrator {
  private pool: KeyEntry[] = [];
  private currentIndex = 0;
  private cooldownMs: number;

  constructor(config: KeyOrchestratorConfig) {
    this.cooldownMs = config.cooldownMs ?? 60_000;
    this.pool = config.keys.map((key) => ({
      key,
      requestCount: 0,
      lastError: null,
      cooldownUntil: 0,
      isHealthy: true,
    }));

    if (this.pool.length === 0) {
      console.warn('[KeyOrchestrator] No API keys configured! Add keys to GEMINI_API_KEYS.');
    }
  }

  /**
   * Get the next healthy API key using round-robin.
   * Throws if all keys are on cooldown.
   */
  getKey(): string {
    const now = Date.now();
    const poolSize = this.pool.length;

    // Try each key starting from current index
    for (let i = 0; i < poolSize; i++) {
      const idx = (this.currentIndex + i) % poolSize;
      const entry = this.pool[idx];

      // Check if cooldown has expired
      if (entry.cooldownUntil > 0 && now >= entry.cooldownUntil) {
        entry.cooldownUntil = 0;
        entry.isHealthy = true;
        entry.lastError = null;
      }

      if (entry.isHealthy) {
        this.currentIndex = (idx + 1) % poolSize;
        entry.requestCount++;
        return entry.key;
      }
    }

    // All keys exhausted — find the one with the soonest cooldown expiry
    const soonest = this.pool.reduce((min, entry) =>
      entry.cooldownUntil < min.cooldownUntil ? entry : min
    );
    const waitMs = soonest.cooldownUntil - now;

    throw new Error(
      `All API keys are on cooldown. Nearest recovery in ${Math.ceil(waitMs / 1000)}s. ` +
      `Pool status: ${this.pool.map(e => `${e.key.slice(0, 8)}…: ${e.isHealthy ? 'OK' : 'COOLDOWN'}`).join(', ')}`
    );
  }

  /**
   * Mark a key as exhausted (429 / RESOURCE_EXHAUSTED).
   * It will be excluded from rotation for cooldownMs.
   */
  reportExhausted(key: string, errorMsg?: string): void {
    const entry = this.pool.find((e) => e.key === key);
    if (!entry) return;

    entry.isHealthy = false;
    entry.cooldownUntil = Date.now() + this.cooldownMs;
    entry.lastError = errorMsg ?? 'RESOURCE_EXHAUSTED';

    console.warn(
      `[KeyOrchestrator] Key ${key.slice(0, 8)}… exhausted. Cooldown until ${new Date(entry.cooldownUntil).toISOString()}`
    );
  }

  /**
   * Report a successful use of a key — clears error state.
   */
  reportSuccess(key: string): void {
    const entry = this.pool.find((e) => e.key === key);
    if (!entry) return;

    entry.isHealthy = true;
    entry.lastError = null;
    entry.cooldownUntil = 0;
  }

  /**
   * Get current pool status for monitoring/dashboard.
   */
  getStatus(): { total: number; healthy: number; keys: KeyEntry[] } {
    const now = Date.now();

    // Auto-recover expired cooldowns
    for (const entry of this.pool) {
      if (entry.cooldownUntil > 0 && now >= entry.cooldownUntil) {
        entry.cooldownUntil = 0;
        entry.isHealthy = true;
        entry.lastError = null;
      }
    }

    return {
      total: this.pool.length,
      healthy: this.pool.filter((e) => e.isHealthy).length,
      keys: this.pool.map((e) => ({
        ...e,
        key: e.key.slice(0, 8) + '…', // mask for safety
      })),
    };
  }
}

// Singleton instance
let instance: KeyOrchestrator | null = null;

export function getKeyOrchestrator(): KeyOrchestrator {
  if (!instance) {
    const keysEnv = process.env.GEMINI_API_KEYS ?? '';
    const keys = keysEnv.split(',').map((k) => k.trim()).filter(Boolean);
    instance = new KeyOrchestrator({ keys });
  }
  return instance;
}

export default KeyOrchestrator;
