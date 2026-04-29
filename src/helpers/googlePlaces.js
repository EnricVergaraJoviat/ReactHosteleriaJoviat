let googlePlacesLoaderPromise = null;

function loadMapsBootstrap(apiKey) {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (document.querySelector('script[data-google-maps-bootstrap="true"]')) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const callbackName = `__googleMapsPlacesInit${Date.now()}`;
    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      callback: `google.maps.${callbackName}`,
      loading: 'async',
    });

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsBootstrap = 'true';

    window.google = window.google || {};
    window.google.maps = window.google.maps || {};
    window.google.maps[callbackName] = () => {
      delete window.google.maps[callbackName];
      resolve();
    };

    script.addEventListener('error', () => {
      delete window.google?.maps?.[callbackName];
      reject(new Error('google-script-error'));
    });

    document.head.appendChild(script);
  });
}

function loadGooglePlacesApi(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error('missing-api-key'));
  }

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('missing-window'));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (googlePlacesLoaderPromise) {
    return googlePlacesLoaderPromise;
  }

  googlePlacesLoaderPromise = loadMapsBootstrap(apiKey)
    .then(async () => {
      await window.google.maps.importLibrary('places');

      if (!window.google?.maps?.places) {
        throw new Error('google-places-unavailable');
      }

      return window.google;
    })
    .catch((error) => {
      googlePlacesLoaderPromise = null;
      throw error;
    });

  return googlePlacesLoaderPromise;
}

async function getPlaceClass() {
  if (!window.google?.maps?.importLibrary) {
    throw new Error('google-places-unavailable');
  }

  const { Place } = await window.google.maps.importLibrary('places');

  if (!Place) {
    throw new Error('google-places-unavailable');
  }

  return Place;
}

function getDisplayName(displayName) {
  if (typeof displayName === 'string') {
    return displayName;
  }

  return displayName?.text ?? '';
}

function getPhotoUrl(photo) {
  if (!photo) {
    return '';
  }

  try {
    if (typeof photo.getURI === 'function') {
      return photo.getURI({ maxWidth: 1200, maxHeight: 1200 });
    }

    if (typeof photo.getUrl === 'function') {
      return photo.getUrl({ maxWidth: 1200, maxHeight: 1200 });
    }
  } catch (error) {
    return '';
  }

  return '';
}

function getPhotoName(photo) {
  return photo?.name ?? photo?.photoName ?? '';
}

function getCoordinate(location, methodName, propertyName) {
  if (!location) {
    return null;
  }

  if (typeof location[methodName] === 'function') {
    return location[methodName]();
  }

  return typeof location[propertyName] === 'number' ? location[propertyName] : null;
}

function normalizeSearchResult(place) {
  const primaryPhoto = place.photos?.[0];

  return {
    placeId: place.id ?? '',
    name: getDisplayName(place.displayName),
    address: place.formattedAddress ?? '',
    photoUrl: getPhotoUrl(primaryPhoto),
    photoName: getPhotoName(primaryPhoto),
    primaryType: place.primaryType ?? '',
    types: Array.isArray(place.types) ? place.types : [],
  };
}

function normalizePlaceDetails(place) {
  const primaryPhoto = place.photos?.[0];
  const latitude = getCoordinate(place.location, 'lat', 'latitude');
  const longitude = getCoordinate(place.location, 'lng', 'longitude');

  return {
    googlePlaceId: place.id ?? '',
    name: getDisplayName(place.displayName),
    address: place.formattedAddress ?? '',
    phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? '',
    website: place.websiteURI ?? '',
    googleMapsUrl: place.googleMapsURI ?? '',
    photoUrl: getPhotoUrl(primaryPhoto),
    googlePhotoName: getPhotoName(primaryPhoto),
    rating: typeof place.rating === 'number' ? String(place.rating) : '',
    businessStatus: place.businessStatus ?? '',
    latitude,
    longitude,
    primaryType: place.primaryType ?? '',
    primaryTypeDisplayName: getDisplayName(place.primaryTypeDisplayName),
    types: Array.isArray(place.types) ? place.types : [],
  };
}

async function searchRestaurants(query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const Place = await getPlaceClass();
  const response = await Place.searchByText({
    fields: ['id', 'displayName', 'formattedAddress', 'photos', 'primaryType', 'types'],
    maxResultCount: 10,
    textQuery: trimmedQuery,
  });

  return (response.places ?? []).map(normalizeSearchResult);
}

async function fetchPlaceDetails(placeId) {
  if (!placeId) {
    throw new Error('missing-place-id');
  }

  const Place = await getPlaceClass();
  const place = new Place({ id: placeId });

  await place.fetchFields({
    fields: [
      'businessStatus',
      'displayName',
      'formattedAddress',
      'googleMapsURI',
      'internationalPhoneNumber',
      'location',
      'nationalPhoneNumber',
      'photos',
      'primaryType',
      'primaryTypeDisplayName',
      'rating',
      'types',
      'websiteURI',
    ],
  });

  return normalizePlaceDetails(place);
}

export { fetchPlaceDetails, loadGooglePlacesApi, searchRestaurants };
