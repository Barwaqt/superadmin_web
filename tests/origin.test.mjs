import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const canonical = "https://console.barwaqt.com";
for (const kind of ['auth', 'commerce']) {
  async function invoke(origin, env = { NODE_ENV: 'production' }, url = 'http://127.0.0.1:3000/api/test') {
    const path = kind === 'auth' ? '../app/api/auth/[action]/route.ts' : '../app/api/commerce/[...path]/route.ts';
    const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, process: { env }, URL, AbortSignal, setTimeout,
      require(name) {
        if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, ...options }) } };
        if (name === 'next/headers') return { cookies: async () => ({ get: () => undefined, set() {}, delete() {} }) };
        throw Error(name);
      }, fetch() { throw Error('Unexpected upstream request'); }
    });
    return exports.POST({ method: 'POST', url, json: async () => ({}), headers: new Headers({ ...(origin ? { origin } : {}), 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' }) }, { params: Promise.resolve(kind === 'auth' ? { action: 'refresh' } : { path: ['orders'] }) });
  }
  test(`${kind}: public HTTPS origin passes through internal HTTP proxy URL`, async () => {
    assert.equal((await invoke(canonical)).status, 401);
  });
  test(`${kind}: foreign and absent origins remain blocked despite forwarded headers`, async () => {
    for (const origin of ['https://evil.example', undefined, 'null', canonical + '.evil.example']) assert.equal((await invoke(origin)).status, 403);
  });
  test(`${kind}: explicit staging origin replaces production origin`, async () => {
    const env = { NODE_ENV: 'production', APP_ORIGIN: 'https://stagging.barwaqt.com' };
    assert.equal((await invoke(env.APP_ORIGIN, env)).status, 401);
    assert.equal((await invoke(canonical, env)).status, 403);
  });
  test(`${kind}: local development retains same-origin checks`, async () => {
    assert.equal((await invoke('http://localhost:3000', {}, 'http://localhost:3000/api/test')).status, 401);
  });
}
