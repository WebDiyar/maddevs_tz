import { readdirSync } from 'node:fs';

const VENDOR_UI = readdirSync(new URL('../src/shared/ui', import.meta.url))
  .filter((name) => /^[a-z][a-z-]*\.tsx$/.test(name))
  .map((name) => `shared/ui/${name}`);

const config = {
  root: 'src',
  preset: 'next',
  routerDir: 'auto',
  alias: '@/',
  vendorUiPaths: VENDOR_UI,
  routerWrappers: ['Suspense', 'ErrorBoundary'],
  conventions: true,
  thresholds: {
    componentWarnLines: 250,
    componentErrorLines: 400,
    sliceGroupMinSlices: 3,
    maxSlicesPerLayer: 25,
  },
  ignore: [
    '**/node_modules/**',
    '**/.next/**',
    '**/*.d.ts',
    '**/*.test.*',
    '**/*.stories.*',
    '**/shared/model/use-mobile.ts',
    ...VENDOR_UI.map((file) => `**/${file}`),
  ],
  rules: {},
};

export default config;
