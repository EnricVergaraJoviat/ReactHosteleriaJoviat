import { getDocs } from 'firebase/firestore';
import { auth } from './firebase';
import { loadFirestoreCollections } from './firestoreData';
import { buildReportWorkbook } from './reportWorkbook';
import { downloadAdminReport } from './downloadAdminReport';

jest.mock('./firebase', () => ({ auth: { currentUser: null }, db: {} }));
jest.mock('firebase/firestore', () => ({ collection: jest.fn(), getDocs: jest.fn() }));
jest.mock('./firestoreData', () => ({ loadFirestoreCollections: jest.fn() }));
jest.mock('./reportWorkbook', () => ({ buildReportWorkbook: jest.fn(), addReportCharts: jest.fn(), reportFilename: () => 'report.xlsx' }));

beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = { uid: 'admin-id', email: 'admin@example.test' };
  getDocs.mockResolvedValue({ docs: [{ id: 'admin-doc', data: () => ({ Email: 'admin@example.test' }) }] });
  loadFirestoreCollections.mockResolvedValue({ students: [], restaurants: [], relations: [] });
  buildReportWorkbook.mockReturnValue({ workbook: { xlsx: { writeBuffer: async () => new Uint8Array([1]) } }, chartData: {} });
});

test('rejects a signed-out or non-admin user before loading private report data', async () => {
  auth.currentUser = null;
  await expect(downloadAdminReport()).rejects.toThrow('report-not-authorized');
  expect(getDocs).not.toHaveBeenCalled();
  auth.currentUser = { uid: 'student', email: 'student@example.test' };
  await expect(downloadAdminReport()).rejects.toThrow('report-not-authorized');
  expect(loadFirestoreCollections).not.toHaveBeenCalled();
});

test('a failed collection load never produces a partial workbook', async () => {
  loadFirestoreCollections.mockRejectedValue(new Error('offline'));
  await expect(downloadAdminReport()).rejects.toThrow('offline');
  expect(buildReportWorkbook).not.toHaveBeenCalled();
});

test('does not download if the session changes during generation', async () => {
  buildReportWorkbook.mockReturnValue({ workbook: { xlsx: { writeBuffer: async () => { auth.currentUser = null; return new Uint8Array(); } } }, chartData: {} });
  await expect(downloadAdminReport()).rejects.toThrow('report-session-changed');
});

test('downloads an xlsx once and releases its object URL', async () => {
  jest.useFakeTimers();
  URL.createObjectURL = jest.fn(() => 'blob:report');
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    await downloadAdminReport();
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL.mock.calls[0][0].type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(document.querySelector('a[download="report.xlsx"]')).toBeNull();
    jest.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report');
  } finally { click.mockRestore(); jest.useRealTimers(); }
});
