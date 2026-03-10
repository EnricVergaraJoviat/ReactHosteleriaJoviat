import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { db } from '../../helpers/firebase';
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

function RestaurantsScreen() {
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadRestaurants() {
      try {
        const snapshot = await getDocs(collection(db, 'Restaurant'));
        const firestoreRestaurants = snapshot.docs.map((restaurantDoc) => ({
          id: restaurantDoc.id,
          ...restaurantDoc.data(),
        }));

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

  const restaurantsWithCoordinates = restaurants
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
        {restaurants.map((restaurant) => (
          <article className="restaurant-card" key={restaurant.id ?? restaurant.Name}>
            <div className="restaurant-card__body">
              <p className="restaurant-card__label">Restaurant</p>
              <h2>{restaurant.Name ?? 'Sense nom'}</h2>
              <p className="restaurant-card__meta">
                {formatLocation(restaurant.Location)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RestaurantsScreen;
