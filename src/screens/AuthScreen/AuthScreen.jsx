import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import RequestAccessDialog from './RequestAccessDialog';
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
  onPasswordReset,
  onRequestAccess,
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetErrorMessage, setResetErrorMessage] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const isLoginMode = mode === 'login';
  const isLogoutMode = mode === 'logout';
  const shouldOpenRequestDialog = mode === 'request';
  const resetResultMessage = resetSuccessMessage || resetErrorMessage;
  const isResetSuccess = Boolean(resetSuccessMessage);

  useEffect(() => {
    if (shouldOpenRequestDialog) {
      setIsRequestDialogOpen(true);
    }
  }, [shouldOpenRequestDialog]);

  function openResetDialog() {
    setResetEmail(email);
    setResetErrorMessage('');
    setResetSuccessMessage('');
    setIsResetDialogOpen(true);
  }

  function closeResetDialog() {
    setIsResetDialogOpen(false);
    setResetErrorMessage('');
    setResetSuccessMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onLogin({ email, password });
  }

  async function handlePasswordResetSubmit(event) {
    event.preventDefault();
    setResetErrorMessage('');
    setResetSuccessMessage('');
    setIsResetSubmitting(true);

    try {
      await onPasswordReset({
        email: resetEmail,
      });
      setResetSuccessMessage(t('auth.passwordResetSent'));
    } catch (error) {
      setResetErrorMessage(error?.message || t('auth.passwordResetError'));
    } finally {
      setIsResetSubmitting(false);
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
        {isLoginMode || shouldOpenRequestDialog ? (
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
                  setIsRequestDialogOpen(true);
                }}
              >
                {t('auth.requestAccess')}
              </button>
            </div>
            <div className="auth-screen__request-access">
              <p>{t('auth.forgotPasswordPrompt')}</p>
              <button
                className="auth-screen__request-access-link"
                type="button"
                onClick={openResetDialog}
              >
                {t('auth.recoverPassword')}
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

        {!isLoginMode && !isLogoutMode && !shouldOpenRequestDialog ? (
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
        <RequestAccessDialog onClose={() => setIsRequestDialogOpen(false)} onRequestAccess={onRequestAccess} />
      ) : null}

      {isResetDialogOpen ? (
        <div className="auth-screen__error-layer">
          <div
            className="auth-screen__error-dialog auth-screen__request-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-password-reset-title"
          >
            <h2 id="auth-password-reset-title">{t('auth.passwordResetTitle')}</h2>
            {resetResultMessage ? (
              <>
                <p
                  className={`auth-screen__request-feedback ${
                    isResetSuccess
                      ? 'auth-screen__request-feedback--success'
                      : 'auth-screen__request-feedback--error'
                  }`}
                  role={isResetSuccess ? 'status' : 'alert'}
                >
                  {resetResultMessage}
                </p>
                <div className="auth-screen__dialog-actions">
                  {!isResetSuccess ? (
                    <button
                      className="auth-screen__secondary-button"
                      type="button"
                      onClick={() => {
                        setResetErrorMessage('');
                      }}
                    >
                      {t('auth.tryAgain')}
                    </button>
                  ) : null}
                  <button
                    className="auth-screen__primary-action"
                    type="button"
                    onClick={closeResetDialog}
                  >
                    {t('common.close')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="auth-screen__reset-description">
                  {t('auth.passwordResetDescription')}
                </p>
                <form className="auth-screen__form" onSubmit={handlePasswordResetSubmit}>
                  <label className="auth-screen__field">
                    <span>Email</span>
                    <input
                      autoComplete="email"
                      name="password-reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      required
                    />
                  </label>
                  <div className="auth-screen__dialog-actions">
                    <button
                      className="auth-screen__secondary-button"
                      type="button"
                      onClick={closeResetDialog}
                    >
                      {t('common.close')}
                    </button>
                    <button
                      className="auth-screen__primary-action"
                      type="submit"
                      disabled={isResetSubmitting}
                    >
                      {isResetSubmitting ? t('auth.passwordResetSending') : t('auth.passwordResetSubmit')}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AuthScreen;
