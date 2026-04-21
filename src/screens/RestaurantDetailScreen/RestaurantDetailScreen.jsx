import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import { deleteRestaurant } from '../../helpers/restaurantDeletion';
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

function formatBusinessStatus(status) {
  const normalizedStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';

  switch (normalizedStatus) {
    case 'OPERATIONAL':
      return 'Operatiu';
    case 'CLOSED_TEMPORARILY':
      return 'Tancat temporalment';
    case 'CLOSED_PERMANENTLY':
      return 'Tancat permanentment';
    default:
      return status || '';
  }
}

function ContactItem({ label, value, href, children }) {
  return (
    <div className="restaurant-detail__contact-item">
      <p className="restaurant-detail__contact-label">{label}</p>
      {children ? children : value ? (
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

function RatingStars({ value }) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return (
      <p className="restaurant-detail__contact-value restaurant-detail__contact-value--muted">
        No disponible
      </p>
    );
  }

  return (
    <div className="restaurant-detail__rating" aria-label={`Rating ${numericValue} de 5`}>
      <div className="restaurant-detail__rating-stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => {
          const starNumber = index + 1;
          const fillPercent = Math.max(0, Math.min(1, numericValue - index)) * 100;

          return (
            <span className="restaurant-detail__rating-star" key={starNumber}>
              <span className="restaurant-detail__rating-star-base">★</span>
              <span
                className="restaurant-detail__rating-star-fill"
                style={{ width: `${fillPercent}%` }}
              >
                ★
              </span>
            </span>
          );
        })}
      </div>
      <p className="restaurant-detail__rating-value">{numericValue.toFixed(1)}</p>
    </div>
  );
}

function RestaurantDetailScreen({
  restaurantId,
  isAdministrator,
  onBack,
  onDeleted,
  onEdit,
  onOpenStudentDetails,
}) {
  const [restaurant, setRestaurant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

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

  function handleStartDelete() {
    setActionMessage('');
    setIsDeleteDialogOpen(true);
  }

  function handleCancelDelete() {
    if (isDeleting) {
      return;
    }

    setIsDeleteDialogOpen(false);
  }

  async function handleConfirmDelete() {
    if (!restaurant) {
      return;
    }

    setActionMessage('');
    setIsDeleting(true);

    try {
      await deleteRestaurant(restaurant);
      setIsDeleteDialogOpen(false);
      onDeleted?.(restaurant.id);
    } catch (deleteError) {
      setActionMessage('No s\'ha pogut eliminar el restaurant. Torna-ho a provar.');
    } finally {
      setIsDeleting(false);
    }
  }

  function handleEdit() {
    setActionMessage('');
    onEdit?.(restaurant.id);
  }

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
          {isAdministrator ? (
            <div className="restaurant-detail__admin-actions">
              <button
                className="restaurant-detail__action restaurant-detail__action--secondary"
                type="button"
                onClick={handleEdit}
              >
                Editar
              </button>
              <button
                className="restaurant-detail__action restaurant-detail__action--danger"
                type="button"
                onClick={handleStartDelete}
              >
                Eliminar
              </button>
            </div>
          ) : null}
          {actionMessage ? (
            <p className="restaurant-detail__action-message" role="status">
              {actionMessage}
            </p>
          ) : null}
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
          <ContactItem
            label="Web"
          >
            {restaurant.Website ? (
              <a
                className="restaurant-detail__contact-action"
                href={restaurant.Website}
                target="_blank"
                rel="noreferrer"
              >
                <span className="restaurant-detail__contact-action-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Zm5.9 8h-2.1a14 14 0 0 0-1.1-4A7 7 0 0 1 17.9 11Zm-5.9 8c-.7 0-1.9-1.7-2.4-5h4.8c-.5 3.3-1.7 5-2.4 5Zm-2.6-7c0-.7.1-1.4.2-2h5c.1.6.2 1.3.2 2s-.1 1.4-.2 2h-5a12 12 0 0 1-.2-2Zm-5.3 0h2.1a14 14 0 0 0 1.1 4A7 7 0 0 1 4.1 12Zm2.1-1H4.1a7 7 0 0 1 3.2-4a14 14 0 0 0-1.1 4Zm5.8-8c.7 0 1.9 1.7 2.4 5H9.6c.5-3.3 1.7-5 2.4-5Zm0 0c-.7 0-1.9 1.7-2.4 5H9.3A14 14 0 0 1 8.2 7A7 7 0 0 1 12 4.1Zm-3.8 12.9c.3.8.7 1.5 1.1 2.1A7 7 0 0 1 4.1 13h2.1Zm7.5 2.1c.5-.6.8-1.3 1.1-2.1h2.1a7 7 0 0 1-3.2 2.1Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span>Visitar web</span>
              </a>
            ) : null}
          </ContactItem>
          <ContactItem
            label="Google Maps"
          >
            {restaurant.GoogleMapsURL ? (
              <a
                className="restaurant-detail__contact-action"
                href={restaurant.GoogleMapsURL}
                target="_blank"
                rel="noreferrer"
              >
                <span className="restaurant-detail__contact-action-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 2.8A6.2 6.2 0 0 0 5.8 9c0 4.4 5 10.7 5.2 10.9a1.3 1.3 0 0 0 2 0c.2-.2 5.2-6.5 5.2-10.9A6.2 6.2 0 0 0 12 2.8Zm0 8.4A2.2 2.2 0 1 1 12 6.8a2.2 2.2 0 0 1 0 4.4Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span>Obrir fitxa a Google Maps</span>
              </a>
            ) : null}
          </ContactItem>
          <ContactItem
            label="Rating"
          >
            <RatingStars value={restaurant.Rating} />
          </ContactItem>
          <ContactItem
            label="Estat del negoci"
            value={formatBusinessStatus(restaurant.BusinessStatus)}
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
                  <p className="restaurant-detail__student-role">
                    {student.role || 'Rol no disponible'}
                  </p>
                  <p className={`restaurant-detail__student-status ${student.currentJob ? '' : 'restaurant-detail__student-status--muted'}`}>
                    {student.currentJob
                      ? 'Treballa actualment en aquest restaurant.'
                      : 'Ara mateix no hi treballa.'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {isDeleteDialogOpen ? (
        <div
          className="restaurant-detail__dialog-backdrop"
          role="presentation"
          onClick={handleCancelDelete}
        >
          <div
            className="restaurant-detail__dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="restaurant-delete-title"
            aria-describedby="restaurant-delete-description"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="restaurant-delete-title">Vols eliminar aquest restaurant?</h2>
            <p id="restaurant-delete-description">
              S&apos;eliminara la fitxa del restaurant i tambe totes les relacions vinculades de la col.leccio Rest-Alum.
            </p>
            <div className="restaurant-detail__dialog-actions">
              <button
                className="restaurant-detail__action restaurant-detail__action--secondary"
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                Cancel.lar
              </button>
              <button
                className="restaurant-detail__action restaurant-detail__action--danger"
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminant...' : 'Confirmar eliminacio'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default RestaurantDetailScreen;
