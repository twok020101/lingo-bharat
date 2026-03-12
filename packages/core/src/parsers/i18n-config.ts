// packages/core/src/parsers/i18n-config.ts
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import path from 'path';
import type { LingoConfig, Locale, CheckerContext } from '../types.js';
import { INDIC_LOCALE_CODES } from '../data/india-population.js';

/**
 * Parse a Lingo.dev i18n.json config file.
 * Supports schema versions 1.10+ with $schema, lockedKeys, ignoredKeys, preservedKeys.
 */
export async function parseLingoConfig(configPath: string): Promise<LingoConfig> {
  const raw = await readFile(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as LingoConfig;

  // Validate minimum required fields
  if (!parsed.locale?.source) {
    throw new Error(`Invalid i18n.json: missing "locale.source" in ${configPath}`);
  }
  if (!parsed.locale?.targets || parsed.locale.targets.length === 0) {
    throw new Error(`Invalid i18n.json: missing or empty "locale.targets" in ${configPath}`);
  }
  if (!parsed.buckets || Object.keys(parsed.buckets).length === 0) {
    throw new Error(`Invalid i18n.json: missing or empty "buckets" in ${configPath}`);
  }

  return parsed;
}

/**
 * Resolve translation files from i18n.json config.
 * Replaces [locale] placeholder in include patterns and globs for matching files.
 * Currently focuses on JSON bucket types for v1.
 */
export async function resolveTranslationFiles(
  config: LingoConfig,
  projectRoot: string
): Promise<Map<Locale, string[]>> {
  const fileMap = new Map<Locale, string[]>();

  for (const locale of config.locale.targets) {
    const files: string[] = [];

    for (const [_bucketType, bucketConfig] of Object.entries(config.buckets)) {
      for (const pattern of bucketConfig.include) {
        // Only process patterns that have [locale] placeholder or are JSON-like
        const resolvedPattern = pattern.replace(/\[locale\]/g, locale);
        const matches = await glob(resolvedPattern, {
          cwd: projectRoot,
          ignore: bucketConfig.exclude,
        });
        files.push(...matches.map(f => path.join(projectRoot, f)));
      }
    }

    fileMap.set(locale, files);
  }

  return fileMap;
}

/**
 * Resolve source locale files (English by default).
 */
export async function resolveSourceFiles(
  config: LingoConfig,
  projectRoot: string
): Promise<string[]> {
  const files: string[] = [];

  for (const [_bucketType, bucketConfig] of Object.entries(config.buckets)) {
    for (const pattern of bucketConfig.include) {
      const resolvedPattern = pattern.replace(/\[locale\]/g, config.locale.source);
      const matches = await glob(resolvedPattern, {
        cwd: projectRoot,
        ignore: bucketConfig.exclude,
      });
      files.push(...matches.map(f => path.join(projectRoot, f)));
    }
  }

  return files;
}

/**
 * Collect all ignoredKeys and lockedKeys across all buckets into sets.
 */
export function collectSkippedKeys(config: LingoConfig): {
  ignoredKeys: Set<string>;
  lockedKeys: Set<string>;
} {
  const ignoredKeys = new Set<string>();
  const lockedKeys = new Set<string>();

  for (const bucketConfig of Object.values(config.buckets)) {
    if (bucketConfig.ignoredKeys) {
      for (const key of bucketConfig.ignoredKeys) {
        ignoredKeys.add(key);
      }
    }
    if (bucketConfig.lockedKeys) {
      for (const key of bucketConfig.lockedKeys) {
        lockedKeys.add(key);
      }
    }
  }

  return { ignoredKeys, lockedKeys };
}

/**
 * Filter target locales to only Indic ones.
 */
export function filterIndicLocales(targetLocales: Locale[]): Locale[] {
  return targetLocales.filter(locale => {
    // Handle both 'hi' and 'hi-IN' formats
    const baseLang = locale.split('-')[0];
    return INDIC_LOCALE_CODES.has(baseLang);
  });
}

/**
 * Build a full CheckerContext from config and project root.
 */
export async function buildCheckerContext(
  configPath: string,
  projectRoot: string
): Promise<CheckerContext> {
  const config = await parseLingoConfig(configPath);
  const translationFiles = await resolveTranslationFiles(config, projectRoot);
  const sourceFiles = await resolveSourceFiles(config, projectRoot);
  const indicLocales = filterIndicLocales(config.locale.targets);
  const { ignoredKeys, lockedKeys } = collectSkippedKeys(config);

  return {
    projectRoot,
    config,
    sourceLocale: config.locale.source,
    targetLocales: config.locale.targets,
    indicLocales,
    translationFiles,
    sourceFiles,
    ignoredKeys,
    lockedKeys,
  };
}
