/**
 * Job Description Normalizer
 * Converts raw job descriptions into structured job representations
 */

export interface JobSource {
  type: 'official_api' | 'official_company_page' | 'user_url' | 'user_provided' | 'verified_secondary' | 'unverified';
  url?: string;
  retrieved_at?: string;
  verified?: boolean;
}

export interface JobRequirement {
  id: string;
  text: string;
  category: 'skill' | 'experience' | 'education' | 'tool' | 'platform' | 'domain';
  priority: 'required' | 'preferred' | 'nice_to_have';
}

export interface NormalizedJob {
  id: string;
  version: string;
  normalized_at: string;
  company: string;
  title: string;
  location?: string;
  employment_type?: 'full-time' | 'part-time' | 'contract' | 'internship' | 'co-op';
  remote?: boolean;
  source: JobSource;
  requirements: JobRequirement[];
  responsibilities: Array<{ id: string; text: string }>;
  technologies: string[];
  education: Array<{
    level?: string;
    field?: string;
    priority: 'required' | 'preferred' | 'nice_to_have';
  }>;
  experience?: {
    years?: number;
    seniority?: string;
    priority: 'required' | 'preferred' | 'nice_to_have';
  };
  keywords: string[];
  domain?: string;
  original_description: string;
}

export class JobNormalizer {
  async normalize(
    jobDescription: string,
    source: JobSource,
    metadata?: {
      company?: string;
      title?: string;
      location?: string;
      url?: string;
    }
  ): Promise<NormalizedJob> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const company = metadata?.company || this.extractCompany(jobDescription);
    const title = metadata?.title || this.extractTitle(jobDescription);
    const location = metadata?.location || this.extractLocation(jobDescription);

    const normalized: NormalizedJob = {
      id,
      version: '1.0',
      normalized_at: now,
      company,
      title,
      location,
      employment_type: this.extractEmploymentType(jobDescription),
      remote: this.isRemote(jobDescription),
      source,
      requirements: this.extractRequirements(jobDescription),
      responsibilities: this.extractResponsibilities(jobDescription),
      technologies: this.extractTechnologies(jobDescription),
      education: this.extractEducation(jobDescription),
      experience: this.extractExperience(jobDescription),
      keywords: this.extractKeywords(jobDescription),
      domain: this.inferDomain(jobDescription, title),
      original_description: jobDescription,
    };

    return normalized;
  }

  private generateId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractCompany(description: string): string {
    const labeledMatch = description.match(/^\s*company\s*:\s*([^\n]+)$/im);
    if (labeledMatch) return labeledMatch[1].trim();
    const companyMatch = description.match(/\bat\s+([A-Z][A-Za-z0-9&.' -]*)(?=\s*(?:[,.;\n]|$))/);
    return companyMatch ? companyMatch[1].trim() : 'Unknown Company';
  }

  private extractTitle(description: string): string {
    const labeledMatch = description.match(/^\s*(?:job title|position|role)\s*:\s*([^\n]+)$/im);
    if (labeledMatch) return labeledMatch[1].trim();
    const firstLine = description.split('\n')
      .map((line) => line.trim().replace(/^#+\s*/, ''))
      .find((line) => line && !/^(job description|requirements|qualifications|responsibilities)$/i.test(line));
    return firstLine || 'Unknown Position';
  }

  private extractLocation(description: string): string | undefined {
    const locationMatch = description.match(/(?:location|remote|based):\s*([^\n]+)/i);
    return locationMatch ? locationMatch[1].trim() : undefined;
  }

  private extractEmploymentType(description: string): 'full-time' | 'part-time' | 'contract' | 'internship' | 'co-op' | undefined {
    const lower = description.toLowerCase();
    if (lower.includes('full-time') || lower.includes('full time')) return 'full-time';
    if (lower.includes('part-time') || lower.includes('part time')) return 'part-time';
    if (lower.includes('contract')) return 'contract';
    if (lower.includes('internship') || lower.includes('intern')) return 'internship';
    if (lower.includes('co-op') || lower.includes('co op')) return 'co-op';
    return undefined;
  }

  private isRemote(description: string): boolean {
    const lower = description.toLowerCase();
    return lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh');
  }

  private extractRequirements(description: string): JobRequirement[] {
    const requirements: JobRequirement[] = [];
    let section: 'requirements' | 'preferred' | 'responsibilities' | 'other' = 'other';
    let index = 0;

    for (const line of description.split('\n')) {
      const nextSection = this.readSection(line);
      if (nextSection) {
        section = nextSection;
        continue;
      }

      const cleanLine = line.trim();
      const isBullet = /^[-*•]\s+/.test(cleanLine);
      const explicit = /\b(required|must have|must be|minimum|qualification|proficiency|proficient|experience with|knowledge of|familiarity with)\b/i.test(cleanLine);
      if (section !== 'responsibilities' && (isBullet && section !== 'other' || explicit)) {
        const priorityContext = section === 'preferred' ? 'preferred' : cleanLine;
        requirements.push({
          id: `req-${index++}`,
          text: this.cleanRequirementText(cleanLine),
          category: this.categorizeRequirement(cleanLine),
          priority: this.determinePriority(priorityContext),
        });
      }
    }

    return requirements;
  }

  private isRequirementLine(line: string): boolean {
    const lower = line.toLowerCase();
    const requirementKeywords = ['required', 'must have', 'need', 'qualification', 'skill', 'experience'];
    return requirementKeywords.some(keyword => lower.includes(keyword)) || 
           line.trim().startsWith('-') || 
           line.trim().startsWith('•');
  }

  private readSection(line: string): 'requirements' | 'preferred' | 'responsibilities' | 'other' | undefined {
    const heading = line.trim().replace(/^#+\s*/, '').replace(/[:.]$/, '').toLowerCase();
    if (!heading || heading.length > 100) return undefined;
    if (/\b(responsibilities|what you(?:'|’)ll do|duties|your role)\b/.test(heading)) return 'responsibilities';
    if (/\b(preferred|nice to have|bonus|desirable)\b/.test(heading)) return 'preferred';
    if (/\b(requirements|qualifications|what you(?:'|’)ll need|what we(?:'|’)re looking for|must have)\b/.test(heading)) return 'requirements';
    if (/^(about|benefits|what we offer|who we are|company|our team)$/.test(heading)) return 'other';
    return undefined;
  }

  private cleanRequirementText(line: string): string {
    return line.replace(/^[-•*]\s*/, '').replace(/^(required|must have|need|qualification):\s*/i, '').trim();
  }

  private categorizeRequirement(line: string): 'skill' | 'experience' | 'education' | 'tool' | 'platform' | 'domain' {
    const lower = line.toLowerCase();
    
    if (lower.includes('degree') || lower.includes('bachelor') || lower.includes('master') || lower.includes('phd')) {
      return 'education';
    }
    if (lower.includes('year') || lower.includes('experience')) {
      return 'experience';
    }
    if (lower.includes('python') || lower.includes('java') || lower.includes('c++') || lower.includes('javascript')) {
      return 'skill';
    }
    if (lower.includes('git') || lower.includes('docker') || lower.includes('aws') || lower.includes('kubernetes')) {
      return 'tool';
    }
    if (lower.includes('linux') || lower.includes('windows') || lower.includes('macos')) {
      return 'platform';
    }
    
    return 'domain';
  }

  private determinePriority(line: string): 'required' | 'preferred' | 'nice_to_have' {
    const lower = line.toLowerCase();
    
    if (lower.includes('required') || lower.includes('must') || lower.includes('need')) {
      return 'required';
    }
    if (lower.includes('preferred') || lower.includes('plus') || lower.includes('ideal')) {
      return 'preferred';
    }
    
    return 'nice_to_have';
  }

  private extractResponsibilities(description: string): Array<{ id: string; text: string }> {
    const responsibilities: Array<{ id: string; text: string }> = [];
    let section: 'responsibilities' | 'other' = 'other';
    let index = 0;

    for (const line of description.split('\n')) {
      const nextSection = this.readSection(line);
      if (nextSection) {
        section = nextSection === 'responsibilities' ? 'responsibilities' : 'other';
        continue;
      }

      const trimmed = line.trim();
      const isBullet = /^[-*•]\s+/.test(trimmed);
      const explicit = /^(?:you will|you'll|you’ll|responsibilities|duties)\s*:/i.test(trimmed);
      if ((section === 'responsibilities' && isBullet) || explicit) {
        responsibilities.push({
          id: `resp-${index++}`,
          text: this.cleanResponsibilityText(trimmed),
        });
      }
    }

    return responsibilities;
  }

  private isResponsibilityLine(line: string): boolean {
    const lower = line.toLowerCase();
    const responsibilityKeywords = ['responsibility', 'you will', 'role', 'duties'];
    return responsibilityKeywords.some(keyword => lower.includes(keyword)) ||
           line.trim().startsWith('-') ||
           line.trim().startsWith('•');
  }

  private cleanResponsibilityText(line: string): string {
    return line.replace(/^[-•*]\s*/, '').replace(/^(responsibility|you will|role|duties):\s*/i, '').trim();
  }

  private extractTechnologies(description: string): string[] {
    const technologies: string[] = [];
    const techKeywords = [
      'python', 'java', 'javascript', 'typescript', 'c++', 'c', 'c#', 'go', 'rust',
      'react', 'angular', 'vue', 'node', 'django', 'flask', 'spring',
      'git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'linux', 'windows', 'macos', 'android', 'ios',
      'sql', 'mongodb', 'postgresql', 'mysql', 'redis',
      'esp32', 'arm', 'cortex', 'arduino', 'raspberry pi'
    ];

    const lower = description.toLowerCase();
    for (const tech of techKeywords) {
      const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(?:^|[^a-z0-9+#])${escaped}(?:$|[^a-z0-9+#])`, 'i');
      if (pattern.test(lower) && !technologies.includes(tech)) {
        technologies.push(tech);
      }
    }

    return technologies;
  }

  private extractEducation(description: string): Array<{
    level?: string;
    field?: string;
    priority: 'required' | 'preferred' | 'nice_to_have';
  }> {
    const education: Array<{
      level?: string;
      field?: string;
      priority: 'required' | 'preferred' | 'nice_to_have';
    }> = [];

    const lower = description.toLowerCase();
    
    if (lower.includes('bachelor') || /\bbs\b/i.test(description)) {
      education.push({ level: 'bachelor', priority: this.determinePriority(description) });
    }
    if (lower.includes('master') || /\bms\b/i.test(description)) {
      education.push({ level: 'master', priority: this.determinePriority(description) });
    }
    if (lower.includes('phd') || lower.includes('doctorate')) {
      education.push({ level: 'phd', priority: this.determinePriority(description) });
    }

    return education;
  }

  private extractExperience(description: string): {
    years?: number;
    seniority?: string;
    priority: 'required' | 'preferred' | 'nice_to_have';
  } | undefined {
    const yearsMatch = description.match(/(\d+)\+?\s*years?/i);
    const years = yearsMatch ? parseInt(yearsMatch[1]) : undefined;

    const seniorityMatch = description.match(/(?:senior|junior|mid|lead|principal)/i);
    const seniority = seniorityMatch ? seniorityMatch[1].toLowerCase() : undefined;

    if (!years && !seniority) return undefined;

    return {
      years,
      seniority,
      priority: this.determinePriority(description),
    };
  }

  private extractKeywords(description: string): string[] {
    const keywords: string[] = [];
    const words = description.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      if (word.length > 3 && !keywords.includes(word)) {
        keywords.push(word);
      }
    }

    return keywords.slice(0, 20);
  }

  private inferDomain(description: string, title?: string): string | undefined {
    const text = `${title || ''} ${description}`.toLowerCase();
    
    if (text.includes('embedded') || text.includes('firmware') || text.includes('iot')) {
      return 'embedded systems';
    }
    if (text.includes('frontend') || text.includes('react') || text.includes('vue')) {
      return 'frontend';
    }
    if (text.includes('backend') || text.includes('api') || text.includes('server')) {
      return 'backend';
    }
    if (text.includes('full stack') || text.includes('fullstack')) {
      return 'full stack';
    }
    if (text.includes('machine learning') || /\bml\b/.test(text) || /\bai\b/.test(text)) {
      return 'machine learning';
    }
    if (text.includes('research') || text.includes('academic')) {
      return 'research';
    }

    return undefined;
  }
}
