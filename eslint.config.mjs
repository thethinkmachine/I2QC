import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        THREE: 'readonly',
        MathJax: 'readonly',
        bellViz: 'writable', // Used in week2.html
      },
    },
    rules: {
      'no-unused-vars': 'off', // Defined in JS, used in HTML script tags
      'no-console': 'off',
      'no-undef': 'warn',
    },
  },
];
