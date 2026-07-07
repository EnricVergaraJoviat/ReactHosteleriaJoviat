import { useEffect, useState } from 'react';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import useIsDesktop from '../../hooks/useIsDesktop';
import './AppShell.css';

const joviatLogo = `${process.env.PUBLIC_URL}/logo_joviat_culinary.png`;

function AppShell({
  activeView,
  isAdministrator,
  isAuthenticated,
  currentStudentProfile,
  currentUserEmail,
  hasStudentProfile,
  onAuthAction,
  onNavigate,
  onReportIncident,
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
        currentStudentProfile={currentStudentProfile}
        currentUserEmail={currentUserEmail}
        isAdministrator={isAdministrator}
        isAuthenticated={isAuthenticated}
        isMenuOpen={isMenuOpen}
        onAuthAction={onAuthAction}
        onEditProfile={() => handleNavigate('edit-profile')}
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
          onReportIncident={() => {
            onReportIncident?.();
            if (!isDesktop) {
              setIsMenuOpen(false);
            }
          }}
        />
        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
