// packages/core/src/parsers/json-bucket.ts
import { readFile } from 'fs/promises';

/**
 * Load a JSON translation file and return a flat key-value map.
 * Handles nested JSON by flattening with dot-separated keys.
 */
export async function loadJsonTranslationFile(
  filePath: string
): Promise<Record<string, string>> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return flattenObject(parsed);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}; // File doesn't exist yet — not an error for our purposes
    }
    throw error;
  }
}

/**
 * Load multiple JSON translation files and merge them into a single flat map.
 */
export async function loadTranslationFiles(
  filePaths: string[]
): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};

  for (const filePath of filePaths) {
    // Only process JSON files
    if (!filePath.endsWith('.json')) continue;

    const entries = await loadJsonTranslationFile(filePath);
    Object.assign(merged, entries);
  }

  return merged;
}

/**
 * Flatten a nested object into a flat map with dot-separated keys.
 * Example: { a: { b: "hello" } } → { "a.b": "hello" }
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    }
    // Skip arrays, numbers, booleans, nulls
  }

  return result;
}

/**
 * Given a flat key-value map, reconstruct the nested JSON object.
 * Example: { "a.b": "hello" } → { a: { b: "hello" } }
 */
export function unflattenObject(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}
