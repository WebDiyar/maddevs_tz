// scripts/fsd/index.mjs
// Оркестрация: разбор аргументов → конфиг → скан проекта → правила → отчёт → exit code.

import { loadUserConfig, resolveConfig } from "./config.mjs";
import { scanProject } from "./project.mjs";
import { selectRules, rules as allRules } from "./rules/index.mjs";
import { printReport, color } from "./report.mjs";

const HELP = `
${color.bold("fsd-check")} — проверка архитектуры Feature-Sliced Design (правила из FSD.md)

  node fsd-check.mjs [путь-к-src] [опции]

Опции
  --preset <next|react>   Набор слоёв. По умолчанию определяется автоматически
  --config <файл>         Путь к fsd.config.mjs
  --no-conventions        Только официальная методология, без правил «[конвенция команды]»
  --rules                 Показать список правил и выйти
  --json                  Машиночитаемый вывод для CI
  --quiet                 Не печатать подсказки «как чинить»
  --max-warnings <n>      Падать, если предупреждений больше n (по умолчанию не падать)
  -h, --help              Эта справка

Примеры
  node fsd-check.mjs                       # проверить ./src
  node fsd-check.mjs src --preset next     # явный пресет
  node fsd-check.mjs --json > fsd.json     # отчёт для CI
`;

export function parseArgs(argv) {
  const options = { json: false, help: false, listRules: false, maxWarnings: Infinity, verbose: true };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--quiet":
        options.verbose = false;
        break;
      case "--rules":
        options.listRules = true;
        break;
      case "--no-conventions":
        options.conventions = false;
        break;
      case "--preset":
        options.preset = argv[index + 1];
        index += 1;
        break;
      case "--config":
        options.config = argv[index + 1];
        index += 1;
        break;
      case "--max-warnings":
        options.maxWarnings = Number(argv[index + 1]);
        index += 1;
        break;
      default:
        if (arg.startsWith("-")) throw new Error(`Неизвестная опция: ${arg}`);
        options.root = arg;
    }
  }

  return options;
}

function listRules() {
  console.log("");
  console.log(color.bold("Правила чекера"));
  console.log("");
  for (const rule of allRules) {
    const badge = rule.convention ? color.cyan(" [конвенция команды]") : "";
    console.log(`  ${color.bold(rule.name.padEnd(32))} ${rule.severity.padEnd(5)} ${color.gray(`FSD.md ${rule.docs}`)}`);
    console.log(`  ${" ".repeat(32)} ${rule.description}${badge}`);
  }
  console.log("");
  console.log(color.gray("Отключить правило: rules: { 'имя-правила': 'off' } в fsd.config.mjs"));
  console.log("");
}


/**
 * Один и тот же импорт нарушает сразу несколько правил (импорт «вверх» — это заодно и обход
 * публичного API, и относительный путь наружу). Оставляем самое содержательное сообщение,
 * чтобы отчёт не превращался в три строки об одной проблеме.
 */
const OVERLAPPING = [
  ["forbidden-imports", ["no-public-api-sidestep", "no-relative-cross-slice", "no-layer-root-import"]],
  ["no-public-api-sidestep", ["no-relative-cross-slice"]],
  ["hybrid-slice-group", ["group-has-code"]],
];

export function dropOverlapping(diagnostics) {
  const dominant = new Map();
  for (const diagnostic of diagnostics) {
    if (diagnostic.line === undefined) continue;
    const key = `${diagnostic.file}:${diagnostic.line}`;
    if (!dominant.has(key)) dominant.set(key, new Set());
    dominant.get(key).add(diagnostic.rule);
  }

  return diagnostics.filter((diagnostic) => {
    if (diagnostic.line === undefined) return true;
    const rulesAtPosition = dominant.get(`${diagnostic.file}:${diagnostic.line}`);
    return !OVERLAPPING.some(
      ([winner, suppressed]) => rulesAtPosition.has(winner) && suppressed.includes(diagnostic.rule),
    );
  });
}

export async function run(argv, cwd = process.cwd()) {
  const options = parseArgs(argv);

  if (options.help) {
    console.log(HELP);
    return 0;
  }
  if (options.listRules) {
    listRules();
    return 0;
  }

  const { config: userConfig, path: configPath } = await loadUserConfig(cwd, options.config);
  const config = resolveConfig(userConfig, options, cwd);
  const project = scanProject(config);
  const rules = selectRules(config);

  const diagnostics = [];
  for (const rule of rules) {
    let found = [];
    try {
      found = rule.check(project) ?? [];
    } catch (error) {
      diagnostics.push({
        rule: rule.name,
        severity: "warn",
        message: `правило упало: ${error.message}`,
        file: "(чекер)",
        docs: rule.docs,
      });
      continue;
    }

    const severity = config.rules[rule.name] ?? rule.severity;
    for (const diagnostic of found) {
      diagnostics.push({
        ...diagnostic,
        rule: rule.name,
        docs: rule.docs,
        // severity правила можно переопределить конфигом, а конкретной находке — поднять самой.
        severity: config.rules[rule.name] ?? diagnostic.severity ?? severity,
      });
    }
  }

  const deduplicated = dropOverlapping(diagnostics);

  const stats = {
    files: project.files.length,
    slices: project.slices.length,
    groups: project.groups.length,
    layers: project.layers.size,
    rules: rules.length,
    configPath,
  };

  printReport(deduplicated, { config, stats, options });

  const errors = deduplicated.filter((diagnostic) => diagnostic.severity === "error").length;
  const warnings = deduplicated.filter((diagnostic) => diagnostic.severity === "warn").length;

  if (errors > 0) return 1;
  if (warnings > options.maxWarnings) return 1;
  return 0;
}
