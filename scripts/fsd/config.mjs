// scripts/fsd/config.mjs
// Конфигурация чекера: пресеты слоёв, дефолты, severity правил, загрузка fsd.config.mjs.
// Всё, что здесь описано, — прямая проекция FSD.md (ссылка на раздел лежит в поле docs каждого правила).

import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

/**
 * Пресеты слоёв. Порядок = сверху вниз по ответственности (FSD.md §3).
 * Импортировать можно ТОЛЬКО строго ниже по этому списку.
 */
export const PRESETS = {
  react: {
    name: "react",
    layers: ["app", "processes", "pages", "widgets", "features", "entities", "shared"],
    appLayer: "app",
    pagesLayer: "pages",
  },
  next: {
    // Next.js занимает app/ и pages/ роутером — оба слоя FSD переименованы (FSD.md §3).
    name: "next",
    layers: ["_app", "processes", "_pages", "widgets", "features", "entities", "shared"],
    appLayer: "_app",
    pagesLayer: "_pages",
  },
};

/** Слои, у которых нет слайсов — только сегменты (FSD.md §3). */
export const SLICELESS = new Set(["app", "_app", "shared"]);

/** Слой deprecated целиком (FSD.md §0, §3). */
export const DEPRECATED_LAYERS = new Set(["processes"]);

/** Слой не рекомендуется для НОВОГО кода, но существующий остаётся валидным (FSD.md §0). */
export const DISCOURAGED_LAYERS = new Set(["widgets"]);

/** Канонические сегменты (FSD.md §5, §14). Свои заводить можно — проверяется только смысл имени. */
export const KNOWN_SEGMENTS = new Set([
  "ui",
  "api",
  "model",
  "lib",
  "config",
  "routes",
  "i18n",
  "db",
  "store",
  "styles",
  "entrypoint",
  "providers",
  "layout",
  "assets",
  "api-routes",
  "testing",
]);

/** Имена папок, описывающие ЭССЕНЦИЮ содержимого, а не назначение (FSD.md §5, §5.3). */
export const BAD_SEGMENT_NAMES = new Set([
  "components",
  "hooks",
  "types",
  "utils",
  "helpers",
  "common",
  "shared",
  "constants",
  "interfaces",
  "enums",
  "misc",
  "stuff",
  "core",
  "services",
]);

export const DEFAULT_CONFIG = {
  /** Корень FSD-кода относительно cwd. */
  root: "src",
  /** Пресет слоёв: "next" | "react" | null (автоопределение по наличию _pages/_app). */
  preset: null,
  /** Алиас на корень FSD (FSD.md §9). Основной + синонимы, которые тоже считаем абсолютными. */
  alias: "@/",
  aliases: ["@/", "~/", "src/"],
  /**
   * Пути стороннего UI-набора (shadcn/ui и подобное), относительно корня FSD.
   * Там свои соглашения об именах и структуре файлов: component-naming и
   * no-multiple-components-per-file эти пути пропускают.
   */
  vendorUiPaths: [],
  /** Каркасные обёртки, которых требует фреймворк: в роутере они не «разметка». */
  routerWrappers: ["Suspense", "ErrorBoundary"],
  /** Расширения, которые считаем исходниками. */
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"],
  /** Что не смотреть вообще. */
  ignore: [
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/build/**",
    "**/*.d.ts",
    "**/__mocks__/**",
    "**/__tests__/**",
    "**/*.test.*",
    "**/*.spec.*",
    "**/*.stories.*",
  ],
  /**
   * Правила из разделов «[конвенция команды]» FSD.md (§4.2, §5.2, §7, §9).
   * false — остаются только требования официальной методологии.
   */
  conventions: true,
  thresholds: {
    /** Размер файла компонента: мягкий и жёсткий триггер (FSD.md §7). */
    componentWarnLines: 250,
    componentErrorLines: 400,
    /** Меньше слайсов в группе — группа не оправдана (FSD.md §4.1). */
    sliceGroupMinSlices: 3,
    /** Слайсов в слое больше — это пере-нарезка (FSD.md §12, §16). */
    maxSlicesPerLayer: 25,
  },
  /**
   * Папка(и) роутера Next.js вне FSD-корня: там лежат только тонкие ре-экспорты.
   * Строка или массив. "auto" — определить по факту: берутся существующие app/ и pages/
   * (Next.js допускает оба роутера одновременно, дока требует переименования слоёв
   * в _app/_pages независимо от роутера — https://fsd.how/docs/guides/tech/with-nextjs).
   */
  routerDir: "auto",
  /** Переопределение severity: "error" | "warn" | "off". */
  rules: {},
};

/**
 * Папки роутера с указанием разновидности: у App Router файлы маршрутов называются
 * канонически (page/layout/route/...), у Pages Router — произвольно, маршрутом является
 * любой модуль в папке. Отсюда разный способ их искать (rules/next.mjs).
 */
export function resolveRouterDirs(routerDir, cwd) {
  const candidates =
    routerDir === "auto" || routerDir == null
      ? ["app", "pages"]
      : Array.isArray(routerDir)
        ? routerDir
        : [routerDir];

  const dirs = [];
  for (const dir of candidates) {
    const abs = path.resolve(cwd, dir);
    if (!fs.existsSync(abs)) continue;
    const base = path.basename(dir);
    dirs.push({ dir, abs, kind: base === "pages" ? "pages-router" : "app-router" });
  }
  return dirs;
}

const SEVERITIES = new Set(["error", "warn", "off"]);

/** Простейший glob в RegExp: поддержаны **, *, ?. Пути всегда с прямыми слэшами. */
export function globToRegExp(glob) {
  let out = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          out += "(?:.*/)?";
          i += 2;
        } else {
          out += ".*";
          i += 1;
        }
      } else {
        out += "[^/]*";
      }
      continue;
    }
    if (char === "?") {
      out += "[^/]";
      continue;
    }
    out += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

export function isIgnored(relPath, config) {
  return config.ignoreRe.some((re) => re.test(relPath));
}

/** Загружает fsd.config.mjs рядом с проектом, если он есть. */
export async function loadUserConfig(cwd, explicitPath) {
  const candidates = explicitPath
    ? [path.resolve(cwd, explicitPath)]
    : ["fsd.config.mjs", "fsd.config.js", "scripts/fsd.config.mjs"].map((file) => path.resolve(cwd, file));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const module = await import(pathToFileURL(candidate).href);
      return { config: module.default ?? module.config ?? {}, path: candidate };
    }
  }
  if (explicitPath) throw new Error(`Конфиг не найден: ${explicitPath}`);
  return { config: {}, path: null };
}

/** Автоопределение пресета по структуре папок. */
export function detectPreset(rootAbs) {
  const prefixed = fs.existsSync(path.join(rootAbs, "_pages")) || fs.existsSync(path.join(rootAbs, "_app"));
  return prefixed ? "next" : "react";
}

export function resolveConfig(userConfig, cliOptions, cwd) {
  const merged = {
    ...DEFAULT_CONFIG,
    ...userConfig,
    thresholds: { ...DEFAULT_CONFIG.thresholds, ...(userConfig.thresholds ?? {}) },
    rules: { ...DEFAULT_CONFIG.rules, ...(userConfig.rules ?? {}) },
  };

  if (cliOptions.root) merged.root = cliOptions.root;
  if (cliOptions.preset) merged.preset = cliOptions.preset;
  if (cliOptions.conventions === false) merged.conventions = false;

  merged.cwd = cwd;
  merged.rootAbs = path.resolve(cwd, merged.root);
  if (!fs.existsSync(merged.rootAbs)) {
    throw new Error(`Корень FSD не найден: ${merged.rootAbs} — передай путь аргументом или задай root в конфиге`);
  }

  const presetName = merged.preset ?? detectPreset(merged.rootAbs);
  const preset = PRESETS[presetName];
  if (!preset) {
    throw new Error(`Неизвестный пресет: ${presetName}. Доступны: ${Object.keys(PRESETS).join(", ")}`);
  }

  merged.preset = presetName;
  merged.layers = preset.layers;
  merged.appLayer = preset.appLayer;
  merged.pagesLayer = preset.pagesLayer;
  merged.layerIndex = new Map(preset.layers.map((layer, index) => [layer, index]));
  merged.routerDirs = resolveRouterDirs(merged.routerDir, cwd);
  merged.aliases = [merged.alias, ...merged.aliases.filter((alias) => alias !== merged.alias)];
  merged.ignoreRe = merged.ignore.map(globToRegExp);

  for (const [rule, severity] of Object.entries(merged.rules)) {
    if (!SEVERITIES.has(severity)) {
      throw new Error(`Неверная severity "${severity}" у правила "${rule}". Допустимо: error | warn | off`);
    }
  }

  return merged;
}
