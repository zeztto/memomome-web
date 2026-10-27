import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTitle, validateTextLength, escapeHtml, sanitizeFilename } from '../src/app/utils/validation';

test('titles must remain nonempty after sanitization and fit the limit', () => {
  for (const title of ['', '   ', '<>', ' < > ', 'x'.repeat(201)]) assert.equal(validateTitle(title).valid,false);
  assert.deepEqual(validateTitle('  메모 제목  '),{valid:true,sanitized:'메모 제목'});
});

test('large memo inputs are rejected and export strings escape HTML', () => {
  assert.equal(validateTextLength('x'.repeat(1_000_001)).valid,false);
  assert.equal(validateTextLength('x'.repeat(1_000_000)).valid,true);
  assert.equal(escapeHtml('<script>"&\'</script>'),'&lt;script&gt;&quot;&amp;&#x27;&lt;&#x2F;script&gt;');
  assert.equal(sanitizeFilename('../한글 파일?.html'),'.._한글-파일_.html');
});
