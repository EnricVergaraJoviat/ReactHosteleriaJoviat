import { useEffect, useMemo, useState } from 'react';
import heroImage from '../../assets/images/joviat-restaurant.webp';
import alumniIcon from '../../assets/images/Alumni.png';
import { useI18n } from '../../i18n/I18nContext';
import './HomeScreen.css';

function getMobileInstallState() {
  if (typeof window === 'undefined') {
    return {
      isAndroid: false,
      isIos: false,
      isInstalled: false,
      isMobileDevice: false,
    };
  }

  const userAgent = window.navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/i.test(userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  return {
    isAndroid,
    isIos,
    isInstalled,
    isMobileDevice: isIos || isAndroid,
  };
}

function HomeScreen({ onNavigate }) {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallHelpVisible, setIsInstallHelpVisible] = useState(false);
  const [installState, setInstallState] = useState(getMobileInstallState);

  useEffect(() => {
    function refreshInstallState() {
      setInstallState(getMobileInstallState());
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      refreshInstallState();
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsInstallHelpVisible(false);
      refreshInstallState();
    }

    refreshInstallState();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const shouldShowInstallButton = useMemo(() => (
    installState.isMobileDevice
    && !installState.isInstalled
    && (installState.isIos || installState.isAndroid)
  ), [installState]);

  async function handleInstallApp() {
    if (installState.isIos) {
      setIsInstallHelpVisible((currentValue) => !currentValue);
      return;
    }

    if (!deferredPrompt) {
      setIsInstallHelpVisible(true);
      return;
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice.catch(() => null);

    if (choiceResult?.outcome === 'accepted') {
      setIsInstallHelpVisible(false);
    }

    setDeferredPrompt(null);
  }

  return (
    <section
      className="home-screen__hero"
      style={{ backgroundImage: `url(${heroImage})` }}
    >
      <div className="home-screen__overlay" aria-hidden="true" />
      <div className="home-screen__content">
        <div className="home-screen__top-content">
          <p className="home-screen__eyebrow">{t('home.eyebrow')}</p>
          <p className="home-screen__description">
            {t('home.description')}
          </p>
          <div className="home-screen__actions">
            <button
              className="home-screen__action home-screen__action--primary"
              type="button"
              onClick={() => onNavigate('restaurants')}
            >
              {t('home.restaurants')}
            </button>
            <button
              className="home-screen__action home-screen__action--secondary"
              type="button"
              onClick={() => onNavigate('students')}
            >
              {t('home.students')}
            </button>
          </div>
        </div>
        <div className="home-screen__headline-panel">
          <div className="home-screen__headline-copy">
            <h1>{t('home.title')}</h1>
            <div className="home-screen__cta-group">
              <div className="home-screen__register-cta">
                <button
                  className="home-screen__register-button"
                  type="button"
                  onClick={() => onNavigate('register')}
                >
                  <img
                    className="home-screen__register-icon"
                    src={alumniIcon}
                    alt=""
                    aria-hidden="true"
                  />
                  <span className="home-screen__register-copy">
                    <span>{t('home.register')}</span>
                    <span className="home-screen__register-note">
                      {t('home.registerNote')}
                    </span>
                  </span>
                </button>
              </div>
              {shouldShowInstallButton ? (
                <button
                  className="home-screen__install-button"
                  type="button"
                  onClick={handleInstallApp}
                >
                  <span>{t('home.install')}</span>
                </button>
              ) : null}
            </div>
            {shouldShowInstallButton && isInstallHelpVisible ? (
              <p className="home-screen__install-help">
                {installState.isIos
                  ? t('home.installIosHelp')
                  : t('home.installAndroidHelp')}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomeScreen;
