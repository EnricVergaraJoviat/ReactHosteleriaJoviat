import { useI18n } from '../../i18n/I18nContext';
import './ViewModeToggle.css';

const iconPaths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  list: 'M3 4h3v3H3z M9 4h12v3H9z M3 10h3v3H3z M9 10h12v3H9z M3 16h3v3H3z M9 16h12v3H9z',
  map: 'M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z',
};

export default function ViewModeToggle({ value, onChange, showMap = false }) {
  const { t } = useI18n();
  return (
    <div className="view-mode-toggle" role="group" aria-label={t('list.viewMode')}>
      {(showMap ? ['grid', 'list', 'map'] : ['grid', 'list']).map((mode) => (
        <button
          key={mode}
          className="view-mode-toggle__button"
          type="button"
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={iconPaths[mode]} fill="currentColor" fillRule="evenodd" />
          </svg>
          {t(mode === 'map' ? 'restaurants.mapMode' : `list.${mode}Mode`)}
        </button>
      ))}
    </div>
  );
}
