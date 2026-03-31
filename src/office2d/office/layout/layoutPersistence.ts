import type { OfficeLayout } from '../types';
import { deserializeLayout, serializeLayout } from './layoutSerializer';

const STORAGE_KEY = 'ual-office-layout-v1';
const STORAGE_KEY_REVISION = 'ual-office-layout-revision';

/**
 * Save layout to localStorage.
 * Automatically called when layout changes in edit mode.
 */
export function saveLayout(layout: OfficeLayout): void {
  try {
    const serialized = serializeLayout(layout);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(STORAGE_KEY_REVISION, String(Date.now()));
    console.log('[LayoutPersistence] Layout saved successfully');
  } catch (err) {
    console.error('[LayoutPersistence] Failed to save layout:', err);
  }
}

/**
 * Load layout from localStorage.
 * Returns null if no saved layout exists or if it fails to parse.
 */
export function loadSavedLayout(): OfficeLayout | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      console.log('[LayoutPersistence] No saved layout found');
      return null;
    }

    const layout = deserializeLayout(saved);
    if (layout) {
      console.log('[LayoutPersistence] Layout loaded successfully:',
        `${layout.furniture.length} furniture items, ${layout.cols}x${layout.rows} tiles`);
    }
    return layout;
  } catch (err) {
    console.error('[LayoutPersistence] Failed to load layout:', err);
    return null;
  }
}

/**
 * Clear saved layout from localStorage.
 * Use this to reset to default layout.
 */
export function clearSavedLayout(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_REVISION);
    console.log('[LayoutPersistence] Saved layout cleared');
  } catch (err) {
    console.error('[LayoutPersistence] Failed to clear layout:', err);
  }
}

/**
 * Check if there's a saved layout.
 */
export function hasSavedLayout(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

/**
 * Get the timestamp of last save.
 */
export function getLastSaveTime(): number | null {
  const revision = localStorage.getItem(STORAGE_KEY_REVISION);
  return revision ? parseInt(revision, 10) : null;
}
