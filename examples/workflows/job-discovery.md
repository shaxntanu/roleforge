# Example Workflow: Related Job Discovery

This example demonstrates how to use RoleForge to discover related job opportunities.

## Input

**Portfolio Repository**: `/path/to/portfolio`

**Current Job**: Embedded Systems Engineer at TechCorp

## Agent Command

```
Find related embedded systems roles that can reuse my existing resume family
based on my portfolio at /path/to/portfolio
```

## Expected Output

RoleForge will:

1. **Analyze candidate evidence**
   - Identify strong domains: Embedded Systems, Web Development
   - Extract skills: C++, Python, React, ESP32, IoT
   - Identify projects: IoT Weather Station, Task Management App

2. **Determine role family**
   - Primary: Embedded Systems
   - Secondary: Web Development
   - Transferable: Firmware, IoT

3. **Search for related jobs**
   - Search by skills: C++, Embedded Systems, IoT
   - Search by domain: Embedded Systems, Firmware
   - Search by role family: Embedded Systems

4. **Cluster discovered jobs**
   ```
   Embedded / Firmware Cluster:
   - Embedded Systems Engineer
   - Firmware Engineer
   - Embedded Software Engineer
   - IoT Engineer
   - Microcontroller Engineer
   ```

5. **Identify resume families**
   - Embedded Resume Family (high reuse)
   - Web Resume Family (medium reuse)

6. **Analyze each discovered job**

   **Job 1: Firmware Engineer at Company A**
   - Evidence overlap: High (85%)
   - Resume reuse: High (90%)
   - Missing: FreeRTOS experience
   - Tailoring effort: Low
   - Application effort: Low

   **Job 2: IoT Engineer at Company B**
   - Evidence overlap: High (80%)
   - Resume reuse: High (88%)
   - Missing: Cloud platform experience
   - Tailoring effort: Low
   - Application effort: Low

   **Job 3: Embedded Software Engineer at Company C**
   - Evidence overlap: Medium (65%)
   - Resume reuse: Medium (75%)
   - Missing: ARM Cortex-M experience
   - Tailoring effort: Medium
   - Application effort: Medium

7. **Generate discovery report**
   ```yaml
   discovered_jobs:
     - title: Firmware Engineer
       company: Company A
       evidence_overlap: 0.85
       resume_family: embedded
       missing_requirements:
         - FreeRTOS
       required_tailoring: low
       application_effort: low
       reason: Strong match on C++ and embedded projects
   ```

8. **Company-level discovery**
   - Search for other roles at Company A
   - Identify: Firmware Engineer, IoT Engineer, Electronics Engineer
   - Filter by evidence support

## Output Files

- `related-jobs.yaml` - Discovered opportunities with analysis
- `resume-families.yaml` - Identified resume families
- `career-map.md` - Career direction analysis

## Key Features Demonstrated

- Skill-based job discovery
- Role family identification
- Job clustering
- Resume family analysis
- Effort estimation
- Company-level discovery
- Career mapping
