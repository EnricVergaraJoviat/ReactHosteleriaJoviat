import './AdminScreen.css';
import { useI18n } from '../../i18n/I18nContext';

function AdminScreen({ view }) {
  const { t } = useI18n();
  const titleKeyByView = {
    'add-restaurant': 'forms.addRestaurant',
    'add-student': 'forms.addStudent',
    'manage-registrations': 'registrations.title',
  };
  const titleKey = titleKeyByView[view] ?? titleKeyByView['manage-registrations'];

  return (
    <section className="admin-screen__hero">
      <div className="admin-screen__content">
        <p className="admin-screen__eyebrow">{t('common.administration')}</p>
        <h1>{t(titleKey)}</h1>
        <p className="admin-screen__description">{t('registrations.description')}</p>
      </div>
    </section>
  );
}

export default AdminScreen;
