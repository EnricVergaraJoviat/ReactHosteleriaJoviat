import { addDoc, collection, doc, serverTimestamp } from 'firebase/firestore';
import { loadStudentRestaurantGraph } from './firestoreData';
import { associateRestaurantRegistration } from './restaurantRegistrations';

jest.mock('./firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(), collection: jest.fn(), doc: jest.fn(), serverTimestamp: jest.fn(),
}));
jest.mock('./firestoreData', () => ({
  getReferenceId: (value) => value?.id ?? '',
  loadStudentRestaurantGraph: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  collection.mockImplementation((db, name) => name);
  doc.mockImplementation((db, name, id) => `${name}/${id}`);
  serverTimestamp.mockReturnValue('timestamp');
  loadStudentRestaurantGraph.mockResolvedValue({ students: [
    { id: 'alumni-1', Email: 'alumni@example.com', linkedRestaurants: [] },
  ] });
});

test('associates the requesting alumni without roles, using the reference before the email', async () => {
  await associateRestaurantRegistration({ id_alumni: { id: 'alumni-1' }, Email: 'old@example.com' }, 'restaurant-1');
  expect(addDoc).toHaveBeenCalledWith('Rest-Alum', {
    id_alumni: 'Alumni/alumni-1', id_restaurant: 'Restaurant/restaurant-1',
    rol: [], current_job: false, createdAt: 'timestamp',
  });
});

test('resolves older requests without an alumni reference by normalized email', async () => {
  await associateRestaurantRegistration({ Email: ' Alumni@Example.com ' }, 'restaurant-1');
  expect(addDoc).toHaveBeenCalledTimes(1);
});

test('preserves an existing association and its roles on retry', async () => {
  loadStudentRestaurantGraph.mockResolvedValue({ students: [
    { id: 'alumni-1', linkedRestaurants: [{ id: 'restaurant-1', roles: ['Chef'] }] },
  ] });
  await associateRestaurantRegistration({ id_alumni: { id: 'alumni-1' } }, 'restaurant-1');
  expect(addDoc).not.toHaveBeenCalled();
});

test('fails instead of claiming association when the requester no longer exists', async () => {
  await expect(associateRestaurantRegistration({ id_alumni: { id: 'deleted' } }, 'restaurant-1')).rejects.toThrow();
  expect(addDoc).not.toHaveBeenCalled();
});
