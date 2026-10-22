#!/usr/bin/env node
// scripts/fsd-check.mjs — точка входа. Всё лежит в scripts/: рядом движок
// fsd/ и настройка проекта fsd.config.mjs. Запускать из корня проекта.
//
//   node scripts/fsd-check.mjs              # проверить ./src
//   node scripts/fsd-check.mjs --rules      # список правил
//   node scripts/fsd-check.mjs --json       # отчёт для CI
//
// package.json:
//   "scripts": { "fsd": "node scripts/fsd-check.mjs", "fsd:ci": "node scripts/fsd-check.mjs --json" }

import { run } from "./fsd/index.mjs";

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error) {
  console.error(`\nfsd-check: ${error.message}\n`);
  process.exitCode = 2;
}
