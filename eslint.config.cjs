const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');
const ts = require('@typescript-eslint/eslint-plugin');
const globals = require('globals');

module.exports = defineConfig([
  // Legacy ESLint ignored dotfiles and dot-directories by default.
  { ignores: ['**/.*'] },
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, ...ts.configs['flat/recommended']],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // ES2022 adds no global names beyond ES2021 in globals 13.x.
      globals: { ...globals.browser, ...globals.es2021, ...globals.webextensions }
    },
    rules: {
      // Preserve ESLint 8 recommended coverage, including constant while loops.
      'no-constant-condition': ['error', { checkLoops: 'all' }],
      'no-extra-semi': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-inner-declarations': ['error', 'functions', { blockScopedFunctions: 'disallow' }]
    }
  }
]);
