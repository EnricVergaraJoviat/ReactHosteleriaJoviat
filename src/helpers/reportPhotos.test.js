import ExcelJS from 'exceljs';
import { buildReportWorkbook } from './reportWorkbook';
import { addReportPhotoFormulas } from './reportPhotos';

test('writes IMAGE formulas without downloading or embedding photos, including long URLs', async () => {
  const url = `https://example.test/photo.jpg?token=${'a'.repeat(300)}`;
  const { workbook, photoTargets } = buildReportWorkbook({
    students: [{ id: 'z', Name: 'Zoe', PhotoURL: url }, { id: 'a', Name: 'Anna' }],
    restaurants: [{ id: 'r', Name: 'Restaurant', PhotoURL: url }],
  });
  const originalFetch = global.fetch;
  global.fetch = jest.fn(() => { throw new Error('Must not request photos'); });
  try {
    addReportPhotoFormulas(workbook, photoTargets);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(workbook.getWorksheet('Usuaris').getCell('C7').value).toBe('Sense fotografia');
    const restored = new ExcelJS.Workbook();
    await restored.xlsx.load(await workbook.xlsx.writeBuffer());
    for (const [name, row] of [['Usuaris', 8], ['Establiments', 7]]) {
      const sheet = restored.getWorksheet(name);
      const urlColumn = sheet.getRow(6).values.indexOf('Fotografia (URL)');
      const source = sheet.getCell(row, urlColumn);
      expect(source.value).toBe(url);
      expect(sheet.getCell(row, 3).formula).toBe(`_xlfn.IMAGE(${source.address},B${row},0)`);
      expect(sheet.getImages()).toHaveLength(0);
    }
    expect(workbook.calcProperties.fullCalcOnLoad).toBe(true);
  } finally { global.fetch = originalFetch; }
});

test('invalid or missing URLs produce clear labels', () => {
  const { workbook, photoTargets } = buildReportWorkbook({ students: [
    { id: 'a', Name: 'A', PhotoURL: 'http://example.test/a.jpg' },
    { id: 'b', Name: 'B', PhotoURL: 'javascript:alert(1)' },
    { id: 'c', Name: 'C', PhotoURL: '   ' },
    { id: 'd', Name: 'D', PhotoURL: 'https://user:password@example.test/a.jpg' },
  ] });
  addReportPhotoFormulas(workbook, photoTargets);
  const sheet = workbook.getWorksheet('Usuaris');
  expect(sheet.getCell('C7').value).toBe('Cal una URL pública HTTPS');
  expect(sheet.getCell('C8').value).toBe('Cal una URL pública HTTPS');
  expect(sheet.getCell('C9').value).toBe('Sense fotografia');
  expect(sheet.getCell('C10').value).toBe('Cal una URL pública HTTPS');
});
