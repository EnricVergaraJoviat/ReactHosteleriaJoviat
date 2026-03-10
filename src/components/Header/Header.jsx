import './Header.css';

function Header({ logoSrc, isMenuOpen, showMenuButton, onMenuToggle, onHomeClick }) {
  return (
    <header className="site-header">
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
    </header>
  );
}

export default Header;
