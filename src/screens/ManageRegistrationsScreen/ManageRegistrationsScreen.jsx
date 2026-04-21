import { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../helpers/firebase';
import {
  USER_REGISTRATIONS_COLLECTION,
  acceptUserRegistration,
  rejectUserRegistration,
} from '../../helpers/userRegistrations';
import { useI18n } from '../../i18n/I18nContext';
import './ManageRegistrationsScreen.css';

const RESTAURANT_REGISTRATIONS_COLLECTION = 'RestaruantsRegistrations';

function ManageRegistrationsScreen() {
  const { t } = useI18n();
  const [registrations, setRegistrations] = useState([]);
  const [restaurantRegistrations, setRestaurantRegistrations] = useState([]);
  const [activeRegistrationView, setActiveRegistrationView] = useState('users');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isActionInFlightRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRegistrations() {
      try {
        const [usersSnapshot, restaurantsSnapshot] = await Promise.all([
          getDocs(collection(db, USER_REGISTRATIONS_COLLECTION)),
          getDocs(collection(db, RESTAURANT_REGISTRATIONS_COLLECTION)),
        ]);
        const items = usersSnapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));
        const restaurantItems = restaurantsSnapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));

        if (isMounted) {
          setRegistrations(items);
          setRestaurantRegistrations(restaurantItems);
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
      if (action.type === 'delete-restaurant') {
        await deleteDoc(doc(db, RESTAURANT_REGISTRATIONS_COLLECTION, action.registration.id));
        setSuccessMessage(t('registrations.restaurantDeleted'));
        setRestaurantRegistrations((current) =>
          current.filter((entry) => entry.id !== action.registration.id)
        );
        return;
      }

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
      if (error?.code === 'auth/email-already-in-use' || error?.code === 'alumni/email-already-exists') {
        setErrorMessage(t('registrations.userExists'));
      } else if (error?.code === 'auth/invalid-email') {
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
                    {registration.Description || t('registrations.restaurantNoDescription')}
                  </p>
                </div>
                <div className="manage-registrations__actions">
                  <button
                    className="manage-registrations__button manage-registrations__button--reject"
                    type="button"
                    onClick={() => setPendingAction({ type: 'delete-restaurant', registration })}
                  >
                    {t('registrations.deleteRequest')}
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
                : pendingAction.type === 'delete-restaurant'
                  ? t('registrations.confirmRestaurantDelete')
                  : t('registrations.confirmReject')}
            </h2>
            <p>
              {pendingAction.type === 'accept'
                ? t('registrations.confirmAcceptText', { name: pendingAction.registration.Name })
                : pendingAction.type === 'delete-restaurant'
                  ? t('registrations.confirmRestaurantDeleteText')
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
                    : pendingAction.type === 'delete-restaurant'
                      ? t('registrations.deleteRequest')
                      : t('registrations.cancelRequest')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ManageRegistrationsScreen;
