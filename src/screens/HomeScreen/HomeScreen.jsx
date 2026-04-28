import heroImage from '../../assets/images/joviat-restaurant.webp';
import alumniIcon from '../../assets/images/Alumni.png';
import { useI18n } from '../../i18n/I18nContext';
import './HomeScreen.css';

function HomeScreen({ onNavigate }) {
  const { t } = useI18n();

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
              <span>{t('home.register')}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomeScreen;
