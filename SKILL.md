---
name: roleforge
description: Agentic career compiler that analyzes portfolio codebases, matches evidence to job descriptions, and generates tailored resumes, CVs, and job opportunities without inventing experience. Uses portfolio as source of truth, extracts verifiable evidence, maps to job requirements, and produces LaTeX-generated documents with truth validation.
license: MIT
metadata:
  version: "1.0"
  author: shaxntanu
---

# RoleForge

RoleForge is an agentic career compiler that transforms your portfolio codebase into job-specific applications. It treats your code as the source of truth, extracts verifiable evidence, matches it to job requirements, and generates tailored resumes, CVs, and opportunity discoveries.

## When to Activate

Activate RoleForge when the user requests any of the following:

- Generate a resume or CV from their portfolio/repository
- Tailor an application for a specific job description
- Analyze how their skills match a job posting
- Discover related job opportunities based on their portfolio
- Create job-specific application documents
- Audit their portfolio for career-relevant evidence
- Find which roles their portfolio supports best

## Required Inputs

### Primary Input
- **Repository path**: Path to the candidate's portfolio/codebase repository

### Secondary Input (at least one required)
- **Job URL**: URL to a job posting
- **Job description**: Pasted job description text
- **Role family**: Target role family (e.g., "embedded systems", "frontend", "research")

## Optional Inputs

- **Existing resume/CV**: Path to existing resume for additional context (does not override portfolio evidence)
- **LinkedIn export**: Path to LinkedIn profile export (does not override portfolio evidence)
- **User facts**: Additional factual information provided by the user
- **Include CV**: Boolean flag to generate CV in addition to resume
- **Discover related jobs**: Boolean flag to enable job discovery
- **Generate career map**: Boolean flag to generate career direction analysis
- **Output path**: Directory for generated application files

## Execution Workflow

### Phase 1: Repository Analysis
1. Analyze repository structure (languages, frameworks, tools)
2. Extract projects from repository
3. Parse README files, package.json, and documentation
4. Analyze git history (commits, PRs, issues) when useful
5. Extract repository metadata (stars, forks, topics)

### Phase 2: Evidence Extraction
1. Extract candidate identity (name, email, links if present)
2. Extract education information (if present in portfolio)
3. Extract work experience (only if verifiable from portfolio)
4. Extract skills with confidence levels:
   - DIRECT: Explicitly present in source material
   - SUPPORTED: Multiple evidence sources
   - INFERRED: Reasonable technical inference
   - WEAKLY_INFERRED: Possible but insufficiently established
   - UNSUPPORTED: No evidence
5. Extract achievements with evidence sources
6. Extract project evidence (technologies, responsibilities, outcomes)
7. Extract research/publications (if present)

### Phase 3: Candidate Knowledge Base Construction
1. Build normalized candidate profile (candidate.yaml)
2. Organize evidence by category (identity, education, experience, skills, projects)
3. Assign confidence levels to all claims
4. Record provenance for every piece of evidence
5. Save to `candidate/current/` directory

### Phase 4: Job Description Acquisition
Follow priority order:
1. Official job API (if available)
2. Official company careers page
3. Job URL provided by user
4. Permitted/legal web retrieval
5. User-provided job description
6. Online search for verification

Record source metadata:
```yaml
source:
  type: official_company_page
  url: https://example.com/jobs/123
  retrieved_at: 2024-01-01T00:00:00Z
  verified: true
```

If user provides JD:
- Verify against online sources
- Report discrepancies
- Keep user's version as original source
- Flag conflicts for user review

### Phase 5: Requirement Extraction
1. Parse job description into structured requirements
2. Categorize requirements (skills, experience, education, responsibilities, tools)
3. Assign priority levels (required, preferred, nice_to_have)
4. Normalize requirement text for matching

### Phase 6: Evidence-to-Requirement Matching
1. Map each requirement to candidate evidence
2. Assign match levels:
   - strong: Direct evidence matches requirement
   - partial: Some evidence but gaps exist
   - transferable: Related skills can transfer
   - weak: Limited or tangential evidence
   - none: No supporting evidence
3. Assign confidence scores (high, medium, low)
4. Generate evidence map with provenance

### Phase 7: Fit and Gap Analysis
Generate analysis with:
- Strong matches (requirements with strong evidence)
- Partial matches (requirements with partial evidence)
- Transferable skills (adjacent capabilities)
- Missing requirements (no evidence)
- Unverifiable requirements (cannot verify from portfolio)
- Overall fit score (0-100)
- Fit assessment (excellent, good, moderate, limited)

### Phase 8: Resume Strategy
1. Determine role family based on job
2. Select most relevant projects for the role
3. Emphasize skills that match requirements
4. Deprioritize unrelated content
5. Choose appropriate template (ats, engineering, modern, academic)
6. Set content priorities and ordering

### Phase 9: Content Selection
1. Select projects based on:
   - Requirement overlap
   - Responsibility overlap
   - Skill overlap
   - Evidence strength
   - Recency
   - Role relevance
2. Select skills based on job requirements
3. Select experience entries with verifiable evidence
4. Quantify metrics only when evidence exists
5. Use truthful qualitative language when metrics absent

### Phase 10: LaTeX Generation
1. Load appropriate template based on strategy
2. Build structured content from selection
3. Assemble LaTeX source with proper formatting
4. Include only claims with sufficient evidence (DIRECT, SUPPORTED, or INFERRED)
5. Generate resume.tex and optionally cv.tex

### Phase 11: PDF Compilation
1. Compile LaTeX using pdflatex
2. Handle compilation errors gracefully
3. Generate resume.pdf and optionally cv.pdf

### Phase 12: PDF Validation
Check for:
- Compilation failures
- Page count violations
- Text overflow
- Broken links
- Missing glyphs
- Empty sections
- Duplicated content
- Malformed dates
- Visual consistency

Report errors and warnings. Fail validation on critical errors.

### Phase 13: Truth Audit
1. Extract all bullet points from generated document
2. Audit each bullet against evidence map
3. Assign confidence level to each claim
4. Flag unsupported claims
5. Remove or revise claims without sufficient evidence
6. Generate audit report with:
   - Total bullets
   - Approved bullets
   - Flagged bullets
   - Removed bullets
   - Approval rate
   - Unsupported claims with suggested actions

### Phase 14: Related Job Discovery (if enabled)
1. Analyze candidate evidence for skill domains
2. Search for related roles by:
   - Skills
   - Responsibilities
   - Technical domain
   - Role family
   - Transferable skills
3. Cluster related jobs by role family
4. Identify resume families for reuse
5. For each discovered job, provide:
   - Role and company
   - Source
   - Evidence overlap score
   - Resume family
   - Missing requirements
   - Required tailoring effort
   - Application effort estimate

### Phase 15: Career Map Generation (if enabled)
Generate career-map.md with:
- Strong evidence domains
- Adjacent domains
- Evidence-supported role neighborhoods
- Skill transfer opportunities

### Phase 16: Application Packaging
Create application directory structure:
```
applications/
└── company/
    └── role/
        ├── job-description.md
        ├── job-analysis.yaml
        ├── evidence-map.yaml
        ├── resume.tex
        ├── resume.pdf
        ├── cv.tex (if applicable)
        ├── cv.pdf (if applicable)
        └── generation-report.md
```

Include candidate snapshot and job snapshot for reproducibility.

## Evidence Rules

### Confidence Levels
- **DIRECT**: Explicitly stated in source material (README, code comments, project descriptions)
- **SUPPORTED**: Multiple independent evidence sources
- **INFERRED**: Reasonable technical inference from evidence (e.g., React → Frontend Development)
- **WEAKLY_INFERRED**: Possible but insufficiently established
- **UNSUPPORTED**: No evidence exists

### Evidence Sources
Extract from:
- Source code
- Repository structure
- README files
- Project descriptions
- Package manifests (package.json, requirements.txt, etc.)
- Configuration files
- Documentation
- Project pages
- GitHub metadata
- Releases
- Issues and pull requests
- Commit history (when useful)

### Prohibited Inferences
Never infer:
- React → Angular experience
- ESP32 → FreeRTOS experience
- Git commits → leadership
- Repository ownership → company employment
- Related technologies as direct experience

### Transferable Skills
May label as transferable but never represent as direct experience:
- Adjacent frameworks in same ecosystem
- Related programming languages
- Similar tools with different syntax

### Quantification Rules
- Only include metrics with verifiable evidence
- Never invent percentages or improvements
- Prefer truthful qualitative language when metrics absent
- Every quantified claim must have traceable evidence

## Job Description Retrieval Rules

### Priority Order
1. Official job API (if available)
2. Official company careers page
3. Job URL provided by user
4. Permitted/legal web retrieval
5. User-provided job description
6. Online search for verification

### Verification
When user provides JD:
- Attempt to verify against online sources
- Report any discrepancies found
- Keep user's version as original source
- Flag conflicts for user review
- Never silently replace user's version

### Source Recording
Always record:
- Source type
- Source URL
- Retrieval timestamp
- Verification status

## Truth Validation Rules

### Claim Approval
Only claims with DIRECT, SUPPORTED, or INFERRED confidence may appear in generated documents.

### Claim Removal
Remove claims with:
- UNSUPPORTED confidence
- WEAKLY_INFERRED confidence (unless user explicitly requests)
- No traceable evidence

### Claim Flagging
Flag claims with:
- Insufficient evidence for confidence level
- Conflicting evidence
- Ambiguous sourcing

### Audit Threshold
Audit fails if approval rate < 80%. User must review and approve flagged claims.

## Job Discovery Behavior

### Discovery Method
Use:
- Skills from candidate evidence
- Responsibilities from projects
- Technical domain analysis
- Role family mapping
- Transferable skill identification
- Evidence overlap scoring

### Resume Families
Group roles into reusable families:
- Embedded Systems
- Firmware
- IoT
- Frontend
- Full Stack
- Research
- Computational Science
- Electronics
- Robotics
- Data/ML

### Company-Level Discovery
When a job is found, search for other compatible roles at the same company.

### Effort Estimation
For each discovered job, estimate:
- Evidence overlap (high/medium/low)
- Resume reuse (high/medium/low)
- Missing requirements
- Tailoring effort (low/medium/high)
- Application effort (low/medium/high)

## LaTeX Generation Rules

### Template Selection
- **ats-resume**: Simple, ATS-optimized format
- **engineering-resume**: Modern format for technical roles
- **modern-resume**: Contemporary design with accent colors
- **academic-cv**: Comprehensive format for research positions
- **research-cv**: Focused on research output

### CV Generation
Only generate CV if sufficient evidence exists:
- Research details
- Publications
- Academic history
- Presentations
- Certifications

If insufficient, return:
```yaml
cv_status: INSUFFICIENT_INFORMATION
missing:
  - research details
  - publications
  - academic history
```

### Content Rules
- Never include unsupported claims
- Maintain consistent formatting
- Use proper LaTeX escaping
- Include only selected content from strategy
- Respect page count limits

## Validation

### PDF Validation
Must pass all critical checks:
- Compilation success
- No text overflow
- No missing glyphs
- No duplicated content

### Truth Validation
Must pass:
- Approval rate >= 80%
- No unsupported claims in final document
- All claims have traceable evidence

### Failure Handling
On validation failure:
- Report specific errors
- Suggest fixes
- Allow user to review and approve
- Do not automatically proceed with failed validation

## Output Formats

### Primary Outputs
- `resume.tex`: LaTeX source for resume
- `resume.pdf`: Compiled resume PDF
- `candidate.yaml`: Normalized candidate profile
- `evidence-map.yaml`: Evidence-to-requirement mapping
- `job-analysis.yaml`: Fit and gap analysis

### Optional Outputs
- `cv.tex`: LaTeX source for CV (if sufficient evidence)
- `cv.pdf`: Compiled CV PDF (if sufficient evidence)
- `related-jobs.yaml`: Discovered related opportunities
- `career-map.md`: Career direction analysis
- `audit-report.yaml`: Truth audit results

### Application Package
Complete application directory with:
- Job description snapshot
- Job analysis
- Evidence map
- Generated documents
- Audit report
- Generation report

## Safety Constraints

### Never Invent
- Experience
- Employment
- Education
- Achievements
- Technologies
- Metrics
- Responsibilities
- Qualifications

### Always Require Evidence
- Every claim must have source
- Every skill must have confidence level
- Every metric must have traceable evidence
- Every achievement must have provenance

### Human Approval
- Applications are prepared, not submitted
- User must review before submission
- Flagged claims require user decision
- Audit failures require user intervention

## Example Invocations

### Basic Resume Generation
```
Use RoleForge to generate a resume for this repository:
/path/to/portfolio

For this job:
https://company.com/careers/role-123
```

### With CV and Discovery
```
Generate a resume and CV from my portfolio at /path/to/portfolio
for the embedded systems role at this URL: https://company.com/jobs/456
Also discover related jobs and generate a career map.
```

### Job Analysis Only
```
Analyze how my portfolio at /path/to/portfolio matches this job description:
[pasted job description]
```

### Related Job Discovery
```
Find related embedded systems roles that can reuse my existing resume family
based on my portfolio at /path/to/portfolio
```

### From Existing JD
```
Generate a tailored resume for this job description using my portfolio
at /path/to/portfolio as the source of truth:
[pasted job description]
```

## Architecture Documentation

View the complete architecture documentation at:
- Website: [https://shaxntanu.github.io/roleforge/](https://shaxntanu.github.io/roleforge/)
- Repository: [https://github.com/shaxntanu/roleforge](https://github.com/shaxntanu/roleforge)

## Acknowledgments

RoleForge's documentation website design is inspired by Archify:
- Website: https://tt-a1i.github.io/archify/
- GitHub: https://github.com/tt-a1i/archify

RoleForge learns from Archify's information architecture and visualization approach while creating an original visual language and implementation for career compilation.
