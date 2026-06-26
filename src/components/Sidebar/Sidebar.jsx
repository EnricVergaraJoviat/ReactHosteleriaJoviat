import './Sidebar.css';
import { ReactComponent as RestaurantsMenuIcon } from '../../assets/icons/restaurants.svg';
import { ReactComponent as AddRestaurantMenuIcon } from '../../assets/icons/add-restaurant.svg';
import { APP_VERSION } from '../../appVersion';
import joviatNetworkingLogo from '../../assets/images/logo_joviat_networking_white.png';
import worldImage from '../../assets/images/world_joviat.png';
import { useI18n } from '../../i18n/I18nContext';

const TRELLO_BOARD_URL = 'https://trello.com/b/4CWtinBj/hosteleriajoviat';

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
    labelKey: 'nav.restaurants',
    view: 'restaurants',
    icon: <SidebarAssetIcon icon={RestaurantsMenuIcon} className="sidebar__icon--restaurant" />,
  },
  {
    labelKey: 'nav.students',
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
    labelKey: 'nav.addRestaurant',
    view: 'add-restaurant',
    icon: <SidebarAssetIcon icon={AddRestaurantMenuIcon} className="sidebar__icon--add-restaurant" />,
  },
  {
    labelKey: 'nav.addStudent',
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
    labelKey: 'nav.manageRegistrations',
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
    labelKey: 'nav.editProfile',
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
  onReportIncident,
}) {
  const { language, languages, setLanguage, t } = useI18n();
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
          aria-label={t('nav.menu.close')}
          onClick={onClose}
        />
      ) : null}
      <aside className={sidebarClassName} aria-label={t('nav.main')}>
        <nav className="sidebar__nav">
          <div className="sidebar__brand">
            <img
              className="sidebar__brand-logo"
              src={joviatNetworkingLogo}
              alt="Joviat Networking"
            />
            <p className="sidebar__label">Alumni Network</p>
            <div className="sidebar__language-switcher" aria-label={t('language.label')}>
              {languages.map((languageCode) => (
                <button
                  key={languageCode}
                  className={`sidebar__language-button${
                    language === languageCode ? ' sidebar__language-button--active' : ''
                  }`}
                  type="button"
                  aria-label={t(`language.${languageCode}`)}
                  aria-pressed={language === languageCode}
                  onClick={() => setLanguage(languageCode)}
                >
                  {languageCode.toUpperCase()}
                </button>
              ))}
            </div>
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
                  <span className="sidebar__link-text">{t(item.labelKey)}</span>
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
                      <span className="sidebar__link-text">{t(item.labelKey)}</span>
                    </button>
                  </li>
                ))}
                {isAdministrator ? (
                  <li>
                    <a
                      className="sidebar__link sidebar__link--external"
                      href={TRELLO_BOARD_URL}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <SidebarIcon>
                        <path
                          d="M7 4.75h10A2.25 2.25 0 0 1 19.25 7v10A2.25 2.25 0 0 1 17 19.25H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <path
                          d="M9 8.5h2.25v6H9zM12.75 8.5H15v3.75h-2.25z"
                          fill="currentColor"
                        />
                      </SidebarIcon>
                      <span className="sidebar__link-text">{t('nav.openTrello')}</span>
                    </a>
                  </li>
                ) : null}
              </ul>
            </>
          ) : null}
          {isAuthenticated ? (
            <>
              <div className="sidebar__divider" aria-hidden="true" />
              <ul className="sidebar__list">
                <li>
                  <button
                    className="sidebar__link"
                    type="button"
                    onClick={onReportIncident}
                  >
                    <SidebarIcon>
                      <path
                        d="M12 8.5v4.2M12 16.2h.01M5.4 19h13.2a1.8 1.8 0 0 0 1.6-2.65L13.6 4.9a1.85 1.85 0 0 0-3.2 0L3.8 16.35A1.8 1.8 0 0 0 5.4 19Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </SidebarIcon>
                    <span className="sidebar__link-text">{t('nav.reportIncident')}</span>
                  </button>
                </li>
              </ul>
            </>
          ) : null}
          <div className="sidebar__footer">
            <div className="sidebar__world-art" aria-hidden="true">
              <img src={worldImage} alt="" />
            </div>
            <p className="sidebar__version">v{APP_VERSION}</p>
          </div>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
