import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

describe('HPLBIZ edition isolation', () => {
  it('boots independently with HPLBIZ config, data and credentials', () => {
    const fixture = fileURLToPath(new URL('./hplbiz-fixture.ts', import.meta.url));
    const result = spawnSync(process.execPath, ['--experimental-sqlite', '--experimental-strip-types', fixture], {
      encoding: 'utf8',
      env: { ...process.env, BUSINESS_EDITION: 'hplbiz', NODE_ENV: 'test' },
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /HPLBIZ edition isolation verified/);
  });
});
