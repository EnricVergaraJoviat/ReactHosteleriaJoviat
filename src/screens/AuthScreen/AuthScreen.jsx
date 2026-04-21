import { useState } from 'react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestName, setRequestName] = useState('');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestErrorMessage, setRequestErrorMessage] = useState('');
  const [requestSuccessMessage, setRequestSuccessMessage] = useState('');

  const isLoginMode = mode === 'login';
  const isLogoutMode = mode === 'logout';

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
      setRequestSuccessMessage('Hem registrat la teva sol.licitud d\'acces.');
      setRequestEmail('');
      setRequestName('');
    } catch (error) {
      setRequestErrorMessage('No s\'ha pogut registrar la sol.licitud. Torna-ho a provar.');
    }
  }

  return (
    <section className="auth-screen" aria-label="Autenticacio">
      <div className="auth-screen__backdrop" />
      <div
        className="auth-screen__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-screen-title"
      >
        {isLoginMode ? (
          <>
            <p className="auth-screen__eyebrow">Acces</p>
            <h1 id="auth-screen-title">Iniciar sessio</h1>
            <p className="auth-screen__description">
              Entra amb el teu correu electronic i la contrasenya per accedir a l&apos;aplicacio.
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
                <span>Contrasenya</span>
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
                {isSubmitting ? 'Validant...' : 'Fer login'}
              </button>
            </form>
            <div className="auth-screen__request-access">
              <p>Si aun no estas registrado</p>
              <button
                className="auth-screen__request-access-link"
                type="button"
                onClick={() => {
                  setRequestErrorMessage('');
                  setRequestSuccessMessage('');
                  setIsRequestDialogOpen(true);
                }}
              >
                solicita acceso
              </button>
            </div>
          </>
        ) : null}

        {isLogoutMode ? (
          <>
            <p className="auth-screen__eyebrow">Sessio activa</p>
            <h1 id="auth-screen-title">Vols fer logout?</h1>
            <p className="auth-screen__description">
              {userEmail
                ? `Has iniciat sessio com ${userEmail}. Si continues, es tancara la sessio actual.`
                : 'Si continues, es tancara la sessio actual.'}
            </p>
            <div className="auth-screen__actions">
              <button
                className="auth-screen__secondary-action"
                type="button"
                onClick={onLogout}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Tancant...' : 'Confirmar logout'}
              </button>
            </div>
          </>
        ) : null}

        {!isLoginMode && !isLogoutMode ? (
          <>
            <p className="auth-screen__eyebrow">Sessio activa</p>
            <h1 id="auth-screen-title">Sessio iniciada</h1>
            <p className="auth-screen__description">
              {isAuthenticated && userEmail
                ? `Has iniciat sessio correctament amb ${userEmail}.`
                : 'Has iniciat sessio correctament.'}
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
            <h2 id="auth-error-title">Error de login</h2>
            <p>{errorMessage}</p>
            <button type="button" onClick={onClearError}>
              D&apos;acord
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
            <h2 id="auth-request-title">Solicitar acceso</h2>
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
                <span>Nombre y apellidos</span>
                <input
                  autoComplete="name"
                  name="request-name"
                  type="text"
                  value={requestName}
                  onChange={(event) => setRequestName(event.target.value)}
                  required
                />
              </label>
              {requestErrorMessage ? (
                <p className="auth-screen__request-feedback auth-screen__request-feedback--error">
                  {requestErrorMessage}
                </p>
              ) : null}
              {requestSuccessMessage ? (
                <p className="auth-screen__request-feedback auth-screen__request-feedback--success">
                  {requestSuccessMessage}
                </p>
              ) : null}
              <div className="auth-screen__dialog-actions">
                <button
                  className="auth-screen__secondary-button"
                  type="button"
                  onClick={() => setIsRequestDialogOpen(false)}
                >
                  Cerrar
                </button>
                <button className="auth-screen__primary-action" type="submit">
                  Solicitar acceso
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AuthScreen;
