/**
 * Cleanup Scheduler
 * This module handles periodic cleanup of expired guest users
 */

const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const CLEANUP_SECRET = process.env.CLEANUP_SECRET || 'internal-cleanup-secret';

let intervalId: NodeJS.Timeout | null = null;

/**
 * Perform cleanup of expired guest users
 */
async function performCleanup(): Promise<void> {
  try {
    const response = await fetch('/api/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLEANUP_SECRET}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[Cleanup] Deleted ${data.deletedCount} expired guest users at ${new Date().toISOString()}`);
    } else {
      console.error(`[Cleanup] Failed to cleanup: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[Cleanup] Error performing cleanup:', error);
  }
}

/**
 * Start the cleanup scheduler
 */
export function startCleanupScheduler(): void {
  if (intervalId) {
    console.log('[Cleanup] Scheduler already running');
    return;
  }

  console.log('[Cleanup] Starting scheduler (interval: 5 minutes)');
  
  // Perform initial cleanup
  performCleanup();
  
  // Schedule periodic cleanup
  intervalId = setInterval(() => {
    performCleanup();
  }, CLEANUP_INTERVAL);
}

/**
 * Stop the cleanup scheduler
 */
export function stopCleanupScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Cleanup] Scheduler stopped');
  }
}

/**
 * Manually trigger cleanup
 */
export function triggerCleanup(): Promise<void> {
  return performCleanup();
}

// Auto-start on module load (only in production or when enabled)
// Temporarily disabled to prevent startup errors
// if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_ENABLE_CLEANUP !== 'false') {
//   startCleanupScheduler();
// }
