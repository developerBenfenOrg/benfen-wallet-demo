import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      'plugin:prettier/recommended',
      'plugin:import/recommended',
      'plugin:import/typescript',
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      prettier: prettier,
      'unused-imports': unusedImports,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'import/order': [
        'warn',
        {
          groups: [['builtin', 'external'], ['internal', 'parent', 'sibling', 'index'], 'type'],
          pathGroups: [
            {
              pattern: '{.,..}/**/*.css',
              group: 'type',
              position: 'after',
            },
            {
              pattern: '~/**',
              group: 'internal',
            },
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
          warnOnUnassignedImports: true,
        },
      ],
      'import/no-duplicates': ['error'],
    },
  },
);
