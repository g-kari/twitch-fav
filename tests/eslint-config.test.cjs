const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { ESLint } = require('eslint');
const globals = require('globals');

const eslint = new ESLint({ cwd: path.resolve(__dirname, '..') });
const fixturePath = 'src/lint-fixture.ts';

for (const [rule, source] of [
  ['no-extra-semi', 'export const value = 1;;'],
  ['no-mixed-spaces-and-tabs', 'export const value = 1;\n \tconsole.log(value);'],
  ['no-inner-declarations', 'if (window) { function inner() {} inner(); }\nexport {};'],
  ['no-constant-condition', 'while (true) { break; }\nexport {};'],
  ['@typescript-eslint/no-explicit-any', 'export const value: any = 1;'],
  ['@typescript-eslint/no-unused-vars', 'const unused = 1;\nexport {};']
]) {
  test(`flat config retains ${rule} as an error`, async () => {
    const [result] = await eslint.lintText(source, { filePath: fixturePath });
    assert.ok(result.messages.some(message => message.ruleId === rule && message.severity === 2));
  });
}

test('flat config preserves browser, ES2022 and WebExtension globals', async () => {
  const config = await eslint.calculateConfigForFile(fixturePath);
  assert.equal(config.languageOptions.sourceType, 'module');
  assert.equal(config.languageOptions.parser.meta.name, 'typescript-eslint/parser');
  assert.ok(globals.es2021 && Object.keys(globals.es2021).length > 0);
  for (const name of ['Promise', 'BigInt', 'Atomics', 'WeakRef', 'FinalizationRegistry']) {
    assert.equal(config.languageOptions.globals[name], false, `${name} is read-only`);
  }
  assert.deepEqual(config.languageOptions.globals, {
    ...globals.browser, ...globals.es2021, ...globals.webextensions
  });
  const [result] = await eslint.lintText(
    'console.log(window, chrome.runtime, browser.runtime, Promise, BigInt);',
    { filePath: fixturePath }
  );
  assert.equal(result.errorCount, 0);
  assert.equal(result.warningCount, 0);
});

test('flat config preserves the TypeScript source scope and dotfile exclusions', async () => {
  assert.equal(await eslint.isPathIgnored('src/background.ts'), false);
  assert.equal(await eslint.isPathIgnored('src/utils/model.ts'), false);
  assert.equal(await eslint.isPathIgnored('src/.hidden.ts'), true);
  assert.equal(await eslint.isPathIgnored('src/.hidden/nested.ts'), true);
  assert.equal(await eslint.calculateConfigForFile('tests/outside.ts'), undefined);
});
