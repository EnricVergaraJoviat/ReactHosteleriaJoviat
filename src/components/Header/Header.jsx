import './Header.css';
import { ReactComponent as LoginIcon } from '../../assets/icons/login.svg';
import { ReactComponent as LogoutIcon } from '../../assets/icons/logout.svg';
import SmartImage from '../SmartImage/SmartImage';
import { useI18n } from '../../i18n/I18nContext';

function Header({
  logoSrc,
  currentStudentProfile,
  currentUserEmail,
  isAdministrator,
  isAuthenticated,
  isMenuOpen,
  onAuthAction,
  onEditProfile,
  onHomeClick,
  onMenuToggle,
  showMenuButton,
}) {
  const { t } = useI18n();
  const AuthIcon = isAuthenticated ? LogoutIcon : LoginIcon;
  const shouldShowAvatar = isAuthenticated && !isAdministrator;

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
              aria-label={isMenuOpen ? t('nav.menu.close') : t('nav.menu.open')}
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
            aria-label={t('header.home')}
            onClick={onHomeClick}
          >
            <img className="site-header__logo" src={logoSrc} alt="Logo Joviat" />
          </button>
        </div>
        <div className="site-header__actions">
          <div className={`site-header__user${isAuthenticated ? ' site-header__user--authenticated' : ''}`}>
            {shouldShowAvatar ? (
              <button
                className="site-header__avatar"
                type="button"
                aria-label={t('header.profile')}
                onClick={onEditProfile}
              >
                <SmartImage
                  src={currentStudentProfile?.PhotoURL}
                  type="student"
                  label={currentStudentProfile?.Name ?? currentUserEmail}
                  alt=""
                />
              </button>
            ) : null}
            <button className="site-header__auth-button" type="button" onClick={onAuthAction}>
              <span className="site-header__auth-icon" aria-hidden="true">
                <AuthIcon focusable="false" />
              </span>
              {isAuthenticated ? t('header.logout') : t('header.login')}
            </button>
            {isAuthenticated && currentUserEmail ? (
              <span className="site-header__email">{currentUserEmail}</span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
