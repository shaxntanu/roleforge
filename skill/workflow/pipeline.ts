/**
 * RoleForge Main Pipeline
 * Orchestrates the career compilation workflow
 */

import { RepositoryAnalyzer } from '../analyzers/repository-analyzer';
import { EvidenceExtractor } from '../analyzers/evidence-extractor';
import { CandidateBuilder } from '../analyzers/candidate-builder';
import { JobNormalizer, JobSource } from '../analyzers/job-normalizer';
import { RequirementMatcher } from '../matchers/requirement-matcher';
import { StrategyGenerator } from '../generators/strategy-generator';
import { LaTeXGenerator, LaTeXOutput } from '../generators/latex-generator';
import { TruthAuditor, AuditReport } from '../validators/truth-auditor';
import { ApplicationSnapshotManager, ApplicationSnapshot } from '../generators/application-snapshot';
import { CandidateProfile } from '../analyzers/candidate-builder';
import { EvidenceMatch, FitAnalysis } from '../matchers/requirement-matcher';
import { ApplicationStrategy } from '../generators/strategy-generator';

export interface PipelineConfig {
  repoPath: string;
  jobSource?: string;
  jobDescription?: string;
  outputPath?: string;
  options?: {
    includeCV?: boolean;
    discoverRelatedJobs?: boolean;
    generateCareerMap?: boolean;
  };
}

export interface PipelineResult {
  snapshotPath: string;
  candidateProfile: CandidateProfile;
  evidenceMap: EvidenceMatch[];
  fitAnalysis: FitAnalysis;
  strategy: ApplicationStrategy;
  resume: LaTeXOutput;
  cv?: LaTeXOutput;
  auditReport: AuditReport;
}

export class Pipeline {
  private repoAnalyzer: RepositoryAnalyzer;
  private evidenceExtractor: EvidenceExtractor;
  private candidateBuilder: CandidateBuilder;
  private jobNormalizer: JobNormalizer;
  private requirementMatcher: RequirementMatcher;
  private strategyGenerator: StrategyGenerator;
  private latexGenerator: LaTeXGenerator;
  private truthAuditor: TruthAuditor;

  constructor() {
    this.repoAnalyzer = new RepositoryAnalyzer();
    this.evidenceExtractor = new EvidenceExtractor();
    this.candidateBuilder = new CandidateBuilder();
    this.jobNormalizer = new JobNormalizer();
    this.requirementMatcher = new RequirementMatcher();
    this.strategyGenerator = new StrategyGenerator();
    this.latexGenerator = new LaTeXGenerator();
    this.truthAuditor = new TruthAuditor();
  }

  async execute(config: PipelineConfig): Promise<PipelineResult> {
    // 1. Repository Analysis
    console.log('[1/10] Analyzing repository...');
    const repoAnalysis = await this.repoAnalyzer.analyze(config.repoPath);
    console.log(`  Found ${repoAnalysis.projects.length} projects`);
    console.log(`  Languages: ${repoAnalysis.structure.languages.join(', ')}`);
    console.log('✓ Repository analysis complete');

    // 2. Evidence Extraction
    console.log('[2/10] Extracting evidence...');
    const evidence = await this.evidenceExtractor.extract(repoAnalysis);
    console.log(`  Extracted ${evidence.skills.languages.length} languages`);
    console.log(`  Extracted ${evidence.projects.length} projects`);
    console.log('✓ Evidence extraction complete');

    // 3. Candidate Knowledge Base Construction
    console.log('[3/10] Building candidate profile...');
    const candidateProfile = await this.candidateBuilder.build(evidence, config.repoPath);
    console.log(`  Candidate ID: ${candidateProfile.id}`);
    console.log('✓ Candidate profile built');

    // 4. Job Description Acquisition
    console.log('[4/10] Acquiring job description...');
    let jobSource: JobSource = {
      type: 'user_provided',
      retrieved_at: new Date().toISOString(),
      verified: false,
    };

    let jobDescription = config.jobDescription || '';
    if (config.jobSource && config.jobSource.startsWith('http')) {
      jobSource = {
        type: 'user_url',
        url: config.jobSource,
        retrieved_at: new Date().toISOString(),
        verified: false,
      };
    } else if (config.jobSource) {
      jobDescription = jobDescription || config.jobSource;
    }

    if (!jobDescription.trim()) {
      throw new Error('A job description is required. Pass job text or retrieve the URL and provide its contents.');
    }

    const normalizedJob = await this.jobNormalizer.normalize(
      jobDescription,
      jobSource,
    );
    console.log(`  Job: ${normalizedJob.title} at ${normalizedJob.company}`);
    console.log(`  Requirements: ${normalizedJob.requirements.length}`);
    console.log('✓ Job description acquired');

    // 5. Requirement Extraction (done in normalization)
    console.log('[5/10] Extracting requirements...');
    console.log('✓ Requirements extracted');

    // 6. Evidence-to-Requirement Matching
    console.log('[6/10] Matching evidence to requirements...');
    const evidenceMap = await this.requirementMatcher.match(evidence, normalizedJob.requirements);
    console.log(`  Matches: ${evidenceMap.length}`);
    console.log('✓ Evidence matching complete');

    // 7. Fit and Gap Analysis
    console.log('[7/10] Analyzing fit...');
    const fitAnalysis = await this.requirementMatcher.analyzeFit(evidenceMap);
    console.log(`  Fit Score: ${fitAnalysis.fitScore}%`);
    console.log(`  Overall Fit: ${fitAnalysis.overallFit}`);
    console.log('✓ Fit analysis complete');

    // 8. Resume Strategy
    console.log('[8/10] Generating application strategy...');
    const strategy = await this.strategyGenerator.generate(
      evidence,
      fitAnalysis,
      normalizedJob.title,
      candidateProfile.id,
      normalizedJob.id,
    );
    console.log(`  Template: ${strategy.template}`);
    console.log(`  Selected Projects: ${strategy.selectedProjects.length}`);
    console.log(`  Selected Skills: ${strategy.selectedSkills.length}`);
    console.log('✓ Strategy generated');

    // 9. LaTeX Generation
    console.log('[9/10] Generating LaTeX resume...');
    let resume = await this.latexGenerator.generateResume(evidence, strategy);
    console.log(`  Generated ${resume.tex.length} bytes of LaTeX`);
    console.log('✓ LaTeX generated');

    // 10. CV Generation (if applicable)
    let cv: LaTeXOutput | undefined;
    const hasCvEvidence = Boolean(evidence.research?.length || evidence.education.length || evidence.experience.length);
    const shouldGenerateCV = Boolean(config.options?.includeCV || strategy.documentType === 'cv');
    if (shouldGenerateCV && hasCvEvidence) {
      console.log('[10/11] Generating CV...');
      cv = await this.latexGenerator.generateCV(evidence, strategy);
      console.log(`  Generated ${cv.tex.length} bytes of LaTeX`);
      console.log('✓ CV generated');
    } else if (shouldGenerateCV) {
      console.log('  Skipping CV: no research, education, or experience evidence was found.');
    }

    // 11. Truth Audit
    console.log(config.options?.includeCV ? '[11/11]' : '[10/10] Performing truth audit...');
    const sourceAudits: AuditReport[] = [];
    const emittedAudits: AuditReport[] = [];
    const auditDocument = async (document: LaTeXOutput): Promise<LaTeXOutput> => {
      const sourceAudit = await this.truthAuditor.audit(document.tex, evidence, JSON.stringify(evidenceMap));
      const safeTex = this.truthAuditor.removeUnsupportedBullets(document.tex, sourceAudit);
      sourceAudits.push(sourceAudit);
      const safeDocument = this.latexGenerator.withSource(document, safeTex);
      emittedAudits.push(await this.truthAuditor.audit(safeTex, evidence, JSON.stringify(evidenceMap)));
      return safeDocument;
    };

    resume = await auditDocument(resume);
    if (cv) cv = await auditDocument(cv);
    const auditReport = this.combineAuditReports(sourceAudits, emittedAudits);
    console.log(`  Approval Rate: ${(auditReport.summary.approvalRate * 100).toFixed(1)}%`);
    console.log(`  Audit Passed: ${auditReport.passed ? 'Yes' : 'No'}`);
    console.log('✓ Truth audit complete');

    // Create snapshot
    const snapshot: ApplicationSnapshot = {
      id: `app-${Date.now()}`,
      createdAt: new Date().toISOString(),
      candidate: candidateProfile,
      job: normalizedJob,
      evidenceMap,
      fitAnalysis,
      strategy,
      resume,
      cv,
      auditReport,
    };

    const snapshotManager = new ApplicationSnapshotManager(config.outputPath);
    const snapshotPath = await snapshotManager.saveSnapshot(snapshot);
    console.log('');
    console.log(`Snapshot saved to: ${snapshotPath}`);

    return {
      snapshotPath,
      candidateProfile,
      evidenceMap,
      fitAnalysis,
      strategy,
      resume,
      cv,
      auditReport,
    };
  }

  private combineAuditReports(sourceReports: AuditReport[], emittedReports: AuditReport[]): AuditReport {
    const bullets = sourceReports.flatMap((report) => report.bullets);
    const totalBullets = bullets.length;
    const approvedBullets = bullets.filter((bullet) => bullet.status === 'approved').length;
    const flaggedBullets = bullets.filter((bullet) => bullet.status === 'flagged').length;
    const removedBullets = bullets.filter((bullet) => bullet.status === 'removed').length;
    return {
      passed: emittedReports.length > 0 && emittedReports.every((report) => report.passed),
      bullets,
      unsupportedClaims: sourceReports.flatMap((report) => report.unsupportedClaims),
      summary: {
        totalBullets,
        approvedBullets,
        flaggedBullets,
        removedBullets,
        approvalRate: totalBullets ? approvedBullets / totalBullets : 0,
      },
    };
  }
}
