/**
 * Truth Auditor
 * Checks each generated LaTeX list item against the candidate evidence used to create it.
 */

import { CandidateEvidence } from '../analyzers/evidence-extractor';

export interface AuditReport {
  passed: boolean;
  bullets: BulletAudit[];
  unsupportedClaims: UnsupportedClaim[];
  summary: AuditSummary;
}

export interface BulletAudit {
  text: string;
  evidence: string[];
  confidence: 'DIRECT' | 'SUPPORTED' | 'INFERRED' | 'WEAKLY_INFERRED' | 'UNSUPPORTED';
  status: 'approved' | 'flagged' | 'removed';
  notes?: string;
}

export interface UnsupportedClaim {
  text: string;
  suggestedAction: 'remove' | 'revise' | 'add_evidence';
  reason: string;
}

export interface AuditSummary {
  totalBullets: number;
  approvedBullets: number;
  flaggedBullets: number;
  removedBullets: number;
  approvalRate: number;
}

type EvidenceMatch = {
  text: string;
  source: string;
  confidence: BulletAudit['confidence'];
};

export class TruthAuditor {
  async audit(
    generatedContent: string,
    candidateEvidence: CandidateEvidence,
    _evidenceMap: string,
  ): Promise<AuditReport> {
    const bullets = this.extractBullets(generatedContent);
    const audits = bullets.map((bullet) => this.auditBullet(bullet, candidateEvidence));
    const unsupportedClaims = audits
      .filter((audit) => audit.status !== 'approved')
      .map((audit) => ({
        text: audit.text,
        suggestedAction: audit.status === 'removed' ? 'remove' as const : 'revise' as const,
        reason: audit.notes || 'The generated claim needs more support.',
      }));
    const summary = this.generateSummary(audits);

    return {
      passed: summary.totalBullets > 0 && summary.approvalRate >= 0.8 && summary.removedBullets === 0,
      bullets: audits,
      unsupportedClaims,
      summary,
    };
  }

  /** Remove claims that have no exact, sufficiently strong evidence match. */
  removeUnsupportedBullets(content: string, report: AuditReport): string {
    let auditIndex = 0;
    const lines = content.split(/\r?\n/);
    const output: string[] = [];

    for (let index = 0; index < lines.length;) {
      const sectionLine = lines[index];
      if (/^\\section\*?\{/.test(sectionLine.trim())) {
        let sectionEnd = index + 1;
        while (sectionEnd < lines.length && !/^\\section\*?\{/.test(lines[sectionEnd].trim())) sectionEnd += 1;
        const section = lines.slice(index, sectionEnd);
        const hasList = section.some((line) => /^\\begin\{itemize\}/.test(line.trim()));
        const filtered = section.map((line) => {
          if (!/^\\item\b/.test(line.trim())) return line;
          const claim = line.trim().replace(/^\\item\s*/, '');
          if (!this.stripLaTeX(claim)) return line;
          const audit = report.bullets[auditIndex++];
          return audit?.status === 'removed' ? null : line;
        });
        const remainingBullets = filtered.filter((line) => line !== null && /^\\item\b/.test(line.trim())).length;
        if (!hasList || remainingBullets > 0) output.push(...filtered.filter((line): line is string => line !== null));
        index = sectionEnd;
        continue;
      }

      const line = lines[index++];
      if (/^\\item\b/.test(line.trim())) {
        const claim = line.trim().replace(/^\\item\s*/, '');
        if (this.stripLaTeX(claim)) {
          const audit = report.bullets[auditIndex++];
          if (audit?.status === 'removed') continue;
        }
      }
      output.push(line);
    }

    return output.join('\n');
  }

  private extractBullets(content: string): string[] {
    return content.split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('\\item'))
      .map((line) => this.stripLaTeX(line.replace(/^\\item\s*/, '')))
      .filter(Boolean);
  }

  private auditBullet(bullet: string, candidateEvidence: CandidateEvidence): BulletAudit {
    const normalizedBullet = this.normalizeClaim(bullet);
    const directEvidence = this.collectDirectEvidence(candidateEvidence);
    const exact = directEvidence.find((item) => this.normalizeClaim(item.text) === normalizedBullet);
    if (exact) {
      const status = exact.confidence === 'DIRECT' || exact.confidence === 'SUPPORTED'
        ? 'approved'
        : exact.confidence === 'INFERRED' ? 'flagged' : 'removed';
      return {
        text: bullet,
        evidence: [exact.source],
        confidence: exact.confidence,
        status,
        notes: status === 'flagged'
          ? 'This claim relies on an inference and should be reviewed.'
          : status === 'removed' ? 'This evidence is too weak to include without user confirmation.' : undefined,
      };
    }

    const partial = directEvidence.find((item) => {
      const source = this.normalizeClaim(item.text);
      return source.length >= 5 && (normalizedBullet.includes(source) || source.includes(normalizedBullet));
    });

    return {
      text: bullet,
      evidence: partial ? [partial.source] : [],
      confidence: partial ? partial.confidence : 'UNSUPPORTED',
      status: 'removed',
      notes: partial
        ? 'The claim contains material beyond the matching source text; revise it to match the evidence exactly.'
        : 'No exact supporting candidate evidence was found.',
    };
  }

  private collectDirectEvidence(candidateEvidence: CandidateEvidence): EvidenceMatch[] {
    const evidence: EvidenceMatch[] = [];
    const skills = [
      ...candidateEvidence.skills.languages,
      ...candidateEvidence.skills.frameworks,
      ...candidateEvidence.skills.tools,
      ...candidateEvidence.skills.domains,
    ];

    for (const skill of skills) {
      evidence.push({
        text: skill.name,
        source: skill.sources.join(', ') || 'repository analysis',
        confidence: skill.confidence,
      });
    }

    for (const project of candidateEvidence.projects) {
      const source = project.evidence.join(', ') || project.name;
      const projectClaim = [
        project.name,
        project.description,
        project.technologies.length ? `Technologies: ${project.technologies.join(', ')}` : '',
      ].filter(Boolean).join('. ');
      if (projectClaim) evidence.push({ text: projectClaim, source, confidence: project.confidence });

      for (const responsibility of project.responsibilities) {
        evidence.push({ text: responsibility, source, confidence: project.confidence });
      }
    }

    for (const experience of candidateEvidence.experience) {
      const role = [experience.role, experience.company].filter(Boolean).join(' — ');
      for (const description of experience.description) {
        evidence.push({
          text: role ? `${role}. ${description}` : description,
          source: experience.evidence.join(', ') || 'candidate evidence',
          confidence: 'DIRECT',
        });
      }
    }

    for (const education of candidateEvidence.education) {
      const claim = [education.degree, education.field, education.institution].filter(Boolean).join(', ');
      if (claim) evidence.push({ text: claim, source: education.evidence.join(', ') || 'candidate evidence', confidence: 'DIRECT' });
    }

    for (const research of candidateEvidence.research || []) {
      const claim = [research.title, research.venue, research.year].filter(Boolean).join(', ');
      if (claim) evidence.push({ text: claim, source: research.evidence.join(', ') || 'candidate evidence', confidence: 'DIRECT' });
    }

    return evidence;
  }

  private stripLaTeX(value: string): string {
    return value
      .replace(/\\(?:textbf|textit|emph|texttt)\s*\{([^{}]*)\}/g, '$1')
      .replace(/\\href\s*\{[^{}]*\}\s*\{([^{}]*)\}/g, '$1')
      .replace(/\\url\s*\{([^{}]*)\}/g, '$1')
      .replace(/\\textbackslash\{\}/g, '\\')
      .replace(/\\textasciicircum\{\}/g, '^')
      .replace(/\\textasciitilde\{\}/g, '~')
      .replace(/\\([%$&#_{}])/g, '$1')
      .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, ' ')
      .replace(/[{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeClaim(value: string): string {
    return this.stripLaTeX(value)
      .toLowerCase()
      .replace(/[.,;:()\[\]“”"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateSummary(audits: BulletAudit[]): AuditSummary {
    const totalBullets = audits.length;
    const approvedBullets = audits.filter((audit) => audit.status === 'approved').length;
    const flaggedBullets = audits.filter((audit) => audit.status === 'flagged').length;
    const removedBullets = audits.filter((audit) => audit.status === 'removed').length;
    return {
      totalBullets,
      approvedBullets,
      flaggedBullets,
      removedBullets,
      approvalRate: totalBullets ? approvedBullets / totalBullets : 0,
    };
  }
}
