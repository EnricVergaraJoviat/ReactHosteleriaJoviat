import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import { getImageWithFallback } from '../../helpers/imageFallbacks';
import 'leaflet/dist/leaflet.css';
import './RestaurantsScreen.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function parseLocation(location) {
  if (!location) {
    return null;
  }

  if (typeof location === 'object') {
    if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      return [location.latitude, location.longitude];
    }

    if (typeof location._lat === 'number' && typeof location._long === 'number') {
      return [location._lat, location._long];
    }
  }

  if (typeof location === 'string') {
    const matches = location.match(/-?\d+(?:\.\d+)?/g);

    if (matches && matches.length >= 2) {
      return [Number(matches[0]), Number(matches[1])];
    }
  }

  return null;
}

function formatLocation(location) {
  const parsedLocation = parseLocation(location);

  if (!parsedLocation) {
    return 'Ubicacio no disponible';
  }

  return `${parsedLocation[0].toFixed(6)}, ${parsedLocation[1].toFixed(6)}`;
}

function MapBounds({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) {
      return;
    }

    if (locations.length === 1) {
      map.setView(locations[0], 13);
      return;
    }

    map.fitBounds(locations, { padding: [40, 40] });
  }, [locations, map]);

  return null;
}

function RestaurantsScreen({ onOpenRestaurantDetails }) {
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadRestaurants() {
      try {
        const { restaurants: firestoreRestaurants } = await loadStudentRestaurantGraph();

        if (isMounted) {
          setRestaurants(firestoreRestaurants);
          setError('');
        }
      } catch (loadError) {
        if (isMounted) {
          setError('No s\'han pogut carregar els restaurants de Firestore.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRestaurants();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredRestaurants = restaurants.filter((restaurant) =>
    (restaurant.Name ?? '').toLowerCase().includes(normalizedSearchTerm)
  );

  const restaurantsWithCoordinates = filteredRestaurants
    .map((restaurant) => ({
      ...restaurant,
      coordinates: parseLocation(restaurant.Location),
    }))
    .filter((restaurant) => restaurant.coordinates);

  const mapCenter = restaurantsWithCoordinates[0]?.coordinates ?? [41.3851, 2.1734];

  return (
    <section className="restaurants-screen">
      <div className="restaurants-screen__intro">
        <h1>RESTAURANTS</h1>
      </div>

      <div className="restaurants-search">
        <label className="restaurants-search__label" htmlFor="restaurants-search">
          Cercar restaurant
        </label>
        <div className="restaurants-search__field">
          <input
            id="restaurants-search"
            className="restaurants-search__input"
            type="text"
            value={searchTerm}
            placeholder="Escriu el nom del restaurant"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm ? (
            <button
              className="restaurants-search__clear"
              type="button"
              aria-label="Esborrar cerca de restaurants"
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <p className="restaurants-screen__status" role="status">
          Carregant restaurants...
        </p>
      ) : null}

      {error ? (
        <p className="restaurants-screen__status restaurants-screen__status--error" role="alert">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && restaurants.length === 0 ? (
        <p className="restaurants-screen__status">
          No hi ha restaurants disponibles.
        </p>
      ) : null}

      {!isLoading && !error && restaurants.length > 0 && filteredRestaurants.length === 0 ? (
        <p className="restaurants-screen__status">
          No s&apos;ha trobat cap restaurant amb aquest nom.
        </p>
      ) : null}

      {!isLoading && !error ? (
        <section className="restaurants-map" aria-label="Mapa de restaurants">
          {restaurantsWithCoordinates.length > 0 ? (
            <MapContainer
              center={mapCenter}
              className="restaurants-map__frame"
              scrollWheelZoom={false}
              zoom={13}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapBounds
                locations={restaurantsWithCoordinates.map((restaurant) => restaurant.coordinates)}
              />
              {restaurantsWithCoordinates.map((restaurant) => (
                <Marker key={restaurant.id ?? restaurant.Name} position={restaurant.coordinates}>
                  <Popup>{restaurant.Name ?? 'Sense nom'}</Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="restaurants-map__empty">
              No hi ha coordenades disponibles per mostrar pins al mapa.
            </div>
          )}
        </section>
      ) : null}

      <div className="restaurants-grid">
        {filteredRestaurants.map((restaurant) => (
          <article className="restaurant-card" key={restaurant.id ?? restaurant.Name}>
            <div className="restaurant-card__image-wrap">
              <img
                className="restaurant-card__image"
                src={getImageWithFallback(restaurant.PhotoURL, 'restaurant', restaurant.Name)}
                alt={restaurant.Name ?? 'Restaurant'}
              />
            </div>
            <div className="restaurant-card__body">
              <div className="restaurant-card__header">
                <div>
                  <p className="restaurant-card__label">Restaurant</p>
                  <h2>{restaurant.Name ?? 'Sense nom'}</h2>
                </div>
                <button
                  className="restaurant-card__details"
                  type="button"
                  aria-label={`Obrir fitxa de ${restaurant.Name ?? 'restaurant'}`}
                  onClick={() => onOpenRestaurantDetails(restaurant.id, 'restaurants')}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path
                      d="M12 5c5.5 0 9.5 5.9 9.7 6.2a1.4 1.4 0 0 1 0 1.6C21.5 13.1 17.5 19 12 19S2.5 13.1 2.3 12.8a1.4 1.4 0 0 1 0-1.6C2.5 10.9 6.5 5 12 5Zm0 2C8.4 7 5.4 10.4 4.4 12 5.4 13.6 8.4 17 12 17s6.6-3.4 7.6-5C18.6 10.4 15.6 7 12 7Zm0 1.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
              <p className="restaurant-card__meta">
                {restaurant.linkedStudentCount > 0
                  ? `${restaurant.linkedStudentCount} alumni associat${
                    restaurant.linkedStudentCount === 1 ? '' : 's'
                  }`
                  : formatLocation(restaurant.Location)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RestaurantsScreen;
