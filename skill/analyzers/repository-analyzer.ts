/**
 * Repository Analyzer
 * Extracts candidate evidence from portfolio codebase
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface RepositoryAnalysis {
  structure: {
    languages: string[];
    frameworks: string[];
    tools: string[];
  };
  projects: Project[];
  contributions: Contribution[];
  metadata: {
    repoName: string;
    description?: string;
    topics: string[];
    stars: number;
    forks: number;
  };
}

export interface Project {
  name: string;
  path: string;
  description?: string;
  languages: string[];
  technologies: string[];
  readme?: string;
  packageJson?: any;
  evidence: ProjectEvidence;
}

export interface ProjectEvidence {
  skills: SkillEvidence[];
  achievements: string[];
  responsibilities: string[];
  metrics?: Metric[];
}

export interface SkillEvidence {
  name: string;
  category: string;
  confidence: 'DIRECT' | 'SUPPORTED' | 'INFERRED' | 'WEAKLY_INFERRED' | 'UNSUPPORTED';
  sources: string[];
}

export interface Metric {
  value: string;
  description: string;
  source: string;
}

export interface Contribution {
  type: 'commit' | 'pull_request' | 'issue' | 'release';
  count: number;
  description?: string;
}

const IGNORED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  'bin',
  'obj',
  '.vscode',
  '.idea',
  '__pycache__',
  'venv',
  'env',
  '.next',
  '.nuxt',
  'coverage',
  '.cache',
];

const IGNORED_FILES = [
  '.env',
  '.env.local',
  '.env.*',
  '*.log',
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  'TypeScript': ['.ts', '.tsx'],
  'JavaScript': ['.js', '.jsx', '.mjs'],
  'Python': ['.py'],
  'Java': ['.java'],
  'C++': ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
  'C': ['.c', '.h'],
  'C#': ['.cs'],
  'Go': ['.go'],
  'Rust': ['.rs'],
  'Ruby': ['.rb'],
  'PHP': ['.php'],
  'Swift': ['.swift'],
  'Kotlin': ['.kt', '.kts'],
  'Scala': ['.scala'],
  'R': ['.r', '.R'],
  'MATLAB': ['.m'],
  'Shell': ['.sh', '.bash'],
  'HTML': ['.html', '.htm'],
  'CSS': ['.css', '.scss', '.sass', '.less'],
  'SQL': ['.sql'],
  'Markdown': ['.md'],
};

const FRAMEWORK_PATTERNS: Record<string, RegExp[]> = {
  'React': [/react/i, /usestate/i, /useeffect/i],
  'Vue': [/vue/i, /v-if/i, /v-for/i],
  'Angular': [/angular/i, /@component/i, /@injectable/i],
  'Next.js': [/next/i, /getstaticprops/i, /getserversideprops/i],
  'Nuxt': [/nuxt/i, /asyncdata/i],
  'Express': [/express/i, /app\.use/i, /app\.get/i],
  'Django': [/django/i, /from django/i],
  'Flask': [/flask/i, /flask\./i],
  'Spring': [/spring/i, /@restcontroller/i, /@service/i],
  'Rails': [/rails/i, /activerecord/i],
};

export class RepositoryAnalyzer {
  async analyze(repoPath: string): Promise<RepositoryAnalysis> {
    const repoName = path.basename(repoPath);

    // Analyze repository structure
    const structure = await this.analyzeStructure(repoPath);

    // Extract projects
    const projects = await this.extractProjects(repoPath);

    // Analyze contributions
    const contributions = await this.analyzeContributions(repoPath);

    // Extract metadata
    const metadata = await this.extractMetadata(repoPath, repoName);

    return {
      structure,
      projects,
      contributions,
      metadata,
    };
  }

  private async analyzeStructure(repoPath: string): Promise<any> {
    const languages = new Set<string>();
    const frameworks = new Set<string>();
    const tools = new Set<string>();

    try {
      await this.scanDirectory(repoPath, repoPath, async (filePath, relativePath) => {
        const ext = path.extname(filePath);

        // Detect language
        for (const [lang, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
          if (extensions.includes(ext)) {
            languages.add(lang);
          }
        }

        // Read file for framework detection
        if (['.ts', '.tsx', '.js', '.jsx', '.py', '.java'].includes(ext)) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            this.detectFrameworks(content, frameworks);
            this.detectTools(content, tools);
          } catch (e) {
            // Skip files that can't be read
          }
        }
      });
    } catch (error) {
      console.error('Error analyzing structure:', error);
    }

    return {
      languages: Array.from(languages),
      frameworks: Array.from(frameworks),
      tools: Array.from(tools),
    };
  }

  private detectFrameworks(content: string, frameworks: Set<string>): void {
    for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          frameworks.add(framework);
          break;
        }
      }
    }
  }

  private detectTools(content: string, tools: Set<string>): void {
    if (/git/i.test(content)) tools.add('Git');
    if (/docker/i.test(content)) tools.add('Docker');
    if (/webpack/i.test(content)) tools.add('Webpack');
    if (/vite/i.test(content)) tools.add('Vite');
    if (/jest/i.test(content)) tools.add('Jest');
    if (/pytest/i.test(content)) tools.add('Pytest');
    if (/eslint/i.test(content)) tools.add('ESLint');
    if (/prettier/i.test(content)) tools.add('Prettier');
    if (/typescript/i.test(content)) tools.add('TypeScript');
  }

  private async extractProjects(repoPath: string): Promise<Project[]> {
    const projects: Project[] = [];

    try {
      const entries = await fs.readdir(repoPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !IGNORED_DIRS.includes(entry.name)) {
          const projectPath = path.join(repoPath, entry.name);
          const project = await this.analyzeProject(projectPath, entry.name);
          if (project) {
            projects.push(project);
          }
        }
      }

      // Also analyze root as a project
      const rootProject = await this.analyzeProject(repoPath, path.basename(repoPath));
      if (rootProject) {
        projects.unshift(rootProject);
      }
    } catch (error) {
      console.error('Error extracting projects:', error);
    }

    return projects;
  }

  private async analyzeProject(projectPath: string, name: string): Promise<Project | null> {
    const languages = new Set<string>();
    const technologies = new Set<string>();
    let readme: string | undefined;
    let packageJson: any | undefined;
    const skills: SkillEvidence[] = [];
    const achievements: string[] = [];
    const responsibilities: string[] = [];

    try {
      // Check for README
      const readmeFiles = ['README.md', 'README.txt', 'README'];
      for (const readmeFile of readmeFiles) {
        try {
          const readmePath = path.join(projectPath, readmeFile);
          const readmeContent = await fs.readFile(readmePath, 'utf-8');
          readme = readmeContent;
          this.extractFromReadme(readmeContent, skills, achievements, responsibilities);
          break;
        } catch (e) {
          // README not found
        }
      }

      // Check for package.json
      try {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
        packageJson = JSON.parse(packageContent);
        if (packageJson.dependencies) {
          Object.keys(packageJson.dependencies).forEach(dep => {
            technologies.add(dep);
            skills.push({
              name: dep,
              category: 'tool',
              confidence: 'DIRECT',
              sources: ['package.json'],
            });
          });
        }
      } catch (e) {
        // package.json not found
      }

      // Scan files for languages
      await this.scanDirectory(projectPath, projectPath, async (filePath) => {
        const ext = path.extname(filePath);
        for (const [lang, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
          if (extensions.includes(ext)) {
            languages.add(lang);
            if (!skills.find(s => s.name === lang)) {
              skills.push({
                name: lang,
                category: 'language',
                confidence: 'DIRECT',
                sources: [path.basename(filePath)],
              });
            }
          }
        }
      });

      return {
        name,
        path: projectPath,
        description: readme ? this.extractDescription(readme) : undefined,
        languages: Array.from(languages),
        technologies: Array.from(technologies),
        readme,
        packageJson,
        evidence: {
          skills,
          achievements,
          responsibilities,
        },
      };
    } catch (error) {
      return null;
    }
  }

  private extractFromReadme(readme: string, skills: SkillEvidence[], achievements: string[], responsibilities: string[]): void {
    const lines = readme.split('\n');

    for (const line of lines) {
      // Extract skills from bullet points
      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        const text = line.replace(/^[-*]\s*/, '').trim();

        // Detect skill keywords
        const skillKeywords = ['built', 'developed', 'implemented', 'created', 'designed', 'used', 'using'];
        if (skillKeywords.some(kw => text.toLowerCase().includes(kw))) {
          responsibilities.push(text);
        }
      }
    }
  }

  private extractDescription(readme: string): string {
    const lines = readme.split('\n');
    const firstParagraph: string[] = [];

    for (const line of lines) {
      if (line.trim() === '') {
        if (firstParagraph.length > 0) break;
        continue;
      }
      if (!line.startsWith('#')) {
        firstParagraph.push(line.trim());
      }
    }

    return firstParagraph.join(' ').substring(0, 200);
  }

  private async scanDirectory(
    dirPath: string,
    basePath: string,
    callback: (filePath: string, relativePath: string) => Promise<void>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.includes(entry.name)) {
            await this.scanDirectory(fullPath, basePath, callback);
          }
        } else {
          await callback(fullPath, relativePath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  private async analyzeContributions(repoPath: string): Promise<Contribution[]> {
    const contributions: Contribution[] = [];

    try {
      // Check if it's a git repository
      const gitDir = path.join(repoPath, '.git');
      try {
        await fs.access(gitDir);

        // Try to get basic git info using simple commands
        // This is a simplified version - full implementation would use git commands
        contributions.push({
          type: 'commit',
          count: 0, // Would need git log to count
          description: 'Git repository detected',
        });
      } catch (e) {
        // Not a git repository
      }
    } catch (error) {
      // Error checking for git
    }

    return contributions;
  }

  private async extractMetadata(repoPath: string, repoName: string): Promise<any> {
    let description: string | undefined;
    const topics: string[] = [];

    try {
      // Try to read README for description
      const readmePath = path.join(repoPath, 'README.md');
      try {
        const readme = await fs.readFile(readmePath, 'utf-8');
        description = this.extractDescription(readme);
      } catch (e) {
        // README not found
      }
    } catch (error) {
      // Error reading metadata
    }

    return {
      repoName,
      description,
      topics,
      stars: 0,
      forks: 0,
    };
  }
}
