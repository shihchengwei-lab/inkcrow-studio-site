import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Run the production module; replace only browser/React boundaries in each harness.
export function moduleLoader(globals = {}, mocks = {}) {
  const cache = new Map();
  const load = path => {
    if (cache.has(path)) return cache.get(path);
    if (path.endsWith(".css")) return {};
    const exports = {};
    cache.set(path, exports);
    const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    runInNewContext(code, { ...globals, exports, require: name => {
      if (name in mocks) return mocks[name];
      const base = resolve(dirname(path), name);
      return load(extname(base) ? base : [base + ".ts", base + ".tsx"].find(existsSync));
    } });
    return exports;
  };
  return load;
}
