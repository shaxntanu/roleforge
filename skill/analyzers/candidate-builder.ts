/**
 * Candidate Knowledge Base Builder
 * Converts extracted evidence into normalized candidate profile
 */

import { CandidateEvidence } from './evidence-extractor';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CandidateProfile {
  id: string;
  version: string;
  generated_at: string;
  identity: {
    name?: string;
    email?: string;
    links?: Array<{ type: string; url: string }>;
  };
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    start_date: string;
    end_date?: string;
    confidence: string;
    sources: string[];
  }>;
  experience: Array<{
    company?: string;
    role?: string;
    start_date: string;
    end_date?: string;
    confidence: string;
    sources: string[];
  }>;
  skills: Array<{
    name: string;
    confidence: string;
    category: string;
    sources: string[];
  }>;
  projects: Array<{
    name: string;
    description?: string;
    repository?: string;
    technologies: string[];
    confidence: string;
    sources: string[];
  }>;
  research: Array<{
    title: string;
    institution?: string;
    confidence: string;
    sources: string[];
  }>;
  publications: Array<{
    title: string;
    venue?: string;
    year?: string;
    confidence: string;
    sources: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    date?: string;
    confidence: string;
    sources: string[];
  }>;
  evidence: Array<{
    id: string;
    claim: string;
    category: string;
    confidence: string;
    source_type: string;
    sources: string[];
  }>;
  source_provenance: {
    repositories: string[];
    files_analyzed: string[];
    user_provided_facts: string[];
  };
}

export class CandidateBuilder {
  async build(
    evidence: CandidateEvidence,
    repoPath: string
  ): Promise<CandidateProfile> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const profile: CandidateProfile = {
      id,
      version: '1.0',
      generated_at: now,
      identity: this.normalizeIdentity(evidence.identity),
      education: this.normalizeEducation(evidence.education),
      experience: this.normalizeExperience(evidence.experience),
      skills: this.normalizeSkills(evidence.skills),
      projects: this.normalizeProjects(evidence.projects),
      research: this.normalizeResearch(evidence.research),
      publications: [],
      certifications: [],
      evidence: this.buildEvidenceList(evidence),
      source_provenance: {
        repositories: [repoPath],
        files_analyzed: [],
        user_provided_facts: [],
      },
    };

    return profile;
  }

  async save(profile: CandidateProfile, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(profile, null, 2));
  }

  private generateId(): string {
    return `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizeIdentity(identity: any): any {
    return {
      name: identity.name,
      email: identity.email,
      links: identity.links,
    };
  }

  private normalizeEducation(education: any[]): any[] {
    return education.map(edu => ({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      start_date: edu.startYear ? `${edu.startYear}-09` : '',
      end_date: edu.endYear ? `${edu.endYear}-05` : undefined,
      confidence: 'DIRECT',
      sources: edu.evidence || [],
    }));
  }

  private normalizeExperience(experience: any[]): any[] {
    return experience.map(exp => ({
      company: exp.company,
      role: exp.role,
      start_date: exp.startYear ? `${exp.startYear}-01` : '',
      end_date: exp.endYear ? `${exp.endYear}-12` : undefined,
      confidence: 'DIRECT',
      sources: exp.evidence || [],
    }));
  }

  private normalizeSkills(skills: any): any[] {
    const normalized: any[] = [];
    
    for (const skill of skills.languages || []) {
      normalized.push({
        name: skill.name,
        confidence: skill.confidence,
        category: 'language',
        sources: skill.sources || [],
      });
    }
    
    for (const skill of skills.frameworks || []) {
      normalized.push({
        name: skill.name,
        confidence: skill.confidence,
        category: 'framework',
        sources: skill.sources || [],
      });
    }
    
    for (const skill of skills.tools || []) {
      normalized.push({
        name: skill.name,
        confidence: skill.confidence,
        category: 'tool',
        sources: skill.sources || [],
      });
    }
    
    for (const skill of skills.domains || []) {
      normalized.push({
        name: skill.name,
        confidence: skill.confidence,
        category: 'domain',
        sources: skill.sources || [],
      });
    }
    
    return normalized;
  }

  private normalizeProjects(projects: any[]): any[] {
    return projects.map(proj => ({
      name: proj.name,
      description: proj.description,
      repository: undefined,
      technologies: proj.technologies || [],
      confidence: proj.confidence || 'DIRECT',
      sources: proj.evidence || [],
    }));
  }

  private normalizeResearch(research: any[] | undefined): any[] {
    if (!research) return [];
    
    return research.map(r => ({
      title: r.title,
      institution: r.institution,
      confidence: 'DIRECT',
      sources: r.evidence || [],
    }));
  }

  private buildEvidenceList(evidence: CandidateEvidence): any[] {
    const evidenceList: any[] = [];
    let index = 0;

    for (const skill of evidence.skills.languages || []) {
      evidenceList.push({
        id: `evidence-${index++}`,
        claim: `Proficient in ${skill.name}`,
        category: 'skill',
        confidence: skill.confidence,
        source_type: 'REPOSITORY',
        sources: skill.sources || [],
      });
    }

    for (const project of evidence.projects || []) {
      evidenceList.push({
        id: `evidence-${index++}`,
        claim: `Built ${project.name}`,
        category: 'project',
        confidence: project.confidence,
        source_type: 'REPOSITORY',
        sources: project.evidence || [],
      });
    }

    return evidenceList;
  }
}
