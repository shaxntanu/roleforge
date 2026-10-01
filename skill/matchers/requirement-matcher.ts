/**
 * Requirement Matcher
 * Maps candidate evidence to job requirements
 */

import { CandidateEvidence } from '../analyzers/evidence-extractor';

export interface JobRequirement {
  id: string;
  text: string;
  category: 'skill' | 'experience' | 'education' | 'responsibility' | 'tool';
  priority: 'required' | 'preferred' | 'nice_to_have';
}

export interface EvidenceMatch {
  requirementId: string;
  requirementText: string;
  evidence: EvidenceSource[];
  matchLevel: 'strong' | 'partial' | 'transferable' | 'weak' | 'none';
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
    const strongMatches = matches.filter(m => m.matchLevel === 'strong');
    const partialMatches = matches.filter(m => m.matchLevel === 'partial');
    const transferableSkills = matches.filter(m => m.matchLevel === 'transferable');
    const missingRequirements = matches.filter(m => m.matchLevel === 'none');
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
    // Requirement matching implementation
    return {
      requirementId: requirement.id,
      requirementText: requirement.text,
      evidence: [],
      matchLevel: 'none',
      confidence: 'low',
    };
  }

  private calculateFitScore(matches: EvidenceMatch[]): number {
    // Fit score calculation implementation
    return 0;
  }

  private determineOverallFit(fitScore: number): 'excellent' | 'good' | 'moderate' | 'limited' {
    // Overall fit determination implementation
    return 'limited';
  }
}
