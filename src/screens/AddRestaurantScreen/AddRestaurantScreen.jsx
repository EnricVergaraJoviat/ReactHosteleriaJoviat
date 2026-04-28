import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, functions, storage } from '../../helpers/firebase';
import { joviatMapIcon } from '../../helpers/joviatMapIcon';
import {
  fetchPlaceDetails,
  loadGooglePlacesApi,
  searchRestaurants,
} from '../../helpers/googlePlaces';
import { useI18n } from '../../i18n/I18nContext';
import 'leaflet/dist/leaflet.css';
import './AddRestaurantScreen.css';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY ?? '';
const STORAGE_BUCKET = storage?.app?.options?.storageBucket ?? '';

const INITIAL_FORM_DATA = {
  name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  googleMapsUrl: '',
  photoUrl: '',
  rating: '',
  businessStatus: '',
  latitude: '',
  longitude: '',
  googlePlaceId: '',
  googlePhotoName: '',
};

function normalizeFileName(fileName) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function getImageExtension(urlValue, contentType) {
  if (typeof contentType === 'string' && contentType.includes('/')) {
    const extension = contentType.split('/')[1]?.split(';')[0]?.trim().toLowerCase();

    if (extension) {
      return extension === 'jpeg' ? 'jpg' : extension;
    }
  }

  try {
    const parsedUrl = new URL(urlValue);
    const pathname = parsedUrl.pathname ?? '';
    const pathnameParts = pathname.split('.');
    const rawExtension = pathnameParts[pathnameParts.length - 1]?.toLowerCase();

    if (rawExtension && rawExtension.length <= 5) {
      return rawExtension;
    }
  } catch (error) {}

  return 'jpg';
}

async function uploadRestaurantPhoto(photoUrl, { restaurantName, googlePlaceId }) {
  let response;

  try {
    response = await fetch(photoUrl);
  } catch (error) {
    console.error('Restaurant photo fetch failed', {
      photoUrl,
      restaurantName,
      googlePlaceId,
      error,
    });
    throw new Error('restaurant-photo-fetch-failed');
  }

  if (!response.ok) {
    console.error('Restaurant photo download failed', {
      photoUrl,
      restaurantName,
      googlePlaceId,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error('restaurant-photo-download-failed');
  }

  const photoBlob = await response.blob();
  const fileExtension = getImageExtension(photoUrl, photoBlob.type);
  const safeBaseName = normalizeFileName(
    googlePlaceId || restaurantName || `restaurant-${Date.now()}`
  ) || `restaurant-${Date.now()}`;
  const storagePath = `restaurantes/${Date.now()}-${safeBaseName}.${fileExtension}`;
  const storageReference = ref(storage, storagePath);

  try {
    await uploadBytes(storageReference, photoBlob, photoBlob.type
      ? { contentType: photoBlob.type }
      : undefined);
  } catch (error) {
    console.error('Restaurant photo upload failed', {
      photoUrl,
      restaurantName,
      googlePlaceId,
      storagePath,
      error,
    });
    throw error;
  }

  return getDownloadURL(storageReference);
}

function isFirebaseStorageUrl(urlValue) {
  if (!urlValue) {
    return false;
  }

  try {
    const parsedUrl = new URL(urlValue);

    return (
      parsedUrl.hostname === 'firebasestorage.googleapis.com'
      || parsedUrl.hostname === 'storage.googleapis.com'
      || (Boolean(STORAGE_BUCKET) && (
        parsedUrl.hostname === STORAGE_BUCKET
        || parsedUrl.pathname.includes(`/b/${STORAGE_BUCKET}/`)
        || parsedUrl.pathname.includes(`/${STORAGE_BUCKET}/`)
      ))
    );
  } catch (error) {
    return false;
  }
}

function buildFormDataFromRestaurant(restaurant) {
  if (!restaurant) {
    return INITIAL_FORM_DATA;
  }

  const location = restaurant.Location;
  const latitude = typeof location?.latitude === 'number'
    ? location.latitude
    : typeof location?._lat === 'number'
      ? location._lat
      : '';
  const longitude = typeof location?.longitude === 'number'
    ? location.longitude
    : typeof location?._long === 'number'
      ? location._long
      : '';

  return {
    name: restaurant.Name ?? '',
    address: restaurant.Address ?? '',
    phone: restaurant.Phone ?? '',
    email: restaurant.Email ?? '',
    website: restaurant.Website ?? '',
    googleMapsUrl: restaurant.GoogleMapsURL ?? '',
    photoUrl: restaurant.PhotoURL ?? '',
    rating: restaurant.Rating ?? '',
    businessStatus: restaurant.BusinessStatus ?? '',
    latitude: latitude === '' ? '' : String(latitude),
    longitude: longitude === '' ? '' : String(longitude),
    googlePlaceId: restaurant.GooglePlaceId ?? '',
    googlePhotoName: restaurant.GooglePhotoName ?? '',
  };
}

const copyPlacePhotoToStorage = httpsCallable(functions, 'copyPlacePhotoToStorage');

function getPlacesErrorMessage(error, t) {
  switch (error?.message) {
    case 'missing-api-key':
      return t('forms.missingGoogleApiKey');
    case 'REQUEST_DENIED':
      return t('forms.googleDenied');
    case 'OVER_QUERY_LIMIT':
      return t('forms.googleLimit');
    case 'google-script-error':
    case 'google-places-unavailable':
      return t('forms.googleLoadError');
    default:
      return t('forms.googleQueryError');
  }
}

function getRestaurantSaveErrorMessage(error, mode, t) {
  if (
    error?.message === 'restaurant-photo-download-failed'
    || error?.message === 'restaurant-photo-fetch-failed'
  ) {
    return t('forms.restaurantPhotoDownloadError');
  }

  switch (error?.code) {
    case 'permission-denied':
      return mode === 'edit'
        ? t('forms.restaurantPermissionUpdate')
        : t('forms.restaurantPermissionCreate');
    case 'not-found':
      return t('forms.restaurantNotFound');
    case 'unauthenticated':
      return t('forms.restaurantUnauthenticated');
    case 'storage/unauthorized':
      return t('forms.storageUnauthorized');
    case 'storage/object-not-found':
      return t('forms.storagePhotoNotFound');
    case 'storage/unknown':
      return t('forms.storageUnknown');
    case 'unavailable':
      return t('forms.firebaseUnavailable');
    default:
      return mode === 'edit'
        ? t('forms.restaurantUpdateFailed', { detail: error?.code ? `(${error.code})` : t('forms.tryAgain') })
        : t('forms.restaurantSaveFailed', { detail: error?.code ? `(${error.code})` : t('forms.tryAgain') });
  }
}

function parseGoogleMapsCoordinates(urlValue) {
  if (!urlValue) {
    return null;
  }

  const normalizedUrl = urlValue.trim();

  const directMatch = urlValue.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

  if (directMatch) {
    return [Number(directMatch[1]), Number(directMatch[2])];
  }

  const embedMatch = urlValue.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);

  if (embedMatch) {
    return [Number(embedMatch[1]), Number(embedMatch[2])];
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    const candidateParams = ['q', 'query', 'll', 'sll', 'center'];

    for (const paramName of candidateParams) {
      const paramValue = parsedUrl.searchParams.get(paramName);

      if (!paramValue) {
        continue;
      }

      const paramMatch = paramValue.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);

      if (paramMatch) {
        return [Number(paramMatch[1]), Number(paramMatch[2])];
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

function buildGoogleEmbedUrl({ googlePlaceId, latitude, longitude, address, name }) {
  if (!GOOGLE_MAPS_API_KEY) {
    return '';
  }

  const baseUrl = 'https://www.google.com/maps/embed/v1/place';
  const params = new URLSearchParams({
    key: GOOGLE_MAPS_API_KEY,
  });

  if (googlePlaceId) {
    params.set('q', `place_id:${googlePlaceId}`);
    return `${baseUrl}?${params.toString()}`;
  }

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isNaN(parsedLatitude) && !Number.isNaN(parsedLongitude)) {
    params.set('q', `${parsedLatitude},${parsedLongitude}`);
    return `${baseUrl}?${params.toString()}`;
  }

  const fallbackQuery = [name, address].filter(Boolean).join(', ');

  if (fallbackQuery) {
    params.set('q', fallbackQuery);
    return `${baseUrl}?${params.toString()}`;
  }

  return '';
}

function AddRestaurantScreen({
  mode = 'create',
  restaurant = null,
  onSaved,
  onOpenCreatedRestaurant,
}) {
  const { t } = useI18n();
  const [googleStatus, setGoogleStatus] = useState(
    GOOGLE_MAPS_API_KEY ? 'loading' : 'missing-key'
  );
  const [googleError, setGoogleError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(() => buildFormDataFromRestaurant(restaurant));
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [successTone, setSuccessTone] = useState('success');
  const [hasPhotoPreviewError, setHasPhotoPreviewError] = useState(false);
  const [createdRestaurantInfo, setCreatedRestaurantInfo] = useState(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setGoogleStatus('missing-key');
      setGoogleError(getPlacesErrorMessage(new Error('missing-api-key'), t));
      return;
    }

    let isMounted = true;

    loadGooglePlacesApi(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (isMounted) {
          setGoogleStatus('ready');
          setGoogleError('');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setGoogleStatus('error');
          setGoogleError(getPlacesErrorMessage(error, t));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [t]);

  const selectedResult = useMemo(
    () => results.find((entry) => entry.placeId === selectedPlaceId) ?? null,
    [results, selectedPlaceId]
  );

  const previewCoordinates = useMemo(() => {
    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);

    if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
      return [latitude, longitude];
    }

    return parseGoogleMapsCoordinates(formData.googleMapsUrl);
  }, [formData.googleMapsUrl, formData.latitude, formData.longitude]);

  const googleEmbedUrl = useMemo(
    () => buildGoogleEmbedUrl(formData),
    [formData]
  );

  useEffect(() => {
    setHasPhotoPreviewError(false);
  }, [formData.photoUrl]);

  useEffect(() => {
    setFormData(buildFormDataFromRestaurant(restaurant));
    setResults([]);
    setSelectedPlaceId('');
    setSearchTerm('');
    setErrorMessage('');
    setSuccessMessage('');
    setSuccessTone('success');
    setCreatedRestaurantInfo(null);
  }, [restaurant, mode]);

  function resetCreateForm() {
    setFormData(INITIAL_FORM_DATA);
    setResults([]);
    setSelectedPlaceId('');
    setSearchTerm('');
    setErrorMessage('');
    setSuccessMessage('');
    setSuccessTone('success');
    setHasPhotoPreviewError(false);
    setCreatedRestaurantInfo(null);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setErrorMessage('');
    setSuccessMessage('');
    setSuccessTone('success');
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSearch(event) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setSuccessTone('success');

    const trimmedSearch = searchTerm.trim();

    if (!trimmedSearch) {
      setErrorMessage(t('forms.searchBefore'));
      return;
    }

    if (googleStatus !== 'ready') {
      setErrorMessage(googleError || t('forms.googleNotReady'));
      return;
    }

    setIsSearching(true);

    try {
      const places = await searchRestaurants(trimmedSearch);
      setResults(places);
      setSelectedPlaceId(places[0]?.placeId ?? '');

      if (places.length === 0) {
        setErrorMessage(t('forms.noRestaurantsFound'));
      }
    } catch (error) {
      setErrorMessage(getPlacesErrorMessage(error, t));
    } finally {
      setIsSearching(false);
    }
  }

  async function handleImportSelectedPlace() {
    if (!selectedPlaceId) {
      setErrorMessage(t('forms.selectRestaurantError'));
      return;
    }

    setIsImporting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setSuccessTone('success');

    try {
      const details = await fetchPlaceDetails(selectedPlaceId);

      setFormData({
        name: details.name,
        address: details.address,
        phone: details.phone,
        email: '',
        website: details.website,
        googleMapsUrl: details.googleMapsUrl,
        photoUrl: details.photoUrl || selectedResult?.photoUrl || '',
        rating: details.rating,
        businessStatus: details.businessStatus,
        latitude: details.latitude != null ? String(details.latitude) : '',
        longitude: details.longitude != null ? String(details.longitude) : '',
        googlePlaceId: details.googlePlaceId,
        googlePhotoName: details.googlePhotoName ?? '',
      });
      setSuccessMessage(t('forms.restaurantImported'));
    } catch (error) {
      setErrorMessage(getPlacesErrorMessage(error, t));
    } finally {
      setIsImporting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setSuccessTone('success');

    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      setErrorMessage(t('forms.searchBefore'));
      return;
    }

    setIsSubmitting(true);

    try {
      const latitude = Number(formData.latitude);
      const longitude = Number(formData.longitude);
      const hasValidCoordinates = !Number.isNaN(latitude) && !Number.isNaN(longitude);
      const trimmedPhotoUrl = formData.photoUrl.trim();
      const trimmedGooglePhotoName = formData.googlePhotoName.trim();
      const trimmedGooglePlaceId = formData.googlePlaceId.trim();
      const existingStoredPhotoUrl = (restaurant?.PhotoURL ?? '').trim();
      const shouldCopyGooglePhoto = Boolean(trimmedPhotoUrl)
        && !isFirebaseStorageUrl(trimmedPhotoUrl)
        && Boolean(trimmedGooglePhotoName || trimmedGooglePlaceId);
      const shouldUploadPhoto = Boolean(trimmedPhotoUrl)
        && !shouldCopyGooglePhoto
        && !isFirebaseStorageUrl(trimmedPhotoUrl);
      let storedPhotoUrl = trimmedPhotoUrl;
      let photoUploadWarning = '';

      if (shouldCopyGooglePhoto) {
        try {
          const result = await copyPlacePhotoToStorage({
            photoName: trimmedGooglePhotoName,
            restaurantName: trimmedName,
            googlePlaceId: trimmedGooglePlaceId,
          });
          storedPhotoUrl = result.data?.photoUrl ?? trimmedPhotoUrl;
        } catch (error) {
          if (mode === 'edit') {
            storedPhotoUrl = existingStoredPhotoUrl;
            photoUploadWarning = existingStoredPhotoUrl
              ? t('forms.photoUpdateWarning')
              : t('forms.photoSaveWarning');
          } else {
            throw error;
          }
        }
      } else if (shouldUploadPhoto) {
        try {
          storedPhotoUrl = await uploadRestaurantPhoto(trimmedPhotoUrl, {
            restaurantName: trimmedName,
            googlePlaceId: formData.googlePlaceId.trim(),
          });
        } catch (error) {
          if (mode === 'edit') {
            storedPhotoUrl = existingStoredPhotoUrl;
            photoUploadWarning = existingStoredPhotoUrl
              ? t('forms.photoUrlUpdateWarning')
              : t('forms.photoUrlSaveWarning');
          } else {
            throw error;
          }
        }
      }

      const restaurantPayload = {
        Name: trimmedName,
        Address: formData.address.trim(),
        Phone: formData.phone.trim(),
        Email: formData.email.trim(),
        Website: formData.website.trim(),
        GoogleMapsURL: formData.googleMapsUrl.trim(),
        PhotoURL: storedPhotoUrl,
        Rating: formData.rating.trim(),
        BusinessStatus: formData.businessStatus.trim(),
        GooglePlaceId: formData.googlePlaceId.trim(),
        GooglePhotoName: formData.googlePhotoName.trim(),
        Location: hasValidCoordinates ? { latitude, longitude } : '',
      };

      if (mode === 'edit' && restaurant?.id) {
        await updateDoc(doc(db, 'Restaurant', restaurant.id), {
          ...restaurantPayload,
          updatedAt: serverTimestamp(),
        });
        setSuccessTone(photoUploadWarning ? 'warning' : 'success');
        setSuccessMessage(photoUploadWarning || t('forms.restaurantUpdated'));
        onSaved?.(restaurant.id);
      } else {
        const createdRestaurant = await addDoc(collection(db, 'Restaurant'), {
          ...restaurantPayload,
          createdAt: serverTimestamp(),
        });

        await onSaved?.(createdRestaurant.id);
        setSuccessTone('success');
        setSuccessMessage(t('forms.restaurantCreated'));
        setCreatedRestaurantInfo({
          id: createdRestaurant.id,
          name: trimmedName,
        });
      }
    } catch (error) {
      console.error('Restaurant save failed', {
        mode,
        restaurantId: restaurant?.id ?? null,
        error,
        errorCode: error?.code ?? null,
        errorMessage: error?.message ?? null,
      });
      setSuccessTone('success');
      setErrorMessage(getRestaurantSaveErrorMessage(error, mode, t));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isEditing = mode === 'edit';
  const screenTitle = isEditing ? t('forms.editRestaurant') : t('forms.addRestaurant');
  const screenDescription = isEditing
    ? t('forms.restaurantEditDescription')
    : t('forms.restaurantCreateDescription');
  const submitLabel = isEditing ? t('common.saveChanges') : t('forms.saveRestaurant');
  const submitLoadingLabel = isEditing ? t('common.saving') : t('common.saving');

  return (
    <section className="add-restaurant-screen">
      <div className="add-restaurant-screen__intro">
        <p className="add-restaurant-screen__eyebrow">{t('common.administration')}</p>
        <h1>{screenTitle}</h1>
        <p className="add-restaurant-screen__description">
          {screenDescription}
        </p>
      </div>

      <form className="add-restaurant-form" onSubmit={handleSubmit}>
        <section className="add-restaurant-form__card add-restaurant-form__card--search">
          <div className="add-restaurant-form__panel-heading">
            <div>
              <h2>{t('forms.googleSearchTitle')}</h2>
              <p>{t('forms.googleSearchDescription')}</p>
            </div>
          </div>

          <div className="add-restaurant-form__search-row">
            <label className="add-restaurant-form__field add-restaurant-form__field--grow">
              <span>{t('forms.restaurantName')}</span>
              <input
                name="google-search"
                type="text"
                value={searchTerm}
                placeholder="Ex. Disfrutar Barcelona"
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <button
              className="add-restaurant-form__action"
              type="button"
              onClick={handleSearch}
              disabled={isSearching || googleStatus === 'loading'}
            >
              {isSearching ? t('forms.searching') : t('forms.search')}
            </button>
          </div>

          <div className="add-restaurant-form__search-row add-restaurant-form__search-row--results">
            <label className="add-restaurant-form__field add-restaurant-form__field--grow">
              <span>{t('forms.results')}</span>
              <select
                value={selectedPlaceId}
                onChange={(event) => setSelectedPlaceId(event.target.value)}
                disabled={results.length === 0}
              >
                <option value="">
                  {results.length ? t('forms.selectRestaurant') : t('forms.noResultsYet')}
                </option>
                {results.map((result) => (
                  <option key={result.placeId} value={result.placeId}>
                    {result.name}{result.address ? ` · ${result.address}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="add-restaurant-form__action add-restaurant-form__action--secondary"
              type="button"
              onClick={handleImportSelectedPlace}
              disabled={!selectedPlaceId || isImporting}
            >
              {isImporting ? t('forms.importing') : t('forms.autocomplete')}
            </button>
          </div>

          {selectedResult ? (
            <div className="add-restaurant-form__selected">
              <strong>{selectedResult.name}</strong>
              <p>{selectedResult.address || t('common.addressUnavailable')}</p>
            </div>
          ) : null}

          {googleStatus === 'loading' ? (
            <p className="add-restaurant-form__status" role="status">
              {t('forms.loadingGoogle')}
            </p>
          ) : null}

          {googleError ? (
            <p className="add-restaurant-form__feedback add-restaurant-form__feedback--error" role="alert">
              {googleError}
            </p>
          ) : null}
        </section>

        <section className="add-restaurant-form__card">
          <div className="add-restaurant-form__panel-heading">
            <div>
              <h2>{t('forms.restaurantData')}</h2>
              <p>{t('forms.restaurantDataDescription')}</p>
            </div>
          </div>

          <div className="add-restaurant-form__grid">
            <label className="add-restaurant-form__field add-restaurant-form__field--full">
              <span>{t('forms.name')}</span>
              <input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleFormChange}
                placeholder={t('forms.restaurantName')}
              />
            </label>

            <label className="add-restaurant-form__field add-restaurant-form__field--full">
              <span>{t('forms.address')}</span>
              <input
                name="address"
                type="text"
                value={formData.address}
                onChange={handleFormChange}
                placeholder={t('forms.fullAddress')}
              />
            </label>

            <label className="add-restaurant-form__field">
              <span>{t('common.phone')}</span>
              <input
                name="phone"
                type="text"
                value={formData.phone}
                onChange={handleFormChange}
                placeholder="+34 000 000 000"
              />
            </label>

            <label className="add-restaurant-form__field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="contacte@restaurant.com"
              />
            </label>

            <label className="add-restaurant-form__field">
              <span>Web</span>
              <input
                name="website"
                type="url"
                value={formData.website}
                onChange={handleFormChange}
                placeholder="https://restaurant.com"
              />
            </label>

            <label className="add-restaurant-form__field">
              <span>Google Maps URL</span>
              <input
                name="googleMapsUrl"
                type="url"
                value={formData.googleMapsUrl}
                onChange={handleFormChange}
                placeholder="https://maps.google.com/..."
              />
            </label>

            <label className="add-restaurant-form__field">
              <span>{t('forms.latitude')}</span>
              <input
                name="latitude"
                type="text"
                value={formData.latitude}
                onChange={handleFormChange}
                placeholder="41.390000"
              />
            </label>

            <label className="add-restaurant-form__field">
              <span>{t('forms.longitude')}</span>
              <input
                name="longitude"
                type="text"
                value={formData.longitude}
                onChange={handleFormChange}
                placeholder="2.150000"
              />
            </label>

            <label className="add-restaurant-form__field">
              <span>Rating</span>
              <input
                name="rating"
                type="text"
                value={formData.rating}
                onChange={handleFormChange}
                placeholder="4.8"
              />
            </label>

            <label className="add-restaurant-form__field">
              <span>{t('common.businessStatus')}</span>
              <input
                name="businessStatus"
                type="text"
                value={formData.businessStatus}
                onChange={handleFormChange}
                placeholder="OPERATIONAL"
              />
            </label>

            <label className="add-restaurant-form__field add-restaurant-form__field--full">
              <span>{t('forms.photoUrl')}</span>
              <input
                name="photoUrl"
                type="url"
                value={formData.photoUrl}
                onChange={handleFormChange}
                placeholder="https://..."
              />
            </label>

            <label className="add-restaurant-form__field add-restaurant-form__field--full">
              <span>Google Place ID</span>
              <input
                name="googlePlaceId"
                type="text"
                value={formData.googlePlaceId}
                onChange={handleFormChange}
                placeholder="place_id"
              />
            </label>
          </div>

          <div className="add-restaurant-form__preview-grid">
            <section className="add-restaurant-form__preview-card" aria-label={t('forms.photoPreview')}>
              <div className="add-restaurant-form__preview-heading">
                <h3>{t('forms.photoPreview')}</h3>
              </div>
              {formData.photoUrl && !hasPhotoPreviewError ? (
                <img
                  className="add-restaurant-form__photo-preview"
                  src={formData.photoUrl}
                  alt={formData.name || t('forms.photoPreviewAlt')}
                  onError={() => setHasPhotoPreviewError(true)}
                />
              ) : (
                <p className="add-restaurant-form__preview-empty">
                  {formData.photoUrl
                    ? t('forms.photoPreviewError')
                    : t('forms.photoPreviewEmpty')}
                </p>
              )}
            </section>

            <section className="add-restaurant-form__preview-card" aria-label={t('forms.mapPreview')}>
              <div className="add-restaurant-form__preview-heading">
                <h3>{t('forms.mapPreview')}</h3>
              </div>
              {googleEmbedUrl ? (
                <div className="add-restaurant-form__map-wrap">
                  <iframe
                    className="add-restaurant-form__map-embed"
                    title={t('forms.googleMapsPreviewTitle')}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={googleEmbedUrl}
                  />
                </div>
              ) : previewCoordinates ? (
                <div className="add-restaurant-form__map-wrap">
                  <MapContainer
                    center={previewCoordinates}
                    className="add-restaurant-form__map"
                    scrollWheelZoom={false}
                    zoom={15}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker icon={joviatMapIcon} position={previewCoordinates}>
                      <Popup>{formData.name || t('common.restaurant')}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              ) : (
                <p className="add-restaurant-form__preview-empty">
                  {t('forms.mapPreviewEmpty')}
                </p>
              )}
            </section>
          </div>

          {errorMessage ? (
            <p className="add-restaurant-form__feedback add-restaurant-form__feedback--error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p
              className={`add-restaurant-form__feedback ${
                successTone === 'warning'
                  ? 'add-restaurant-form__feedback--warning'
                  : 'add-restaurant-form__feedback--success'
              }`}
              role="status"
            >
              {successMessage}
            </p>
          ) : null}

          <div className="add-restaurant-form__actions">
            <button className="add-restaurant-form__submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? submitLoadingLabel : submitLabel}
            </button>
          </div>
        </section>
      </form>

      {createdRestaurantInfo ? (
        <div className="add-restaurant-form__dialog-layer" role="presentation">
          <div
            className="add-restaurant-form__dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="restaurant-created-title"
            aria-describedby="restaurant-created-description"
          >
            <h2 id="restaurant-created-title">{t('forms.restaurantCreatedDialogTitle')}</h2>
            <p id="restaurant-created-description">
              {t('forms.restaurantCreatedDialogDescription', {
                name: createdRestaurantInfo.name,
              })}
            </p>
            <div className="add-restaurant-form__dialog-actions">
              <button
                className="add-restaurant-form__action add-restaurant-form__action--secondary"
                type="button"
                onClick={() => onOpenCreatedRestaurant?.(createdRestaurantInfo.id)}
              >
                {t('forms.openCreatedRestaurant', { name: createdRestaurantInfo.name })}
              </button>
              <button
                className="add-restaurant-form__action"
                type="button"
                onClick={resetCreateForm}
              >
                {t('forms.createAnotherRestaurant')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AddRestaurantScreen;
