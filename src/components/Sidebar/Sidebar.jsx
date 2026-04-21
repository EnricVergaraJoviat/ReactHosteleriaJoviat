import './Sidebar.css';
import { ReactComponent as RestaurantsMenuIcon } from '../../assets/icons/restaurants.svg';
import { ReactComponent as AddRestaurantMenuIcon } from '../../assets/icons/add-restaurant.svg';

function SidebarIcon({ children }) {
  return (
    <span className="sidebar__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {children}
      </svg>
    </span>
  );
}

function SidebarAssetIcon({ icon: Icon, className = '' }) {
  return (
    <span className={`sidebar__icon ${className}`.trim()} aria-hidden="true">
      <Icon focusable="false" />
    </span>
  );
}

const MENU_ITEMS = [
  {
    label: 'Visualitzar Restaurants',
    view: 'restaurants',
    icon: <SidebarAssetIcon icon={RestaurantsMenuIcon} className="sidebar__icon--restaurant" />,
  },
  {
    label: 'Visualitzar alumnes',
    view: 'students',
    icon: (
      <SidebarIcon>
        <path
          d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4 19a5 5 0 0 1 10 0M17 10a2.5 2.5 0 1 0 0-5M17.5 14.5c1.9.2 3.4 1.9 3.5 3.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </SidebarIcon>
    ),
  },
];

const ADMIN_MENU_ITEMS = [
  {
    label: 'Afegir Restaurant',
    view: 'add-restaurant',
    icon: <SidebarAssetIcon icon={AddRestaurantMenuIcon} className="sidebar__icon--add-restaurant" />,
  },
  {
    label: 'Afegir Alumne',
    view: 'add-student',
    icon: (
      <SidebarIcon>
        <path
          d="M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4 19a6 6 0 0 1 12 0M18 8v6M15 11h6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </SidebarIcon>
    ),
  },
  {
    label: 'Gestionar altes',
    view: 'manage-registrations',
    icon: (
      <SidebarIcon>
        <path
          d="M12 21s-6.5-3.8-6.5-10V6.5L12 4l6.5 2.5V11c0 6.2-6.5 10-6.5 10Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m9.5 12 1.7 1.7 3.3-3.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </SidebarIcon>
    ),
  },
];

const STUDENT_MENU_ITEMS = [
  {
    label: 'Editar perfil',
    view: 'edit-profile',
    icon: (
      <SidebarIcon>
        <path
          d="M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 19a7 7 0 0 1 14 0M17.5 17.5l3-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m19 13 2 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </SidebarIcon>
    ),
  },
];

function Sidebar({
  activeView,
  isAdministrator,
  isAuthenticated,
  hasStudentProfile,
  isDesktop,
  isOpen,
  onClose,
  onNavigate,
}) {
  const secondaryMenuItems = isAuthenticated
    ? isAdministrator
      ? ADMIN_MENU_ITEMS
      : hasStudentProfile
        ? STUDENT_MENU_ITEMS
        : []
    : [];

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
          <div className="sidebar__brand">
            <p className="sidebar__brand-section">Culinary</p>
            <p className="sidebar__label">Alumni Network</p>
          </div>
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
                  {item.icon}
                  <span className="sidebar__link-text">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
          {secondaryMenuItems.length ? (
            <>
              <div className="sidebar__divider" aria-hidden="true" />
              <ul className="sidebar__list sidebar__list--admin">
                {secondaryMenuItems.map((item) => (
                  <li key={item.view}>
                    <button
                      className={`sidebar__link ${
                        activeView === item.view ? 'sidebar__link--active' : ''
                    }`}
                      type="button"
                      onClick={() => onNavigate(item.view)}
                    >
                      {item.icon}
                      <span className="sidebar__link-text">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
