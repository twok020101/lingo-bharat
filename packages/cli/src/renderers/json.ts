// packages/cli/src/renderers/json.ts
import { writeFile } from 'fs/promises';
import type { BharatReport } from '@lingo-bharat/core';

/**
 * Write the BharatReport as a JSON file.
 */
export async function writeJsonReport(report: BharatReport, outputPath: string): Promise<void> {
  const json = JSON.stringify(report, null, 2);
  await writeFile(outputPath, json, 'utf-8');
}
