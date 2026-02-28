/**
 * Formatting utility functions
 */

/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format time in seconds to compact form (e.g., "1m 30s")
 */
export function formatTimeCompact(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format score with proper suffix
 */
export function formatScore(score: number): string {
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  return score.toString();
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Generate a random seed
 */
export function generateSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}

/**
 * Format a seed for display
 */
export function formatSeed(seed: number): string {
  return seed.toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Parse a seed from string input
 */
export function parseSeed(input: string): number | null {
  // Try hex first
  if (/^[0-9A-Fa-f]+$/.test(input)) {
    const parsed = parseInt(input, 16);
    if (!isNaN(parsed)) return parsed >>> 0;
  }
  
  // Try decimal
  const parsed = parseInt(input, 10);
  if (!isNaN(parsed)) return parsed >>> 0;
  
  return null;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a shift number (1-8)
 */
export function formatShift(shiftNumber: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const suffix = suffixes[shiftNumber % 100] || suffixes[0];
  return `${shiftNumber}${suffix} Shift`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
