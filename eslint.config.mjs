import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import betterTailwind from 'eslint-plugin-better-tailwindcss';

const sliceInternals = {
  group: ['@/_pages/*/**', '@/features/*/**', '@/entities/*/**', '!@/entities/*/@x/*'],
  message: 'FSD §6: чужой слайс импортируется только через его index.ts — @/{слой}/{слайс}.',
};

const sharedUiInternals = {
  group: ['@/shared/ui/*/*'],
  message: 'FSD §6: shared/ui импортируется через публичный API компонента — @/shared/ui/Button.',
};

const upwardImports = (layers) => ({
  group: layers.map((layer) => `${layer}/**`),
  message: 'FSD §3: импорт «вверх» по слоям запрещён — зависимости идут только вниз.',
});

const restrictedImports = (...extraPatterns) => [
  'error',
  { patterns: [sliceInternals, sharedUiInternals, ...extraPatterns] },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports(),
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports(
        upwardImports(['@/app', '@/_app', '@/_pages', '@/features', '@/entities']),
      ),
    },
  },
  {
    files: ['src/entities/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports(
        upwardImports(['@/app', '@/_app', '@/_pages', '@/features']),
      ),
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports(upwardImports(['@/app', '@/_app', '@/_pages'])),
    },
  },
  {
    files: ['src/_pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports(upwardImports(['@/app', '@/_app'])),
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    plugins: { 'better-tailwindcss': betterTailwind },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'src/_app/styles/globals.css',
        callees: ['cn', 'clsx', 'cva', 'twMerge'],
      },
    },
    rules: {
      'better-tailwindcss/no-unknown-classes': 'error',
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-duplicate-classes': 'error',
      'better-tailwindcss/no-deprecated-classes': 'error',
      'better-tailwindcss/no-concatenated-classes': 'error',
      'better-tailwindcss/no-unnecessary-whitespace': 'error',
      'better-tailwindcss/enforce-consistent-variant-order': 'warn',
      'better-tailwindcss/enforce-shorthand-classes': 'warn',
    },
  },
  {
    files: ['src/shared/ui/**/*.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      'import/consistent-type-specifier-style': 'off',
      'better-tailwindcss/no-unknown-classes': ['error', { ignore: ['toaster'] }],
      'better-tailwindcss/enforce-consistent-variant-order': 'off',
      'better-tailwindcss/enforce-shorthand-classes': 'off',
    },
  },

  {
    files: ['scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'release/**',
    'build/**',
    'next-env.d.ts',
    'scripts/fsd/**',
    'scripts/fsd-check.mjs',
  ]),
]);

export default eslintConfig;
