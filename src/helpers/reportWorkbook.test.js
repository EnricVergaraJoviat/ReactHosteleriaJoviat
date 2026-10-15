import ExcelJS from 'exceljs';
import { buildReportWorkbook, referenceId, reportFilename, reportValue } from './reportWorkbook';

const generatedAt = new Date('2026-09-20T10:30:00Z');
const data = {
  students: [
    { id: 'a', Name: 'Anna Puig', Email: 'anna@example.test', Password: 'NEVER_EXPORT', Phone: '+34000123456', createdAt: { toDate: () => generatedAt }, Extra: { token: 'NEVER_EXPORT', note: '=1+1' } },
    { id: 'b', Name: '=HYPERLINK("https://example.test")' },
  ],
  restaurants: [{ id: 'r', Name: 'Restaurant Exemple', Rating: 4.5 }, { id: 'empty', Name: 'Sense alumnis' }],
  relations: [
    { id: 'one', id_alumni: { id: 'a' }, id_restaurant: { path: 'Restaurant/r' }, rol: ['kitchen'], current_job: true },
    { id: 'two', id_alumni: 'Alumni/a', id_restaurant: 'r', current_job: false },
    { id: 'missing', id_alumni: 'deleted', id_restaurant: 'r' },
  ],
  administrators: [{ id: 'admin', Name: 'Admin', Email: 'admin@example.test', refreshToken: 'NEVER_EXPORT' }],
};

test('exports all records, counts unique people and preserves orphaned assignments', async () => {
  const { workbook, chartData } = buildReportWorkbook(data, generatedAt);
  expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resum', 'Usuaris', 'Establiments', 'Assignacions', 'Llegenda']);
  const summary = workbook.getWorksheet('Resum');
  expect(summary.getCell('A7').value).toBe(2);
  expect(summary.getCell('A11').value).toBe(1);
  expect(summary.getCell('D11').value).toBe(1);
  expect(chartData.establishments.find((entry) => entry.label === 'Restaurant Exemple').value).toBe(1);
  expect(workbook.getWorksheet('Assignacions').getCell('F9').value).toBe('Referència no disponible');
  expect(workbook.getWorksheet('Assignacions').getCell('E9').value).toBe('No informat');
  expect(JSON.stringify(workbook.model)).not.toContain('NEVER_EXPORT');
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(await workbook.xlsx.writeBuffer());
  const users = restored.getWorksheet('Usuaris');
  expect(users.getCell('B7').value).toBe('=HYPERLINK("https://example.test")');
  expect(users.views[0]).toMatchObject({ state: 'frozen', ySplit: 6, xSplit: 2 });
  expect(users.getTable('UsuarisInforme')).toBeDefined();
  const dateColumn = users.getRow(6).values.indexOf('Data de creació');
  expect(users.getCell(8, dateColumn).value).toEqual(generatedAt);
  expect(restored.getWorksheet('Assignacions').getCell('B7').formula).toContain('MATCH("Alumni/a"');
  expect(restored.getWorksheet('Assignacions').getCell('C7').formula).toContain("'Establiments'!$A$7:$A$8");
});

test('empty report serializes without fake records or invalid lookup ranges', async () => {
  const { workbook, chartData } = buildReportWorkbook({}, generatedAt);
  expect(workbook.getWorksheet('Resum').getCell('A7').value).toBe(0);
  expect(chartData.establishments).toEqual([]);
  const bytes = await workbook.xlsx.writeBuffer();
  expect(bytes.byteLength).toBeGreaterThan(0);
  expect(JSON.stringify(workbook.model)).not.toContain('MATCH(');
});

test('lookup links use literal stable IDs, including wildcard and quote characters', () => {
  const id = 'a*?"';
  const { workbook } = buildReportWorkbook({ students: [{ id, Name: 'Anna "A"' }], restaurants: [{ id: 'r', Name: 'R' }], relations: [{ id: 'rel', id_alumni: id, id_restaurant: 'r' }] });
  expect(workbook.getWorksheet('Assignacions').getCell('B7').formula).toContain('Alumni/a~*~?""');
  expect(workbook.getWorksheet('Assignacions').getCell('B7').formula).toContain('Anna ""A""');
});

test('normalizes Firestore references, timestamps, booleans and local filenames', () => {
  expect(referenceId({ path: 'Alumni/abc' })).toBe('abc');
  expect(reportValue(false)).toBe('No');
  expect(reportValue(0)).toBe(0);
  expect(reportValue({ latitude: 41.7, longitude: 1.8 })).toBe('41.7, 1.8');
  expect(reportFilename(new Date('2026-09-20T23:30:00Z'))).toBe('Joviat_Informe_usuaris_2026-09-21.xlsx');
});
