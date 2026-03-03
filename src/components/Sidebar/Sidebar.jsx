import './Sidebar.css';

const MENU_ITEMS = [
  'Visualitzar Restaurants',
  'Visualitzar alumnes',
];

function Sidebar({ isDesktop, isOpen, onClose }) {
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
              <li key={item}>
                <button className="sidebar__link" type="button">
                  {item}
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
