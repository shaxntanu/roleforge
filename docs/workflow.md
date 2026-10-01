# RoleForge Workflow

The RoleForge pipeline consists of 16 phases that transform portfolio evidence into job-specific applications.

## Phase 1: Repository Analysis

Analyze the candidate's portfolio repository structure.

**Input**: Repository path
**Output**: Repository analysis (languages, frameworks, tools, projects, metadata)

**Actions**:
- Parse repository structure
- Identify programming languages
- Detect frameworks and libraries
- Extract project metadata
- Analyze git history when useful

## Phase 2: Evidence Extraction

Extract candidate evidence from repository analysis.

**Input**: Repository analysis
**Output**: Candidate evidence (identity, education, experience, skills, projects, achievements)

**Actions**:
- Extract identity information
- Extract education (if verifiable)
- Extract work experience (only if verifiable)
- Extract skills with confidence levels
- Extract achievements with evidence sources
- Extract project evidence

## Phase 3: Candidate Knowledge Base Construction

Build normalized candidate profile.

**Input**: Candidate evidence
**Output**: candidate.json

**Actions**:
- Normalize candidate profile
- Organize evidence by category
- Assign confidence levels
- Record provenance for every piece of evidence
- Save to candidate/current/

## Phase 4: Job Description Acquisition

Acquire and verify job description.

**Priority Order**:
1. Official job API
2. Official company careers page
3. User-provided job URL
4. Permitted/legal web retrieval
5. User-provided job description
6. Online search for verification

**Actions**:
- Attempt retrieval by priority
- Record source metadata
- Verify against official sources
- Flag conflicts for user review

## Phase 5: Requirement Extraction

Parse job description into structured requirements.

**Input**: Job description text
**Output**: Structured requirements

**Actions**:
- Categorize requirements (skills, experience, education, tools)
- Assign priority levels (required, preferred, nice_to_have)
- Normalize requirement text for matching

## Phase 6: Evidence-to-Requirement Matching

Map each requirement to candidate evidence.

**Input**: candidate.json, job.json
**Output**: evidence-map.json

**Actions**:
- Map each requirement to candidate evidence
- Assign match levels (DIRECT_MATCH, SUPPORTED_MATCH, TRANSFERABLE_MATCH, PARTIAL_MATCH, NO_EVIDENCE)
- Assign confidence scores
- Generate evidence map with provenance

## Phase 7: Fit and Gap Analysis

Generate fit analysis.

**Input**: evidence-map.json
**Output**: fit-analysis.json

**Actions**:
- Identify strong matches
- Identify partial matches
- Identify transferable skills
- Identify missing requirements
- Calculate overall fit score (0-100)
- Determine fit assessment (excellent, good, moderate, limited)

## Phase 8: Resume Strategy

Determine application generation strategy.

**Input**: candidate.json, job.json, fit-analysis.json
**Output**: strategy.json

**Actions**:
- Determine role family
- Select relevant projects
- Emphasize matching skills
- Choose appropriate template
- Set content priorities

## Phase 9: Content Selection

Select content for generated documents.

**Input**: strategy.json, candidate.json
**Output**: Content selection

**Actions**:
- Select projects based on requirement overlap
- Select skills based on job requirements
- Select experience entries with verifiable evidence
- Quantify metrics only when evidence exists

## Phase 10: LaTeX Generation

Generate LaTeX source documents.

**Input**: Content selection, template
**Output**: resume.tex, cv.tex (if applicable)

**Actions**:
- Load appropriate template
- Build structured content
- Assemble LaTeX source
- Include only claims with sufficient evidence

## Phase 11: PDF Compilation

Compile LaTeX to PDF.

**Input**: resume.tex, cv.tex
**Output**: resume.pdf, cv.pdf

**Actions**:
- Compile using pdflatex
- Handle compilation errors gracefully
- Generate PDF output

## Phase 12: PDF Validation

Validate compiled PDFs.

**Input**: resume.pdf, cv.pdf
**Output**: Validation report

**Actions**:
- Check for compilation failures
- Check page count violations
- Check text overflow
- Check broken links
- Check missing glyphs
- Check duplicated content

## Phase 13: Truth Audit

Audit generated documents against evidence.

**Input**: Generated documents, evidence-map.json
**Output**: truth-audit.json

**Actions**:
- Extract all claims from document
- Audit each claim against evidence map
- Assign confidence level to each claim
- Flag unsupported claims
- Remove or revise claims without sufficient evidence
- Generate audit report with approval rate

## Phase 14: Related Job Discovery (Optional)

Discover related job opportunities.

**Input**: candidate.json, current job
**Output**: related-jobs.json

**Actions**:
- Analyze candidate evidence for skill domains
- Search for related roles
- Cluster jobs by role family
- Identify resume families for reuse
- Estimate effort for each opportunity

## Phase 15: Career Map Generation (Optional)

Generate career direction analysis.

**Input**: candidate.json
**Output**: career-map.md

**Actions**:
- Identify strong evidence domains
- Identify adjacent domains
- Map evidence-supported role neighborhoods
- Identify skill transfer opportunities

## Phase 16: Application Packaging

Package all artifacts for reproducibility.

**Input**: All generated artifacts
**Output**: Application directory

**Actions**:
- Create application directory structure
- Include candidate snapshot
- Include job snapshot
- Include all generated documents
- Include audit report
- Include generation report

## Failure Modes

### No Portfolio
- Ask user for repository/codebase

### No Job Description
- Build candidate knowledge base
- Ask for target job if needed

### Job URL Inaccessible
- Ask user to paste JD

### No Official Source Found
- Mark source status appropriately

### Insufficient Candidate Evidence
- Report gap to user

### No Resume-Relevant Evidence
- Do not manufacture content

### CV Not Appropriate
- Generate resume instead
- Explain why CV is inappropriate

### LaTeX Compiler Unavailable
- Return .tex source
- Explain compilation limitation

### Conflicting Sources
- Prefer higher-trust source
- Record conflict
