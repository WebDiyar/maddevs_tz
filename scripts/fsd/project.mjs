// scripts/fsd/project.mjs
// Сканер проекта: превращает файловое дерево в модель FSD.
//
// Модель отвечает на вопросы, которые задают правила:
//   - какой это слой / слайс / группа / сегмент (FSD.md §3, §4, §4.1, §5);
//   - есть ли у слайса публичный API и что он экспортирует (§6);
//   - куда указывает каждый импорт: свой слайс, чужой слайс, @x, внешний пакет (§6, §13).

import fs from "node:fs";
import path from "node:path";
import { SLICELESS, KNOWN_SEGMENTS, isIgnored } from "./config.mjs";

const INDEX_BASENAMES = new Set(["index", "index.server", "index.client"]);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function readDir(dirAbs) {
  return fs.readdirSync(dirAbs, { withFileTypes: true }).filter((entry) => !entry.name.startsWith("."));
}

function isSourceFile(name, config) {
  return config.extensions.includes(path.extname(name));
}

/** index.ts / index.server.ts / index.tsx … в корне папки. */
function findIndexFiles(dirAbs, config) {
  if (!fs.existsSync(dirAbs)) return [];
  return readDir(dirAbs)
    .filter((entry) => entry.isFile() && isSourceFile(entry.name, config))
    .map((entry) => entry.name)
    .filter((name) => INDEX_BASENAMES.has(name.slice(0, name.length - path.extname(name).length)));
}

/**
 * Папка внутри слоя — либо слайс, либо группа, третьего не дано (FSD.md §4.2).
 * Слайс узнаём по собственному публичному API или по наличию сегментов.
 */
function inspectFolder(dirAbs, config) {
  const entries = readDir(dirAbs);
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const files = entries.filter((entry) => entry.isFile() && isSourceFile(entry.name, config)).map((entry) => entry.name);
  const indexFiles = findIndexFiles(dirAbs, config);

  const segmentDirs = dirs.filter((name) => KNOWN_SEGMENTS.has(name) || name === "@x");
  const childrenWithOwnApi = dirs.filter((name) => findIndexFiles(path.join(dirAbs, name), config).length > 0);

  return { entries, dirs, files, indexFiles, segmentDirs, childrenWithOwnApi };
}

/** Рекурсивная классификация содержимого слоя: слайсы + группы слайсов. */
function classifyLayer(layerName, layerAbs, config) {
  const slices = [];
  const groups = [];

  const visit = (dirAbs, relParts, groupPath) => {
    const info = inspectFolder(dirAbs, config);
    const looksLikeSlice = info.indexFiles.length > 0 || info.segmentDirs.length > 0;
    const looksLikeGroup = info.childrenWithOwnApi.length > 0;

    if (looksLikeSlice) {
      slices.push({
        name: relParts.join("/"),
        shortName: relParts[relParts.length - 1],
        layer: layerName,
        group: groupPath,
        abs: dirAbs,
        rel: toPosix(path.relative(config.rootAbs, dirAbs)),
        indexFiles: info.indexFiles,
        segments: info.segmentDirs,
        rootFiles: info.files,
        looseDirs: info.dirs.filter((name) => !KNOWN_SEGMENTS.has(name) && name !== "@x"),
        // Папка одновременно со своим API и с вложенными слайсами — гибрид (FSD.md §4.2).
        hybridChildren: looksLikeGroup ? info.childrenWithOwnApi : [],
        files: [],
        importedBy: new Set(),
      });
      return;
    }

    if (info.dirs.length > 0) {
      const group = {
        name: relParts.join("/"),
        layer: layerName,
        abs: dirAbs,
        rel: toPosix(path.relative(config.rootAbs, dirAbs)),
        // Общего кода в группе быть не может (FSD.md §4.1) — сохраняем, чтобы правило это увидело.
        rootFiles: info.files,
        indexFiles: info.indexFiles,
        children: info.dirs,
      };
      groups.push(group);
      for (const child of info.dirs) {
        visit(path.join(dirAbs, child), [...relParts, child], group.name);
      }
      return;
    }

    // Ни API, ни сегментов, ни подпапок — слайс без сегментов (FSD.md §5).
    slices.push({
      name: relParts.join("/"),
      shortName: relParts[relParts.length - 1],
      layer: layerName,
      group: groupPath,
      abs: dirAbs,
      rel: toPosix(path.relative(config.rootAbs, dirAbs)),
      indexFiles: info.indexFiles,
      segments: [],
      rootFiles: info.files,
      looseDirs: [],
      hybridChildren: [],
      files: [],
      importedBy: new Set(),
    });
  };

  for (const entry of readDir(layerAbs)) {
    if (entry.isDirectory()) {
      visit(path.join(layerAbs, entry.name), [entry.name], null);
    }
  }

  return { slices, groups };
}

const IMPORT_PATTERNS = [
  { re: /import\s+type\s+[^'"]*?from\s*['"]([^'"]+)['"]/g, kind: "import", typeOnly: true },
  { re: /import\s+(?!type\s)[^'"]*?from\s*['"]([^'"]+)['"]/g, kind: "import", typeOnly: false },
  { re: /import\s*['"]([^'"]+)['"]/g, kind: "side-effect", typeOnly: false },
  { re: /export\s+type\s+(?:\*|\{[\s\S]*?\})\s*from\s*['"]([^'"]+)['"]/g, kind: "re-export", typeOnly: true },
  { re: /export\s+(?!type\s)(?:\*(?:\s+as\s+\w+)?|\{[\s\S]*?\})\s*from\s*['"]([^'"]+)['"]/g, kind: "re-export", typeOnly: false },
  { re: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g, kind: "dynamic", typeOnly: false },
  { re: /require\(\s*['"]([^'"]+)['"]\s*\)/g, kind: "require", typeOnly: false },
];

function lineAt(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source[i] === "\n") line += 1;
  }
  return line;
}

function parseImports(source) {
  const imports = [];
  const seen = new Set();
  for (const { re, kind, typeOnly } of IMPORT_PATTERNS) {
    re.lastIndex = 0;
    let match = re.exec(source);
    while (match !== null) {
      const key = `${match.index}:${match[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        imports.push({ spec: match[1], kind, typeOnly, line: lineAt(source, match.index), statement: match[0] });
      }
      match = re.exec(source);
    }
  }
  return imports.sort((left, right) => left.line - right.line);
}

/** Куда указывает спецификатор импорта в терминах FSD. */
export function resolveSpec(spec, file, config) {
  let internalPath = null;
  let style = null;

  const alias = config.aliases.find((candidate) => spec.startsWith(candidate));
  if (alias) {
    internalPath = spec.slice(alias.length);
    style = "absolute";
  } else if (spec.startsWith(".")) {
    const dir = path.posix.dirname(file.rel);
    internalPath = path.posix.normalize(path.posix.join(dir, spec));
    style = "relative";
    if (internalPath.startsWith("..")) {
      return { kind: "outside-root", spec, style };
    }
  } else {
    return { kind: "external", spec, style: "package" };
  }

  const parts = internalPath.split("/").filter((part) => part.length > 0 && part !== ".");
  const layer = parts[0] ?? null;
  const target = {
    kind: "internal",
    spec,
    style,
    path: parts.join("/"),
    layer,
    isKnownLayer: config.layerIndex.has(layer),
    slice: null,
    segment: null,
    rest: [],
    crossApiFor: null,
    pointsAtSliceRoot: false,
    pointsAtLayerRoot: parts.length === 1,
  };

  if (!target.isKnownLayer) return target;

  const rest = parts.slice(1);
  if (SLICELESS.has(layer)) {
    target.segment = rest[0] ?? null;
    target.rest = rest.slice(1);
    return target;
  }

  const crossIndex = rest.indexOf("@x");
  if (crossIndex !== -1) {
    target.slice = rest.slice(0, crossIndex).join("/");
    const crossFile = rest[crossIndex + 1] ?? "";
    target.crossApiFor = crossFile.replace(/\.[^.]+$/, "") || null;
    target.rest = rest.slice(crossIndex + 1);
    return target;
  }

  // Ищем самый длинный известный слайс, совпадающий с началом пути.
  const layerSlices = config.sliceNamesByLayer.get(layer) ?? [];
  const match = layerSlices.find((name) => rest.join("/") === name || rest.join("/").startsWith(`${name}/`));
  if (match) {
    target.slice = match;
    const tail = rest.slice(match.split("/").length);
    const withoutIndex = tail.filter((part) => !INDEX_BASENAMES.has(part.replace(/\.[^.]+$/, "")));
    target.pointsAtSliceRoot = withoutIndex.length === 0;
    target.segment = withoutIndex[0] ?? null;
    target.rest = withoutIndex.slice(1);
  } else {
    target.slice = rest[0] ?? null;
    target.segment = rest[1] ?? null;
    target.rest = rest.slice(2);
    target.pointsAtSliceRoot = rest.length === 1;
  }

  return target;
}

export function scanProject(config) {
  const layers = new Map();
  const allFiles = [];
  const unknownDirs = [];

  for (const entry of readDir(config.rootAbs)) {
    if (!entry.isDirectory()) continue;
    const layerName = entry.name;
    const layerAbs = path.join(config.rootAbs, layerName);

    if (!config.layerIndex.has(layerName)) {
      unknownDirs.push({ name: layerName, rel: layerName });
      continue;
    }

    const sliceless = SLICELESS.has(layerName);
    const info = inspectFolder(layerAbs, config);
    const layer = {
      name: layerName,
      abs: layerAbs,
      sliceless,
      index: config.layerIndex.get(layerName),
      segments: sliceless ? info.dirs : [],
      rootFiles: info.files,
      indexFiles: info.indexFiles,
      slices: [],
      groups: [],
      files: [],
    };

    if (!sliceless) {
      const { slices, groups } = classifyLayer(layerName, layerAbs, config);
      layer.slices = slices;
      layer.groups = groups;
    }

    layers.set(layerName, layer);
  }

  // Индекс имён слайсов нужен резолверу импортов (слайс может лежать в группе: "order/list").
  config.sliceNamesByLayer = new Map(
    [...layers.values()].map((layer) => [
      layer.name,
      layer.slices.map((slice) => slice.name).sort((left, right) => right.length - left.length),
    ]),
  );

  const walk = (dirAbs) => {
    for (const entry of readDir(dirAbs)) {
      const abs = path.join(dirAbs, entry.name);
      const rel = toPosix(path.relative(config.rootAbs, abs));
      if (isIgnored(rel, config)) continue;
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!isSourceFile(entry.name, config)) continue;

      const parts = rel.split("/");
      const layerName = parts[0];
      const layer = layers.get(layerName) ?? null;
      const source = fs.readFileSync(abs, "utf8");
      const basename = path.basename(entry.name, path.extname(entry.name));

      const file = {
        abs,
        rel,
        name: entry.name,
        basename,
        ext: path.extname(entry.name),
        layer: layer ? layerName : null,
        knownLayer: Boolean(layer),
        slice: null,
        sliceRel: null,
        group: null,
        segment: null,
        segmentPath: [],
        inCrossApi: parts.includes("@x"),
        crossApiFor: null,
        isIndex: INDEX_BASENAMES.has(basename),
        isServerIndex: basename === "index.server",
        source,
        lines: source.split("\n").length,
        imports: parseImports(source),
      };

      if (layer) {
        layer.files.push(file);
        if (layer.sliceless) {
          file.segment = parts[1] ?? null;
          file.segmentPath = parts.slice(2, -1);
        } else {
          const slice = layer.slices.find((candidate) => rel === candidate.rel || rel.startsWith(`${candidate.rel}/`));
          if (slice) {
            slice.files.push(file);
            file.slice = slice.name;
            file.sliceRel = slice.rel;
            file.group = slice.group;
            const tail = rel.slice(slice.rel.length + 1).split("/");
            if (tail[0] === "@x") {
              file.crossApiFor = path.basename(tail[1] ?? "", path.extname(tail[1] ?? "")) || null;
            } else if (tail.length > 1) {
              file.segment = tail[0];
              file.segmentPath = tail.slice(1, -1);
            }
          } else {
            const group = layer.groups.find((candidate) => path.posix.dirname(rel) === candidate.rel);
            if (group) file.group = group.name;
          }
        }
      }

      allFiles.push(file);
    }
  };

  walk(config.rootAbs);

  // Разрешаем импорты и считаем, кто кем пользуется (нужно правилу insignificant-slice).
  const slicesByKey = new Map();
  for (const layer of layers.values()) {
    for (const slice of layer.slices) slicesByKey.set(`${layer.name}/${slice.name}`, slice);
  }

  for (const file of allFiles) {
    for (const dependency of file.imports) {
      dependency.target = resolveSpec(dependency.spec, file, config);
      const { target } = dependency;
      if (target.kind !== "internal" || !target.isKnownLayer || !target.slice) continue;
      const key = `${target.layer}/${target.slice}`;
      const slice = slicesByKey.get(key);
      const sameSlice = file.layer === target.layer && file.slice === target.slice;
      if (slice && !sameSlice) {
        slice.importedBy.add(file.slice ? `${file.layer}/${file.slice}` : `${file.layer}${file.segment ? `/${file.segment}` : ""}`);
      }
    }
  }

  return {
    config,
    layers,
    files: allFiles,
    unknownDirs,
    slices: [...slicesByKey.values()],
    groups: [...layers.values()].flatMap((layer) => layer.groups),
    sliceByKey: slicesByKey,
  };
}
