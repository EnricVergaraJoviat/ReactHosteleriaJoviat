import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReportDialog from './ReportDialog';
import { downloadAdminReport } from '../../helpers/downloadAdminReport';

jest.mock('../../helpers/downloadAdminReport', () => ({ downloadAdminReport: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});

test('opening and cancelling do not load data or trigger a download', () => {
  const close = jest.fn();
  render(<ReportDialog onClose={close} />);
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Generar i baixar l’informe?');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel·lar' }));
  expect(close).toHaveBeenCalledTimes(1);
  expect(downloadAdminReport).not.toHaveBeenCalled();
});

test('confirmation downloads once and announces success', async () => {
  let resolve;
  downloadAdminReport.mockImplementation(() => new Promise((done) => { resolve = done; }));
  render(<ReportDialog onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Generar i baixar' }));
  await waitFor(() => expect(downloadAdminReport).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button', { name: 'Generant…' })).toBeDisabled();
  resolve();
  expect(await screen.findByRole('button', { name: 'Tancar' })).toBeEnabled();
  expect(screen.getByRole('status')).toHaveTextContent('S’ha iniciat la baixada');
});

test('failure leaves a retry action and permits cancellation', async () => {
  downloadAdminReport.mockRejectedValue(new Error('offline'));
  render(<ReportDialog onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Generar i baixar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No s’ha pogut generar');
  expect(screen.getByRole('button', { name: 'Tornar-ho a provar' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Cancel·lar' })).toBeEnabled();
});
