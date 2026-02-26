// @ts-check
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import unusedImports from 'eslint-plugin-unused-imports'
import functional from 'eslint-plugin-functional/flat'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  functional.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.node, ...globals.vitest },
      parserOptions: { project: true, tsconfigRootDir: import.meta.dirname }
    },
    plugins: { 'unused-imports': unusedImports },
    rules: {
      // ─── Unused imports ──────────────────────────────────────────────
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }
      ],
      // ─── Type imports ────────────────────────────────────────────────
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' }
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      // ─── Functional strictness ───────────────────────────────────────
      'functional/no-let': 'error',
      'functional/immutable-data': 'error',
      'functional/no-throw-statements': 'error',
      'functional/no-try-statements': 'error',
      'functional/prefer-readonly-type': 'error',
      'functional/no-expression-statements': 'off',
      'functional/no-return-void': 'off'
    }
  },
  eslintConfigPrettier
)
