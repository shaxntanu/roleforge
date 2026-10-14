/**
 * Application Snapshot Manager
 * Creates and manages application package snapshots
 */

import { CandidateProfile } from '../analyzers/candidate-builder';
import { NormalizedJob } from '../analyzers/job-normalizer';
import { EvidenceMatch, FitAnalysis } from '../matchers/requirement-matcher';
import { ApplicationStrategy } from './strategy-generator';
import { AuditReport } from '../validators/truth-auditor';
import { PDFValidator, ValidationResult } from '../validators/pdf-validator';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface SnapshotDocument {
  tex: string;
  pdf?: Uint8Array;
  metadata?: {
    template: string;
    pageCount?: number;
    wordCount: number;
    compiled: boolean;
  };
}

interface CompilationResult {
  compiled: boolean;
  message: string;
  validation?: ValidationResult;
}

export interface ApplicationSnapshot {
  id: string;
  createdAt: string;
  candidate: CandidateProfile;
  job: NormalizedJob;
  evidenceMap: EvidenceMatch[];
  fitAnalysis: FitAnalysis;
  strategy: ApplicationStrategy;
  resume: SnapshotDocument;
  cv?: SnapshotDocument;
  auditReport: AuditReport;
}

export class ApplicationSnapshotManager {
  private outputDir: string;
  private pdfValidator = new PDFValidator();

  constructor(outputDir?: string) {
    this.outputDir = outputDir || path.join(process.cwd(), 'applications');
  }

  async saveSnapshot(snapshot: ApplicationSnapshot): Promise<string> {
    const company = this.sanitizeFilename(snapshot.job.company);
    const title = this.sanitizeFilename(snapshot.job.title);
    const snapshotDir = path.join(this.outputDir, company, title);
    
    await fs.mkdir(snapshotDir, { recursive: true });
    
    // Save candidate profile
    await fs.writeFile(
      path.join(snapshotDir, 'candidate.json'),
      JSON.stringify(snapshot.candidate, null, 2)
    );
    
    // Save job description
    await fs.writeFile(
      path.join(snapshotDir, 'job.json'),
      JSON.stringify(snapshot.job, null, 2)
    );
    
    // Save evidence map
    await fs.writeFile(
      path.join(snapshotDir, 'evidence-map.json'),
      JSON.stringify(snapshot.evidenceMap, null, 2)
    );
    
    // Save fit analysis
    await fs.writeFile(
      path.join(snapshotDir, 'fit-analysis.json'),
      JSON.stringify(snapshot.fitAnalysis, null, 2)
    );
    
    // Save strategy
    await fs.writeFile(
      path.join(snapshotDir, 'strategy.json'),
      JSON.stringify(snapshot.strategy, null, 2)
    );
    
    // Save and compile the resume. The editable source remains available when pdflatex is missing.
    const resumeTexPath = path.join(snapshotDir, 'resume.tex');
    const resumePdfPath = path.join(snapshotDir, 'resume.pdf');
    await fs.writeFile(resumeTexPath, snapshot.resume.tex, 'utf8');
    if (snapshot.resume.pdf) await fs.writeFile(resumePdfPath, snapshot.resume.pdf);
    const resumeCompilation = await this.compileAndValidate(resumeTexPath, resumePdfPath);
    if (snapshot.resume.metadata) snapshot.resume.metadata.compiled = resumeCompilation.compiled;
    await fs.writeFile(path.join(snapshotDir, 'pdf-validation-report.json'), JSON.stringify(resumeCompilation, null, 2));
    
    // Save CV if available
    let cvCompilation: CompilationResult | undefined;
    if (snapshot.cv) {
      const cvTexPath = path.join(snapshotDir, 'cv.tex');
      const cvPdfPath = path.join(snapshotDir, 'cv.pdf');
      await fs.writeFile(cvTexPath, snapshot.cv.tex, 'utf8');
      if (snapshot.cv.pdf) await fs.writeFile(cvPdfPath, snapshot.cv.pdf);
      cvCompilation = await this.compileAndValidate(cvTexPath, cvPdfPath);
      if (snapshot.cv.metadata) snapshot.cv.metadata.compiled = cvCompilation.compiled;
      await fs.writeFile(path.join(snapshotDir, 'cv-pdf-validation-report.json'), JSON.stringify(cvCompilation, null, 2));
    }
    
    // Save audit report
    await fs.writeFile(
      path.join(snapshotDir, 'audit-report.json'),
      JSON.stringify(snapshot.auditReport, null, 2)
    );
    
    // Save snapshot metadata
    await fs.writeFile(
      path.join(snapshotDir, 'snapshot.json'),
      JSON.stringify({
        id: snapshot.id,
        createdAt: snapshot.createdAt,
        candidateId: snapshot.candidate.id,
        jobId: snapshot.job.id,
        company: snapshot.job.company,
        title: snapshot.job.title,
        documentType: snapshot.strategy.documentType,
        template: snapshot.strategy.template,
        resumeMetadata: snapshot.resume.metadata,
        cvMetadata: snapshot.cv?.metadata,
        auditPassed: snapshot.auditReport.passed,
        approvalRate: snapshot.auditReport.summary.approvalRate,
      }, null, 2)
    );
    
    // Save generation report
    await this.generateReport(snapshot, snapshotDir, resumeCompilation, cvCompilation);
    
    return snapshotDir;
  }

  private async generateReport(
    snapshot: ApplicationSnapshot,
    snapshotDir: string,
    resumeCompilation: CompilationResult,
    cvCompilation?: CompilationResult,
  ): Promise<void> {
    const generatedFiles = [
      'candidate.json', 'job.json', 'evidence-map.json', 'fit-analysis.json', 'strategy.json',
      'resume.tex', 'pdf-validation-report.json', 'audit-report.json', 'snapshot.json', 'report.md',
    ];
    if (resumeCompilation.compiled) generatedFiles.push('resume.pdf');
    if (snapshot.cv) generatedFiles.push('cv.tex', 'cv-pdf-validation-report.json');
    if (cvCompilation?.compiled) generatedFiles.push('cv.pdf');

    const report = `# Application Generation Report

**Company**: ${snapshot.job.company}
**Title**: ${snapshot.job.title}
**Generated**: ${snapshot.createdAt}
**Document Type**: ${snapshot.strategy.documentType}
**Template**: ${snapshot.strategy.template}

## Fit Analysis

- **Overall Fit**: ${snapshot.fitAnalysis.overallFit}
- **Fit Score**: ${snapshot.fitAnalysis.fitScore}%
- **Strong Matches**: ${snapshot.fitAnalysis.strongMatches.length}
- **Partial Matches**: ${snapshot.fitAnalysis.partialMatches.length}
- **Transferable Skills**: ${snapshot.fitAnalysis.transferableSkills.length}
- **Missing Requirements**: ${snapshot.fitAnalysis.missingRequirements.length}

## Audit Report

- **Audit Passed**: ${snapshot.auditReport.passed ? 'Yes' : 'No'}
- **Total Bullets**: ${snapshot.auditReport.summary.totalBullets}
- **Approved Bullets**: ${snapshot.auditReport.summary.approvedBullets}
- **Flagged Bullets**: ${snapshot.auditReport.summary.flaggedBullets}
- **Removed Bullets**: ${snapshot.auditReport.summary.removedBullets}
- **Approval Rate**: ${(snapshot.auditReport.summary.approvalRate * 100).toFixed(1)}%

## PDF Compilation

- **Resume PDF**: ${resumeCompilation.compiled ? 'Generated' : `Unavailable — ${resumeCompilation.message}`}
${snapshot.cv ? `- **CV PDF**: ${cvCompilation?.compiled ? 'Generated' : `Unavailable — ${cvCompilation?.message || 'not compiled'}`}` : '- **CV PDF**: Not requested'}

## Selected Projects

${snapshot.strategy.selectedProjects.map(p => `- ${p}`).join('\n')}

## Selected Skills

${snapshot.strategy.selectedSkills.map(s => `- ${s}`).join('\n')}

## Evidence Sources

- **Repositories**: ${snapshot.candidate.source_provenance.repositories.join(', ')}
- **Files Analyzed**: ${snapshot.candidate.source_provenance.files_analyzed.length}

## Files Generated

${generatedFiles.map((file) => `- ${file}`).join('\n')}

---
Generated by RoleForge
`;

    await fs.writeFile(path.join(snapshotDir, 'report.md'), report);
  }

  private async compileAndValidate(texPath: string, pdfPath: string): Promise<CompilationResult> {
    try {
      await fs.access(pdfPath);
    } catch {
      try {
        await execFileAsync('pdflatex', [
          '-interaction=nonstopmode',
          '-halt-on-error',
          '-file-line-error',
          path.basename(texPath),
        ], {
          cwd: path.dirname(texPath),
          timeout: 60000,
          maxBuffer: 4 * 1024 * 1024,
          windowsHide: true,
        });
      } catch (error) {
        await fs.rm(pdfPath, { force: true });
        const message = error instanceof Error ? error.message : String(error);
        return { compiled: false, message: message.split(/\r?\n/)[0] };
      }
    }

    try {
      const validation = await this.pdfValidator.validate(pdfPath, texPath);
      const compilation = validation.checks.find((check) => check.name === 'Compilation');
      const compiled = Boolean(compilation?.passed);
      if (!compiled) await fs.rm(pdfPath, { force: true });
      return {
        compiled,
        message: compiled ? 'PDF generated and checked.' : compilation?.message || 'The generated PDF did not pass its file check.',
        validation,
      };
    } catch (error) {
      await fs.rm(pdfPath, { force: true });
      const message = error instanceof Error ? error.message : String(error);
      return { compiled: false, message: `PDF validation failed: ${message}` };
    }
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  async loadSnapshot(snapshotPath: string): Promise<ApplicationSnapshot | null> {
    try {
      const snapshotJson = await fs.readFile(path.join(snapshotPath, 'snapshot.json'), 'utf-8');
      const snapshotMeta = JSON.parse(snapshotJson);
      
      const candidateJson = await fs.readFile(path.join(snapshotPath, 'candidate.json'), 'utf-8');
      const jobJson = await fs.readFile(path.join(snapshotPath, 'job.json'), 'utf-8');
      const evidenceMapJson = await fs.readFile(path.join(snapshotPath, 'evidence-map.json'), 'utf-8');
      const fitAnalysisJson = await fs.readFile(path.join(snapshotPath, 'fit-analysis.json'), 'utf-8');
      const strategyJson = await fs.readFile(path.join(snapshotPath, 'strategy.json'), 'utf-8');
      const auditReportJson = await fs.readFile(path.join(snapshotPath, 'audit-report.json'), 'utf-8');
      
      const resumeTex = await fs.readFile(path.join(snapshotPath, 'resume.tex'), 'utf-8');
      let resumePdf: Buffer | undefined;
      try {
        resumePdf = await fs.readFile(path.join(snapshotPath, 'resume.pdf'));
      } catch (e) {
        // PDF not available
      }
      
      let cv: SnapshotDocument | undefined;
      try {
        const cvTex = await fs.readFile(path.join(snapshotPath, 'cv.tex'), 'utf-8');
        let cvPdf: Buffer | undefined;
        try {
          cvPdf = await fs.readFile(path.join(snapshotPath, 'cv.pdf'));
        } catch (e) {
          // CV PDF not available
        }
        cv = { tex: cvTex, pdf: cvPdf, metadata: snapshotMeta.cvMetadata };
      } catch (e) {
        // CV not generated
      }
      
      return {
        id: snapshotMeta.id,
        createdAt: snapshotMeta.createdAt,
        candidate: JSON.parse(candidateJson),
        job: JSON.parse(jobJson),
        evidenceMap: JSON.parse(evidenceMapJson),
        fitAnalysis: JSON.parse(fitAnalysisJson),
        strategy: JSON.parse(strategyJson),
        resume: { tex: resumeTex, pdf: resumePdf, metadata: snapshotMeta.resumeMetadata },
        cv,
        auditReport: JSON.parse(auditReportJson),
      };
    } catch (error) {
      return null;
    }
  }

  async listSnapshots(): Promise<string[]> {
    try {
      const companies = await fs.readdir(this.outputDir);
      const snapshots: string[] = [];
      
      for (const company of companies) {
        const companyPath = path.join(this.outputDir, company);
        const stats = await fs.stat(companyPath);
        
        if (stats.isDirectory()) {
          const roles = await fs.readdir(companyPath);
          for (const role of roles) {
            snapshots.push(path.join(companyPath, role));
          }
        }
      }
      
      return snapshots;
    } catch (error) {
      return [];
    }
  }
}
