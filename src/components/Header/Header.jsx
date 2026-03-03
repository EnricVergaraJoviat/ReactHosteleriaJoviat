import './Header.css';

function Header({ logoSrc, showMenuButton, onMenuToggle }) {
  return (
    <header className="site-header">
      <div className="site-header__brand">
        {showMenuButton ? (
          <button
            className="site-header__menu-button"
            type="button"
            aria-label="Obrir menu"
            onClick={onMenuToggle}
          >
            <span />
            <span />
            <span />
          </button>
        ) : null}
        <img className="site-header__logo" src={logoSrc} alt="Logo Joviat" />
      </div>
    </header>
  );
}

export default Header;
