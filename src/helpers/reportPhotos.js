// IMAGE is evaluated by Excel when the workbook opens. Generating the report
// never requests or embeds profile photos. Cell references also support long URLs.
export function addReportPhotoFormulas(workbook, targets = []) {
  for (const target of targets) {
    const sheet = workbook.getWorksheet(target.sheet);
    const cell = sheet.getCell(target.row, 3);
    const url = typeof target.url === 'string' ? target.url.trim() : '';
    if (!url) { cell.value = 'Sense fotografia'; continue; }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('invalid-photo-url');
    } catch {
      cell.value = 'Cal una URL pública HTTPS';
      continue;
    }
    const column = sheet.getRow(6).values.indexOf('Fotografia (URL)');
    if (column < 1) throw new Error('missing-photo-url-column');
    const sourceCell = sheet.getCell(target.row, column);
    sourceCell.value = url;
    cell.value = {
      // Future-function prefix is required in the XLSX, regardless of Excel UI language.
      formula: `_xlfn.IMAGE(${sourceCell.address},B${target.row},0)`,
      result: 'Obre amb Excel compatible amb IMAGE',
    };
  }
}
