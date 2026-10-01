# Example Workflow: CV Generation

This example demonstrates when and how RoleForge generates a CV.

## Input

**Portfolio Repository**: `/path/to/portfolio` (research-focused)

**Job**: Research Scientist at AI Research Lab

## Agent Command

```
Generate a resume and CV from my portfolio at /path/to/portfolio
for the research scientist role at this URL: https://airesearch.com/careers/research-scientist
```

## Expected Behavior

### CV Generation Criteria

RoleForge checks for sufficient CV evidence:
- Research details ✓
- Publications ✓
- Academic history ✓
- Presentations ✓
- Certifications ✓

### CV Status

Since sufficient evidence exists:
```yaml
cv_status: SUFFICIENT
```

### Resume Generation

1. Generate resume using academic-cv template
2. Emphasize research projects and publications
3. Include academic background prominently
4. Highlight research skills and methodologies

### CV Generation

1. Generate CV using research-cv template
2. Include all publications with full citations
3. Add research experience with detailed descriptions
4. Include academic presentations and talks
5. Add teaching experience (if present)
6. Include grants and awards (if present)
7. Add service and committee work (if present)

### Output Structure

```
applications/
└── airesearch/
    └── research-scientist/
        ├── job-description.md
        ├── job-analysis.yaml
        ├── evidence-map.yaml
        ├── resume.tex
        ├── resume.pdf
        ├── cv.tex
        ├── cv.pdf
        └── generation-report.md
```

## Insufficient Evidence Example

If the portfolio lacks research evidence:

### CV Status

```yaml
cv_status: INSUFFICIENT_INFORMATION
missing:
  - research details
  - publications
  - academic history
```

### Behavior

RoleForge will:
1. Generate resume only
2. Report CV status as insufficient
3. List missing evidence types
4. Suggest adding research artifacts to portfolio

## Key Features Demonstrated

- CV generation criteria
- Evidence sufficiency checking
- Academic vs resume differentiation
- Research-focused content selection
- Publication formatting
- Academic experience inclusion
