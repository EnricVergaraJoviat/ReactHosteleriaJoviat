import './Header.css';
import { ReactComponent as LoginIcon } from '../../assets/icons/login.svg';
import { ReactComponent as LogoutIcon } from '../../assets/icons/logout.svg';

function Header({
  logoSrc,
  isAuthenticated,
  isMenuOpen,
  onAuthAction,
  onHomeClick,
  onMenuToggle,
  showMenuButton,
}) {
  const AuthIcon = isAuthenticated ? LogoutIcon : LoginIcon;

  return (
    <header className="site-header">
      <div className="site-header__content">
        <div className="site-header__brand">
          {showMenuButton ? (
            <button
              className={`site-header__menu-button ${
                isMenuOpen ? 'site-header__menu-button--open' : ''
              }`}
              type="button"
              aria-label={isMenuOpen ? 'Tancar menu' : 'Obrir menu'}
              onClick={onMenuToggle}
            >
              {isMenuOpen ? (
                <span className="site-header__menu-close" aria-hidden="true">
                  ×
                </span>
              ) : (
                <span className="site-header__menu-lines" aria-hidden="true">
                  <span className="site-header__menu-line" />
                  <span className="site-header__menu-line" />
                  <span className="site-header__menu-line" />
                </span>
              )}
            </button>
          ) : null}
          <button
            className="site-header__home-button"
            type="button"
            aria-label="Tornar a la pagina principal"
            onClick={onHomeClick}
          >
            <img className="site-header__logo" src={logoSrc} alt="Logo Joviat" />
          </button>
        </div>
        <div className="site-header__actions">
          <button className="site-header__auth-button" type="button" onClick={onAuthAction}>
            <span className="site-header__auth-icon" aria-hidden="true">
              <AuthIcon focusable="false" />
            </span>
            {isAuthenticated ? 'Logout' : 'Login'}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
