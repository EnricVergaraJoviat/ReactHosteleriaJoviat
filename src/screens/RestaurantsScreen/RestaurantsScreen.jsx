import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import SmartImage from '../../components/SmartImage/SmartImage';
import LinkedStudentsPreview from '../../components/LinkedStudentsPreview/LinkedStudentsPreview';
import { ReactComponent as SearchIcon } from '../../assets/icons/search.svg';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles';
import './RestaurantsScreen.css';

const RESTAURANTS_PER_PAGE = 8;

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

function createClusterIcon(cluster) {
  return L.divIcon({
    html: `<span>${cluster.getChildCount()}</span>`,
    className: 'restaurants-map__cluster',
    iconSize: L.point(52, 52, true),
  });
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
  const [currentPage, setCurrentPage] = useState(1);

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
  const totalPages = Math.ceil(filteredRestaurants.length / RESTAURANTS_PER_PAGE);
  const visibleRestaurants = filteredRestaurants.slice(
    (currentPage - 1) * RESTAURANTS_PER_PAGE,
    currentPage * RESTAURANTS_PER_PAGE
  );
  const rangeStart = filteredRestaurants.length === 0
    ? 0
    : ((currentPage - 1) * RESTAURANTS_PER_PAGE) + 1;
  const rangeEnd = Math.min(currentPage * RESTAURANTS_PER_PAGE, filteredRestaurants.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearchTerm]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
          <span className="restaurants-search__icon" aria-hidden="true">
            <SearchIcon focusable="false" />
          </span>
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
              <MarkerClusterGroup
                chunkedLoading
                iconCreateFunction={createClusterIcon}
                showCoverageOnHover={false}
              >
                {restaurantsWithCoordinates.map((restaurant) => (
                  <Marker key={restaurant.id ?? restaurant.Name} position={restaurant.coordinates}>
                    <Popup>
                      <article className="restaurants-map__popup">
                        <h2 className="restaurants-map__popup-title">
                          {restaurant.Name ?? 'Sense nom'}
                        </h2>
                        <div className="restaurants-map__popup-content">
                          <div className="restaurants-map__popup-image-wrap">
                            <SmartImage
                              className="restaurants-map__popup-image"
                              src={restaurant.PhotoURL}
                              type="restaurant"
                              label={restaurant.Name}
                              alt={restaurant.Name ?? 'Restaurant'}
                            />
                          </div>
                          <div className="restaurants-map__popup-copy">
                            <p className="restaurants-map__popup-eyebrow">Alumnes associats</p>
                            <LinkedStudentsPreview
                              students={restaurant.linkedStudents ?? []}
                              count={restaurant.linkedStudentCount ?? 0}
                              className="restaurants-map__popup-students"
                            />
                          </div>
                        </div>
                        <button
                          className="restaurants-map__popup-button"
                          type="button"
                          onClick={() => onOpenRestaurantDetails(restaurant.id, 'restaurants')}
                        >
                          Veure detall
                        </button>
                      </article>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          ) : (
            <div className="restaurants-map__empty">
              No hi ha coordenades disponibles per mostrar pins al mapa.
            </div>
          )}
        </section>
      ) : null}

      {!isLoading && !error && filteredRestaurants.length > RESTAURANTS_PER_PAGE ? (
        <nav className="restaurants-pagination" aria-label="Paginacio de restaurants">
          <p className="restaurants-pagination__summary">
            {rangeStart} a {rangeEnd} de {filteredRestaurants.length} restaurants
          </p>
          <div className="restaurants-pagination__controls">
            <button
              className="restaurants-pagination__arrow"
              type="button"
              aria-label="Pagina anterior"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              ‹
            </button>
            <div className="restaurants-pagination__pages">
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;

                return (
                  <button
                    key={pageNumber}
                    className={`restaurants-pagination__page${
                      pageNumber === currentPage ? ' restaurants-pagination__page--active' : ''
                    }`}
                    type="button"
                    aria-label={`Anar a la pagina ${pageNumber}`}
                    aria-current={pageNumber === currentPage ? 'page' : undefined}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            <button
              className="restaurants-pagination__arrow"
              type="button"
              aria-label="Pagina seguent"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              ›
            </button>
          </div>
        </nav>
      ) : null}

      <div className="restaurants-grid">
        {visibleRestaurants.map((restaurant) => (
          <article className="restaurant-card" key={restaurant.id ?? restaurant.Name}>
            <div className="restaurant-card__image-wrap">
              <SmartImage
                className="restaurant-card__image"
                src={restaurant.PhotoURL}
                type="restaurant"
                label={restaurant.Name}
                alt={restaurant.Name ?? 'Restaurant'}
              />
            </div>
            <div className="restaurant-card__body">
              <div className="restaurant-card__header">
                <div>
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
              <LinkedStudentsPreview
                students={restaurant.linkedStudents ?? []}
                count={restaurant.linkedStudentCount ?? 0}
                className="restaurant-card__meta"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RestaurantsScreen;
