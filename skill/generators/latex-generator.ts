/**
 * LaTeX Generator
 * Generates editable resume and CV source from selected, evidence-backed content.
 */

import { CandidateEvidence } from '../analyzers/evidence-extractor';
import { ApplicationStrategy } from './strategy-generator';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LaTeXOutput {
  tex: string;
  metadata: {
    template: string;
    /** Filled by a PDF inspection step; undefined means pagination was not measured. */
    pageCount?: number;
    wordCount: number;
    compiled: boolean;
  };
}

export class LaTeXGenerator {
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(process.cwd(), 'templates');
  }

  async generateResume(
    candidateEvidence: CandidateEvidence,
    strategy: ApplicationStrategy,
  ): Promise<LaTeXOutput> {
    const resumeTemplate = ['ats', 'engineering', 'modern'].includes(strategy.template)
      ? strategy.template
      : 'ats';
    const template = await this.loadTemplate(resumeTemplate, 'resume');
    const content = this.buildContent(candidateEvidence, strategy, false);
    const tex = this.assembleLaTeX(template, content);

    return {
      tex,
      metadata: {
        template: resumeTemplate,
        wordCount: this.countWords(tex),
        compiled: false,
      },
    };
  }

  async generateCV(
    candidateEvidence: CandidateEvidence,
    strategy: ApplicationStrategy,
  ): Promise<LaTeXOutput> {
    const templateName = strategy.template === 'research' ? 'research' : 'academic';
    const template = await this.loadTemplate(templateName, 'cv');
    const content = this.buildContent(candidateEvidence, strategy, true);
    const tex = this.assembleLaTeX(template, content);

    return {
      tex,
      metadata: {
        template: templateName,
        wordCount: this.countWords(tex),
        compiled: false,
      },
    };
  }

  withSource(output: LaTeXOutput, tex: string): LaTeXOutput {
    return {
      ...output,
      tex,
      metadata: { ...output.metadata, wordCount: this.countWords(tex), compiled: false },
    };
  }

  private async loadTemplate(templateName: string, documentType: 'resume' | 'cv'): Promise<string> {
    const templateFile = documentType === 'cv'
      ? `${templateName}-cv.tex`
      : `${templateName}-resume.tex`;
    const relativeDirectory = documentType === 'cv' ? 'cvs' : 'resumes';
    const templatePaths = [
      path.join(this.templatesDir, relativeDirectory, templateFile),
      path.resolve(__dirname, '../../../templates', relativeDirectory, templateFile),
      path.resolve(__dirname, '../../templates', relativeDirectory, templateFile),
    ];

    for (const templatePath of templatePaths) {
      try {
        return await fs.readFile(templatePath, 'utf-8');
      } catch {
        // Try the package template directory next.
      }
    }
    throw new Error(`RoleForge template not found: ${templateFile}`);
  }

  private buildContent(
    candidateEvidence: CandidateEvidence,
    strategy: ApplicationStrategy,
    isCV: boolean,
  ): Record<string, string> {
    return {
      '<<name>>': this.formatName(candidateEvidence.identity.name),
      '<<title>>': this.escapeLaTeX(strategy.roleFamily),
      '<<contact>>': this.formatContact(candidateEvidence.identity),
      '<<sections>>': this.formatSections(candidateEvidence, strategy, isCV),
    };
  }

  private formatName(name?: string): string {
    return name ? this.escapeLaTeX(name) : '';
  }

  private formatContact(identity: CandidateEvidence['identity']): string {
    const contact: string[] = [];
    if (identity.email) contact.push(`\\url{${identity.email}}`);
    for (const link of identity.links || []) {
      contact.push(`\\href{${link.url}}{${this.escapeLaTeX(link.type)}}`);
    }
    return contact.join(' $\\cdot$ ');
  }

  private formatSections(
    candidateEvidence: CandidateEvidence,
    strategy: ApplicationStrategy,
    isCV: boolean,
  ): string {
    const sections: string[] = [];
    const skills = this.formatSkills(candidateEvidence, strategy.selectedSkills);
    const projects = this.formatProjects(candidateEvidence, strategy.selectedProjects);
    const experience = this.formatExperience(candidateEvidence);
    const education = this.formatEducation(candidateEvidence);
    const research = this.formatResearch(candidateEvidence.research);

    const ordered = isCV
      ? [education, research, experience, projects, skills]
      : [skills, projects, experience, education];

    for (const section of ordered) {
      if (section) sections.push(section);
    }
    return sections.join('\n\n');
  }

  private formatSkills(candidateEvidence: CandidateEvidence, selectedSkills: string[]): string {
    if (!selectedSkills.length) return '';
    const evidenceSkills = [
      ...candidateEvidence.skills.languages,
      ...candidateEvidence.skills.frameworks,
      ...candidateEvidence.skills.tools,
      ...candidateEvidence.skills.domains,
    ];
    const normalized = new Set(evidenceSkills.map((skill) => skill.name.toLowerCase()));
    const supported = selectedSkills.filter((skill) => normalized.has(skill.toLowerCase()));
    if (!supported.length) return '';

    return [
      '\\section*{Skills}',
      '\\begin{itemize}',
      ...supported.map((skill) => `\\item ${this.escapeLaTeX(skill)}`),
      '\\end{itemize}',
    ].join('\n');
  }

  private formatProjects(candidateEvidence: CandidateEvidence, selectedProjects: string[]): string {
    const selected = new Set(selectedProjects.map((name) => name.toLowerCase()));
    const projects = candidateEvidence.projects.filter((project) => selected.has(project.name.toLowerCase()));
    if (!projects.length) return '';

    const items: string[] = ['\\section*{Projects}', '\\begin{itemize}'];
    for (const project of projects) {
      const parts = [`\\textbf{${this.escapeLaTeX(project.name)}}`];
      if (project.description) parts.push(this.escapeLaTeX(project.description));
      const technologies = project.technologies.filter(Boolean);
      if (technologies.length) {
        parts.push(`\\textit{Technologies: ${technologies.map((item) => this.escapeLaTeX(item)).join(', ')}}`);
      }
      items.push(`\\item ${parts.join('. ')}`);
      for (const responsibility of project.responsibilities) {
        items.push(`\\item ${this.escapeLaTeX(responsibility)}`);
      }
    }
    items.push('\\end{itemize}');
    return items.join('\n');
  }

  private formatExperience(candidateEvidence: CandidateEvidence): string {
    if (!candidateEvidence.experience.length) return '';
    const items = ['\\section*{Experience}', '\\begin{itemize}'];
    for (const experience of candidateEvidence.experience) {
      const heading = [experience.role, experience.company].filter(Boolean).join(' — ');
      for (const description of experience.description) {
        items.push(`\\item ${heading ? `\\textbf{${this.escapeLaTeX(heading)}}. ` : ''}${this.escapeLaTeX(description)}`);
      }
    }
    items.push('\\end{itemize}');
    return items.length > 2 ? items.join('\n') : '';
  }

  private formatEducation(candidateEvidence: CandidateEvidence): string {
    if (!candidateEvidence.education.length) return '';
    const items = ['\\section*{Education}', '\\begin{itemize}'];
    for (const education of candidateEvidence.education) {
      const detail = [education.degree, education.field, education.institution].filter(Boolean).join(', ');
      if (detail) items.push(`\\item ${this.escapeLaTeX(detail)}`);
    }
    items.push('\\end{itemize}');
    return items.length > 2 ? items.join('\n') : '';
  }

  private formatResearch(research?: CandidateEvidence['research']): string {
    if (!research?.length) return '';
    const items = ['\\section*{Research}', '\\begin{itemize}'];
    for (const entry of research) {
      const details = [entry.title, entry.venue, entry.year].filter(Boolean).join(', ');
      if (details) items.push(`\\item ${this.escapeLaTeX(details)}`);
    }
    items.push('\\end{itemize}');
    return items.length > 2 ? items.join('\n') : '';
  }

  private assembleLaTeX(template: string, content: Record<string, string>): string {
    let tex = template;
    for (const [placeholder, value] of Object.entries(content)) {
      tex = tex.replaceAll(placeholder, value);
    }
    return tex;
  }

  private countWords(content: string): number {
    return content
      .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, ' ')
      .replace(/[{}$]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .length;
  }

  private escapeLaTeX(text: string): string {
    const escapes: Record<string, string> = {
      '\\': '\\textbackslash{}',
      '{': '\\{',
      '}': '\\}',
      '$': '\\$',
      '&': '\\&',
      '#': '\\#',
      '%': '\\%',
      '_': '\\_',
      '^': '\\textasciicircum{}',
      '~': '\\textasciitilde{}',
    };
    return text.replace(/[\\{}$&#_%^~]/g, (character) => escapes[character]);
  }
}
