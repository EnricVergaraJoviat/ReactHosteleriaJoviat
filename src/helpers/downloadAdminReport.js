import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { loadFirestoreCollections } from './firestoreData';
import { addReportCharts, buildReportWorkbook, reportFilename } from './reportWorkbook';
import { addReportPhotoFormulas } from './reportPhotos';

export async function downloadAdminReport() {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('report-not-authorized');
  const snapshot = await getDocs(collection(db, 'Administrator'));
  const administrators = snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }));
  if (!administrators.some((entry) => String(entry.Email || '').trim().toLowerCase() === user.email.trim().toLowerCase())) {
    throw new Error('report-not-authorized');
  }
  const data = await loadFirestoreCollections();
  const generatedAt = new Date();
  const { workbook, chartData, photoTargets } = buildReportWorkbook({ ...data, administrators }, generatedAt);
  addReportCharts(workbook, chartData);
  addReportPhotoFormulas(workbook, photoTargets);
  const buffer = await workbook.xlsx.writeBuffer();
  if (auth.currentUser?.uid !== user.uid) throw new Error('report-session-changed');
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = reportFilename(generatedAt);
  document.body.appendChild(anchor);
  try { anchor.click(); } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
