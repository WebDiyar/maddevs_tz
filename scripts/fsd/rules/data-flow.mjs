// scripts/fsd/rules/data-flow.mjs
// Серверное состояние и обработка ошибок по слоям (FSD.md §9, §16).
// Оба правила — из раздела «[конвенция команды]», гасятся флагом --no-conventions.

import { stripComments, lineOf } from "./_shared.mjs";

/** Возвращает тело блока, начиная с открывающей скобки, по балансу фигурных скобок. */
function readBlock(source, braceIndex) {
  let depth = 0;
  for (let i = braceIndex; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(braceIndex, i + 1);
    }
  }
  return source.slice(braceIndex);
}

/**
 * FSD.md §9: в api ошибку логируем и пробрасываем дальше, а не глушим.
 * Проглоченная ошибка в сегменте api превращается в пустой экран без единого следа в логах.
 */
const apiErrorHandling = {
  name: "api-error-handling",
  docs: "§9",
  severity: "warn",
  convention: true,
  description: "catch в сегменте api глушит ошибку вместо проброса",
  check(project) {
    const diagnostics = [];

    for (const file of project.files) {
      if (file.segment !== "api" || file.isIndex) continue;

      const source = stripComments(file.source);
      const catchRe = /catch\s*(?:\([^)]*\))?\s*\{/g;
      let match = catchRe.exec(source);

      while (match !== null) {
        const braceIndex = match.index + match[0].length - 1;
        const body = readBlock(source, braceIndex);
        const rethrows = /\bthrow\b|Promise\.reject|\breject\s*\(/.test(body);

        if (!rethrows) {
          diagnostics.push({
            file: file.rel,
            line: lineOf(source, match.index),
            message: "catch без проброса ошибки",
            hint: "Правило слоя api: залогировать и бросить дальше. Решение «показать тост / подставить заглушку» принимает хук фичи или страницы, а не функция запроса.",
          });
        }
        match = catchRe.exec(source);
      }
    }

    return diagnostics;
  },
};

/**
 * FSD.md §9: источник истины для серверных данных — кэш-слой (TanStack Query и т.п.).
 * Стор, который сам ходит в api, заводит вторую копию тех же данных, и они разъезжаются.
 */
const serverStateInStore = {
  name: "no-server-state-in-store",
  docs: "§9",
  severity: "warn",
  convention: true,
  description: "Клиентский стор сам загружает серверные данные",
  check(project) {
    // create<T>()(…) у zustand, createSlice у RTK, createStore, MobX — общий признак «здесь объявлен стор».
    const storeApi = /\b(?:create|createSlice|createStore|makeAutoObservable|proxy)\s*[<(]/;
    const diagnostics = [];

    for (const file of project.files) {
      if (file.segment !== "model") continue;
      const source = stripComments(file.source);
      if (!storeApi.test(source)) continue;

      const fromApiSegment = file.imports.find((dependency) => {
        const target = dependency.target;
        if (dependency.typeOnly) return false;
        if (target.kind !== "internal") return false;
        return target.segment === "api";
      });
      const directFetch = /\bfetch\s*\(|\baxios\.(?:get|post|put|patch|delete)\s*\(/.test(source);

      if (!fromApiSegment && !directFetch) continue;

      diagnostics.push({
        file: file.rel,
        line: fromApiSegment?.line,
        message: fromApiSegment
          ? `стор тянет данные из api: ${fromApiSegment.spec}`
          : "стор ходит в сеть напрямую",
        hint: "Серверные данные живут в кэш-слое, в сторе — только клиентское состояние (фильтры, открытая модалка, тема). Две копии одних данных расходятся на первой же мутации.",
      });
    }

    return diagnostics;
  },
};

export default [apiErrorHandling, serverStateInStore];
