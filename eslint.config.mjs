import parser from '@typescript-eslint/parser';
export default [{
  files: ['{app,components,lib}/**/*.{ts,tsx}', 'proxy.ts', 'next.config.ts'],
  languageOptions: {parser},
  rules: {
    'for-direction': 'error',
    'no-async-promise-executor': 'error',
    'no-constant-binary-expression': 'error',
    'no-dupe-else-if': 'error',
    'no-duplicate-case': 'error',
    'no-fallthrough': 'error',
    'no-unreachable': 'error',
    'valid-typeof': 'error',
  },
}];
