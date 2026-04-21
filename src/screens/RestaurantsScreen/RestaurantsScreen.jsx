import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import { joviatMapIcon } from '../../helpers/joviatMapIcon';
import SmartImage from '../../components/SmartImage/SmartImage';
import LinkedStudentsPreview from '../../components/LinkedStudentsPreview/LinkedStudentsPreview';
import { ReactComponent as SearchIcon } from '../../assets/icons/search.svg';
import { useI18n } from '../../i18n/I18nContext';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles';
import './RestaurantsScreen.css';

const RESTAURANTS_PER_PAGE = 8;

function ViewModeIcon({ type }) {
  if (type === 'map') {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M12 3.5A5.5 5.5 0 0 0 6.5 9c0 3.8 4.4 9.5 5 10.2a.7.7 0 0 0 1 0c.6-.7 5-6.4 5-10.2A5.5 5.5 0 0 0 12 3.5Zm0 7.8A2.3 2.3 0 1 1 12 6.7a2.3 2.3 0 0 1 0 4.6Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M5 6.5h14v2H5v-2Zm0 4.5h14v2H5v-2Zm0 4.5h14v2H5v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function AddressIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M12 3.5A5.5 5.5 0 0 0 6.5 9c0 3.8 4.4 9.5 5 10.2a.7.7 0 0 0 1 0c.6-.7 5-6.4 5-10.2A5.5 5.5 0 0 0 12 3.5Zm0 7.8A2.3 2.3 0 1 1 12 6.7a2.3 2.3 0 0 1 0 4.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DetailsIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M12 5c5.5 0 9.5 5.9 9.7 6.2a1.4 1.4 0 0 1 0 1.6C21.5 13.1 17.5 19 12 19S2.5 13.1 2.3 12.8a1.4 1.4 0 0 1 0-1.6C2.5 10.9 6.5 5 12 5Zm0 2C8.4 7 5.4 10.4 4.4 12 5.4 13.6 8.4 17 12 17s6.6-3.4 7.6-5C18.6 10.4 15.6 7 12 7Zm0 1.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

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

function RestaurantCard({ restaurant, onOpenRestaurantDetails, isCompact = false }) {
  const { t } = useI18n();
  const restaurantName = restaurant.Name ?? t('common.noName');
  const openDetailsLabel = isCompact
    ? t('restaurants.openDetailsMap', { name: restaurant.Name ?? t('common.restaurant') })
    : t('restaurants.openDetails', { name: restaurant.Name ?? t('common.restaurant') });

  return (
    <article className={`restaurant-card${isCompact ? ' restaurant-card--compact' : ''}`}>
      <div className="restaurant-card__image-wrap">
        <SmartImage
          className="restaurant-card__image"
          src={restaurant.PhotoURL}
          type="restaurant"
          label={restaurant.Name}
          alt={restaurant.Name ?? t('common.restaurant')}
        />
      </div>
      <div className="restaurant-card__body">
        <h2>{restaurantName}</h2>
        <p className="restaurant-card__address">
          <span className="restaurant-card__address-icon" aria-hidden="true">
            <AddressIcon />
          </span>
          <span>{restaurant.Address ?? t('common.addressUnavailable')}</span>
        </p>
        <LinkedStudentsPreview
          students={restaurant.linkedStudents ?? []}
          count={restaurant.linkedStudentCount ?? 0}
          className="restaurant-card__meta"
        />
        <button
          className="restaurant-card__details"
          type="button"
          aria-label={openDetailsLabel}
          onClick={() => onOpenRestaurantDetails(restaurant.id, 'restaurants')}
        >
          <span className="restaurant-card__details-icon" aria-hidden="true">
            <DetailsIcon />
          </span>
          {t('common.details')}
        </button>
      </div>
    </article>
  );
}

function RestaurantsScreen({ onOpenRestaurantDetails }) {
  const { t } = useI18n();
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('map');

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
          setError(t('restaurants.loadError'));
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
  }, [t]);

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
        <h1>{t('restaurants.title')}</h1>
      </div>

      <div className="restaurants-view-toggle" aria-label={t('restaurants.viewMode')}>
        <button
          className={`restaurants-view-toggle__button${
            viewMode === 'map' ? ' restaurants-view-toggle__button--active' : ''
          }`}
          type="button"
          aria-pressed={viewMode === 'map'}
          onClick={() => setViewMode('map')}
        >
          <span className="restaurants-view-toggle__icon" aria-hidden="true">
            <ViewModeIcon type="map" />
          </span>
          {t('restaurants.mapMode')}
        </button>
        <button
          className={`restaurants-view-toggle__button${
            viewMode === 'list' ? ' restaurants-view-toggle__button--active' : ''
          }`}
          type="button"
          aria-pressed={viewMode === 'list'}
          onClick={() => setViewMode('list')}
        >
          <span className="restaurants-view-toggle__icon" aria-hidden="true">
            <ViewModeIcon type="list" />
          </span>
          {t('restaurants.listMode')}
        </button>
      </div>

      <div className="restaurants-search">
        <label className="restaurants-search__label" htmlFor="restaurants-search">
          <span>{t('restaurants.search')}</span>
          <span className="restaurants-search__count">
            {t('list.showing', { filtered: filteredRestaurants.length, total: restaurants.length })}
          </span>
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
            placeholder={t('restaurants.placeholder')}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm ? (
            <button
              className="restaurants-search__clear"
              type="button"
              aria-label={t('restaurants.clearSearch')}
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="restaurants-screen__status restaurants-screen__status--loading" role="status">
          <span className="restaurants-screen__spinner" aria-hidden="true" />
          <span>{t('restaurants.loading')}</span>
        </div>
      ) : null}

      {error ? (
        <p className="restaurants-screen__status restaurants-screen__status--error" role="alert">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && restaurants.length === 0 ? (
        <p className="restaurants-screen__status">
          {t('restaurants.empty')}
        </p>
      ) : null}

      {!isLoading && !error && restaurants.length > 0 && filteredRestaurants.length === 0 ? (
        <p className="restaurants-screen__status">
          {t('restaurants.noResults')}
        </p>
      ) : null}

      {!isLoading && !error && viewMode === 'map' ? (
        <section className="restaurants-map" aria-label={t('restaurants.map')}>
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
                  <Marker
                    key={restaurant.id ?? restaurant.Name}
                    icon={joviatMapIcon}
                    position={restaurant.coordinates}
                  >
                    <Popup
                      autoPanPadding={[32, 32]}
                      keepInView
                      maxWidth={260}
                      minWidth={220}
                    >
                      <RestaurantCard
                        restaurant={restaurant}
                        onOpenRestaurantDetails={onOpenRestaurantDetails}
                        isCompact
                      />
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          ) : (
            <div className="restaurants-map__empty">
              {t('restaurants.noCoordinates')}
            </div>
          )}
        </section>
      ) : null}

      {!isLoading && !error && viewMode === 'list' ? (
        <>
          {filteredRestaurants.length > RESTAURANTS_PER_PAGE ? (
            <nav className="restaurants-pagination" aria-label={t('restaurants.pagination')}>
              <p className="restaurants-pagination__summary">
                {t('list.rangeRestaurants', { start: rangeStart, end: rangeEnd, total: filteredRestaurants.length })}
              </p>
              <div className="restaurants-pagination__controls">
                <button
                  className="restaurants-pagination__arrow"
                  type="button"
                  aria-label={t('list.previousPage')}
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
                        aria-label={t('list.goToPage', { page: pageNumber })}
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
                  aria-label={t('list.nextPage')}
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
              <RestaurantCard
                key={restaurant.id ?? restaurant.Name}
                restaurant={restaurant}
                onOpenRestaurantDetails={onOpenRestaurantDetails}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export default RestaurantsScreen;
