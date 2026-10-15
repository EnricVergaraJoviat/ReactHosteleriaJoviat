import { fetchPlaceDetails } from './googlePlaces';
import { getGoogleMapsCategories } from 'firebase/functions';

jest.mock('./firebase', () => ({ functions: {} }));
jest.mock('firebase/functions', () => {
  const getGoogleMapsCategories = jest.fn();
  return { getGoogleMapsCategories, httpsCallable: () => getGoogleMapsCategories };
});

const originalGoogle = window.google;
let fetchFields;

beforeEach(() => {
  fetchFields = jest.fn().mockResolvedValue({});
  class Place {
    constructor({ id }) {
      this.id = id;
      this.displayName = "El Cigró d'Or";
      this.primaryType = 'spanish_restaurant';
      this.primaryTypeDisplayName = 'Spanish restaurant';
      this.fetchFields = fetchFields;
    }
  }
  window.google = { maps: { importLibrary: jest.fn().mockResolvedValue({ Place }) } };
  getGoogleMapsCategories.mockReset();
});

afterAll(() => { window.google = originalGoogle; });

test('imports the Maps labels alongside the original Places type', async () => {
  const labels = { ca: 'Restaurant de cuina catalana', es: 'Restaurante de cocina catalana', en: 'Catalonian restaurant' };
  getGoogleMapsCategories.mockResolvedValue({ data: { googleMapsTypeLabels: labels } });
  expect(await fetchPlaceDetails('place-cigro')).toMatchObject({
    googlePlaceId: 'place-cigro', primaryType: 'spanish_restaurant', googleMapsTypeLabels: labels,
  });
  expect(getGoogleMapsCategories).toHaveBeenCalledWith({ placeId: 'place-cigro' });
  // The unsupported REST field must never be sent to the JavaScript SDK.
  expect(fetchFields.mock.calls[0][0].fields).not.toContain('googleMapsTypeLabel');
});

test('keeps the import usable if the optional category service is unavailable', async () => {
  getGoogleMapsCategories.mockRejectedValue({ code: 'functions/unavailable' });
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    expect(await fetchPlaceDetails('place-cigro')).toMatchObject({
      name: "El Cigró d'Or", primaryType: 'spanish_restaurant', googleMapsTypeLabels: {},
    });
  } finally {
    warning.mockRestore();
  }
});

test('public registration loads place details without calling the administrator-only category service', async () => {
  expect(await fetchPlaceDetails('place-cigro', { includeCategories: false })).toMatchObject({
    googlePlaceId: 'place-cigro', name: "El Cigró d'Or", googleMapsTypeLabels: {},
  });
  expect(getGoogleMapsCategories).not.toHaveBeenCalled();
});
