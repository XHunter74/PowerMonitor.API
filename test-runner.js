#!/usr/bin/env node
const { spawnSync } = require('child_process');

// Collect file arguments after 'npm run test --'
const files = process.argv.slice(2);
// If no specific file passed, test all specs
const patterns = files.length ? files : ['tests/**/*.spec.ts'];

// Build mocha arguments. Patterns are quoted so the shell (spawned via shell: true
// below) passes them through unexpanded instead of glob-expanding them itself -
// POSIX sh doesn't support "**" recursive globs, which silently dropped spec files
// nested more than one directory below tests/ on Linux. Mocha does its own (correct)
// recursive glob resolution once it receives the literal pattern.
const mochaArgs = ['-r', 'ts-node/register', ...patterns.map((p) => `"${p}"`)];

// Spawn mocha
const result = spawnSync('mocha', mochaArgs, { stdio: 'inherit', shell: true });
process.exit(result.status);
