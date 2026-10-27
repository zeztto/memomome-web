import test from 'node:test';
import assert from 'node:assert/strict';
import { toTextCsv } from '../src/app/utils/textCsv';

test('text CSV neutralizes formulas including whitespace and control prefixes', () => {
  for (const line of ['=HYPERLINK("https://invalid.test")', '+1+1', '-1+1', '@SUM(1)', '  =1+1', '\t=1+1', '\r=1+1', ' \t\r@SUM(1)', '\u00a0=1', '\0=1', '\tplain', '\rplain']) {
    assert.equal(toTextCsv(line), '\ufeff"\'' + line.replace(/"/g, '""') + '"');
  }
});

test('text CSV preserves normal text, quote escaping, row breaks, CR and BOM', () => {
  assert.equal(toTextCsv('한글 "내용"\n둘째 줄\r'), '\ufeff"한글 ""내용"""\n"둘째 줄\r"');
  assert.equal(toTextCsv("'=1+1"), '\ufeff"\'=1+1"');
  assert.equal(toTextCsv(''), '\ufeff""');
});
