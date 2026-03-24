import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import SmartImage from '../../components/SmartImage/SmartImage';
import 'leaflet/dist/leaflet.css';
import './RestaurantDetailScreen.css';

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

function ContactItem({ label, value, href }) {
  return (
    <div className="restaurant-detail__contact-item">
      <p className="restaurant-detail__contact-label">{label}</p>
      {value ? (
        href ? (
          <a
            className="restaurant-detail__contact-value restaurant-detail__contact-value--link"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {value}
          </a>
        ) : (
          <p className="restaurant-detail__contact-value">{value}</p>
        )
      ) : (
        <p className="restaurant-detail__contact-value restaurant-detail__contact-value--muted">
          No disponible
        </p>
      )}
    </div>
  );
}

function RestaurantDetailScreen({ restaurantId, onBack, onOpenStudentDetails }) {
  const [restaurant, setRestaurant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadRestaurant() {
      try {
        const { restaurants } = await loadStudentRestaurantGraph();
        const selectedRestaurant = restaurants.find((entry) => entry.id === restaurantId) ?? null;

        if (isMounted) {
          setRestaurant(selectedRestaurant);
          setError(selectedRestaurant ? '' : 'No s\'ha trobat la fitxa del restaurant.');
        }
      } catch (loadError) {
        if (isMounted) {
          setError('No s\'ha pogut carregar la fitxa del restaurant.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRestaurant();

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  if (isLoading) {
    return (
      <section className="restaurant-detail">
        <p className="restaurant-detail__status" role="status">
          Carregant fitxa del restaurant...
        </p>
      </section>
    );
  }

  if (error || !restaurant) {
    return (
      <section className="restaurant-detail">
        <button className="restaurant-detail__back" type="button" onClick={onBack}>
          Tornar
        </button>
        <p className="restaurant-detail__status restaurant-detail__status--error" role="alert">
          {error || 'No s\'ha trobat la fitxa del restaurant.'}
        </p>
      </section>
    );
  }

  const coordinates = parseLocation(restaurant.Location);

  return (
    <section className="restaurant-detail">
      <div className="restaurant-detail__header">
        <button className="restaurant-detail__back" type="button" onClick={onBack}>
          Tornar
        </button>
      </div>

      <div className="restaurant-detail__hero">
        <div className="restaurant-detail__photo-wrap">
          <SmartImage
            className="restaurant-detail__photo"
            src={restaurant.PhotoURL}
            type="restaurant"
            label={restaurant.Name}
            alt={restaurant.Name ?? 'Restaurant'}
          />
        </div>
        <div className="restaurant-detail__hero-body">
          <p className="restaurant-detail__eyebrow">Fitxa de restaurant</p>
          <h1>{restaurant.Name ?? 'Sense nom'}</h1>
          <p className="restaurant-detail__address">
            {restaurant.Address ?? 'Adreca no disponible'}
          </p>
        </div>
      </div>

      <section className="restaurant-detail__panel">
        <h2>Ubicacio</h2>
        {coordinates ? (
          <div className="restaurant-detail__map-wrap">
            <MapContainer
              center={coordinates}
              className="restaurant-detail__map"
              scrollWheelZoom={false}
              zoom={15}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={coordinates}>
                <Popup>{restaurant.Name ?? 'Sense nom'}</Popup>
              </Marker>
            </MapContainer>
          </div>
        ) : (
          <div className="restaurant-detail__map-empty">
            No hi ha ubicacio disponible per mostrar al mapa.
          </div>
        )}
      </section>

      <section className="restaurant-detail__panel">
        <h2>Contacte</h2>
        <div className="restaurant-detail__contacts">
          <ContactItem
            label="Phone"
            value={restaurant.Phone}
            href={restaurant.Phone ? `tel:${restaurant.Phone}` : ''}
          />
          <ContactItem
            label="Email"
            value={restaurant.Email}
            href={restaurant.Email ? `mailto:${restaurant.Email}` : ''}
          />
        </div>
      </section>

      <section className="restaurant-detail__panel">
        <div className="restaurant-detail__panel-heading">
          <h2>Alumnes</h2>
          <p>
            {restaurant.linkedStudents?.length
              ? 'Llistat d\'alumnes vinculats a aquest restaurant.'
              : 'Encara no hi ha alumnes vinculats a aquest restaurant.'}
          </p>
        </div>

        {restaurant.linkedStudents?.length ? (
          <div className="restaurant-detail__students">
            {restaurant.linkedStudents.map((student) => (
              <article className="restaurant-detail__student-card" key={`${restaurant.id}-${student.id}`}>
                <div className="restaurant-detail__student-image-wrap">
                  <SmartImage
                    className="restaurant-detail__student-image"
                    src={student.PhotoURL}
                    type="student"
                    label={student.Name}
                    alt={student.Name ?? 'Alumne'}
                  />
                </div>
                <div className="restaurant-detail__student-body">
                  <div className="restaurant-detail__student-topline">
                    <h3>{student.Name ?? 'Sense nom'}</h3>
                    <div className="restaurant-detail__student-actions">
                      <span className={`restaurant-detail__badge ${student.currentJob ? '' : 'restaurant-detail__badge--muted'}`}>
                        {student.currentJob ? 'Actualment' : 'Anteriorment'}
                      </span>
                      <button
                        className="restaurant-detail__details"
                        type="button"
                        aria-label={`Obrir fitxa de ${student.Name ?? 'alumne'}`}
                        onClick={() => onOpenStudentDetails(student.id, 'restaurant-detail')}
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <path
                            d="M12 5c5.5 0 9.5 5.9 9.7 6.2a1.4 1.4 0 0 1 0 1.6C21.5 13.1 17.5 19 12 19S2.5 13.1 2.3 12.8a1.4 1.4 0 0 1 0-1.6C2.5 10.9 6.5 5 12 5Zm0 2C8.4 7 5.4 10.4 4.4 12 5.4 13.6 8.4 17 12 17s6.6-3.4 7.6-5C18.6 10.4 15.6 7 12 7Zm0 1.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="restaurant-detail__student-role">
                    {student.role || 'Rol no disponible'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}

export default RestaurantDetailScreen;
