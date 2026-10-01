#!/usr/bin/env node

/**
 * Validation Tests
 * Tests schema validation for all RoleForge data models
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHEMAS_DIR = join(__dirname, '../schemas');
const EXAMPLES_DIR = join(__dirname, '../examples');

const TESTS = [
  {
    name: 'Candidate Schema Validation',
    schema: join(SCHEMAS_DIR, 'candidate.schema.json'),
    example: join(EXAMPLES_DIR, 'candidate.example.json'),
  },
  {
    name: 'Job Schema Validation',
    schema: join(SCHEMAS_DIR, 'job.schema.json'),
    example: join(EXAMPLES_DIR, 'job.example.json'),
  },
  {
    name: 'Evidence Map Schema Validation',
    schema: join(SCHEMAS_DIR, 'match.schema.json'),
    example: join(EXAMPLES_DIR, 'evidence-map.example.json'),
  },
  {
    name: 'Truth Audit Schema Validation',
    schema: join(SCHEMAS_DIR, 'truth-audit.schema.json'),
    example: join(EXAMPLES_DIR, 'truth-audit.example.json'),
  },
];

function validateSchema(schema, data) {
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

  return errors;
}

async function runTests() {
  console.log('Running RoleForge Validation Tests\n');
  
  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
    console.log(`Testing: ${test.name}`);
    
    try {
      const schema = JSON.parse(readFileSync(test.schema, 'utf-8'));
      const data = JSON.parse(readFileSync(test.example, 'utf-8'));
      
      const errors = validateSchema(schema, data);
      
      if (errors.length === 0) {
        console.log(`✓ PASSED\n`);
        passed++;
      } else {
        console.log(`✗ FAILED`);
        for (const error of errors) {
          console.log(`  - ${error}`);
        }
        console.log();
        failed++;
      }
    } catch (error) {
      console.log(`✗ FAILED: ${error.message}\n`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
