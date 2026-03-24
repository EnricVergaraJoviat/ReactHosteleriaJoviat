import './Sidebar.css';

const MENU_ITEMS = [
  {
    label: 'Visualitzar Restaurants',
    view: 'restaurants',
  },
  {
    label: 'Visualitzar alumnes',
    view: 'students',
  },
];

const ADMIN_MENU_ITEMS = [
  {
    label: 'Afegir Restaurant',
    view: 'add-restaurant',
  },
  {
    label: 'Afegir Alumne',
    view: 'add-student',
  },
  {
    label: 'Gestionar altes',
    view: 'manage-registrations',
  },
];

function Sidebar({
  activeView,
  isAdministrator,
  isAuthenticated,
  isDesktop,
  isOpen,
  onAuthAction,
  onClose,
  onNavigate,
}) {
  const sidebarClassName = isDesktop
    ? 'sidebar sidebar--desktop'
    : `sidebar sidebar--mobile ${isOpen ? 'sidebar--open' : ''}`;

  return (
    <>
      {!isDesktop && isOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Tancar menu"
          onClick={onClose}
        />
      ) : null}
      <aside className={sidebarClassName} aria-label="Menu principal">
        <nav className="sidebar__nav">
          <p className="sidebar__label">Menu</p>
          <ul className="sidebar__list">
            {MENU_ITEMS.map((item) => (
              <li key={item.view}>
                <button
                  className={`sidebar__link ${
                    activeView === item.view ? 'sidebar__link--active' : ''
                  }`}
                  type="button"
                  onClick={() => onNavigate(item.view)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="sidebar__divider" aria-hidden="true" />
          <div className="sidebar__auth">
            <button
              className={`sidebar__link ${
                activeView === 'auth' ? 'sidebar__link--active' : ''
              }`}
              type="button"
              onClick={onAuthAction}
            >
              {isAuthenticated ? 'Logout' : 'Login'}
            </button>
          </div>
          {isAuthenticated && isAdministrator ? (
            <ul className="sidebar__list sidebar__list--admin">
              {ADMIN_MENU_ITEMS.map((item) => (
                <li key={item.view}>
                  <button
                    className={`sidebar__link ${
                      activeView === item.view ? 'sidebar__link--active' : ''
                    }`}
                    type="button"
                    onClick={() => onNavigate(item.view)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
