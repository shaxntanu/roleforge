#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHEMAS = {
  candidate: join(__dirname, '../schemas/candidate.schema.json'),
  evidence: join(__dirname, '../schemas/evidence.schema.json'),
  job: join(__dirname, '../schemas/job.schema.json'),
  match: join(__dirname, '../schemas/match.schema.json'),
  strategy: join(__dirname, '../schemas/strategy.schema.json),
  'truth-audit': join(__dirname, '../schemas/truth-audit.schema.json'),
  opportunity: join(__dirname, '../schemas/opportunity.schema.json')
};

function printUsage() {
  console.log('RoleForge CLI');
  console.log('');
  console.log('Usage:');
  console.log('  node bin/roleforge.mjs validate <schema-type> <input-file>');
  console.log('');
  console.log('Schema types:');
  console.log('  candidate');
  console.log('  evidence');
  console.log('  job');
  console.log('  match');
  console.log('  strategy');
  console.log('  truth-audit');
  console.log('  opportunity');
  console.log('');
  console.log('Example:');
  console.log('  node bin/roleforge.mjs validate candidate candidate.json');
}

async function validate(schemaType, inputFile) {
  const schemaPath = SCHEMAS[schemaType];
  
  if (!schemaPath) {
    console.error(`Unknown schema type: ${schemaType}`);
    console.error(`Valid types: ${Object.keys(SCHEMAS).join(', ')}`);
    process.exit(1);
  }

  try {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    const data = JSON.parse(readFileSync(inputFile, 'utf-8'));

    // Basic structural validation
    const errors = [];
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check field types
    if (schema.properties) {
      for (const [field, propSchema] of Object.entries(schema.properties)) {
        if (field in data) {
          const value = data[field];
          const expectedType = propSchema.type;
          
          if (expectedType === 'array' && !Array.isArray(value)) {
            errors.push(`Field '${field}' should be an array`);
          } else if (expectedType === 'object' && typeof value !== 'object') {
            errors.push(`Field '${field}' should be an object`);
          } else if (expectedType === 'string' && typeof value !== 'string') {
            errors.push(`Field '${field}' should be a string`);
          } else if (expectedType === 'number' && typeof value !== 'number') {
            errors.push(`Field '${field}' should be a number`);
          } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
            errors.push(`Field '${field}' should be a boolean`);
          }
        }
      }
    }

    if (errors.length > 0) {
      console.error(`Validation failed for ${inputFile}:`);
      for (const error of errors) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }

    console.log(`✓ ${inputFile} validates against ${schemaType} schema`);
    process.exit(0);

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  printUsage();
  process.exit(0);
}

if (args[0] === 'validate') {
  if (args.length !== 3) {
    console.error('Usage: node bin/roleforge.mjs validate <schema-type> <input-file>');
    process.exit(1);
  }
  validate(args[1], args[2]);
} else {
  console.error(`Unknown command: ${args[0]}`);
  printUsage();
  process.exit(1);
}
