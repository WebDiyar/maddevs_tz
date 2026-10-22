// scripts/fsd/report.mjs
// Вывод результатов: человекочитаемый отчёт, JSON для CI и сводка по правилам.

const useColor = process.env.NO_COLOR === undefined && process.env.TERM !== "dumb";

const paint = (code) => (text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : String(text));

export const color = {
  red: paint(31),
  yellow: paint(33),
  green: paint(32),
  gray: paint(90),
  cyan: paint(36),
  bold: paint(1),
  underline: paint(4),
};

const SEVERITY_LABEL = {
  error: color.red("error"),
  warn: color.yellow("warn "),
};

function groupByFile(diagnostics) {
  const grouped = new Map();
  for (const diagnostic of diagnostics) {
    const key = diagnostic.file ?? "(проект)";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(diagnostic);
  }
  for (const list of grouped.values()) {
    list.sort((left, right) => (left.line ?? 0) - (right.line ?? 0));
  }
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
}

export function printReport(diagnostics, { config, stats, options }) {
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          preset: config.preset,
          root: config.root,
          conventions: config.conventions,
          stats,
          diagnostics: diagnostics.map(({ rule, severity, message, file, line, docs, hint }) => ({
            rule,
            severity,
            message,
            file,
            line,
            docs,
            hint,
          })),
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warn");

  console.log("");
  console.log(
    `${color.bold("FSD check")} ${color.gray(`· пресет ${config.preset} · корень ${config.root} · конвенции команды: ${config.conventions ? "вкл" : "выкл"}`)}`,
  );
  console.log(
    color.gray(
      `${stats.files} файлов · ${stats.slices} слайсов · ${stats.groups} групп · ${stats.layers} слоёв · ${stats.rules} правил`,
    ),
  );
  console.log("");

  if (diagnostics.length === 0) {
    console.log(color.green("Нарушений не найдено."));
    console.log("");
    return;
  }

  for (const [file, list] of groupByFile(diagnostics)) {
    console.log(color.underline(file));
    for (const diagnostic of list) {
      const position = diagnostic.line ? color.gray(`:${diagnostic.line}`) : "";
      console.log(
        `  ${SEVERITY_LABEL[diagnostic.severity]} ${diagnostic.message}${position} ${color.gray(`[${diagnostic.rule}${diagnostic.docs ? ` · FSD.md ${diagnostic.docs}` : ""}]`)}`,
      );
      if (diagnostic.hint && options.verbose !== false) {
        console.log(`         ${color.cyan("→")} ${diagnostic.hint}`);
      }
    }
    console.log("");
  }

  const byRule = new Map();
  for (const diagnostic of diagnostics) {
    byRule.set(diagnostic.rule, (byRule.get(diagnostic.rule) ?? 0) + 1);
  }
  const top = [...byRule.entries()].sort(([, left], [, right]) => right - left).slice(0, 8);

  console.log(color.bold("Сводка по правилам"));
  for (const [rule, count] of top) {
    console.log(`  ${String(count).padStart(4)}  ${rule}`);
  }
  console.log("");
  console.log(
    `${errors.length > 0 ? color.red(`${errors.length} error`) : color.green("0 error")} · ${
      warnings.length > 0 ? color.yellow(`${warnings.length} warn`) : "0 warn"
    }`,
  );
  console.log("");
}
