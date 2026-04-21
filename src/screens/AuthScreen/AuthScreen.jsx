import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import './AuthScreen.css';

function AuthScreen({
  errorMessage,
  isAuthenticated,
  isSubmitting,
  mode,
  userEmail,
  onClearError,
  onLogin,
  onLogout,
  onRequestAccess,
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestName, setRequestName] = useState('');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestErrorMessage, setRequestErrorMessage] = useState('');
  const [requestSuccessMessage, setRequestSuccessMessage] = useState('');

  const isLoginMode = mode === 'login';
  const isLogoutMode = mode === 'logout';
  const requestResultMessage = requestSuccessMessage || requestErrorMessage;
  const isRequestSuccess = Boolean(requestSuccessMessage);

  function closeRequestDialog() {
    setIsRequestDialogOpen(false);
    setRequestErrorMessage('');
    setRequestSuccessMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onLogin({ email, password });
  }

  async function handleRequestAccessSubmit(event) {
    event.preventDefault();
    setRequestErrorMessage('');
    setRequestSuccessMessage('');

    try {
      await onRequestAccess({
        email: requestEmail,
        name: requestName,
      });
      setRequestSuccessMessage(t('auth.requestSent'));
      setRequestEmail('');
      setRequestName('');
    } catch (error) {
      if (error?.code === 'alumni/email-already-exists') {
        setRequestErrorMessage(t('auth.emailExists'));
      } else if (error?.code === 'user-registration/email-already-pending') {
        setRequestErrorMessage(t('auth.emailPending'));
      } else {
        setRequestErrorMessage(t('auth.requestError'));
      }
    }
  }

  return (
    <section className="auth-screen" aria-label={t('auth.area')}>
      <div className="auth-screen__backdrop" />
      <div
        className="auth-screen__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-screen-title"
      >
        {isLoginMode ? (
          <>
            <p className="auth-screen__eyebrow">{t('auth.access')}</p>
            <h1 id="auth-screen-title">{t('auth.loginTitle')}</h1>
            <p className="auth-screen__description">
              {t('auth.loginDescription')}
            </p>
            <form className="auth-screen__form" onSubmit={handleSubmit}>
              <label className="auth-screen__field">
                <span>Email</span>
                <input
                  autoComplete="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="auth-screen__field">
                <span>{t('auth.password')}</span>
                <input
                  autoComplete="current-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button className="auth-screen__primary-action" type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('auth.validating') : t('auth.doLogin')}
              </button>
            </form>
            <div className="auth-screen__request-access">
              <p>{t('auth.notRegistered')}</p>
              <button
                className="auth-screen__request-access-link"
                type="button"
                onClick={() => {
                  setRequestErrorMessage('');
                  setRequestSuccessMessage('');
                  setIsRequestDialogOpen(true);
                }}
              >
                {t('auth.requestAccess')}
              </button>
            </div>
          </>
        ) : null}

        {isLogoutMode ? (
          <>
            <p className="auth-screen__eyebrow">{t('auth.activeSession')}</p>
            <h1 id="auth-screen-title">{t('auth.logoutTitle')}</h1>
            <p className="auth-screen__description">
              {userEmail
                ? t('auth.logoutDescriptionWithEmail', { email: userEmail })
                : t('auth.logoutDescription')}
            </p>
            <div className="auth-screen__actions">
              <button
                className="auth-screen__secondary-action"
                type="button"
                onClick={onLogout}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('auth.closing') : t('auth.confirmLogout')}
              </button>
            </div>
          </>
        ) : null}

        {!isLoginMode && !isLogoutMode ? (
          <>
            <p className="auth-screen__eyebrow">{t('auth.activeSession')}</p>
            <h1 id="auth-screen-title">{t('auth.loggedTitle')}</h1>
            <p className="auth-screen__description">
              {isAuthenticated && userEmail
                ? t('auth.loggedDescriptionWithEmail', { email: userEmail })
                : t('auth.loggedDescription')}
            </p>
          </>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="auth-screen__error-layer">
          <div
            className="auth-screen__error-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="auth-error-title"
          >
            <h2 id="auth-error-title">{t('auth.loginErrorTitle')}</h2>
            <p>{errorMessage}</p>
            <button type="button" onClick={onClearError}>
              {t('auth.ok')}
            </button>
          </div>
        </div>
      ) : null}

      {isRequestDialogOpen ? (
        <div className="auth-screen__error-layer">
          <div
            className="auth-screen__error-dialog auth-screen__request-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-request-title"
          >
            <h2 id="auth-request-title">{t('auth.requestTitle')}</h2>
            {requestResultMessage ? (
              <>
                <p
                  className={`auth-screen__request-feedback ${
                    isRequestSuccess
                      ? 'auth-screen__request-feedback--success'
                      : 'auth-screen__request-feedback--error'
                  }`}
                  role={isRequestSuccess ? 'status' : 'alert'}
                >
                  {requestResultMessage}
                </p>
                <div className="auth-screen__dialog-actions">
                  <button
                    className="auth-screen__primary-action"
                    type="button"
                    onClick={closeRequestDialog}
                  >
                    {t('common.close')}
                  </button>
                </div>
              </>
            ) : (
              <form className="auth-screen__form" onSubmit={handleRequestAccessSubmit}>
                <label className="auth-screen__field">
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    name="request-email"
                    type="email"
                    value={requestEmail}
                    onChange={(event) => setRequestEmail(event.target.value)}
                    required
                  />
                </label>
                <label className="auth-screen__field">
                  <span>{t('auth.fullName')}</span>
                  <input
                    autoComplete="name"
                    name="request-name"
                    type="text"
                    value={requestName}
                    onChange={(event) => setRequestName(event.target.value)}
                    required
                  />
                </label>
              <div className="auth-screen__dialog-actions">
                <button
                  className="auth-screen__secondary-button"
                  type="button"
                  onClick={closeRequestDialog}
                >
                  {t('common.close')}
                </button>
                <button className="auth-screen__primary-action" type="submit">
                  {t('auth.requestTitle')}
                </button>
              </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AuthScreen;
