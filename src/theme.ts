export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'ocr-llm-pipeline-theme';
export function normalizeTheme(value: unknown): Theme { return value === 'light' ? 'light' : 'dark'; }
export function loadTheme(): Theme {
  try { return normalizeTheme(localStorage.getItem(STORAGE_KEY)); }
  catch { return 'dark'; }
}
export function saveTheme(theme: Theme) {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* file:// may deny local storage */ }
}
