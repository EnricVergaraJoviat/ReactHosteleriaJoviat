import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestAccessDialog from './RequestAccessDialog';
import { fetchPlaceDetails, loadGooglePlacesApi, searchRestaurants } from '../../helpers/googlePlaces';

jest.mock('../../helpers/googlePlaces', () => ({
  fetchPlaceDetails: jest.fn(), loadGooglePlacesApi: jest.fn(), searchRestaurants: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  loadGooglePlacesApi.mockResolvedValue({});
  searchRestaurants.mockResolvedValue([
    { placeId: 'new-place', name: 'Restaurant Nou', address: 'Manresa' },
    { placeId: 'other-place', name: 'Restaurant Nou', address: 'Vic' },
  ]);
  fetchPlaceDetails.mockImplementation(async (id) => ({
    googlePlaceId: id, name: 'Restaurant Nou', address: id === 'new-place' ? 'Manresa' : 'Vic', photoUrl: 'https://example.com/photo.jpg',
  }));
});

async function personalStep() {
  await userEvent.type(screen.getByLabelText('Email'), 'alumni@example.com');
  await userEvent.type(screen.getByLabelText('Nom i cognoms'), 'Alumni Joviat');
  expect(screen.getByRole('button', { name: 'Següent' })).toBeDisabled();
  await userEvent.click(screen.getByRole('checkbox'));
  await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Següent' })); });
}

async function selectPlace() {
  await userEvent.type(screen.getByLabelText("Nom de l'establiment"), 'Restaurant Nou');
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  await screen.findByRole('option', { name: /Restaurant Nou · Manresa/ });
  await userEvent.selectOptions(screen.getByLabelText('Resultats'), 'new-place');
  await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Següent' })); });
  await screen.findByLabelText('Perfil professional');
}

test('requires an explicit place and role, preserves all steps, and submits only once', async () => {
  let finish;
  const onRequestAccess = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
  render(<RequestAccessDialog onClose={jest.fn()} onRequestAccess={onRequestAccess} />);
  await personalStep();
  expect(screen.getByRole('button', { name: 'Següent' })).toBeDisabled();
  await selectPlace();
  expect(screen.getByAltText('Restaurant Nou')).toHaveAttribute('src', 'https://example.com/photo.jpg');
  expect(screen.getByRole('button', { name: 'Sol·licitar accés' })).toBeDisabled();
  await userEvent.selectOptions(screen.getByLabelText('Perfil professional'), 'kitchen');
  await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
  expect(screen.getByLabelText('Resultats')).toHaveValue('new-place');
  await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
  expect(screen.getByLabelText('Email')).toHaveValue('alumni@example.com');
  expect(screen.getByRole('checkbox')).toBeChecked();
  await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Següent' })); });
  await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Següent' })); });
  expect(await screen.findByLabelText('Perfil professional')).toHaveValue('kitchen');
  const submit = screen.getByRole('button', { name: 'Sol·licitar accés' });
  await userEvent.dblClick(submit);
  expect(onRequestAccess).toHaveBeenCalledTimes(1);
  expect(onRequestAccess).toHaveBeenCalledWith({ email: 'alumni@example.com', name: 'Alumni Joviat', hasAcceptedLegalTerms: true, googlePlaceId: 'new-place', role: 'kitchen' });
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  await act(async () => finish());
  expect(await screen.findByRole('status')).toHaveTextContent("S'ha enviat");
});

test('does not select the first namesake and clears the selection when a search changes', async () => {
  render(<RequestAccessDialog onClose={jest.fn()} onRequestAccess={jest.fn()} />);
  await personalStep();
  await userEvent.type(screen.getByLabelText("Nom de l'establiment"), 'Nou');
  fireEvent.keyDown(screen.getByLabelText("Nom de l'establiment"), { key: 'Enter' });
  await screen.findByRole('option', { name: /Restaurant Nou · Vic/ });
  expect(screen.getByRole('button', { name: 'Següent' })).toBeDisabled();
  await userEvent.selectOptions(screen.getByLabelText('Resultats'), 'other-place');
  await userEvent.type(screen.getByLabelText("Nom de l'establiment"), ' Barcelona');
  expect(screen.getByLabelText('Resultats')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Següent' })).toBeDisabled();
});

test('keeps the request editable after search, details and submission errors', async () => {
  const submit = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({});
  render(<RequestAccessDialog onClose={jest.fn()} onRequestAccess={submit} />);
  await personalStep();
  searchRestaurants.mockRejectedValueOnce(new Error('offline'));
  await userEvent.type(screen.getByLabelText("Nom de l'establiment"), 'Nou');
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No s’ha pogut cercar');
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  await screen.findByRole('option', { name: /Restaurant Nou · Manresa/ });
  await userEvent.selectOptions(screen.getByLabelText('Resultats'), 'new-place');
  fetchPlaceDetails.mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Següent' })); });
  expect(await screen.findByRole('alert')).toHaveTextContent('No s’han pogut carregar');
  await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Següent' })); });
  await userEvent.selectOptions(await screen.findByLabelText('Perfil professional'), 'owner');
  await userEvent.click(screen.getByRole('button', { name: 'Sol·licitar accés' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Perfil professional')).toHaveValue('owner');
  await userEvent.click(screen.getByRole('button', { name: 'Sol·licitar accés' }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole('status')).toHaveTextContent("S'ha enviat");
});
