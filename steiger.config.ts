import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: ['./src/_pages/**'],
    rules: {
      'fsd/typo-in-layer-name': 'off',
    },
  },
  {
    files: ['./src/_app/**'],
    rules: {
      'fsd/typo-in-layer-name': 'off',
      'fsd/no-segmentless-slices': 'off',
    },
  },
]);
