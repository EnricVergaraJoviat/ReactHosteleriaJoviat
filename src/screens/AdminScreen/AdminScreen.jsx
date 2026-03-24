import './AdminScreen.css';

const ADMIN_SCREEN_CONTENT = {
  'add-restaurant': {
    eyebrow: 'Administracio',
    title: 'Afegir Restaurant',
    description:
      'Aquesta area queda preparada per crear nous restaurants i completar-ne les dades administratives.',
  },
  'add-student': {
    eyebrow: 'Administracio',
    title: 'Afegir Alumne',
    description:
      'Aquesta area queda preparada per donar d\'alta nous alumnes i registrar la seva informacio basica.',
  },
  'manage-registrations': {
    eyebrow: 'Administracio',
    title: 'Gestionar altes',
    description:
      'Aquesta area queda preparada per revisar, validar o rebutjar noves altes pendents del sistema.',
  },
};

function AdminScreen({ view }) {
  const content = ADMIN_SCREEN_CONTENT[view] ?? ADMIN_SCREEN_CONTENT['manage-registrations'];

  return (
    <section className="admin-screen__hero">
      <div className="admin-screen__content">
        <p className="admin-screen__eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p className="admin-screen__description">{content.description}</p>
      </div>
    </section>
  );
}

export default AdminScreen;
