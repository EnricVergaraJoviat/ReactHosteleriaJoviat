import { getRestaurantCategoryLabel, getRestaurantCategoryKey } from './placeTypes';

const catalan = {
  PrimaryType: 'spanish_restaurant',
  PrimaryTypeDisplayName: 'Spanish restaurant',
  GoogleMapsTypeLabels: {
    ca: 'Restaurant de cuina catalana',
    es: 'Restaurante de cocina catalana',
    en: 'Catalonian restaurant',
  },
};

test.each(['ca', 'es', 'en'])('shows Maps cuisine instead of the broader type in %s', (language) => {
  expect(getRestaurantCategoryLabel(catalan, language)).toBe(catalan.GoogleMapsTypeLabels[language]);
});

test('uses the same category for imported previews and stored restaurants', () => {
  const preview = { primaryType: catalan.PrimaryType, googleMapsTypeLabels: catalan.GoogleMapsTypeLabels };
  expect(getRestaurantCategoryLabel(preview, 'ca')).toBe(getRestaurantCategoryLabel(catalan, 'ca'));
});

test('keeps the specific cuisine when one language is unavailable', () => {
  expect(getRestaurantCategoryLabel({ ...catalan, GoogleMapsTypeLabels: { ca: 'Restaurant de cuina catalana' } }, 'en'))
    .toBe('Restaurant de cuina catalana');
});

test('falls back to the localized generic type for legacy records or absent Maps labels', () => {
  expect(getRestaurantCategoryLabel({ PrimaryType: 'spanish_restaurant' }, 'es')).toBe('Restaurante español');
  expect(getRestaurantCategoryLabel({ GooglePrimaryType: 'restaurant', GoogleMapsTypeLabels: { ca: '  ' } }, 'en')).toBe('Restaurant');
  expect(getRestaurantCategoryLabel(null)).toBe('');
});

test('filters distinguish Catalan and Spanish cuisine even with the same Places primary type', () => {
  const spanish = { ...catalan, GoogleMapsTypeLabels: { ca: 'Restaurant de cuina espanyola', en: 'Spanish restaurant' } };
  expect(getRestaurantCategoryKey(catalan)).not.toBe(getRestaurantCategoryKey(spanish));
  expect(getRestaurantCategoryKey(catalan)).toBe('category:restaurant de cuina catalana');
  expect(getRestaurantCategoryKey({ PrimaryType: 'restaurant' })).toBe('category:restaurant');
  expect(getRestaurantCategoryKey({})).toBe('');
});

test('groups identical visible labels without merging distinct English categories', () => {
  const pastry = { GoogleMapsTypeLabels: { ca: 'Pastisseria', en: 'Pastry shop' } };
  const cake = { GoogleMapsTypeLabels: { ca: 'Pastisseria', en: 'Cake shop' } };
  expect(getRestaurantCategoryKey(pastry, 'ca')).toBe(getRestaurantCategoryKey(cake, 'ca'));
  expect(getRestaurantCategoryKey(pastry, 'en')).not.toBe(getRestaurantCategoryKey(cake, 'en'));
});
