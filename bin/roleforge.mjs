#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const require = createRequire(import.meta.url);

const SCHEMAS = {
  candidate: path.join(projectRoot, 'schemas/candidate.schema.json'),
  evidence: path.join(projectRoot, 'schemas/evidence.schema.json'),
  job: path.join(projectRoot, 'schemas/job.schema.json'),
  match: path.join(projectRoot, 'schemas/match.schema.json'),
  strategy: path.join(projectRoot, 'schemas/strategy.schema.json'),
  'truth-audit': path.join(projectRoot, 'schemas/truth-audit.schema.json'),
  opportunity: path.join(projectRoot, 'schemas/opportunity.schema.json'),
};

function printUsage() {
  console.log(`RoleForge — evidence-backed application compiler

Usage:
  roleforge validate <schema-type> <input-file>
  roleforge run <portfolio-path> <job-description-file> [options]
  roleforge run --text <portfolio-path> [options] < job-description.txt

Options:
  --text              Read the job description from stdin
  --job <file>        Read the job description from a local file
  --output <directory>  Save the application snapshot to this directory
  --include-cv        Generate a CV when portfolio evidence supports one
  --help              Show this help

Schema types: ${Object.keys(SCHEMAS).join(', ')}

Examples:
  node bin/roleforge.mjs validate candidate candidate.json
  node bin/roleforge.mjs run ./portfolio ./job-description.txt
  node bin/roleforge.mjs run --text ./portfolio < job-description.txt`);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function matchesType(value, type) {
  if (type === 'object') return isPlainObject(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'boolean') return typeof value === 'boolean';
  return true;
}

function validate(schemaType, inputFile) {
  const schemaPath = SCHEMAS[schemaType];
  if (!schemaPath) throw new Error(`Unknown schema type: ${schemaType}. Use one of: ${Object.keys(SCHEMAS).join(', ')}`);
  if (!existsSync(inputFile)) throw new Error(`Input file not found: ${inputFile}`);

  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const data = JSON.parse(readFileSync(inputFile, 'utf8'));
  if (!isPlainObject(data)) throw new Error('The input JSON must be an object.');

  const errors = [];
  for (const field of schema.required || []) {
    if (!Object.hasOwn(data, field)) errors.push(`Missing required field: ${field}`);
  }

  for (const [field, propertySchema] of Object.entries(schema.properties || {})) {
    if (!Object.hasOwn(data, field)) continue;
    const value = data[field];
    if (!matchesType(value, propertySchema.type)) {
      errors.push(`Field '${field}' should be ${propertySchema.type}`);
      continue;
    }
    if (propertySchema.enum && !propertySchema.enum.includes(value)) {
      errors.push(`Field '${field}' must be one of: ${propertySchema.enum.join(', ')}`);
    }
    if (typeof propertySchema.minimum === 'number' && value < propertySchema.minimum) {
      errors.push(`Field '${field}' must be at least ${propertySchema.minimum}`);
    }
    if (typeof propertySchema.maximum === 'number' && value > propertySchema.maximum) {
      errors.push(`Field '${field}' must be at most ${propertySchema.maximum}`);
    }
  }

  if (errors.length) {
    console.error(`Validation failed for ${inputFile}:`);
    for (const error of errors) console.error(`  - ${error}`);
    return false;
  }

  console.log(`✓ ${inputFile} passes the ${schemaType} schema's top-level checks`);
  return true;
}

function parseRunOptions(tokens) {
  let portfolioPath;
  let jobInput;
  let readJobFromStdin = false;
  let outputPath = path.resolve(process.cwd(), 'applications');
  let includeCV = false;

  let index = 0;
  if (tokens[index] === '--text') {
    readJobFromStdin = true;
    index += 1;
  }
  portfolioPath = tokens[index++];
  if (!portfolioPath) throw new Error('A portfolio path is required.');

  while (index < tokens.length) {
    const token = tokens[index++];
    if (token === '--help' || token === '-h') return { help: true };
    if (token === '--text') {
      readJobFromStdin = true;
      continue;
    }
    if (token === '--include-cv') {
      includeCV = true;
      continue;
    }
    if (token === '--output' || token === '--job') {
      const value = tokens[index++];
      if (!value) throw new Error(`Expected a value after ${token}.`);
      if (token === '--output') outputPath = path.resolve(value);
      else jobInput = value;
      continue;
    }
    if (token.startsWith('-')) throw new Error(`Unknown option: ${token}`);
    if (jobInput) throw new Error(`Unexpected argument: ${token}`);
    jobInput = token;
  }

  return { portfolioPath: path.resolve(portfolioPath), jobInput, readJobFromStdin, outputPath, includeCV };
}

async function readStdin() {
  if (process.stdin.isTTY) {
    throw new Error('No job text was piped to stdin. Pipe a file or use --job <file>.');
  }
  let content = '';
  for await (const chunk of process.stdin) content += chunk;
  return content;
}

async function run(tokens) {
  const options = parseRunOptions(tokens);
  if (options.help) {
    printUsage();
    return 0;
  }
  if (!existsSync(options.portfolioPath)) throw new Error(`Portfolio path not found: ${options.portfolioPath}`);

  let jobDescription = '';
  if (options.readJobFromStdin) {
    jobDescription = await readStdin();
  } else if (options.jobInput && /^https?:\/\//i.test(options.jobInput)) {
    throw new Error('The CLI does not fetch job URLs. Retrieve the posting with your agent, then pass its text using --text or save it to a local file with --job.');
  } else if (options.jobInput && existsSync(path.resolve(options.jobInput))) {
    jobDescription = readFileSync(path.resolve(options.jobInput), 'utf8');
  } else if (options.jobInput) {
    jobDescription = options.jobInput;
  } else {
    throw new Error('Provide a local job-description file or pass its text with --text.');
  }
  if (!jobDescription.trim()) throw new Error('The job description is empty.');

  const compiledPipeline = path.join(projectRoot, 'dist/skill/workflow/pipeline.js');
  if (!existsSync(compiledPipeline)) {
    throw new Error('The pipeline is not built yet. Run `npm run build` from the RoleForge repository, then retry.');
  }

  const { Pipeline } = require(compiledPipeline);
  const result = await new Pipeline().execute({
    repoPath: options.portfolioPath,
    jobDescription,
    outputPath: options.outputPath,
    options: { includeCV: options.includeCV },
  });

  console.log('\nApplication snapshot');
  console.log(`  Saved to: ${result.snapshotPath}`);
  console.log(`  Role: ${result.strategy.roleFamily}`);
  console.log(`  Template: ${result.strategy.template}`);
  console.log(`  Fit score: ${result.fitAnalysis.fitScore}% (${result.fitAnalysis.overallFit})`);
  console.log(`  Truth audit: ${result.auditReport.passed ? 'passed' : 'review required'} (${result.auditReport.summary.approvedBullets}/${result.auditReport.summary.totalBullets} claims approved)`);
  return result.auditReport.passed ? 0 : 2;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return 0;
  }

  if (args[0] === 'validate') {
    if (args.length !== 3) throw new Error('Usage: roleforge validate <schema-type> <input-file>');
    return validate(args[1], path.resolve(args[2])) ? 0 : 1;
  }
  if (args[0] === 'run') return run(args.slice(1));

  throw new Error(`Unknown command: ${args[0]}`);
}

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(`RoleForge: ${error.message}`);
  process.exitCode = 1;
});
