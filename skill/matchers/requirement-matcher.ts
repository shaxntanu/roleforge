/**
 * Requirement Matcher
 * Maps candidate evidence to job requirements
 */

import { CandidateEvidence } from '../analyzers/evidence-extractor';

export interface JobRequirement {
  id: string;
  text: string;
  category: 'skill' | 'experience' | 'education' | 'responsibility' | 'tool' | 'platform' | 'domain';
  priority: 'required' | 'preferred' | 'nice_to_have';
}

export interface EvidenceMatch {
  requirementId: string;
  requirementText: string;
  evidence: EvidenceSource[];
  matchLevel: 'DIRECT_MATCH' | 'SUPPORTED_MATCH' | 'TRANSFERABLE_MATCH' | 'PARTIAL_MATCH' | 'NO_EVIDENCE' | 'CONTRADICTED';
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface EvidenceSource {
  type: 'project' | 'experience' | 'education' | 'skill';
  source: string;
  description: string;
}

export interface FitAnalysis {
  strongMatches: EvidenceMatch[];
  partialMatches: EvidenceMatch[];
  transferableSkills: EvidenceMatch[];
  missingRequirements: JobRequirement[];
  unverifiableRequirements: JobRequirement[];
  overallFit: 'excellent' | 'good' | 'moderate' | 'limited';
  fitScore: number;
}

export class RequirementMatcher {
  async match(
    candidateEvidence: CandidateEvidence,
    requirements: JobRequirement[]
  ): Promise<EvidenceMatch[]> {
    const matches: EvidenceMatch[] = [];

    for (const requirement of requirements) {
      const match = await this.matchRequirement(candidateEvidence, requirement);
      matches.push(match);
    }

    return matches;
  }

  async analyzeFit(matches: EvidenceMatch[]): Promise<FitAnalysis> {
    const strongMatches = matches.filter(m => m.matchLevel === 'DIRECT_MATCH' || m.matchLevel === 'SUPPORTED_MATCH');
    const partialMatches = matches.filter(m => m.matchLevel === 'PARTIAL_MATCH');
    const transferableSkills = matches.filter(m => m.matchLevel === 'TRANSFERABLE_MATCH');
    const missingRequirements = matches.filter(m => m.matchLevel === 'NO_EVIDENCE');
    const unverifiableRequirements = matches.filter(m => m.confidence === 'low');

    const fitScore = this.calculateFitScore(matches);
    const overallFit = this.determineOverallFit(fitScore);

    return {
      strongMatches,
      partialMatches,
      transferableSkills,
      missingRequirements: missingRequirements.map(m => ({
        id: m.requirementId,
        text: m.requirementText,
        category: 'skill' as const,
        priority: 'required' as const,
      })),
      unverifiableRequirements: unverifiableRequirements.map(m => ({
        id: m.requirementId,
        text: m.requirementText,
        category: 'skill' as const,
        priority: 'required' as const,
      })),
      overallFit,
      fitScore,
    };
  }

  private async matchRequirement(
    candidateEvidence: CandidateEvidence,
    requirement: JobRequirement
  ): Promise<EvidenceMatch> {
    const evidence: EvidenceSource[] = [];
    const requirementText = requirement.text.toLowerCase();

    // Check skills
    for (const skill of candidateEvidence.skills.languages) {
      if (this.matchesRequirement(skill.name, requirementText)) {
        evidence.push({
          type: 'skill',
          source: skill.sources.join(', '),
          description: `Language: ${skill.name}`,
        });
      }
    }

    for (const skill of candidateEvidence.skills.frameworks) {
      if (this.matchesRequirement(skill.name, requirementText)) {
        evidence.push({
          type: 'skill',
          source: skill.sources.join(', '),
          description: `Framework: ${skill.name}`,
        });
      }
    }

    for (const skill of candidateEvidence.skills.tools) {
      if (this.matchesRequirement(skill.name, requirementText)) {
        evidence.push({
          type: 'skill',
          source: skill.sources.join(', '),
          description: `Tool: ${skill.name}`,
        });
      }
    }

    // Check projects
    for (const project of candidateEvidence.projects) {
      for (const tech of project.technologies) {
        if (this.matchesRequirement(tech, requirementText)) {
          evidence.push({
            type: 'project',
            source: project.evidence.join(', '),
            description: `Project: ${project.name} uses ${tech}`,
          });
        }
      }
    }

    // Determine match level
    let matchLevel: EvidenceMatch['matchLevel'] = 'NO_EVIDENCE';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    if (evidence.length > 0) {
      if (this.isDirectMatch(requirementText, evidence)) {
        matchLevel = 'DIRECT_MATCH';
        confidence = 'high';
      } else if (this.isSupportedMatch(requirementText, evidence)) {
        matchLevel = 'SUPPORTED_MATCH';
        confidence = 'medium';
      } else if (this.isTransferableMatch(requirementText, evidence)) {
        matchLevel = 'TRANSFERABLE_MATCH';
        confidence = 'medium';
      } else {
        matchLevel = 'PARTIAL_MATCH';
        confidence = 'low';
      }
    }

    return {
      requirementId: requirement.id,
      requirementText: requirement.text,
      evidence,
      matchLevel,
      confidence,
      notes: matchLevel === 'NO_EVIDENCE' ? 'No supporting evidence found' : undefined,
    };
  }

  private matchesRequirement(skill: string, requirementText: string): boolean {
    const skillLower = skill.toLowerCase();
    return requirementText.includes(skillLower) || skillLower.includes(requirementText);
  }

  private isDirectMatch(requirementText: string, evidence: EvidenceSource[]): boolean {
    // Direct match if the requirement explicitly mentions the skill/technology
    for (const ev of evidence) {
      const desc = ev.description.toLowerCase();
      if (requirementText.includes(desc.split(': ')[1]?.toLowerCase() || '')) {
        return true;
      }
    }
    return false;
  }

  private isSupportedMatch(requirementText: string, evidence: EvidenceSource[]): boolean {
    // Supported match if multiple evidence sources exist
    return evidence.length >= 2;
  }

  private isTransferableMatch(requirementText: string, evidence: EvidenceSource[]): boolean {
    // Transferable match if related but not exact
    const transferablePatterns = [
      ['javascript', 'typescript'],
      ['react', 'vue'],
      ['python', 'django'],
      ['c++', 'c'],
    ];

    for (const [from, to] of transferablePatterns) {
      if (requirementText.includes(from) && evidence.some(e => e.description.toLowerCase().includes(to))) {
        return true;
      }
    }

    return false;
  }

  private calculateFitScore(matches: EvidenceMatch[]): number {
    if (matches.length === 0) return 0;

    const strongCount = matches.filter(m => m.matchLevel === 'DIRECT_MATCH' || m.matchLevel === 'SUPPORTED_MATCH').length;
    const partialCount = matches.filter(m => m.matchLevel === 'PARTIAL_MATCH').length;
    const transferableCount = matches.filter(m => m.matchLevel === 'TRANSFERABLE_MATCH').length;
    const missingCount = matches.filter(m => m.matchLevel === 'NO_EVIDENCE').length;

    // Weighted score
    const score = (strongCount * 1.0 + partialCount * 0.5 + transferableCount * 0.3) / matches.length;
    return Math.round(score * 100);
  }

  private determineOverallFit(fitScore: number): 'excellent' | 'good' | 'moderate' | 'limited' {
    if (fitScore >= 80) return 'excellent';
    if (fitScore >= 60) return 'good';
    if (fitScore >= 40) return 'moderate';
    return 'limited';
  }
}
