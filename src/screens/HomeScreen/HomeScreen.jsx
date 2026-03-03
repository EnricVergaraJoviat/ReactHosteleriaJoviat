import { useEffect, useState } from 'react';
import Header from '../../components/Header/Header';
import Sidebar from '../../components/Sidebar/Sidebar';
import joviatLogo from '../../assets/images/logo_joviat.webp';
import useIsDesktop from '../../hooks/useIsDesktop';
import './HomeScreen.css';

function HomeScreen() {
  const isDesktop = useIsDesktop();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isDesktop) {
      setIsMenuOpen(false);
    }
  }, [isDesktop]);

  return (
    <div className="home-screen">
      <Header
        logoSrc={joviatLogo}
        showMenuButton={!isDesktop}
        onMenuToggle={() => setIsMenuOpen((current) => !current)}
      />
      <div className="home-screen__layout">
        <Sidebar
          isDesktop={isDesktop}
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
        />
        <main className="home-screen__hero">
          <div className="home-screen__content">
            <p className="home-screen__eyebrow">Escola Joviat</p>
            <h1>Pagina principal en construccio</h1>
            <p className="home-screen__description">
              Aquesta base ja te la capcalera negra i l&apos;estructura inicial
              preparada per continuar desenvolupant la portada.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default HomeScreen;
