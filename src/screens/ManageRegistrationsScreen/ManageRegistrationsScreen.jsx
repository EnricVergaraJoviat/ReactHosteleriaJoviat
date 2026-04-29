import { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../helpers/firebase';
import {
  USER_REGISTRATIONS_COLLECTION,
  acceptUserRegistration,
  rejectUserRegistration,
} from '../../helpers/userRegistrations';
import { useI18n } from '../../i18n/I18nContext';
import './ManageRegistrationsScreen.css';

const RESTAURANT_REGISTRATIONS_COLLECTION = 'RestaruantsRegistrations';
const resolveGoogleMapsShareLink = httpsCallable(functions, 'resolveGoogleMapsShareLink');

function ManageRegistrationsScreen({ onManageRestaurantRegistration }) {
  const { t } = useI18n();
  const [registrations, setRegistrations] = useState([]);
  const [restaurantRegistrations, setRestaurantRegistrations] = useState([]);
  const [existingRestaurants, setExistingRestaurants] = useState([]);
  const [activeRegistrationView, setActiveRegistrationView] = useState('users');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRestaurantRegistration, setSelectedRestaurantRegistration] = useState(null);
  const [restaurantPreview, setRestaurantPreview] = useState(null);
  const [restaurantPreviewStatus, setRestaurantPreviewStatus] = useState('idle');
  const [restaurantPreviewError, setRestaurantPreviewError] = useState('');
  const isActionInFlightRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRegistrations() {
      try {
        const [usersSnapshot, restaurantsSnapshot, existingRestaurantsSnapshot] = await Promise.all([
          getDocs(collection(db, USER_REGISTRATIONS_COLLECTION)),
          getDocs(collection(db, RESTAURANT_REGISTRATIONS_COLLECTION)),
          getDocs(collection(db, 'Restaurant')),
        ]);
        const items = usersSnapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));
        const restaurantItems = restaurantsSnapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));
        const existingRestaurantItems = existingRestaurantsSnapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));

        if (isMounted) {
          setRegistrations(items);
          setRestaurantRegistrations(restaurantItems);
          setExistingRestaurants(existingRestaurantItems);
          setErrorMessage('');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(t('registrations.loadError'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRegistrations();

    return () => {
      isMounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!selectedRestaurantRegistration) {
      setRestaurantPreview(null);
      setRestaurantPreviewStatus('idle');
      setRestaurantPreviewError('');
      return;
    }

    const sharedUrl = selectedRestaurantRegistration.GoogleMapsShareUrl?.trim();

    if (!sharedUrl) {
      setRestaurantPreview(null);
      setRestaurantPreviewStatus('error');
      setRestaurantPreviewError(t('registrations.restaurantLinkUnavailable'));
      return;
    }

    let isMounted = true;
    setRestaurantPreview(null);
    setRestaurantPreviewStatus('loading');
    setRestaurantPreviewError('');

    resolveGoogleMapsShareLink({ url: sharedUrl })
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setRestaurantPreview(result.data ?? null);
        setRestaurantPreviewStatus('ready');
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setRestaurantPreview(null);
        setRestaurantPreviewStatus('error');
        setRestaurantPreviewError(t('registrations.restaurantPreviewError'));
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRestaurantRegistration, t]);

  async function handleDeleteRestaurantRegistration(registration) {
    if (!registration?.id || isActionInFlightRef.current) {
      return;
    }

    isActionInFlightRef.current = true;
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await deleteDoc(doc(db, RESTAURANT_REGISTRATIONS_COLLECTION, registration.id));
      setSuccessMessage(t('registrations.restaurantDeleted'));
      setRestaurantRegistrations((current) =>
        current.filter((entry) => entry.id !== registration.id)
      );
      setSelectedRestaurantRegistration(null);
    } catch (error) {
      setErrorMessage(t('registrations.actionError'));
    } finally {
      isActionInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleConfirmAction() {
    if (isActionInFlightRef.current || !pendingAction?.registration?.id) {
      return;
    }

    const action = pendingAction;
    isActionInFlightRef.current = true;
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setPendingAction(null);

    try {
      if (action.type === 'accept') {
        await acceptUserRegistration(action.registration);
        setSuccessMessage(t('registrations.accepted', { name: action.registration.Name }));
      } else {
        await rejectUserRegistration(action.registration.id);
        setSuccessMessage(t('registrations.rejected', { name: action.registration.Name }));
      }

      setRegistrations((current) =>
        current.filter((entry) => entry.id !== action.registration.id)
      );
    } catch (error) {
      if (
        error?.code === 'auth/email-already-in-use'
        || error?.code === 'alumni/email-already-exists'
        || error?.code === 'already-exists'
      ) {
        setErrorMessage(t('registrations.userExists'));
      } else if (error?.code === 'auth/invalid-email' || error?.code === 'invalid-argument') {
        setErrorMessage(t('registrations.invalidEmail'));
      } else if (error?.code === 'auth/weak-password') {
        setErrorMessage(t('registrations.weakPassword'));
      } else {
        setErrorMessage(t('registrations.actionError'));
      }
    } finally {
      isActionInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  const existingRestaurantMatch = restaurantPreview?.googlePlaceId
    ? existingRestaurants.find((entry) => entry.GooglePlaceId === restaurantPreview.googlePlaceId)
    : null;

  return (
    <section className="manage-registrations">
      <div className="manage-registrations__intro">
        <p className="manage-registrations__eyebrow">{t('common.administration')}</p>
        <h1>{t('registrations.title')}</h1>
        <p className="manage-registrations__description">
          {t('registrations.description')}
        </p>
      </div>

      <div className="manage-registrations__panel">
        <div className="manage-registrations__toggle" aria-label={t('registrations.viewMode')}>
          <button
            className={`manage-registrations__toggle-button${
              activeRegistrationView === 'users' ? ' manage-registrations__toggle-button--active' : ''
            }`}
            type="button"
            aria-pressed={activeRegistrationView === 'users'}
            onClick={() => setActiveRegistrationView('users')}
          >
            {t('registrations.viewUsers')}
          </button>
          <button
            className={`manage-registrations__toggle-button${
              activeRegistrationView === 'restaurants' ? ' manage-registrations__toggle-button--active' : ''
            }`}
            type="button"
            aria-pressed={activeRegistrationView === 'restaurants'}
            onClick={() => setActiveRegistrationView('restaurants')}
          >
            {t('registrations.viewRestaurants')}
          </button>
        </div>

        {isLoading ? (
          <p className="manage-registrations__status">{t('registrations.loading')}</p>
        ) : null}

        {!isLoading && errorMessage ? (
          <p className="manage-registrations__status manage-registrations__status--error">
            {errorMessage}
          </p>
        ) : null}

        {!isLoading && !errorMessage && successMessage ? (
          <p className="manage-registrations__status manage-registrations__status--success">
            {successMessage}
          </p>
        ) : null}

        {!isLoading && !errorMessage && activeRegistrationView === 'users' && registrations.length === 0 ? (
          <p className="manage-registrations__status">
            {t('registrations.empty')}
          </p>
        ) : null}

        {!isLoading && !errorMessage && activeRegistrationView === 'restaurants' && restaurantRegistrations.length === 0 ? (
          <p className="manage-registrations__status">
            {t('registrations.restaurantEmpty')}
          </p>
        ) : null}

        {!isLoading && activeRegistrationView === 'users' && registrations.length > 0 ? (
          <div className="manage-registrations__list" role="list">
            {registrations.map((registration) => (
              <article className="manage-registrations__card" key={registration.id} role="listitem">
                <div className="manage-registrations__card-content">
                  <h2>{registration.Name || t('registrations.userNoName')}</h2>
                  <p>{registration.Email || t('registrations.noEmail')}</p>
                </div>
                <div className="manage-registrations__actions">
                  <button
                    className="manage-registrations__button manage-registrations__button--accept"
                    type="button"
                    onClick={() => setPendingAction({ type: 'accept', registration })}
                  >
                    {t('registrations.accept')}
                  </button>
                  <button
                    className="manage-registrations__button manage-registrations__button--reject"
                    type="button"
                    onClick={() => setPendingAction({ type: 'reject', registration })}
                  >
                    {t('registrations.cancel')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!isLoading && activeRegistrationView === 'restaurants' && restaurantRegistrations.length > 0 ? (
          <div className="manage-registrations__list" role="list">
            {restaurantRegistrations.map((registration) => (
              <article className="manage-registrations__card" key={registration.id} role="listitem">
                <div className="manage-registrations__card-content">
                  <h2>{registration.Name || t('registrations.userNoName')}</h2>
                  {registration.Email ? (
                    <p className="manage-registrations__meta">{registration.Email}</p>
                  ) : null}
                  <p className="manage-registrations__request-description">
                    {registration.GoogleMapsShareUrl
                      || registration.Description
                      || t('registrations.restaurantNoDescription')}
                  </p>
                </div>
                <div className="manage-registrations__actions">
                  <button
                    className="manage-registrations__button manage-registrations__button--accept"
                    type="button"
                    onClick={() => setSelectedRestaurantRegistration(registration)}
                  >
                    {t('registrations.viewRequest')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      {pendingAction ? (
        <div className="manage-registrations__dialog-layer">
          <div
            className="manage-registrations__dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="manage-registrations-confirmation-title"
          >
            <h2 id="manage-registrations-confirmation-title">
              {pendingAction.type === 'accept'
                ? t('registrations.confirmAccept')
                : t('registrations.confirmReject')}
            </h2>
            <p>
              {pendingAction.type === 'accept'
                ? t('registrations.confirmAcceptText', { name: pendingAction.registration.Name })
                : t('registrations.confirmRejectText', { name: pendingAction.registration.Name })}
            </p>
            <div className="manage-registrations__dialog-actions">
              <button
                className="manage-registrations__button manage-registrations__button--ghost"
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={isSubmitting}
              >
                {t('registrations.no')}
              </button>
              <button
                className={`manage-registrations__button ${
                  pendingAction.type === 'accept'
                    ? 'manage-registrations__button--accept'
                    : 'manage-registrations__button--reject'
                }`}
                type="button"
                onClick={handleConfirmAction}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t('registrations.processing')
                  : pendingAction.type === 'accept'
                    ? t('registrations.yes')
                    : t('registrations.cancelRequest')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedRestaurantRegistration ? (
        <div className="manage-registrations__dialog-layer">
          <div
            className="manage-registrations__dialog manage-registrations__dialog--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-restaurant-registration-title"
          >
            <h2 id="manage-restaurant-registration-title">
              {t('registrations.restaurantPreviewTitle')}
            </h2>
            <p className="manage-registrations__dialog-copy">
              {selectedRestaurantRegistration.Name || t('registrations.userNoName')}
            </p>

            {restaurantPreviewStatus === 'loading' ? (
              <p>{t('registrations.loadingRestaurantPreview')}</p>
            ) : null}

            {restaurantPreviewStatus === 'error' ? (
              <p>{restaurantPreviewError}</p>
            ) : null}

            {restaurantPreviewStatus === 'ready' && restaurantPreview ? (
              <div className="manage-registrations__preview">
                {restaurantPreview.photoUrl ? (
                  <img
                    className="manage-registrations__preview-image"
                    src={restaurantPreview.photoUrl}
                    alt={restaurantPreview.name || t('common.restaurant')}
                  />
                ) : (
                  <div className="manage-registrations__preview-image manage-registrations__preview-image--empty">
                    {t('registrations.restaurantPhotoUnavailable')}
                  </div>
                )}
                <div className="manage-registrations__preview-content">
                  <h3>{restaurantPreview.name || t('common.noName')}</h3>
                  <p>{restaurantPreview.address || t('common.addressUnavailable')}</p>
                  {restaurantPreview.phone ? (
                    <p>{restaurantPreview.phone}</p>
                  ) : null}
                  {restaurantPreview.website ? (
                    <p>{restaurantPreview.website}</p>
                  ) : null}
                  <a
                    className="manage-registrations__preview-link"
                    href={restaurantPreview.googleMapsUrl || selectedRestaurantRegistration.GoogleMapsShareUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('detail.openGoogleMaps')}
                  </a>
                  {existingRestaurantMatch ? (
                    <p className="manage-registrations__duplicate-warning">
                      {t('registrations.restaurantAlreadyExists', {
                        name: existingRestaurantMatch.Name || restaurantPreview.name || t('common.restaurant'),
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="manage-registrations__dialog-actions">
              <button
                className="manage-registrations__button manage-registrations__button--ghost"
                type="button"
                onClick={() => setSelectedRestaurantRegistration(null)}
                disabled={isSubmitting}
              >
                {t('common.close')}
              </button>
              <button
                className="manage-registrations__button manage-registrations__button--reject"
                type="button"
                onClick={() => handleDeleteRestaurantRegistration(selectedRestaurantRegistration)}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('registrations.processing') : t('registrations.cancelRequest')}
              </button>
              <button
                className="manage-registrations__button manage-registrations__button--accept"
                type="button"
                onClick={() => {
                  onManageRestaurantRegistration?.(
                    selectedRestaurantRegistration,
                    restaurantPreview
                  );
                  setSelectedRestaurantRegistration(null);
                }}
                disabled={
                  isSubmitting
                  || restaurantPreviewStatus !== 'ready'
                  || !restaurantPreview
                  || Boolean(existingRestaurantMatch)
                }
              >
                {t('registrations.manageRestaurantRequest')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ManageRegistrationsScreen;
