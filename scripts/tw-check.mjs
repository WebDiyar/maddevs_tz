import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'src/_app/styles/globals.css');
const SOURCES = ['src', 'app'];
const EXTENSIONS = new Set(['.ts', '.tsx']);
const IGNORED = new Set(['node_modules', '.next', 'out', 'build']);

const COLOR = {
  bold: '\u001b[1m',
  dim: '\u001b[90m',
  yellow: '\u001b[33m',
  green: '\u001b[32m',
  reset: '\u001b[0m',
};
const FIX = process.argv.includes('--fix');

// пакеты вроде tw-animate-css и shadcn отдают CSS через условие "style" в exports
const resolveStyleExport = (id) => {
  const parts = id.split('/');
  const name = id.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const subpath = `.${id.slice(name.length)}`;
  const pkgDir = path.join(ROOT, 'node_modules', name);
  const pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const entry = pkg.exports?.[subpath];
  const target =
    typeof entry === 'string' ? entry : (entry?.style ?? (subpath === '.' && pkg.style));
  return target ? path.join(pkgDir, target) : null;
};

const resolveStylesheet = (id, base) => {
  const candidates = id.startsWith('.')
    ? [path.resolve(base, id)]
    : [`${id}/index.css`, id].map((name) => {
        try {
          return require.resolve(name, { paths: [base, ROOT] });
        } catch {
          return null;
        }
      });
  if (!id.startsWith('.')) {
    try {
      candidates.push(resolveStyleExport(id));
    } catch {
      candidates.push(null);
    }
  }
  const file = candidates.find(
    (name) => name && name.endsWith('.css') && statSync(name, { throwIfNoEntry: false }),
  );
  if (!file) throw new Error(`не найден стиль ${id} (из ${base})`);
  return { base: path.dirname(file), content: readFileSync(file, 'utf8'), path: file };
};

const collectFiles = (dir, acc = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, acc);
    else if (EXTENSIONS.has(path.extname(entry.name))) acc.push(full);
  }
  return acc;
};

const collectCandidates = (text) => {
  const found = [];
  const strings = /(['"`])((?:[^\\\n]|\\.)*?)\1/g;
  for (const match of text.matchAll(strings)) {
    const value = match[2];
    if (!value || value.includes('${') || !/[a-z]/.test(value)) continue;
    const offset = match.index + 1;
    let cursor = 0;
    for (const part of value.split(/(\s+)/)) {
      if (part.trim()) found.push({ candidate: part, index: offset + cursor });
      cursor += part.length;
    }
  }
  return found;
};

const positionOf = (text, index) => {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  return { line, column: index - (before.lastIndexOf('\n') + 1) + 1 };
};

const { __unstable__loadDesignSystem } = await import('tailwindcss');
const design = await __unstable__loadDesignSystem(readFileSync(ENTRY, 'utf8'), {
  base: path.dirname(ENTRY),
  loadStylesheet: async (id, base) => resolveStylesheet(id, base),
  loadModule: async () => ({ base: ROOT, module: {} }),
});

const canonicalCache = new Map();
const canonicalOf = (name) => {
  if (!canonicalCache.has(name)) {
    const [css] = design.candidatesToCss([name]);
    const [canonical] = design.canonicalizeCandidates([name], { rem: 16 });
    canonicalCache.set(name, css && canonical && canonical !== name ? canonical : null);
  }
  return canonicalCache.get(name);
};

const files = SOURCES.flatMap((dir) => collectFiles(path.join(ROOT, dir)));
const findings = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const { candidate, index } of collectCandidates(text)) {
    const canonical = canonicalOf(candidate);
    if (canonical)
      findings.push({ file, index, ...positionOf(text, index), from: candidate, to: canonical });
  }
}

const relative = (file) => path.relative(ROOT, file);
console.log(
  `\n${COLOR.bold}Tailwind check${COLOR.reset} ${COLOR.dim}· ${files.length} файлов · канонический вид классов${COLOR.reset}\n`,
);

if (!findings.length) {
  console.log(`${COLOR.green}Нарушений не найдено.${COLOR.reset}\n`);
  process.exit(0);
}

if (FIX) {
  const byFile = new Map();
  for (const finding of findings) {
    if (!byFile.has(finding.file)) byFile.set(finding.file, []);
    byFile.get(finding.file).push(finding);
  }
  for (const [file, items] of byFile) {
    let text = readFileSync(file, 'utf8');
    for (const item of [...items].sort((a, b) => b.index - a.index)) {
      text = text.slice(0, item.index) + item.to + text.slice(item.index + item.from.length);
    }
    writeFileSync(file, text);
  }
  console.log(
    `${COLOR.green}Исправлено: ${findings.length} в ${byFile.size} файлах.${COLOR.reset}\n`,
  );
  process.exit(0);
}

let current = '';
for (const finding of findings) {
  if (finding.file !== current) {
    current = finding.file;
    console.log(relative(current));
  }
  console.log(
    `  ${COLOR.yellow}warn${COLOR.reset}  класс \`${finding.from}\` пишется как \`${finding.to}\`` +
      ` ${COLOR.dim}:${finding.line}:${finding.column} [canonical-classes]${COLOR.reset}`,
  );
}
console.log(
  `\n${findings.length} warn ${COLOR.dim}· исправить: npm run lint:tw:fix${COLOR.reset}\n`,
);
process.exit(1);
