import ExcelJS from 'exceljs';
import { getJoviatStudyOptions } from './joviatStudies';
import { translateRestaurantRoles } from './restaurantRoles';
import { translations } from '../i18n/translations';

const INK = '202520';
const GOLD = 'B58A46';
const CREAM = 'F8F3EA';
const GREEN = '287568';
const FIRST_ROW = 7;
const privateField = /password|passwd|contrasenya|token|secret|credential|apikey|api_key/i;
const labels = {
  Name: 'Nom', Email: 'Correu electrònic', Phone: 'Telèfon', Bio: 'Biografia',
  PromotionYear: 'Promoció', JoviatStudies: 'Estudis Joviat', Studies: 'Estudis',
  LinkedIn: 'LinkedIn', Instagram: 'Instagram', PhotoURL: 'Fotografia (URL)',
  VisibleContactToAlumniNetwork: 'Contacte visible a la xarxa',
  LegalTermsAccepted: 'Condicions acceptades', LegalTermsAcceptedAt: 'Data d’acceptació',
  createdAt: 'Data de creació', updatedAt: 'Última actualització',
  Address: 'Adreça', Website: 'Web', GoogleMapsURL: 'Google Maps',
  Rating: 'Valoració', BusinessStatus: 'Estat del negoci', Location: 'Coordenades',
  PrimaryType: 'Tipus', PrimaryTypeDisplayName: 'Categoria', Types: 'Categories',
  GooglePlaceId: 'Identificador Google Places', GooglePhotoName: 'Referència de fotografia',
};

export function referenceId(value) {
  const path = typeof value === 'string' ? value : value?.id || value?.path || '';
  return path.split('/').filter(Boolean).pop() || '';
}

// Convert Firestore values explicitly; never interpret user-provided text as a formula.
export function reportValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value;
  if (typeof value.toDate === 'function') return reportValue(value.toDate());
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(reportValue).join('; ');
  if (typeof value.latitude === 'number') return `${value.latitude}, ${value.longitude}`;
  if (typeof value.path === 'string') return value.path;
  return Object.entries(value).filter(([key]) => !privateField.test(key))
    .map(([key, entry]) => `${key}: ${reportValue(entry)}`).join('; ');
}

function fieldsFor(records, preferred, excluded = []) {
  const fields = new Set(records.flatMap(Object.keys));
  return [...new Set([...preferred, ...Array.from(fields).sort()])]
    .filter((key) => !['id', ...excluded].includes(key) && !privateField.test(key));
}

function fieldValue(record, key) {
  if (key === 'JoviatStudies' || key === 'Studies') {
    const options = getJoviatStudyOptions();
    const values = Array.isArray(record[key]) ? record[key] : [record[key]];
    return values.filter(Boolean).map((value) => options.find((option) => option.value === value)?.label || value).join('; ');
  }
  return reportValue(record[key]);
}

function linkStyle(cell) {
  cell.font = { name: 'Arial', size: 11, color: { argb: GREEN }, underline: true };
}

function sheetBase(workbook, name, subtitle, widths) {
  const sheet = workbook.addWorksheet(name, {
    properties: { tabColor: { argb: name === 'Resum' ? INK : GOLD } },
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = widths.map((width) => ({ width }));
  sheet.mergeCells(2, 1, 2, Math.min(widths.length, 6));
  sheet.getCell('A2').value = name === 'Resum' ? 'JOVIAT · Informe de la xarxa' : name;
  sheet.getCell('A2').font = { name: 'Arial', size: 22, bold: true, color: { argb: INK } };
  sheet.getRow(2).height = 38;
  sheet.mergeCells(3, 1, 3, widths.length);
  sheet.getCell('A3').value = subtitle;
  sheet.getCell('A3').font = { name: 'Arial', size: 10, color: { argb: '706959' } };
  sheet.getCell('A3').alignment = { wrapText: true, vertical: 'middle' };
  sheet.getRow(3).height = 32;
  if (name !== 'Resum') {
    sheet.getCell('A4').value = { text: 'Tornar al resum', hyperlink: "#'Resum'!A1" };
    linkStyle(sheet.getCell('A4'));
  }
  sheet.headerFooter.oddFooter = 'JOVIAT Networking &R&P / &N';
  return sheet;
}

function dataSheet(workbook, name, tableName, subtitle, headers, rows) {
  const sheet = sheetBase(workbook, name, subtitle, headers.map((header, i) => i === 0 ? 31 : /Biografia|Estudis|Establiments|Adreça/.test(header) ? 48 : 29));
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 6, showGridLines: false }];
  sheet.addTable({ name: tableName, ref: 'A6', headerRow: true,
    style: { theme: 'TableStyleMedium4', showRowStripes: true },
    columns: headers.map((name) => ({ name, filterButton: true })), rows });
  sheet.getRow(6).height = 32;
  sheet.getRow(6).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  rows.forEach((values, i) => {
    const row = sheet.getRow(FIRST_ROW + i);
    let lines = 1;
    values.forEach((value, column) => {
      const cell = row.getCell(column + 1);
      cell.font = { name: 'Arial', size: 11, color: { argb: INK } };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? CREAM : 'FFFFFF' } };
      if (value instanceof Date) cell.numFmt = 'dd/mm/yyyy hh:mm';
      else if (typeof value === 'number') cell.numFmt = headers[column] === 'Promoció' ? '0' : Number.isInteger(value) ? '#,##0' : '0.########';
      lines = Math.max(lines, Math.ceil(String(value ?? '').length / (sheet.getColumn(column + 1).width - 3)));
    });
    row.height = Math.min(409, Math.max(32, lines * 15 + 12));
  });
  if (!rows.length) sheet.getCell('A8').value = 'No hi ha registres.';
  sheet.pageSetup.printTitlesRow = '1:6';
  return sheet;
}

function recordLink(sheet, row, column, destination, id, name, targetRows) {
  if (!id || !targetRows.has(id)) {
    sheet.getCell(row, column).value = name || 'Registre no disponible';
    sheet.getCell(row, column).font = { color: { argb: '9E4F26' }, name: 'Arial', size: 11 };
    return;
  }
  const quote = (text) => `"${String(text).replace(/"/g, '""')}"`;
  // Resolve stable IDs at click/recalculation time, even after sorting either table.
  const escapedMatch = String(id).replace(/~/g, '~~').replace(/\*/g, '~*').replace(/\?/g, '~?');
  sheet.getCell(row, column).value = {
    formula: `HYPERLINK("#'${destination}'!A"&(MATCH(${quote(escapedMatch)},'${destination}'!$A$7:$A$${6 + targetRows.size},0)+6),${quote(name)})`,
    result: name,
  };
  linkStyle(sheet.getCell(row, column));
}

export function buildReportWorkbook({ students = [], restaurants = [], relations = [], administrators = [] }, generatedAt = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Joviat Networking';
  workbook.created = generatedAt;
  workbook.calcProperties.fullCalcOnLoad = true;
  const sort = (items) => [...items].sort((a, b) => String(a.Name || '').localeCompare(String(b.Name || ''), 'ca') || a.id.localeCompare(b.id));
  const alumni = sort(students);
  const establishments = sort(restaurants);
  const studentMap = new Map(alumni.map((entry) => [entry.id, entry]));
  const restaurantMap = new Map(establishments.map((entry) => [entry.id, entry]));
  const validRelations = relations.filter((entry) => studentMap.has(referenceId(entry.id_alumni)) && restaurantMap.has(referenceId(entry.id_restaurant)));
  const assigned = new Set(validRelations.map((entry) => referenceId(entry.id_alumni)));
  const current = new Set(validRelations.filter((entry) => entry.current_job === true).map((entry) => referenceId(entry.id_alumni)));
  const byStudent = new Map();
  const byRestaurant = new Map();
  validRelations.forEach((entry) => {
    const studentId = referenceId(entry.id_alumni);
    const restaurantId = referenceId(entry.id_restaurant);
    byStudent.set(studentId, [...(byStudent.get(studentId) || []), entry]);
    byRestaurant.set(restaurantId, new Set([...(byRestaurant.get(restaurantId) || []), studentId]));
  });
  const summary = sheetBase(workbook, 'Resum', `Generat el ${generatedAt.toLocaleString('ca-ES', { timeZone: 'Europe/Madrid' })} · Dades de l’aplicació en el moment de l’exportació`, [34, 19, 4, 34, 19, 4, 34, 19]);
  const metrics = [
    ['Alumni', alumni.length], ['Establiments', establishments.length], ['Assignacions', relations.length],
    ['Amb establiment vinculat', assigned.size], ['Sense establiment vinculat', alumni.length - assigned.size], ['Amb feina actual registrada', current.size],
  ];
  metrics.forEach(([label, value], i) => {
    const row = 6 + Math.floor(i / 3) * 4;
    const column = 1 + (i % 3) * 3;
    summary.mergeCells(row, column, row, column + 1);
    summary.mergeCells(row + 1, column, row + 2, column + 1);
    const labelCell = summary.getCell(row, column);
    labelCell.value = label;
    labelCell.font = { name: 'Arial', size: 11, color: { argb: INK }, bold: true };
    const number = summary.getCell(row + 1, column);
    number.value = value;
    number.numFmt = '#,##0';
    number.font = { name: 'Arial', size: 28, color: { argb: i === 4 ? '9E4F26' : GREEN }, bold: true };
    for (let r = row; r <= row + 2; r += 1) {
      for (let c = column; c <= column + 1; c += 1) summary.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREAM } };
      summary.getRow(r).height = 23;
    }
  });
  ['Usuaris', 'Establiments', 'Assignacions', 'Llegenda'].forEach((name, i) => {
    summary.getCell(15, i * 2 + 1).value = { text: `Veure ${name.toLowerCase()}`, hyperlink: `#'${name}'!A1` };
    linkStyle(summary.getCell(15, i * 2 + 1));
  });
  summary.mergeCells('A17:H17');
  summary.getCell('A17').value = `${administrators.length} registres d’administració · ${relations.length - validRelations.length} assignacions amb referències no disponibles`;
  summary.getCell('A17').font = { name: 'Arial', size: 11, color: { argb: '706959' } };

  const userFields = fieldsFor([...alumni, ...administrators], ['Email', 'Phone', 'PromotionYear', 'JoviatStudies', 'Bio', 'LinkedIn', 'Instagram', 'PhotoURL'], ['Name']);
  const userRows = [
    ...alumni.map((entry) => [`Alumni/${entry.id}`, entry.Name || '', entry.PhotoURL ? 'Pendent' : 'Sense fotografia', 'Alumni',
      [...new Set((byStudent.get(entry.id) || []).filter((r) => r.current_job === true).map((r) => restaurantMap.get(referenceId(r.id_restaurant)).Name || referenceId(r.id_restaurant)))].join('; '),
      [...new Set((byStudent.get(entry.id) || []).map((r) => restaurantMap.get(referenceId(r.id_restaurant)).Name || referenceId(r.id_restaurant)))].join('; '),
      ...userFields.map((key) => fieldValue(entry, key))]),
    ...sort(administrators).map((entry) => [`Administrator/${entry.id}`, entry.Name || entry.Email || '', entry.PhotoURL ? 'Pendent' : 'Sense fotografia', 'Administració', '', '', ...userFields.map((key) => fieldValue(entry, key))]),
  ];
  dataSheet(workbook, 'Usuaris', 'UsuarisInforme', 'Perfils Alumni i registres d’administració. Un registre per document; una mateixa persona pot tenir tots dos perfils.',
    ['ID del registre', 'Usuari', 'Fotografia', 'Tipus de perfil', 'Establiments actuals', 'Tots els establiments vinculats', ...userFields.map((key) => labels[key] || key)], userRows);
  const userTargets = new Map(userRows.map((row, i) => [row[0], i + FIRST_ROW]));
  const restaurantFields = fieldsFor(establishments, ['Address', 'Phone', 'Email', 'Website', 'PrimaryTypeDisplayName', 'BusinessStatus', 'Rating', 'PhotoURL'], ['Name']);
  const restaurantRows = establishments.map((entry) => [entry.id, entry.Name || '', entry.PhotoURL ? 'Pendent' : 'Sense fotografia', byRestaurant.get(entry.id)?.size || 0, ...restaurantFields.map((key) => fieldValue(entry, key))]);
  dataSheet(workbook, 'Establiments', 'EstablimentsInforme', 'Tots els establiments, inclosos els que encara no tenen Alumni vinculats. El recompte compta persones úniques.',
    ['ID de l’establiment', 'Establiment', 'Fotografia', 'Alumni vinculats', ...restaurantFields.map((key) => labels[key] || key)], restaurantRows);
  const restaurantTargets = new Map(restaurantRows.map((row, i) => [row[0], i + FIRST_ROW]));
  const relationFields = fieldsFor(relations, [], ['id_alumni', 'id_restaurant', 'rol', 'current_job']);
  const relationRows = relations.map((entry) => {
    const studentId = referenceId(entry.id_alumni);
    const restaurantId = referenceId(entry.id_restaurant);
    return [entry.id, studentMap.get(studentId)?.Name || studentId, restaurantMap.get(restaurantId)?.Name || restaurantId,
      translateRestaurantRoles(entry.rol, (key) => translations.ca[key] || key).join('; '),
      entry.current_job === true ? 'Feina actual' : entry.current_job === false ? 'Experiència anterior' : 'No informat',
      studentMap.has(studentId) && restaurantMap.has(restaurantId) ? 'Completa' : 'Referència no disponible',
      studentId ? `Alumni/${studentId}` : '', restaurantId, ...relationFields.map((key) => fieldValue(entry, key))];
  });
  const assignments = dataSheet(workbook, 'Assignacions', 'AssignacionsInforme', 'Clica el nom de l’usuari o de l’establiment per anar a la seva fitxa. Els enllaços cerquen l’ID i admeten ordenar les taules.',
    ['ID de l’assignació', 'Usuari', 'Establiment', 'Rols professionals', 'Vinculació', 'Estat de la referència', 'ID de l’usuari', 'ID de l’establiment', ...relationFields.map((key) => labels[key] || key)], relationRows);
  relationRows.forEach((row, i) => {
    recordLink(assignments, FIRST_ROW + i, 2, 'Usuaris', row[6], row[1], userTargets);
    recordLink(assignments, FIRST_ROW + i, 3, 'Establiments', row[7], row[2], restaurantTargets);
  });
  if (relationRows.length) assignments.addConditionalFormatting({ ref: `E7:F${6 + relationRows.length}`, rules: [
    { type: 'containsText', operator: 'containsText', text: 'Feina actual', style: { font: { color: { argb: GREEN }, bold: true }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'E6F2EC' } } } },
    { type: 'containsText', operator: 'containsText', text: 'Referència no disponible', style: { font: { color: { argb: '9E4F26' }, bold: true } } },
  ] });
  const legend = dataSheet(workbook, 'Llegenda', 'LlegendaInforme', 'Abast, definicions i navegació de l’informe.', ['Concepte', 'Descripció'], [
    ['Origen', 'Col·leccions Alumni, Administrator, Restaurant i Rest-Alum. No inclou comptes de Firebase Auth sense perfil ni sol·licituds pendents d’alta.'],
    ['Usuaris', 'Inclou tots els perfils emmagatzemats, sense filtres de cerca o d’estat. Els registres d’administració s’identifiquen separadament.'],
    ['Assignació', 'Vinculació professional entre un Alumni i un establiment, no una assignació acadèmica. Es conserven tots els registres, inclosos els duplicats.'],
    ['Feina actual', 'El camp current_job és cert. Fals indica experiència anterior; si falta, es mostra No informat.'],
    ['Sense establiment vinculat', 'Alumni sense cap vinculació resoluble a un establiment existent. No implica que estiguin a l’atur.'],
    ['Dates i períodes', 'Només s’inclouen si consten a les dades. No es dedueixen dates d’inici o final.'],
    ['Enllaços interns', 'A Assignacions, els noms cerquen l’identificador únic a la pestanya de destinació. Ordena la taula sencera i conserva els identificadors. Excel recalcula en obrir.'],
    ['Camps buits', 'Dada no informada. Un zero numèric sí que representa un valor conegut.'],
    ['Dades excloses', 'No s’exporten camps de contrasenyes, tokens, secrets o credencials.'],
    ['Gràfics', 'Fotografia dels recomptes en generar l’informe. Els gràfics no s’actualitzen si edites el fitxer.'],
    ['Fotografies', 'Excel carrega les imatges amb IMAGE des de la columna Fotografia (URL). La generació de l’informe no descarrega cap fotografia. Cal connexió i Excel Microsoft 365 o Excel 2024 compatible.'],
    ['Accés a les fotografies', 'Cal una URL HTTPS directa, pública i sense redireccions. Excel pot demanar habilitar les imatges externes. Si mostra #BLOCKED!, revisa aquest permís; #CONNECT! indica problemes d’accés a la imatge.'],
  ]);
  legend.getColumn(1).width = 32;
  legend.getColumn(2).width = 110;
  legend.eachRow((row, index) => { if (index >= FIRST_ROW) row.height = 48; });
  const photoTargets = [
    ...[...alumni, ...sort(administrators)].map((entry, i) => ({ sheet: 'Usuaris', row: FIRST_ROW + i, url: entry.PhotoURL })),
    ...establishments.map((entry, i) => ({ sheet: 'Establiments', row: FIRST_ROW + i, url: entry.PhotoURL })),
  ];
  ['Usuaris', 'Establiments'].forEach((name) => { workbook.getWorksheet(name).getColumn(3).width = 19; });
  photoTargets.forEach(({ sheet, row }) => {
    const record = workbook.getWorksheet(sheet).getRow(row);
    record.height = Math.max(record.height || 0, 72);
    record.getCell(3).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  return { workbook, photoTargets, chartData: {
    establishments: establishments.map((entry) => ({ label: entry.Name || entry.id, value: byRestaurant.get(entry.id)?.size || 0 })).sort((a, b) => b.value - a.value).slice(0, 10),
    coverage: [{ label: 'Amb establiment', value: assigned.size }, { label: 'Sense establiment', value: alumni.length - assigned.size }],
  } };
}

export function addReportCharts(workbook, chartData) {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('report-chart-unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const draw = (title, entries, x, width) => {
    ctx.fillStyle = '#202520';
    ctx.font = 'bold 25px Arial';
    ctx.fillText(title, x, 45);
    const max = Math.max(1, ...entries.map((entry) => entry.value));
    if (!entries.length) { ctx.font = '20px Arial'; ctx.fillText('No hi ha registres', x, 105); }
    entries.forEach((entry, i) => {
      const y = 95 + i * 55;
      ctx.font = '18px Arial';
      ctx.fillStyle = '#202520';
      let label = entry.label;
      while (ctx.measureText(label).width > width - 60) label = `${label.slice(0, -2)}…`;
      ctx.fillText(label, x, y);
      ctx.fillStyle = '#f2eadc';
      ctx.fillRect(x, y + 10, width - 60, 13);
      ctx.fillStyle = i % 2 ? '#b58a46' : '#287568';
      ctx.fillRect(x, y + 10, (width - 60) * entry.value / max, 13);
      ctx.fillStyle = '#202520';
      ctx.fillText(String(entry.value), x + width - 45, y + 22);
    });
  };
  draw('Alumni per establiment · Top 10', chartData.establishments, 30, 900);
  draw('Vinculació a establiments', chartData.coverage, 1000, 560);
  const imageId = workbook.addImage({ base64: canvas.toDataURL('image/png'), extension: 'png' });
  workbook.getWorksheet('Resum').addImage(imageId, { tl: { col: 0, row: 19 }, ext: { width: 1200, height: 510 } });
  workbook.getWorksheet('Resum').pageSetup.printArea = 'A1:H48';
}

export function reportFilename(date) {
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  return `Joviat_Informe_usuaris_${day}.xlsx`;
}
