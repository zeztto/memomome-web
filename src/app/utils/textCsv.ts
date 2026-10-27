export function toTextCsv(text: string): string {
  const csv = text.split('\n').map((line) => {
    const formula = /^[\s\u0000-\u001f\u007f-\u009f]*[=+\-@]/.test(line) || /^[\t\r]/.test(line);
    const cell = formula ? "'" + line : line;
    return `"${cell.replace(/"/g, '""')}"`;
  }).join('\n');
  return '\ufeff' + csv;
}
