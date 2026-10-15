import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import './ReportDialog.css';

export default function ReportDialog({ onClose }) {
  const { t } = useI18n();
  const dialogRef = useRef(null);
  const workingRef = useRef(false);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState('ready');

  useEffect(() => {
    mountedRef.current = true;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      mountedRef.current = false;
      dialog.close();
      previousFocus?.focus();
    };
  }, []);

  const generate = async () => {
    if (workingRef.current) return;
    workingRef.current = true;
    setStatus('working');
    try {
      const { downloadAdminReport } = await import('../../helpers/downloadAdminReport');
      if (!mountedRef.current) return;
      await downloadAdminReport();
      if (mountedRef.current) setStatus('done');
    } catch (error) {
      if (mountedRef.current) setStatus('error');
    } finally {
      workingRef.current = false;
    }
  };

  return (
    <dialog ref={dialogRef} className="report-dialog" aria-labelledby="report-title" aria-describedby="report-description"
      onCancel={(event) => { event.preventDefault(); if (!workingRef.current) onClose(); }}>
      <div className="report-dialog__content">
        <span className="report-dialog__eyebrow">JOVIAT NETWORKING · EXCEL</span>
        <h2 id="report-title">{t('report.title')}</h2>
        <p id="report-description">{t('report.description')}</p>
        <div className="report-dialog__preview" aria-hidden="true">
          <div className="report-dialog__preview-cards"><span /><span /><span /></div>
          <div className="report-dialog__preview-bars"><i /><i /><i /></div>
          <div className="report-dialog__preview-table"><span /><span /><span /></div>
        </div>
        <p className="report-dialog__includes">{t('report.includes')}</p>
        {status === 'error' && <p role="alert" className="report-dialog__error">{t('report.error')}</p>}
        <p role="status" aria-live="polite" className="report-dialog__status">
          {status === 'working' ? t('report.working') : status === 'done' ? t('report.done') : ''}
        </p>
        <div className="report-dialog__actions">
          <button type="button" className="report-dialog__cancel" disabled={status === 'working'} onClick={onClose} autoFocus>
            {t(status === 'done' ? 'common.close' : 'common.cancel')}
          </button>
          {status !== 'done' && <button type="button" className="report-dialog__generate" disabled={status === 'working'} onClick={generate}>
            {t(status === 'working' ? 'report.generating' : status === 'error' ? 'report.retry' : 'report.confirm')}
          </button>}
        </div>
      </div>
    </dialog>
  );
}
