import SmartImage from '../../components/SmartImage/SmartImage';
import { translateRestaurantRole } from '../../helpers/restaurantRoles';
import { useI18n } from '../../i18n/I18nContext';

function getGoogleMapsLink(restaurant) {
  if (restaurant.GooglePlaceId) {
    const params = new URLSearchParams({
      api: '1', query: restaurant.Name || restaurant.GooglePlaceId,
      query_place_id: restaurant.GooglePlaceId,
    });
    return `https://www.google.com/maps/search/?${params}`;
  }
  try {
    const url = new URL(restaurant.GoogleMapsURL);
    if (url.protocol === 'https:' && (
      /^(www\.|maps\.)?google\.(com|es|cat)$/.test(url.hostname)
      || url.hostname === 'maps.app.goo.gl'
    )) return url.href;
  } catch (error) {}
  return '';
}

function RegistrationWorkplace({ registration, existingRestaurants, expanded = false }) {
  const { t } = useI18n();
  const restaurant = registration.Restaurant;
  if (!restaurant) return null;

  // A matching name alone cannot identify the establishment: use its Google ID.
  const existing = restaurant.GooglePlaceId
    ? existingRestaurants.find((entry) => entry.GooglePlaceId === restaurant.GooglePlaceId)
    : null;
  const status = !restaurant.GooglePlaceId ? 'unknown' : existing ? 'existing' : 'new';
  const mapsUrl = getGoogleMapsLink(restaurant);

  return (
    <div className={`manage-registrations__workplace${expanded ? ' manage-registrations__workplace--expanded' : ''}`}>
      <SmartImage
        className="manage-registrations__workplace-photo"
        src={existing?.PhotoURL || restaurant.PhotoURL}
        type="restaurant"
        label={restaurant.Name}
        alt={restaurant.Name || t('common.restaurant')}
      />
      <div className="manage-registrations__workplace-details">
        <h3>{restaurant.Name}</h3>
        <p>{restaurant.Address || existing?.Address}</p>
        <p><strong>{t('forms.role')}: </strong>{translateRestaurantRole(registration.Role, t)}</p>
        <p className={`manage-registrations__workplace-status manage-registrations__workplace-status--${status}`}>
          {t(`registrations.workplaceStatus.${status}`)}
        </p>
        {status !== 'unknown' ? <p>{t(`registrations.workplaceAction.${status}`)}</p> : null}
        {mapsUrl ? (
          <a className="manage-registrations__preview-link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
            {t('detail.openGoogleMaps')}
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default RegistrationWorkplace;
