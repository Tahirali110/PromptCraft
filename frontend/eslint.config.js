const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'dist/**',
      'build/**',
      '*.config.js',
    ],
  },
  ...compat.extends('expo', 'prettier'),
  {
    rules: {
      // Add any custom rules here
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    },
  },
];
