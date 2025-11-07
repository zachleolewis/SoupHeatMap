/**
 * Export utilities for handling file saving with Tauri or browser fallback
 */

import { invoke } from '@tauri-apps/api/core';

export interface ExportOptions {
  format: 'png' | 'jpg' | 'gif';
  transparent?: boolean;
  quality?: number;
}

/**
 * Save image data to file using Tauri APIs or browser download as fallback
 */
export async function saveImageFile(
  imageBlob: Blob,
  options: ExportOptions,
  filename: string = `soupheatmap.${options.format}`
): Promise<void> {
  // Check if we're in Tauri environment
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

  // If we're in Tauri, use Tauri APIs
  if (isTauri) {
    try {
      // Show save dialog using our custom command
      const filePath = await invoke<string | null>('save_file', {
        extensions: [options.format],
        defaultName: filename
      });

      if (filePath) {
        const arrayBuffer = await imageBlob.arrayBuffer();
        const uint8Array = Array.from(new Uint8Array(arrayBuffer));

        // Write file using our custom command
        await invoke('write_binary_file', {
          path: filePath,
          contents: uint8Array
        });

        return;
      }
    } catch (error) {
      console.error('Tauri export failed:', error);
      // Fall back to browser download
    }
  }

  // Browser download fallback
  const url = URL.createObjectURL(imageBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
