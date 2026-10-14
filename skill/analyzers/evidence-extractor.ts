/**
 * Evidence Extractor
 * Converts repository analysis into structured candidate evidence
 */

import { RepositoryAnalysis, Project, SkillEvidence } from './repository-analyzer';

export interface CandidateEvidence {
  identity: Identity;
  education: Education[];
  experience: Experience[];
  skills: Skills;
  achievements: Achievement[];
  projects: ProjectEvidence[];
  research?: Research[];
}

export interface Identity {
  name?: string;
  email?: string;
  location?: string;
  links?: Link[];
}

export interface Link {
  type: 'github' | 'linkedin' | 'portfolio' | 'other';
  url: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startYear: number;
  endYear?: number;
  gpa?: string;
  evidence: string[];
}

export interface Experience {
  company?: string;
  role?: string;
  startYear: number;
  endYear?: number;
  description: string[];
  technologies: string[];
  evidence: string[];
}

export interface Skills {
  languages: SkillEvidence[];
  frameworks: SkillEvidence[];
  tools: SkillEvidence[];
  domains: SkillEvidence[];
}

export interface Achievement {
  title: string;
  description: string;
  date?: string;
  evidence: string[];
}

export interface ProjectEvidence {
  name: string;
  description: string;
  technologies: string[];
  responsibilities: string[];
  outcomes: string[];
  evidence: string[];
  confidence: 'DIRECT' | 'SUPPORTED' | 'INFERRED' | 'WEAKLY_INFERRED' | 'UNSUPPORTED';
}

export interface Research {
  title: string;
  authors: string[];
  venue: string;
  year: number;
  doi?: string;
  evidence: string[];
}

export class EvidenceExtractor {
  async extract(repoAnalysis: RepositoryAnalysis): Promise<CandidateEvidence> {
    // Extract identity
    const identity = await this.extractIdentity(repoAnalysis);

    // Extract education
    const education = await this.extractEducation(repoAnalysis);

    // Extract experience
    const experience = await this.extractExperience(repoAnalysis);

    // Extract skills
    const skills = await this.extractSkills(repoAnalysis);

    // Extract achievements
    const achievements = await this.extractAchievements(repoAnalysis);

    // Extract project evidence
    const projects = await this.extractProjectEvidence(repoAnalysis);

    // Extract research (if available)
    const research = await this.extractResearch(repoAnalysis);

    return {
      identity,
      education,
      experience,
      skills,
      achievements,
      projects,
      research,
    };
  }

  private async extractIdentity(repoAnalysis: RepositoryAnalysis): Promise<Identity> {
    const identity: Identity = {};

    // Try to extract identity from README or repository metadata
    // This is a simplified implementation - full version would parse README for contact info
    if (repoAnalysis.metadata.description) {
      // Could potentially extract name from description
    }

    return identity;
  }

  private async extractEducation(repoAnalysis: RepositoryAnalysis): Promise<Education[]> {
    const education: Education[] = [];

    // Education is typically not in code repositories unless explicitly stated
    // This would require user-provided information or parsing of README/bio sections
    // For now, return empty - we don't invent education

    return education;
  }

  private async extractExperience(repoAnalysis: RepositoryAnalysis): Promise<Experience[]> {
    const experience: Experience[] = [];

    // Work experience is typically not in code repositories
    // This would require user-provided information
    // For now, return empty - we don't invent work experience

    return experience;
  }

  private async extractSkills(repoAnalysis: RepositoryAnalysis): Promise<Skills> {
    const languages: SkillEvidence[] = [];
    const frameworks: SkillEvidence[] = [];
    const tools: SkillEvidence[] = [];
    const domains: SkillEvidence[] = [];

    // Extract skills from structure analysis
    for (const lang of repoAnalysis.structure.languages) {
      languages.push({
        name: lang,
        category: 'language',
        confidence: 'DIRECT',
        sources: ['repository analysis'],
      });
    }

    for (const framework of repoAnalysis.structure.frameworks) {
      frameworks.push({
        name: framework,
        category: 'framework',
        confidence: 'DIRECT',
        sources: ['repository analysis'],
      });
    }

    for (const tool of repoAnalysis.structure.tools) {
      tools.push({
        name: tool,
        category: 'tool',
        confidence: 'DIRECT',
        sources: ['repository analysis'],
      });
    }

    // Extract skills from projects
    for (const project of repoAnalysis.projects) {
      for (const skill of project.evidence.skills) {
        // Avoid duplicates
        const allSkills = [...languages, ...frameworks, ...tools];
        if (!allSkills.find(s => s.name === skill.name)) {
          if (skill.category === 'language') {
            languages.push(skill);
          } else if (skill.category === 'framework') {
            frameworks.push(skill);
          } else {
            tools.push(skill);
          }
        }
      }
    }

    return {
      languages,
      frameworks,
      tools,
      domains,
    };
  }

  private async extractAchievements(repoAnalysis: RepositoryAnalysis): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    // Extract achievements from projects
    for (const project of repoAnalysis.projects) {
      for (const achievement of project.evidence.achievements) {
        achievements.push({
          title: project.name,
          description: achievement,
          evidence: [project.path],
        });
      }
    }

    return achievements;
  }

  private async extractProjectEvidence(repoAnalysis: RepositoryAnalysis): Promise<ProjectEvidence[]> {
    const projects: ProjectEvidence[] = [];

    for (const project of repoAnalysis.projects) {
      projects.push({
        name: project.name,
        description: project.description || '',
        technologies: project.technologies,
        responsibilities: project.evidence.responsibilities,
        outcomes: project.evidence.achievements,
        evidence: [project.path],
        confidence: 'DIRECT',
      });
    }

    return projects;
  }

  private async extractResearch(repoAnalysis: RepositoryAnalysis): Promise<Research[] | undefined> {
    // Research is typically not in code repositories
    // This would require user-provided information or parsing of academic content
    return undefined;
  }
}
