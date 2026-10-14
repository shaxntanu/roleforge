/**
 * Application Strategy Generator
 * Determines what content should appear in generated documents
 */

import { CandidateEvidence } from '../analyzers/evidence-extractor';
import { EvidenceMatch, FitAnalysis } from '../matchers/requirement-matcher';

export interface ApplicationStrategy {
  candidateId: string;
  jobId: string;
  documentType: 'resume' | 'cv';
  template: 'ats' | 'engineering' | 'modern' | 'academic' | 'research';
  selectedProjects: string[];
  selectedSkills: string[];
  contentPriorities: {
    skills: 'high' | 'medium' | 'low';
    projects: 'high' | 'medium' | 'low';
    experience: 'high' | 'medium' | 'low';
    education: 'high' | 'medium' | 'low';
  };
  omittedSections: string[];
  roleFamily: string;
  emphasisAreas: string[];
}

export class StrategyGenerator {
  async generate(
    candidateEvidence: CandidateEvidence,
    fitAnalysis: FitAnalysis,
    jobTitle: string,
    candidateId: string,
    jobId: string,
  ): Promise<ApplicationStrategy> {
    const roleFamily = this.determineRoleFamily(jobTitle);
    const documentType = this.determineDocumentType(candidateEvidence, roleFamily);
    const template = this.selectTemplate(roleFamily, documentType);
    
    const selectedProjects = this.selectProjects(candidateEvidence, fitAnalysis);
    const selectedSkills = this.selectSkills(candidateEvidence, fitAnalysis);
    const contentPriorities = this.determineContentPriorities(roleFamily);
    const omittedSections = this.determineOmittedSections(candidateEvidence, documentType);
    const emphasisAreas = this.determineEmphasisAreas(fitAnalysis);

    return {
      candidateId,
      jobId,
      documentType,
      template,
      selectedProjects,
      selectedSkills,
      contentPriorities,
      omittedSections,
      roleFamily,
      emphasisAreas,
    };
  }

  private determineRoleFamily(jobTitle: string): string {
    const title = jobTitle.toLowerCase();
    
    if (title.includes('embedded') || title.includes('firmware') || title.includes('iot')) {
      return 'embedded systems';
    }
    if (title.includes('frontend') || title.includes('ui') || title.includes('ux')) {
      return 'frontend';
    }
    if (title.includes('backend') || title.includes('api') || title.includes('server')) {
      return 'backend';
    }
    if (title.includes('full stack') || title.includes('fullstack')) {
      return 'full stack';
    }
    if (title.includes('research') || title.includes('academic') || title.includes('scientist')) {
      return 'research';
    }
    if (title.includes('data') || title.includes('ml') || title.includes('ai')) {
      return 'data science';
    }
    if (title.includes('mobile') || title.includes('android') || title.includes('ios')) {
      return 'mobile';
    }
    if (title.includes('devops') || title.includes('sre') || title.includes('infrastructure')) {
      return 'devops';
    }
    
    return 'general software';
  }

  private determineDocumentType(candidateEvidence: CandidateEvidence, roleFamily: string): 'resume' | 'cv' {
    // CV is appropriate for research/academic roles with sufficient evidence
    if (roleFamily === 'research') {
      if (candidateEvidence.research && candidateEvidence.research.length > 0) {
        return 'cv';
      }
    }
    
    // Default to resume for most software roles
    return 'resume';
  }

  private selectTemplate(roleFamily: string, documentType: 'resume' | 'cv'): ApplicationStrategy['template'] {
    if (documentType === 'cv') {
      return roleFamily === 'research' ? 'research' : 'academic';
    }
    
    // Resume templates based on role family
    const templateMap: Record<string, ApplicationStrategy['template']> = {
      'embedded systems': 'engineering',
      'frontend': 'modern',
      'backend': 'engineering',
      'full stack': 'modern',
      'research': 'academic',
      'data science': 'engineering',
      'mobile': 'modern',
      'devops': 'engineering',
    };
    
    return templateMap[roleFamily] || 'ats';
  }

  private selectProjects(candidateEvidence: CandidateEvidence, fitAnalysis: FitAnalysis): string[] {
    const selected: string[] = [];
    
    // Prioritize projects that match strong requirements
    for (const match of [...fitAnalysis.strongMatches, ...fitAnalysis.partialMatches, ...fitAnalysis.transferableSkills]) {
      for (const evidence of match.evidence) {
        if (evidence.type === 'project') {
          const project = candidateEvidence.projects.find((item) =>
            evidence.description.toLowerCase().includes(item.name.toLowerCase()),
          );
          if (project && !selected.includes(project.name)) {
            selected.push(project.name);
          }
        }
      }
    }
    
    // Add remaining projects up to a limit
    for (const project of candidateEvidence.projects) {
      if (!selected.includes(project.name) && selected.length < 5) {
        selected.push(project.name);
      }
    }
    
    return selected;
  }

  private selectSkills(candidateEvidence: CandidateEvidence, fitAnalysis: FitAnalysis): string[] {
    const selected: string[] = [];
    
    // Prioritize skills that match strong requirements
    for (const match of fitAnalysis.strongMatches) {
      for (const evidence of match.evidence) {
        if (evidence.type === 'skill') {
          const skillName = evidence.description.split(': ')[1]?.trim();
          if (skillName && !selected.includes(skillName)) {
            selected.push(skillName);
          }
        }
      }
    }
    
    // Add remaining skills up to a limit
    const allSkills = [
      ...candidateEvidence.skills.languages.map(s => s.name),
      ...candidateEvidence.skills.frameworks.map(s => s.name),
      ...candidateEvidence.skills.tools.map(s => s.name),
    ];
    
    for (const skill of allSkills) {
      if (!selected.includes(skill) && selected.length < 15) {
        selected.push(skill);
      }
    }
    
    return selected;
  }

  private determineContentPriorities(roleFamily: string): ApplicationStrategy['contentPriorities'] {
    // Different priorities based on role family
    const priorities: Record<string, ApplicationStrategy['contentPriorities']> = {
      'embedded systems': {
        skills: 'high',
        projects: 'high',
        experience: 'medium',
        education: 'medium',
      },
      'frontend': {
        skills: 'high',
        projects: 'high',
        experience: 'medium',
        education: 'low',
      },
      'backend': {
        skills: 'high',
        projects: 'high',
        experience: 'medium',
        education: 'low',
      },
      'full stack': {
        skills: 'high',
        projects: 'high',
        experience: 'medium',
        education: 'low',
      },
      'research': {
        skills: 'high',
        projects: 'medium',
        experience: 'low',
        education: 'high',
      },
      'data science': {
        skills: 'high',
        projects: 'high',
        experience: 'medium',
        education: 'medium',
      },
      'mobile': {
        skills: 'high',
        projects: 'high',
        experience: 'medium',
        education: 'low',
      },
      'devops': {
        skills: 'high',
        projects: 'medium',
        experience: 'high',
        education: 'low',
      },
    };
    
    return priorities[roleFamily] || {
      skills: 'high',
      projects: 'high',
      experience: 'medium',
      education: 'medium',
    };
  }

  private determineOmittedSections(candidateEvidence: CandidateEvidence, documentType: 'resume' | 'cv'): string[] {
    const omitted: string[] = [];
    
    // Omit sections with no evidence
    if (!candidateEvidence.education || candidateEvidence.education.length === 0) {
      omitted.push('education');
    }
    
    if (!candidateEvidence.experience || candidateEvidence.experience.length === 0) {
      omitted.push('experience');
    }
    
    if (!candidateEvidence.research || candidateEvidence.research.length === 0) {
      omitted.push('research');
    }
    
    if (!candidateEvidence.achievements || candidateEvidence.achievements.length === 0) {
      omitted.push('achievements');
    }
    
    // Resume typically omits research section unless applicable
    if (documentType === 'resume' && !omitted.includes('research')) {
      omitted.push('research');
    }
    
    return omitted;
  }

  private determineEmphasisAreas(fitAnalysis: FitAnalysis): string[] {
    const emphasis: string[] = [];
    
    // Emphasize areas with strong matches
    for (const match of fitAnalysis.strongMatches) {
      const category = this.categorizeRequirement(match.requirementText);
      if (!emphasis.includes(category)) {
        emphasis.push(category);
      }
    }
    
    // Add transferable skills as secondary emphasis
    for (const match of fitAnalysis.transferableSkills) {
      const category = this.categorizeRequirement(match.requirementText);
      if (!emphasis.includes(category)) {
        emphasis.push(category);
      }
    }
    
    return emphasis;
  }

  private categorizeRequirement(text: string): string {
    const lower = text.toLowerCase();
    
    if (lower.includes('python') || lower.includes('java') || lower.includes('c++')) {
      return 'programming languages';
    }
    if (lower.includes('react') || lower.includes('angular') || lower.includes('vue')) {
      return 'frameworks';
    }
    if (lower.includes('git') || lower.includes('docker') || lower.includes('aws')) {
      return 'tools';
    }
    if (lower.includes('embedded') || lower.includes('firmware') || lower.includes('iot')) {
      return 'embedded systems';
    }
    
    return 'general';
  }
}
