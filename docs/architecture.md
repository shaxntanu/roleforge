# RoleForge Architecture

RoleForge is an evidence-backed career compiler that transforms portfolio codebases into job-specific applications.

## Core Philosophy

**Evidence Over Inference**: Every claim must be backed by verifiable evidence from the candidate's portfolio.

**Source of Truth**: The portfolio/codebase is the canonical source for candidate claims. The job description is the canonical source for job requirements.

**No Hallucination**: RoleForge never invents experience, skills, achievements, or metrics.

## System Overview

```
Portfolio Repository
        ↓
Repository Analyzer
        ↓
Evidence Extractor
        ↓
Candidate Knowledge Base
        ↓
Job Description
        ↓
Job Normalizer
        ↓
Requirement Matcher
        ↓
Fit / Gap Analysis
        ↓
Application Strategy
        ↓
LaTeX Generator
        ↓
PDF Compiler
        ↓
Truth Auditor
        ↓
Application Snapshot
```

## Components

### Analyzers (`skill/analyzers/`)

- **repository-analyzer.ts**: Analyzes repository structure, languages, frameworks, tools
- **evidence-extractor.ts**: Extracts candidate evidence from repository analysis
- **candidate-builder.ts**: Builds normalized candidate profile from evidence
- **job-normalizer.ts**: Normalizes job descriptions into structured representations

### Matchers (`skill/matchers/`)

- **requirement-matcher.ts**: Maps candidate evidence to job requirements

### Generators (`skill/generators/`)

- **latex-generator.ts**: Generates LaTeX source for resumes and CVs

### Validators (`skill/validators/`)

- **pdf-validator.ts**: Validates compiled PDFs for errors
- **truth-auditor.ts**: Audits generated documents against evidence

### Discovery (`skill/discovery/`)

- **job-discovery.ts**: Discovers related job opportunities

### Workflow (`skill/workflow/`)

- **pipeline.ts**: Orchestrates the complete RoleForge pipeline

## Data Models

### Schemas (`schemas/`)

- **candidate.schema.json**: Normalized candidate profile
- **evidence.schema.json**: Individual evidence items with provenance
- **job.schema.json**: Normalized job description
- **match.schema.json**: Evidence-to-requirement mapping
- **strategy.schema.json**: Application generation strategy
- **truth-audit.schema.json**: Truth audit results
- **opportunity.schema.json**: Related job opportunities

### Examples (`examples/`)

- **candidate.example.json**: Example candidate profile
- **job.example.json**: Example job description
- **evidence-map.example.json**: Example evidence mapping
- **truth-audit.example.json**: Example truth audit

## CLI Tooling

### Validation CLI (`bin/roleforge.mjs`)

Validate JSON artifacts against schemas:

```bash
node bin/roleforge.mjs validate candidate candidate.json
node bin/roleforge.mjs validate job job.json
node bin/roleforge.mjs validate truth-audit audit.json
```

## Evidence Confidence Levels

- **DIRECT**: Explicitly stated in source material
- **SUPPORTED**: Multiple independent evidence sources
- **INFERRED**: Reasonable technical inference
- **WEAKLY_INFERRED**: Possible but insufficiently established
- **UNSUPPORTED**: No evidence exists

## Match Levels

- **DIRECT_MATCH**: Direct evidence matches requirement
- **SUPPORTED_MATCH**: Strong supporting evidence
- **TRANSFERABLE_MATCH**: Related skills can transfer
- **PARTIAL_MATCH**: Some evidence but gaps exist
- **NO_EVIDENCE**: No supporting evidence
- **CONTRADICTED**: Evidence contradicts requirement

## Output Structure

```
applications/
└── company/
    └── role/
        ├── candidate.json
        ├── job.json
        ├── evidence-map.json
        ├── fit-analysis.json
        ├── strategy.json
        ├── resume.tex
        ├── resume.pdf
        ├── cv.tex (if applicable)
        ├── cv.pdf (if applicable)
        ├── truth-audit.json
        └── generation-report.md
```

## Privacy Model

- No uploads to third-party services without explicit authorization
- No logging of private source code, secrets, or personal identifiers
- Candidate repository remains canonical source for claims
- Web retrieval only for job information and opportunity discovery
- Respect robots/access restrictions
- Do not bypass authentication or CAPTCHAs
