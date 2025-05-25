#!/usr/bin/env node
const { spawnSync } = require('child_process');

// Collect file arguments after 'npm run test --'
const files = process.argv.slice(2);
// If no specific file passed, test all specs
const patterns = files.length ? files : ['tests/**/*.spec.ts'];

// Build mocha arguments
const mochaArgs = ['-r', 'ts-node/register', ...patterns];

// Spawn mocha
const result = spawnSync('mocha', mochaArgs, { stdio: 'inherit', shell: true });
process.exit(result.status);
