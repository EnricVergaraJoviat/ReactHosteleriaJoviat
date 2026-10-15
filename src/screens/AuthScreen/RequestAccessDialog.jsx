import { useEffect, useRef, useState } from 'react';
import SmartImage from '../../components/SmartImage/SmartImage';
import { fetchPlaceDetails, loadGooglePlacesApi, searchRestaurants } from '../../helpers/googlePlaces';
import { getRestaurantRoleOptions } from '../../helpers/restaurantRoles';
import { useI18n } from '../../i18n/I18nContext';
import './RequestAccessDialog.css';

function RequestAccessDialog({ onClose, onRequestAccess }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [placeId, setPlaceId] = useState('');
  const [restaurant, setRestaurant] = useState(null);
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const inFlight = useRef(false);
  const stepHeading = useRef(null);

  useEffect(() => {
    stepHeading.current?.focus();
  }, [step]);

  async function handleSearch(event) {
    event.preventDefault();
    if (!search.trim() || inFlight.current) return;
    inFlight.current = true;
    setBusy('search');
    setError('');
    setResults([]);
    setPlaceId('');
    setRestaurant(null);
    try {
      await loadGooglePlacesApi(process.env.REACT_APP_GOOGLE_MAPS_API_KEY ?? '');
      const places = await searchRestaurants(search.trim());
      setResults(places);
      if (!places.length) setError(t('forms.noRestaurantsFound'));
    } catch (searchError) {
      setError(t('auth.placeSearchError'));
    } finally {
      inFlight.current = false;
      setBusy('');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    setError('');
    if (step === 1) {
      if (email.trim() && name.trim() && accepted) setStep(2);
      return;
    }
    if (!placeId) return;
    inFlight.current = true;
    setBusy(step === 2 ? 'details' : 'submit');
    try {
      if (step === 2) {
        const details = restaurant?.googlePlaceId === placeId
          ? restaurant
          : await fetchPlaceDetails(placeId, { includeCategories: false });
        if (!details.name || details.googlePlaceId !== placeId) throw new Error('missing-place');
        setRestaurant(details);
        setStep(3);
      } else if (role && accepted && email.trim() && name.trim()) {
        await onRequestAccess({ email, name, hasAcceptedLegalTerms: accepted, googlePlaceId: placeId, role });
        setSent(true);
      }
    } catch (submitError) {
      if (submitError?.code === 'alumni/email-already-exists') {
        setError(t('auth.emailExists'));
      } else if (submitError?.code === 'user-registration/email-already-pending') {
        setError(t('auth.emailPending'));
      } else {
        setError(t(step === 2 ? 'auth.placeDetailsError' : 'auth.requestError'));
      }
    } finally {
      inFlight.current = false;
      setBusy('');
    }
  }

  return (
    <div className="auth-screen__error-layer">
      <div className="auth-screen__error-dialog auth-screen__request-dialog request-access" role="dialog" aria-modal="true" aria-labelledby="auth-request-title" aria-busy={Boolean(busy)}>
        <h2 id="auth-request-title">{t('auth.requestTitle')}</h2>
        {sent ? (
          <>
            <p role="status">{t('auth.requestSent')}</p>
            <div className="auth-screen__dialog-actions">
              <button type="button" onClick={onClose}>{t('common.close')}</button>
            </div>
          </>
        ) : (
          <>
            <ol className="request-access__steps" aria-label={t('auth.requestProgress')}>
              {['auth.stepPersonal', 'auth.stepRestaurant', 'auth.stepRole'].map((key, index) => (
                <li key={key} aria-current={step === index + 1 ? 'step' : undefined}>
                  <span aria-hidden="true">{index + 1}</span>{t(key)}
                </li>
              ))}
            </ol>
            <h3 ref={stepHeading} tabIndex={-1} className="request-access__step-title">
              {t(['auth.stepPersonal', 'auth.workplaceTitle', 'auth.roleTitle'][step - 1])}
            </h3>
            <form className="auth-screen__form" onSubmit={handleSubmit}>
              {step === 1 ? (
                <>
                  <label className="auth-screen__field">
                    <span>Email</span>
                    <input autoComplete="email" name="request-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                  </label>
                  <label className="auth-screen__field">
                    <span>{t('auth.fullName')}</span>
                    <input autoComplete="name" name="request-name" value={name} onChange={(event) => setName(event.target.value)} required />
                  </label>
                  <div className="auth-screen__legal-terms">
                    <p className="auth-screen__legal-terms-title">{t('auth.legalTermsTitle')}</p>
                    <p>{t('auth.legalTermsIntro')}</p>
                    <p>{t('auth.legalTermsBody')}</p>
                    <a href="https://www.joviat.com/politica-de-privacitat/" target="_blank" rel="noreferrer">https://www.joviat.com/politica-de-privacitat/</a>
                  </div>
                  <label className="auth-screen__terms-check">
                    <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required />
                    <span>{t('auth.acceptLegalTerms')}</span>
                  </label>
                </>
              ) : null}
              {step === 2 ? (
                <>
                  <p className="request-access__description">{t('auth.workplaceDescription')}</p>
                  <div className="request-access__search">
                    <label className="auth-screen__field">
                      <span>{t('forms.restaurantName')}</span>
                      <input value={search} disabled={Boolean(busy)} placeholder={t('auth.placeSearchPlaceholder')} onChange={(event) => {
                        setSearch(event.target.value);
                        setResults([]);
                        setPlaceId('');
                        setRestaurant(null);
                        setError('');
                      }} onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.nativeEvent.isComposing) handleSearch(event);
                      }} />
                    </label>
                    <button type="button" onClick={handleSearch} disabled={Boolean(busy) || !search.trim()}>
                      {t(busy === 'search' ? 'forms.searching' : 'forms.search')}
                    </button>
                  </div>
                  <label className="auth-screen__field">
                    <span>{t('forms.results')}</span>
                    <select value={placeId} disabled={Boolean(busy) || !results.length} onChange={(event) => {
                      setPlaceId(event.target.value);
                      setRestaurant(null);
                      setError('');
                    }} required>
                      <option value="">{t(results.length ? 'forms.selectRestaurantError' : 'forms.noResultsYet')}</option>
                      {results.map((place) => <option key={place.placeId} value={place.placeId}>{place.name} · {place.address}</option>)}
                    </select>
                  </label>
                  <small className="request-access__source">{t('forms.googleSearchTitle')}</small>
                </>
              ) : null}
              {step === 3 && restaurant ? (
                <>
                  <div className="request-access__restaurant">
                    <SmartImage className="request-access__photo" src={restaurant.photoUrl} type="restaurant" label={restaurant.name} alt={restaurant.name} />
                    <div><strong>{restaurant.name}</strong><p>{restaurant.address}</p></div>
                  </div>
                  <label className="auth-screen__field">
                    <span>{t('forms.role')}</span>
                    <select value={role} disabled={Boolean(busy)} onChange={(event) => setRole(event.target.value)} required>
                      <option value="">{t('forms.selectRole')}</option>
                      {getRestaurantRoleOptions(t).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </>
              ) : null}
              {error ? <p className="auth-screen__request-feedback auth-screen__request-feedback--error" role="alert">{error}</p> : null}
              <div className="auth-screen__dialog-actions">
                <button className="auth-screen__secondary-button" type="button" disabled={Boolean(busy)} onClick={() => {
                  if (step === 1) onClose();
                  else { setError(''); setStep(step - 1); }
                }}>{t(step === 1 ? 'common.close' : 'auth.previous')}</button>
                <button className="auth-screen__primary-action" type="submit" disabled={Boolean(busy) || (step === 1 ? !accepted || !email.trim() || !name.trim() : step === 2 ? !placeId : !role)}>
                  {t(busy === 'submit' ? 'auth.requestSending' : busy === 'details' ? 'auth.placeLoading' : step === 3 ? 'auth.requestTitle' : 'auth.next')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default RequestAccessDialog;
