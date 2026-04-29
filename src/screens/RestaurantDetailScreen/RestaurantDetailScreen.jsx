import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import { joviatMapIcon } from '../../helpers/joviatMapIcon';
import { getRestaurantPrimaryType, getTranslatedPlaceType } from '../../helpers/placeTypes';
import { formatPromotionYear } from '../../helpers/promotionYears';
import { translateRestaurantRole } from '../../helpers/restaurantRoles';
import { deleteRestaurant } from '../../helpers/restaurantDeletion';
import SmartImage from '../../components/SmartImage/SmartImage';
import { useI18n } from '../../i18n/I18nContext';
import 'leaflet/dist/leaflet.css';
import './RestaurantDetailScreen.css';

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

function formatBusinessStatus(status, t) {
  const normalizedStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';

  switch (normalizedStatus) {
    case 'OPERATIONAL':
      return t('detail.operational');
    case 'CLOSED_TEMPORARILY':
      return t('detail.closedTemporarily');
    case 'CLOSED_PERMANENTLY':
      return t('detail.closedPermanently');
    default:
      return status || '';
  }
}

function DetailIcon({ type }) {
  switch (type) {
    case 'edit':
      return (
        <svg viewBox="0 0 24 24">
          <path
            d="M4.8 16.9 16.2 5.5a2.1 2.1 0 0 1 3 0l.3.3a2.1 2.1 0 0 1 0 3L8.1 20.2l-4 .8.7-4.1Zm2 1.1.5-.1L18.1 7.1l-.2-.2L7.1 17.7l-.3.3Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'delete':
      return (
        <svg viewBox="0 0 24 24">
          <path
            d="M8.5 4.5 9.4 3h5.2l.9 1.5H20v2H4v-2h4.5Zm-2.3 4h11.6l-.7 11.1A1.5 1.5 0 0 1 15.6 21H8.4a1.5 1.5 0 0 1-1.5-1.4L6.2 8.5Zm3.1 2 .4 8h1.7l-.3-8H9.3Zm3.6 0-.3 8h1.7l.4-8h-1.8Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'phone':
      return (
        <svg viewBox="0 0 24 24">
          <path
            d="M6.7 4.2 9 3.5a1.5 1.5 0 0 1 1.8.9l1 2.3a1.5 1.5 0 0 1-.4 1.7l-1.1 1a10.7 10.7 0 0 0 4.3 4.3l1-1.1a1.5 1.5 0 0 1 1.7-.4l2.3 1a1.5 1.5 0 0 1 .9 1.8l-.7 2.3a2.2 2.2 0 0 1-2.2 1.6C10.6 18.9 5.1 13.4 5.1 6.4a2.2 2.2 0 0 1 1.6-2.2Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'email':
      return (
        <svg viewBox="0 0 24 24">
          <path
            d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm14 3.2-6.4 4.4a1 1 0 0 1-1.2 0L5 8.2V17h14V8.2ZM6.3 7l5.7 3.9L17.7 7H6.3Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'location':
      return (
        <svg viewBox="0 0 24 24">
          <path
            d="M12 2.8A6.2 6.2 0 0 0 5.8 9c0 4.4 5 10.7 5.2 10.9a1.3 1.3 0 0 0 2 0c.2-.2 5.2-6.5 5.2-10.9A6.2 6.2 0 0 0 12 2.8Zm0 8.4A2.2 2.2 0 1 1 12 6.8a2.2 2.2 0 0 1 0 4.4Z"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return null;
  }
}

function ContactItem({ label, value, href, icon, children }) {
  const { t } = useI18n();

  return (
    <div className="restaurant-detail__contact-item">
      <p className="restaurant-detail__contact-label">{label}</p>
      {children ? children : value ? (
        href ? (
          <a
            className="restaurant-detail__contact-value restaurant-detail__contact-value--link restaurant-detail__contact-value--with-icon"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {icon ? (
              <span className="restaurant-detail__contact-value-icon" aria-hidden="true">
                <DetailIcon type={icon} />
              </span>
            ) : null}
            <span>{value}</span>
          </a>
        ) : (
          <p className={`restaurant-detail__contact-value${icon ? ' restaurant-detail__contact-value--with-icon' : ''}`}>
            {icon ? (
              <span className="restaurant-detail__contact-value-icon" aria-hidden="true">
                <DetailIcon type={icon} />
              </span>
            ) : null}
            <span>{value}</span>
          </p>
        )
      ) : (
        <p className="restaurant-detail__contact-value restaurant-detail__contact-value--muted">
          {t('common.notAvailable')}
        </p>
      )}
    </div>
  );
}

function RatingStars({ value }) {
  const { t } = useI18n();
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return (
      <p className="restaurant-detail__contact-value restaurant-detail__contact-value--muted">
        {t('common.notAvailable')}
      </p>
    );
  }

  return (
    <div className="restaurant-detail__rating" aria-label={t('detail.ratingLabel', { value: numericValue })}>
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

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M10.7 5.3 4 12l6.7 6.7 1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4Z"
        fill="currentColor"
      />
    </svg>
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
  const { language, t } = useI18n();
  const [restaurant, setRestaurant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [isLocationExpanded, setIsLocationExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRestaurant() {
      try {
        const { restaurants } = await loadStudentRestaurantGraph();
        const selectedRestaurant = restaurants.find((entry) => entry.id === restaurantId) ?? null;

        if (isMounted) {
          setRestaurant(selectedRestaurant);
          setError(selectedRestaurant ? '' : t('detail.restaurantMissing'));
        }
      } catch (loadError) {
        if (isMounted) {
          setError(t('detail.restaurantLoadError'));
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
  }, [restaurantId, t]);

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
      setActionMessage(t('detail.restaurantDeleteError'));
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
          {t('detail.restaurantLoading')}
        </p>
      </section>
    );
  }

  if (error || !restaurant) {
    return (
      <section className="restaurant-detail">
        <button className="restaurant-detail__back" type="button" onClick={onBack}>
          <span className="restaurant-detail__back-icon" aria-hidden="true">
            <BackIcon />
          </span>
          {t('common.back')}
        </button>
        <p className="restaurant-detail__status restaurant-detail__status--error" role="alert">
          {error || t('detail.restaurantMissing')}
        </p>
      </section>
    );
  }

  const coordinates = parseLocation(restaurant.Location);
  const restaurantPrimaryType = getRestaurantPrimaryType(restaurant);
  const categoryLabel = restaurantPrimaryType
    ? getTranslatedPlaceType(restaurantPrimaryType, language)
    : '';

  return (
    <section className="restaurant-detail">
      <div className="restaurant-detail__header">
        <button className="restaurant-detail__back" type="button" onClick={onBack}>
          <span className="restaurant-detail__back-icon" aria-hidden="true">
            <BackIcon />
          </span>
          {t('common.back')}
        </button>
      </div>

      <div className="restaurant-detail__hero">
        <div className="restaurant-detail__photo-wrap">
          <SmartImage
            className="restaurant-detail__photo"
            src={restaurant.PhotoURL}
            type="restaurant"
            label={restaurant.Name}
            alt={restaurant.Name ?? t('common.restaurant')}
          />
        </div>
        <div className="restaurant-detail__hero-body">
          <p className="restaurant-detail__eyebrow">{t('detail.restaurantSheet')}</p>
          <h1>{restaurant.Name ?? t('common.noName')}</h1>
          <p className="restaurant-detail__address">
            <span className="restaurant-detail__address-icon" aria-hidden="true">
              <DetailIcon type="location" />
            </span>
            <span>{restaurant.Address ?? t('common.addressUnavailable')}</span>
          </p>
          {isAdministrator ? (
            <div className="restaurant-detail__admin-actions">
              <button
                className="restaurant-detail__action restaurant-detail__action--secondary"
                type="button"
                onClick={handleEdit}
              >
                <span className="restaurant-detail__action-icon" aria-hidden="true">
                  <DetailIcon type="edit" />
                </span>
                {t('common.edit')}
              </button>
              <button
                className="restaurant-detail__action restaurant-detail__action--danger"
                type="button"
                onClick={handleStartDelete}
              >
                <span className="restaurant-detail__action-icon" aria-hidden="true">
                  <DetailIcon type="delete" />
                </span>
                {t('common.delete')}
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
        <div className="restaurant-detail__contacts">
          <ContactItem
            label={t('detail.category')}
            value={categoryLabel}
          />
          <ContactItem
            label={t('common.phone')}
            value={restaurant.Phone}
            href={restaurant.Phone ? `tel:${restaurant.Phone}` : ''}
            icon="phone"
          />
          <ContactItem
            label="Email"
            value={restaurant.Email}
            href={restaurant.Email ? `mailto:${restaurant.Email}` : ''}
            icon="email"
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
                <span>{t('detail.visitWeb')}</span>
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
                <span>{t('detail.openGoogleMaps')}</span>
              </a>
            ) : null}
          </ContactItem>
          <ContactItem
            label="Rating"
          >
            <RatingStars value={restaurant.Rating} />
          </ContactItem>
          <ContactItem
            label={t('common.businessStatus')}
            value={formatBusinessStatus(restaurant.BusinessStatus, t)}
          />
        </div>
      </section>

      <section className="restaurant-detail__panel restaurant-detail__panel--collapsible">
        <button
          className="restaurant-detail__section-toggle"
          type="button"
          aria-expanded={isLocationExpanded}
          onClick={() => setIsLocationExpanded((current) => !current)}
        >
          <span>{t('detail.location')}</span>
          <span className="restaurant-detail__section-toggle-icon" aria-hidden="true">
            {isLocationExpanded ? '−' : '+'}
          </span>
        </button>
        {isLocationExpanded ? (
          coordinates ? (
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
                <Marker icon={joviatMapIcon} position={coordinates}>
                  <Popup>{restaurant.Name ?? t('common.noName')}</Popup>
                </Marker>
              </MapContainer>
            </div>
          ) : (
            <div className="restaurant-detail__map-empty">
              {t('detail.noLocation')}
            </div>
          )
        ) : null}
      </section>

      <section className="restaurant-detail__panel">
        <div className="restaurant-detail__panel-heading">
          <h2>{t('common.students')}</h2>
          <p>
            {restaurant.linkedStudents?.length
              ? t('detail.restaurantStudentsText')
              : t('detail.restaurantStudentsEmpty')}
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
                    alt={student.Name ?? t('common.student')}
                  />
                </div>
                <div className="restaurant-detail__student-body">
                  <h3>{student.Name ?? t('common.noName')}</h3>
                  <p className="restaurant-detail__student-role">
                    {student.role ? translateRestaurantRole(student.role, t) : t('common.roleUnavailable')}
                  </p>
                  {student.PromotionYear ? (
                    <p className="restaurant-detail__student-promotion-year">
                      {formatPromotionYear(t, student.PromotionYear)}
                    </p>
                  ) : null}
                  <p className={`restaurant-detail__student-status${student.currentJob ? '' : ' restaurant-detail__student-status--muted'}`}>
                    {student.currentJob
                      ? t('common.currentJob')
                      : t('common.previousExperience')}
                  </p>
                  <button
                    className="restaurant-detail__details"
                    type="button"
                    aria-label={t('students.openDetails', { name: student.Name ?? t('common.student') })}
                    onClick={() => onOpenStudentDetails(student.id, 'restaurant-detail')}
                  >
                    {t('common.details')}
                  </button>
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
            <h2 id="restaurant-delete-title">{t('detail.deleteRestaurantTitle')}</h2>
            <p id="restaurant-delete-description">
              {t('detail.deleteRestaurantDescription')}
            </p>
            <div className="restaurant-detail__dialog-actions">
              <button
                className="restaurant-detail__action restaurant-detail__action--secondary"
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </button>
              <button
                className="restaurant-detail__action restaurant-detail__action--danger"
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? t('detail.deleting') : t('detail.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default RestaurantDetailScreen;
