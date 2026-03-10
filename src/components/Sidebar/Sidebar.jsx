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

function Sidebar({ activeView, isDesktop, isOpen, onClose, onNavigate }) {
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
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
