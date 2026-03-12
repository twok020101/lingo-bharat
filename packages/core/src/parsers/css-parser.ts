// packages/core/src/parsers/css-parser.ts
import { readFile } from 'fs/promises';

/**
 * Extract font-family declarations from a CSS file content.
 * Uses regex-based parsing (lighter than full css-tree AST for our needs).
 */
export function extractFontFamiliesFromCSS(content: string): string[] {
  const families: string[] = [];

  // Match font-family declarations in CSS
  const fontFamilyRegex = /font-family\s*:\s*([^;}{]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = fontFamilyRegex.exec(content)) !== null) {
    families.push(match[1].trim());
  }

  // Match @font-face src references
  const fontFaceRegex = /font-family\s*:\s*['"]([^'"]+)['"]/gi;
  while ((match = fontFaceRegex.exec(content)) !== null) {
    families.push(match[1].trim());
  }

  return families;
}

/**
 * Read a CSS file and extract font declarations.
 */
export async function parseCSSFile(filePath: string): Promise<string[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return extractFontFamiliesFromCSS(content);
  } catch {
    return [];
  }
}
