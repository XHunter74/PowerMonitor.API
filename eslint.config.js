// ESLint flat config (ESLint 10+). Replaces the legacy .eslintrc.js.
const tseslint = require('typescript-eslint');
const importPlugin = require('eslint-plugin-import-x');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const n = require('eslint-plugin-n');
const globals = require('globals');

module.exports = tseslint.config(
    // Patterns ignored by the linter (replaces .eslintignore)
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'coverage/**',
            '**/*.js',
            '**/*.json',
            '**/*.d.ts',
            'tests/**',
        ],
    },
    // TypeScript files under src/
    {
        files: ['src/**/*.ts'],
        extends: [
            ...tseslint.configs.recommended,
            ...tseslint.configs.recommendedTypeChecked,
            importPlugin.flatConfigs.recommended,
            importPlugin.flatConfigs.typescript,
            prettierRecommended,
        ],
        plugins: {
            n,
        },
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.json'],
                sourceType: 'module',
                ecmaVersion: 2020,
            },
            globals: {
                ...globals.node,
                ...globals.es2020,
            },
        },
        rules: {
            // Prettier formatting
            'prettier/prettier': ['error', { singleQuote: true, endOfLine: 'auto' }],
            'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],

            // TypeScript
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
            // allowAsImport restores v7 behavior: TypeScript `import x = require()` syntax is still permitted
            '@typescript-eslint/no-require-imports': ['error', { allowAsImport: true }],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',

            // Node (eslint-plugin-n replaces eslint-plugin-node)
            'n/no-unsupported-features/es-syntax': 'off',
            'n/no-missing-import': 'off',
            'n/no-unpublished-import': 'off',
            'n/no-extraneous-import': 'off',
            'n/no-missing-require': 'off',
            'n/no-unpublished-require': 'off',
            'n/no-extraneous-require': 'off',
            'n/no-unsupported-features/node-builtins': 'off',
        },
    },
);
