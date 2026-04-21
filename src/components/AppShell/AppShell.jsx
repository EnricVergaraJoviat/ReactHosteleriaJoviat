import { useEffect, useState } from 'react';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import useIsDesktop from '../../hooks/useIsDesktop';
import joviatLogo from '../../assets/images/logo_joviat.webp';
import './AppShell.css';

function AppShell({
  activeView,
  isAdministrator,
  isAuthenticated,
  hasStudentProfile,
  onAuthAction,
  onNavigate,
  children,
}) {
  const isDesktop = useIsDesktop();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isDesktop) {
      setIsMenuOpen(false);
    }
  }, [isDesktop]);

  const handleNavigate = (view) => {
    onNavigate(view);
    if (!isDesktop) {
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="app-shell">
      <Header
        logoSrc={joviatLogo}
        isAuthenticated={isAuthenticated}
        isMenuOpen={isMenuOpen}
        onAuthAction={onAuthAction}
        showMenuButton={!isDesktop}
        onHomeClick={() => handleNavigate('home')}
        onMenuToggle={() => setIsMenuOpen((current) => !current)}
      />
      <div className="app-shell__layout">
        <Sidebar
          activeView={activeView}
          isAdministrator={isAdministrator}
          isAuthenticated={isAuthenticated}
          hasStudentProfile={hasStudentProfile}
          isDesktop={isDesktop}
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onNavigate={handleNavigate}
        />
        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
