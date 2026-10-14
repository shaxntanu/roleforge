/**
 * PDF Validator
 * Performs checks supported by the generated PDF, LaTeX source, and local tools.
 */

import * as fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
  errors: string[];
  warnings: string[];
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export class PDFValidator {
  async validate(pdfPath: string, texPath: string): Promise<ValidationResult> {
    const checks = await Promise.all([
      this.checkCompilation(pdfPath),
      this.checkPageCount(pdfPath),
      this.checkOverflow(texPath),
      this.checkLinks(texPath),
      this.checkGlyphs(texPath),
      this.checkEmptySections(texPath),
      this.checkDuplicates(texPath),
      this.checkDates(texPath),
    ]);
    const errors = checks.filter((check) => !check.passed && check.severity === 'error').map((check) => check.message);
    const warnings = checks.filter((check) => !check.passed && check.severity === 'warning').map((check) => check.message);
    return { passed: errors.length === 0, checks, errors, warnings };
  }

  private async checkCompilation(pdfPath: string): Promise<ValidationCheck> {
    try {
      const pdf = await fs.readFile(pdfPath);
      const hasPdfHeader = pdf.subarray(0, 5).toString('ascii') === '%PDF-';
      return {
        name: 'Compilation',
        passed: hasPdfHeader,
        message: hasPdfHeader ? 'A PDF file with a valid header was generated.' : 'The generated file does not have a PDF header.',
        severity: 'error',
      };
    } catch {
      return { name: 'Compilation', passed: false, message: `PDF was not generated: ${pdfPath}`, severity: 'error' };
    }
  }

  private async checkPageCount(pdfPath: string): Promise<ValidationCheck> {
    try {
      const { stdout } = await execFileAsync('pdfinfo', [pdfPath], { timeout: 8000, maxBuffer: 1024 * 1024 });
      const pageCount = Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1]);
      if (!Number.isFinite(pageCount) || pageCount < 1) {
        return { name: 'Page Count', passed: false, message: 'Could not read the PDF page count.', severity: 'warning' };
      }
      return {
        name: 'Page Count',
        passed: pageCount <= 2,
        message: pageCount <= 2 ? `PDF contains ${pageCount} page${pageCount === 1 ? '' : 's'}.` : `PDF contains ${pageCount} pages; review length for the target role.`,
        severity: 'warning',
      };
    } catch {
      return { name: 'Page Count', passed: false, message: 'Page count was not checked because pdfinfo is unavailable.', severity: 'info' };
    }
  }

  private async readCompileLog(texPath: string): Promise<string | undefined> {
    const logPath = texPath.replace(/\.tex$/i, '.log');
    try {
      return await fs.readFile(logPath, 'utf8');
    } catch {
      return undefined;
    }
  }

  private async checkOverflow(texPath: string): Promise<ValidationCheck> {
    const log = await this.readCompileLog(texPath);
    if (!log) return { name: 'Overflow', passed: false, message: 'Overflow was not checked because the LaTeX compile log is unavailable.', severity: 'info' };
    const overfull = log.match(/Overfull \\[hv]box[^\n]*/g) || [];
    return {
      name: 'Overflow',
      passed: overfull.length === 0,
      message: overfull.length ? `${overfull.length} overfull box warning(s) found in the LaTeX log.` : 'No overfull boxes were reported by LaTeX.',
      severity: 'warning',
    };
  }

  private async checkLinks(texPath: string): Promise<ValidationCheck> {
    let tex: string;
    try {
      tex = await fs.readFile(texPath, 'utf8');
    } catch {
      return { name: 'Links', passed: false, message: `LaTeX source was not found: ${texPath}`, severity: 'error' };
    }

    const links = [...tex.matchAll(/\\(?:href\s*\{([^{}]+)\}|url\s*\{([^{}]+)\})/g)]
      .map((match) => match[1] || match[2]);
    const invalid = links.filter((link) => {
      try {
        const parsed = new URL(link);
        return !['https:', 'http:', 'mailto:'].includes(parsed.protocol);
      } catch {
        return true;
      }
    });
    return {
      name: 'Links',
      passed: invalid.length === 0,
      message: invalid.length ? `Unrecognized link target(s): ${invalid.join(', ')}` : `${links.length} link target(s) have valid URL syntax. Network reachability was not checked.`,
      severity: invalid.length ? 'warning' : 'info',
    };
  }

  private async checkGlyphs(texPath: string): Promise<ValidationCheck> {
    const log = await this.readCompileLog(texPath);
    if (!log) return { name: 'Glyphs', passed: false, message: 'Glyph coverage was not checked because the LaTeX compile log is unavailable.', severity: 'info' };
    const missing = log.match(/Missing character:[^\n]*/g) || [];
    return {
      name: 'Glyphs',
      passed: missing.length === 0,
      message: missing.length ? `${missing.length} missing glyph warning(s) found in the LaTeX log.` : 'No missing glyph warnings were reported by LaTeX.',
      severity: 'warning',
    };
  }

  private async checkEmptySections(texPath: string): Promise<ValidationCheck> {
    const tex = await fs.readFile(texPath, 'utf8');
    const sections = [...tex.matchAll(/\\section\*?\{([^{}]+)\}([\s\S]*?)(?=\\section\*?\{|\\end\{document\}|$)/g)];
    const empty = sections.filter(([, , content]) => !content.replace(/%[^\n]*/g, '').replace(/\\(?:begin|end)\{[^}]+\}/g, '').replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, '').replace(/[{}\s]/g, ''));
    return {
      name: 'Empty Sections',
      passed: empty.length === 0,
      message: empty.length ? `Empty section(s): ${empty.map((section) => section[1]).join(', ')}` : 'No empty sections were found.',
      severity: 'warning',
    };
  }

  private async checkDuplicates(texPath: string): Promise<ValidationCheck> {
    const tex = await fs.readFile(texPath, 'utf8');
    const items = tex.split('\n')
      .map((line) => line.trim().replace(/^\\item\s*/, ''))
      .filter((line) => line !== '' && !line.startsWith('\\'))
      .map((line) => line.toLowerCase().replace(/[{}.,;:]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((line) => line.length > 20);
    const duplicates = items.filter((item, index) => items.indexOf(item) !== index);
    return {
      name: 'Duplicates',
      passed: duplicates.length === 0,
      message: duplicates.length ? `Repeated resume item(s): ${[...new Set(duplicates)].join('; ')}` : 'No repeated list items were found.',
      severity: 'warning',
    };
  }

  private async checkDates(texPath: string): Promise<ValidationCheck> {
    const tex = await fs.readFile(texPath, 'utf8');
    const invalid = [...tex.matchAll(/\b(?:19|20)\d{2}[-/](\d{1,2})\b/g)]
      .map((match) => Number(match[1]))
      .filter((month) => month < 1 || month > 12);
    return {
      name: 'Dates',
      passed: invalid.length === 0,
      message: invalid.length ? 'One or more dates contain an invalid month.' : 'Year-month dates use a valid month where present.',
      severity: 'warning',
    };
  }
}
