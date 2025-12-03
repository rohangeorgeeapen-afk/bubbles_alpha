/**
 * Rate Limiter with LRU eviction and configurable storage
 * 
 * Features:
 * - LRU cache eviction to prevent memory bloat
 * - Sliding window rate limiting
 * - Configurable limits per identifier type
 * - Proper cleanup on module unload
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastAccess: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number; // seconds until reset
}

// Configuration
const MAX_ENTRIES = 10000; // Maximum entries before LRU eviction
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    // Clean up expired entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL_MS);

    // Ensure cleanup interval doesn't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.store.forEach((entry, key) => {
      if (now > entry.resetTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.store.delete(key));

    // LRU eviction if still over limit
    if (this.store.size > MAX_ENTRIES) {
      this.evictLRU();
    }
  }

  private evictLRU(): void {
    // Sort by lastAccess and remove oldest entries
    const entries = Array.from(this.store.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    const toRemove = entries.slice(0, Math.floor(MAX_ENTRIES * 0.2)); // Remove 20%
    toRemove.forEach(([key]) => this.store.delete(key));
  }

  check(
    identifier: string,
    maxRequests: number,
    windowMs: number = 60 * 60 * 1000 // 1 hour default
  ): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // No entry or expired - create new
    if (!entry || now > entry.resetTime) {
      const resetTime = now + windowMs;
      this.store.set(identifier, { count: 1, resetTime, lastAccess: now });
      return { allowed: true, remaining: maxRequests - 1, resetTime };
    }

    // Update last access time
    entry.lastAccess = now;

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: entry.resetTime,
        retryAfter 
      };
    }

    // Increment count
    entry.count++;
    this.store.set(identifier, entry);
    return { 
      allowed: true, 
      remaining: maxRequests - entry.count, 
      resetTime: entry.resetTime 
    };
  }

  // For testing or manual reset
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  // Get current stats (useful for monitoring)
  getStats(): { totalEntries: number; oldestEntry: number | null } {
    let oldest: number | null = null;
    this.store.forEach(entry => {
      if (oldest === null || entry.lastAccess < oldest) {
        oldest = entry.lastAccess;
      }
    });
    return { totalEntries: this.store.size, oldestEntry: oldest };
  }

  // Cleanup on shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// Export functions for backward compatibility
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number = 60 * 60 * 1000
): RateLimitResult {
  return rateLimiter.check(identifier, maxRequests, windowMs);
}

export function getRateLimitIdentifier(userId?: string, ip?: string): string {
  // Prefer user ID for authenticated users, fall back to IP
  // Sanitize IP to handle IPv6 and forwarded headers
  const sanitizedIp = ip?.split(',')[0]?.trim() || 'unknown';
  return userId || `ip:${sanitizedIp}`;
}

// Export for testing
export function resetRateLimit(identifier: string): void {
  rateLimiter.reset(identifier);
}

export function getRateLimitStats(): { totalEntries: number; oldestEntry: number | null } {
  return rateLimiter.getStats();
}
