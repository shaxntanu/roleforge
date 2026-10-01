# Example Workflow: Basic Resume Generation

This example demonstrates how to use RoleForge to generate a resume for a specific job.

## Input

**Portfolio Repository**: `/path/to/portfolio`

**Job URL**: `https://company.com/careers/software-engineer-123`

## Agent Command

```
Use RoleForge to generate a resume for this repository:
/path/to/portfolio

For this job:
https://company.com/careers/software-engineer-123
```

## Expected Output

RoleForge will:

1. **Analyze the repository**
   - Detect languages: TypeScript, Python, C++
   - Identify frameworks: React, Next.js
   - Extract projects from repository structure
   - Parse README files and package.json

2. **Extract candidate evidence**
   - Build candidate profile with confidence levels
   - Extract skills with provenance
   - Identify projects with technologies and outcomes
   - Record all evidence sources

3. **Acquire job description**
   - Fetch job description from provided URL
   - Verify source is official company page
   - Record source metadata

4. **Extract requirements**
   - Parse required skills: C++, Embedded Systems, Git
   - Parse preferred skills: Python
   - Parse nice-to-have: React
   - Extract experience requirements
   - Extract education requirements

5. **Match evidence to requirements**
   - C++: SUPPORTED (from embedded project)
   - Embedded Systems: INFERRED (from ESP32 project)
   - Git: DIRECT (from repository)
   - Python: DIRECT (from scripts)
   - React: DIRECT (from web projects)

6. **Generate fit analysis**
   - Strong matches: Git, Python, React
   - Partial matches: C++, Embedded Systems
   - Missing: Professional embedded experience
   - Overall fit: Good (75/100)

7. **Determine resume strategy**
   - Template: engineering-resume
   - Emphasize: C++, Embedded Systems, Python
   - Select projects: IoT Weather Station, Algorithm Visualizer
   - Deprioritize: Unrelated creative projects

8. **Generate LaTeX**
   - Load engineering-resume template
   - Build structured content
   - Assemble resume.tex

9. **Compile PDF**
   - Run pdflatex on resume.tex
   - Generate resume.pdf

10. **Validate PDF**
    - Check compilation: ✓
    - Check page count: ✓ (1 page)
    - Check overflow: ✓
    - Check links: ✓

11. **Perform truth audit**
    - Audit all bullets against evidence
    - Approval rate: 95%
    - No unsupported claims
    - Audit passed

12. **Package application**
    ```
    applications/
    └── techcorp/
        └── software-engineer/
            ├── job-description.md
            ├── job-analysis.yaml
            ├── evidence-map.yaml
            ├── resume.tex
            ├── resume.pdf
            └── generation-report.md
    ```

## Output Files

- `candidate/current/candidate.yaml` - Normalized candidate profile
- `applications/techcorp/software-engineer/resume.tex` - LaTeX source
- `applications/techcorp/software-engineer/resume.pdf` - Compiled resume
- `applications/techcorp/software-engineer/evidence-map.yaml` - Evidence mapping
- `applications/techcorp/software-engineer/job-analysis.yaml` - Fit analysis
- `applications/techcorp/software-engineer/generation-report.md` - Generation summary

## Key Features Demonstrated

- Repository analysis and evidence extraction
- Job description acquisition and verification
- Evidence-to-requirement matching
- Fit and gap analysis
- Resume strategy determination
- LaTeX generation and PDF compilation
- Truth audit and validation
- Application packaging
