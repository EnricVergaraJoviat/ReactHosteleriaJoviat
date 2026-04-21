import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, functions, storage } from '../../helpers/firebase';
import {
  fetchPlaceDetails,
  loadGooglePlacesApi,
  searchRestaurants,
} from '../../helpers/googlePlaces';
import 'leaflet/dist/leaflet.css';
import './AddRestaurantScreen.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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

function getPlacesErrorMessage(error) {
  switch (error?.message) {
    case 'missing-api-key':
      return 'Falta configurar REACT_APP_GOOGLE_MAPS_API_KEY per poder cercar restaurants a Google Places.';
    case 'REQUEST_DENIED':
      return 'Google Places ha rebutjat la peticio. Revisa la clau API i els permisos.';
    case 'OVER_QUERY_LIMIT':
      return 'S\'ha superat el limit de consultes de Google Places.';
    case 'google-script-error':
    case 'google-places-unavailable':
      return 'No s\'ha pogut carregar Google Places. Torna-ho a provar.';
    default:
      return 'No s\'ha pogut completar la consulta a Google Places.';
  }
}

function getRestaurantSaveErrorMessage(error, mode) {
  if (
    error?.message === 'restaurant-photo-download-failed'
    || error?.message === 'restaurant-photo-fetch-failed'
  ) {
    return 'No s\'ha pogut descarregar la foto del restaurant des de Google Places per pujar-la a Storage.';
  }

  switch (error?.code) {
    case 'permission-denied':
      return mode === 'edit'
        ? 'Firebase ha rebutjat l\'actualitzacio del restaurant per permisos insuficients.'
        : 'Firebase ha rebutjat la creacio del restaurant per permisos insuficients.';
    case 'not-found':
      return 'No s\'ha trobat aquest restaurant a Firestore. Potser el document ja no existeix.';
    case 'unauthenticated':
      return 'Cal tenir la sessio iniciada per modificar restaurants.';
    case 'storage/unauthorized':
      return 'No tens permisos per pujar la foto del restaurant a Storage.';
    case 'storage/object-not-found':
      return 'La foto del restaurant no s\'ha trobat a Storage.';
    case 'storage/unknown':
      return 'Storage ha retornat un error desconegut mentre es pujava la foto del restaurant.';
    case 'unavailable':
      return 'Firebase no esta disponible ara mateix. Torna-ho a provar daqui una estona.';
    default:
      return mode === 'edit'
        ? `No s'ha pogut actualitzar el restaurant. ${error?.code ? `(${error.code})` : 'Torna-ho a provar.'}`
        : `No s'ha pogut desar el restaurant. ${error?.code ? `(${error.code})` : 'Torna-ho a provar.'}`;
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

function AddRestaurantScreen({ mode = 'create', restaurant = null, onSaved }) {
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

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setGoogleStatus('missing-key');
      setGoogleError(getPlacesErrorMessage(new Error('missing-api-key')));
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
          setGoogleError(getPlacesErrorMessage(error));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
  }, [restaurant, mode]);

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
      setErrorMessage('Escriu un nom abans de cercar.');
      return;
    }

    if (googleStatus !== 'ready') {
      setErrorMessage(googleError || 'Google Places encara no esta disponible.');
      return;
    }

    setIsSearching(true);

    try {
      const places = await searchRestaurants(trimmedSearch);
      setResults(places);
      setSelectedPlaceId(places[0]?.placeId ?? '');

      if (places.length === 0) {
        setErrorMessage('No s\'han trobat restaurants amb aquesta cerca.');
      }
    } catch (error) {
      setErrorMessage(getPlacesErrorMessage(error));
    } finally {
      setIsSearching(false);
    }
  }

  async function handleImportSelectedPlace() {
    if (!selectedPlaceId) {
      setErrorMessage('Selecciona un restaurant del llistat.');
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
      setSuccessMessage('Dades del restaurant carregades des de Google Places. Pots revisar-les abans de desar.');
    } catch (error) {
      setErrorMessage(getPlacesErrorMessage(error));
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
      setErrorMessage('El nom del restaurant es obligatori.');
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
              ? 'No s\'ha pogut actualitzar la nova foto de Google Places i s\'ha mantingut la foto anterior.'
              : 'No s\'ha pogut desar la nova foto de Google Places, pero la resta de canvis del restaurant si que s\'han actualitzat.';
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
              ? 'No s\'ha pogut actualitzar la nova foto des de Google Places i s\'ha mantingut la foto anterior.'
              : 'No s\'ha pogut desar la nova foto des de Google Places, pero la resta de canvis del restaurant si que s\'han actualitzat.';
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
        setSuccessMessage(photoUploadWarning || 'Restaurant actualitzat correctament.');
        onSaved?.(restaurant.id);
      } else {
        const createdRestaurant = await addDoc(collection(db, 'Restaurant'), {
          ...restaurantPayload,
          createdAt: serverTimestamp(),
        });

        setFormData(INITIAL_FORM_DATA);
        setResults([]);
        setSelectedPlaceId('');
        setSearchTerm('');
        setSuccessTone('success');
        setSuccessMessage('Restaurant creat correctament.');
        onSaved?.(createdRestaurant.id);
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
      setErrorMessage(getRestaurantSaveErrorMessage(error, mode));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isEditing = mode === 'edit';
  const screenTitle = isEditing ? 'Editar Restaurant' : 'Afegir Restaurant';
  const screenDescription = isEditing
    ? 'Actualitza la fitxa del restaurant reutilitzant el mateix formulari de creacio.'
    : 'Cerca el restaurant a Google Places, selecciona\'l del llistat i importa la seva informacio per omplir la fitxa automaticament abans de desar-la a Firestore.';
  const submitLabel = isEditing ? 'Desar canvis' : 'Desar restaurant';
  const submitLoadingLabel = isEditing ? 'Desant canvis...' : 'Desant...';

  return (
    <section className="add-restaurant-screen">
      <div className="add-restaurant-screen__intro">
        <p className="add-restaurant-screen__eyebrow">Administracio</p>
        <h1>{screenTitle}</h1>
        <p className="add-restaurant-screen__description">
          {screenDescription}
        </p>
      </div>

      <form className="add-restaurant-form" onSubmit={handleSubmit}>
        <section className="add-restaurant-form__card add-restaurant-form__card--search">
          <div className="add-restaurant-form__panel-heading">
            <div>
              <h2>Cerca a Google Places</h2>
              <p>Escriu el nom del restaurant i recupera els resultats disponibles.</p>
            </div>
          </div>

          <div className="add-restaurant-form__search-row">
            <label className="add-restaurant-form__field add-restaurant-form__field--grow">
              <span>Nom del restaurant</span>
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
              {isSearching ? 'Cercant...' : 'Buscar'}
            </button>
          </div>

          <div className="add-restaurant-form__search-row add-restaurant-form__search-row--results">
            <label className="add-restaurant-form__field add-restaurant-form__field--grow">
              <span>Resultats</span>
              <select
                value={selectedPlaceId}
                onChange={(event) => setSelectedPlaceId(event.target.value)}
                disabled={results.length === 0}
              >
                <option value="">
                  {results.length ? 'Selecciona un restaurant' : 'Encara no hi ha resultats'}
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
              {isImporting ? 'Importando...' : 'Autocompletar'}
            </button>
          </div>

          {selectedResult ? (
            <div className="add-restaurant-form__selected">
              <strong>{selectedResult.name}</strong>
              <p>{selectedResult.address || 'Adreca no disponible'}</p>
            </div>
          ) : null}

          {googleStatus === 'loading' ? (
            <p className="add-restaurant-form__status" role="status">
              Carregant Google Places...
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
              <h2>Dades del restaurant</h2>
              <p>Revisa els camps importats i completa manualment el que Google no proporcioni.</p>
            </div>
          </div>

          <div className="add-restaurant-form__grid">
            <label className="add-restaurant-form__field add-restaurant-form__field--full">
              <span>Nom</span>
              <input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="Nom del restaurant"
              />
            </label>

            <label className="add-restaurant-form__field add-restaurant-form__field--full">
              <span>Adreca</span>
              <input
                name="address"
                type="text"
                value={formData.address}
                onChange={handleFormChange}
                placeholder="Adreca completa"
              />
            </label>

            <label className="add-restaurant-form__field">
              <span>Telefon</span>
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
              <span>Latitud</span>
              <input
                name="latitude"
                type="text"
                value={formData.latitude}
                onChange={handleFormChange}
                placeholder="41.390000"
              />
            </label>

            <label className="add-restaurant-form__field">
              <span>Longitud</span>
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
              <span>Estat del negoci</span>
              <input
                name="businessStatus"
                type="text"
                value={formData.businessStatus}
                onChange={handleFormChange}
                placeholder="OPERATIONAL"
              />
            </label>

            <label className="add-restaurant-form__field add-restaurant-form__field--full">
              <span>Foto URL</span>
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
            <section className="add-restaurant-form__preview-card" aria-label="Previsualitzacio de foto">
              <div className="add-restaurant-form__preview-heading">
                <h3>Previsualitzacio de foto</h3>
              </div>
              {formData.photoUrl && !hasPhotoPreviewError ? (
                <img
                  className="add-restaurant-form__photo-preview"
                  src={formData.photoUrl}
                  alt={formData.name || 'Previsualitzacio del restaurant'}
                  onError={() => setHasPhotoPreviewError(true)}
                />
              ) : (
                <p className="add-restaurant-form__preview-empty">
                  {formData.photoUrl
                    ? 'No s\'ha pogut carregar la imatge de la URL indicada.'
                    : 'Afegeix una Photo URL per veure la imatge aqui.'}
                </p>
              )}
            </section>

            <section className="add-restaurant-form__preview-card" aria-label="Previsualitzacio del mapa">
              <div className="add-restaurant-form__preview-heading">
                <h3>Previsualitzacio del mapa</h3>
              </div>
              {googleEmbedUrl ? (
                <div className="add-restaurant-form__map-wrap">
                  <iframe
                    className="add-restaurant-form__map-embed"
                    title="Previsualitzacio Google Maps"
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
                    <Marker position={previewCoordinates}>
                      <Popup>{formData.name || 'Restaurant'}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              ) : (
                <p className="add-restaurant-form__preview-empty">
                  Afegeix coordenades o un Google Maps URL valid per veure la ubicacio al mapa.
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
    </section>
  );
}

export default AddRestaurantScreen;
