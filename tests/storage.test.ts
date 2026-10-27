import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSavedMemos } from '../src/app/utils/memoValidation';

const memo={id:'test-only-id',title:'격리 검증',content:'개인정보 없는 test-only 내용',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'};

test('saved memo JSON roundtrip retains text without HTML execution', () => {
  const record={...memo,content:'<script>alert(1)</script>\n한글'};
  assert.deepEqual(parseSavedMemos(JSON.stringify([record])),[record]);
});

test('malformed JSON, invalid shapes, duplicate IDs and oversized records are rejected', () => {
  for (const input of ['{','null','{}','[null]',JSON.stringify([{...memo,content:5}]),JSON.stringify([{...memo,title:'<>'}]),JSON.stringify([{...memo,createdAt:'invalid'}]),JSON.stringify([memo,memo]),JSON.stringify([{...memo,content:'x'.repeat(1_000_001)}])]) assert.deepEqual(parseSavedMemos(input),[]);
});
