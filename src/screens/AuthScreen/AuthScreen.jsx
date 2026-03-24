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
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isLoginMode = mode === 'login';
  const isLogoutMode = mode === 'logout';

  async function handleSubmit(event) {
    event.preventDefault();
    await onLogin({ email, password });
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
    </section>
  );
}

export default AuthScreen;
