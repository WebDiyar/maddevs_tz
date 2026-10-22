// scripts/fsd/rules/index.mjs
// Реестр правил. Порядок здесь = порядок разделов FSD.md.
//
// Правило = { name, docs, severity, description, convention?, check(project) → diagnostics[] }.
// diagnostic = { file, line?, message, hint?, severity? } — severity переопределяет severity правила.
//
// Чтобы добавить своё правило: положи файл рядом и допиши импорт в список ниже.

import layers from "./layers.mjs";
import publicApi from "./public-api.mjs";
import importLocality from "./import-locality.mjs";
import segments from "./segments.mjs";
import sliceGroups from "./slice-groups.mjs";
import crossImports from "./cross-imports.mjs";
import sliceUsage from "./slice-usage.mjs";
import shared from "./shared.mjs";
import dataFlow from "./data-flow.mjs";
import thinComponents from "./thin-components.mjs";
import naming from "./naming.mjs";
import next from "./next.mjs";

export const rules = [
  ...layers, // §0, §3 — слои и главное правило импортов
  ...publicApi, // §6 — публичный API слайса
  ...importLocality, // §6, §9 — относительные/абсолютные импорты
  ...segments, // §5 — сегменты
  ...sliceGroups, // §4.1, §4.2 — группы слайсов и гибриды
  ...crossImports, // §5.3, §6, §13 — @x
  ...sliceUsage, // §12, §13 — одноразовые и мёртвые слайсы
  ...shared, // §14 — фундамент
  ...dataFlow, // §9 — серверное состояние и ошибки [конвенция команды]
  ...thinComponents, // §7 — тонкий компонент [конвенция команды]
  ...naming, // §9 — именование [конвенция команды]
  ...next, // §3 — стык с Next.js
];

export function selectRules(config) {
  return rules.filter((rule) => {
    if (config.rules[rule.name] === "off") return false;
    if (rule.convention && !config.conventions) return false;
    return true;
  });
}
