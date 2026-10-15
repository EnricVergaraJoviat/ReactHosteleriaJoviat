import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDocs } from 'firebase/firestore';
import { acceptUserRegistration } from '../../helpers/userRegistrations';
import { I18nProvider } from '../../i18n/I18nContext';
import ManageRegistrationsScreen from './ManageRegistrationsScreen';

jest.mock('../../helpers/firebase', () => ({ db: {}, functions: {} }));
jest.mock('firebase/firestore', () => ({
  collection: (_, name) => name, getDocs: jest.fn(), deleteDoc: jest.fn(), doc: jest.fn(),
}));
jest.mock('firebase/functions', () => ({ httpsCallable: () => jest.fn() }));
jest.mock('../../helpers/userRegistrations', () => ({
  USER_REGISTRATIONS_COLLECTION: 'UserRegistrations',
  acceptUserRegistration: jest.fn(), rejectUserRegistration: jest.fn(),
}));

const restaurant = {
  Name: 'Restaurant Sol', Address: 'Manresa', GooglePlaceId: 'place-sol',
  PhotoURL: 'https://photos.example.test/sol.jpg',
};
const request = { id: 'request-1', Name: 'Anna Soler', Email: 'anna@example.test', Role: 'kitchen', Restaurant: restaurant };

beforeEach(() => {
  localStorage.setItem('joviat-language', 'es');
  acceptUserRegistration.mockReset();
});

afterEach(() => { localStorage.clear(); });

async function showRequests({ existingRestaurants = [], requests = [request] } = {}) {
  getDocs.mockImplementation(async (name) => ({
    docs: (name === 'UserRegistrations' ? requests : name === 'Restaurant' ? existingRestaurants : [])
      .map((data) => ({ id: data.id, data: () => data })),
  }));
  render(<I18nProvider><ManageRegistrationsScreen activeRegistrationView="users" onRegistrationViewChange={jest.fn()} /></I18nProvider>);
  await screen.findByRole('heading', { name: requests[0].Name });
}

test.each([false, true])('shows the photo, exact Maps place and registration status in the card and confirmation (existing: %s)', async (existing) => {
  const storedPhoto = 'https://storage.example.test/sol.jpg';
  await showRequests({ existingRestaurants: existing ? [{ ...restaurant, id: 'stored', PhotoURL: storedPhoto }] : [] });
  const photo = screen.getByRole('img', { name: restaurant.Name });
  expect(photo).toHaveAttribute('src', existing ? storedPhoto : restaurant.PhotoURL);
  const link = screen.getByRole('link', { name: /abrir ficha en google maps/i });
  expect(new URL(link.href).searchParams.get('query_place_id')).toBe('place-sol');
  expect(link).toHaveAttribute('target', '_blank');
  const status = existing ? 'Ya dado de alta' : 'Todavía no está dado de alta';
  expect(screen.getByText(status)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
  const dialog = within(screen.getByRole('alertdialog'));
  expect(dialog.getByRole('img', { name: restaurant.Name })).toBeInTheDocument();
  expect(dialog.getByText(status)).toBeInTheDocument();
  expect(dialog.getByRole('link', { name: /abrir ficha en google maps/i })).toHaveAttribute('href', link.href);
});

test('same-name restaurants with different Google IDs are not mistaken for an existing place', async () => {
  await showRequests({ existingRestaurants: [{ ...restaurant, GooglePlaceId: 'another-place', id: 'namesake' }] });
  expect(screen.getByText('Todavía no está dado de alta')).toBeInTheDocument();
});

test('shows a fallback image if the saved Google photo is no longer available', async () => {
  await showRequests();
  const photo = screen.getByRole('img', { name: restaurant.Name });
  fireEvent.error(photo);
  expect(photo).not.toHaveAttribute('src', restaurant.PhotoURL);
  expect(screen.getByRole('link', { name: /google maps/i })).toBeInTheDocument();
});

test.each([true, false])('uses the actual server outcome and updates other requests for the same place (created: %s)', async (created) => {
  acceptUserRegistration.mockResolvedValue({ restaurantCreated: created, restaurantId: 'stored', restaurantName: 'Restaurant Sol verificat', emailSent: true });
  await showRequests({ requests: [request, { ...request, id: 'request-2', Name: 'Joan Puig' }] });
  const card = within(screen.getAllByRole('listitem')[0]);
  await userEvent.click(card.getByRole('button', { name: 'Aceptar' }));
  await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  const message = screen.getByRole('status');
  expect(message).toHaveTextContent('Anna Soler');
  expect(message).toHaveTextContent('Restaurant Sol verificat');
  expect(message).toHaveTextContent(created ? 'se ha creado el vínculo entre ambos' : 'ya existía en la base de datos');
  expect(screen.getByText('Ya dado de alta')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Anna Soler' })).not.toBeInTheDocument();
});

test('keeps the creation summary when sending the access email fails', async () => {
  acceptUserRegistration.mockResolvedValue({ restaurantCreated: true, restaurantId: 'stored', restaurantName: restaurant.Name, emailSent: false });
  await showRequests();
  await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
  await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  const message = screen.getByRole('status');
  expect(message).toHaveTextContent('se ha creado el establecimiento');
  expect(message).toHaveTextContent('se ha creado el vínculo');
  expect(message).toHaveTextContent('No se ha podido enviar el correo de acceso');
});

test('legacy requests do not claim a restaurant or link was created', async () => {
  acceptUserRegistration.mockResolvedValue({ studentId: 'new', emailSent: true });
  await showRequests({ requests: [{ ...request, Restaurant: undefined, Role: undefined }] });
  await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
  await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(screen.getByRole('status')).toHaveTextContent('Se ha dado de alta a Anna Soler.');
  expect(screen.getByRole('status')).not.toHaveTextContent('establecimiento');
});
