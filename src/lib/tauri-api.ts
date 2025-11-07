/**
 * Tauri API wrapper for backend communication
 */

import { invoke } from '@tauri-apps/api/core';
import type { MatchSummary, MatchDetail } from '../types';

/**
 * Open folder selection dialog and return selected path
 */
export async function selectFolder(): Promise<string> {
  try {
    const result = await invoke<string>('select_folder');
    return result;
  } catch (error) {
    console.error('Error selecting folder:', error);
    throw error;
  }
}

/**
 * Load all matches from the selected folder
 */
export async function loadMatches(folderPath: string): Promise<MatchSummary[]> {
  try {
    const result = await invoke<MatchSummary[]>('load_matches', { folderPath });
    return result;
  } catch (error) {
    console.error('Error loading matches:', error);
    throw error;
  }
}

/**
 * Load all matches for large datasets
 */
export async function loadMatchesWithProgress(
  folderPath: string,
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void
): Promise<MatchSummary[]> {
  try {
    // For now, just show a simple loading state without events
    // This avoids permission issues with event listening
    if (onProgress) {
      onProgress({ processed: 0, total: 100, percentage: 0 });
    }

    const result = await invoke<MatchSummary[]>('load_matches_with_progress', { folderPath });

    if (onProgress) {
      onProgress({ processed: 100, total: 100, percentage: 100 });
    }

    return result;
  } catch (error) {
    console.error('Error loading matches:', error);
    throw error;
  }
}

/**
 * Get detailed match information by ID
 */
export async function getMatchDetail(folderPath: string, matchId: string): Promise<MatchDetail> {
  try {
    const result = await invoke<MatchDetail>('get_match_detail', {
      folderPath,
      matchId
    });
    return result;
  } catch (error) {
    console.error('Error getting match detail:', error);
    throw error;
  }
}

/**
 * Get multiple match details in parallel for better performance
 */
export async function getMultipleMatchDetails(folderPath: string, matchIds: string[]): Promise<MatchDetail[]> {
  try {
    const result = await invoke<MatchDetail[]>('get_multiple_match_details', {
      folderPath,
      matchIds
    });
    return result;
  } catch (error) {
    console.error('Error getting multiple match details:', error);
    throw error;
  }
}

/**
 * Get multiple match details with estimated progress (controlled batching)
 */
export async function getMultipleMatchDetailsWithProgress(
  folderPath: string,
  matchIds: string[],
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void
): Promise<MatchDetail[]> {
  try {
    const totalMatches = matchIds.length;
    const batchSize = 10; // Matches backend batch size
    const estimatedMsPerBatch = 200; // Rough estimate
    const totalBatches = Math.ceil(totalMatches / batchSize);

    // Start progress
    if (onProgress) {
      onProgress({ processed: 0, total: totalMatches, percentage: 0 });
    }

    // Estimate progress based on time and known batching
    let currentBatch = 0;
    const progressInterval = setInterval(() => {
      if (onProgress && currentBatch < totalBatches) {
        currentBatch++;
        const processed = Math.min(currentBatch * batchSize, totalMatches);
        const percentage = Math.min(Math.round((processed / totalMatches) * 100), 95); // Cap at 95% until complete

        onProgress({ processed, total: totalMatches, percentage });
      }
    }, estimatedMsPerBatch);

    const result = await invoke<MatchDetail[]>('get_multiple_match_details_with_progress', {
      folderPath,
      matchIds
    });
    // Clear interval and show completion
    clearInterval(progressInterval);
    if (onProgress) {
      onProgress({ processed: totalMatches, total: totalMatches, percentage: 100 });
    }

    return result;
  } catch (error) {
    console.error('Error getting multiple match details with progress:', error);
    throw error;
  }
}
