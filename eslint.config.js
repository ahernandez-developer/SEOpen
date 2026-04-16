// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/*.d.ts',
      '**/*.tsbuildinfo',
      'coverage/**',
      '.claude-crap/**',
      'node_modules/**',
      'fixtures/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    // TS-aware rules apply only to source / test TypeScript files.
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // We require explicit return types on exported API for readability.
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Allow unused args that start with `_`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Consistent type imports keep declaration emit clean.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    // Disable type-checked rules on plain JS files (the ESLint config itself).
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Tests use node:test; its describe/it return promises we do not await,
    // and some strict-typing rules are not helpful at the test boundary.
    files: ['**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  prettier,
);
