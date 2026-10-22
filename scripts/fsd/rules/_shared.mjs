// scripts/fsd/rules/_shared.mjs
// Мелкие помощники, общие для правил. Своей логики проверок здесь нет.

/** Ключ слайса вида "entities/dish" — им сравниваем «свой / чужой слайс». */
export function sliceKey(layer, slice) {
  return slice ? `${layer}/${slice}` : layer;
}

export function isSameSlice(file, target) {
  return Boolean(file.slice) && file.layer === target.layer && file.slice === target.slice;
}

/** Файл лежит на слое без слайсов (app / shared) — там «свой слайс» = весь слой. */
export function isSlicelessFile(file, config) {
  return file.knownLayer && (config.appLayer === file.layer || file.layer === "shared");
}

const COMMENT_RE = /\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm;

/** Грубо вырезает комментарии — чтобы эвристики не срабатывали на примерах в комментах. */
export function stripComments(source) {
  return source.replace(COMMENT_RE, (match, prefix) => (prefix === undefined ? "" : prefix));
}

const JSX_RE = /<[A-Z][\w.]*[\s/>]|<>/;

export function hasJsx(source) {
  return JSX_RE.test(stripComments(source));
}

export function lineOf(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source[i] === "\n") line += 1;
  }
  return line;
}

/** Все совпадения регулярки с номерами строк. */
export function matchesWithLines(source, regexp) {
  const result = [];
  const re = new RegExp(regexp.source, regexp.flags.includes("g") ? regexp.flags : `${regexp.flags}g`);
  let match = re.exec(source);
  while (match !== null) {
    result.push({ match, line: lineOf(source, match.index) });
    match = re.exec(source);
  }
  return result;
}

export const isKebabCase = (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export const isPascalCase = (value) => /^[A-Z][A-Za-z0-9]*$/.test(value);
export const isCamelCase = (value) => /^[a-z][A-Za-z0-9]*$/.test(value);

/**
 * Есть ли в файле объявление компонента.
 *
 * Компонент — это функция с большой буквы. Проверять только заглавную букву
 * нельзя: `const RADIUS = 70` и `const LONG_STAY_MINUTES = 180` — константы, а
 * не компоненты, и правила «в файле компонента» на них срабатывать не должны.
 */
export const COMPONENT_DECLARATION =
  /^(?:export\s+)?(?:default\s+)?(?:function\s+[A-Z][A-Za-z0-9]*|const\s+[A-Z][A-Za-z0-9]*\s*(?::[^=]+)?=\s*(?:\(|function\b|memo\b|React\.memo|forwardRef))/m;

export const hasComponent = (source) => COMPONENT_DECLARATION.test(source);

/**
 * Файл из стороннего UI-набора (shadcn/ui и подобное). Такой код приходит со своим
 * соглашением об именах и структуре — обёртка над Radix это один компонент из пятнадцати
 * экспортов, — и правила тонких компонентов на него не распространяются.
 * Список путей задаёт проект в fsd.config.mjs (vendorUiPaths), в движке библиотек нет.
 */
export const isVendorUi = (project, file) =>
  (project.config.vendorUiPaths ?? []).some((prefix) => file.rel.startsWith(prefix));
