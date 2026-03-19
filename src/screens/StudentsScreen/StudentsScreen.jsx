import { useEffect, useState } from 'react';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import { getImageWithFallback } from '../../helpers/imageFallbacks';
import './StudentsScreen.css';

function StudentsScreen({ onOpenStudentDetails }) {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      try {
        const { students: firestoreStudents } = await loadStudentRestaurantGraph();

        if (isMounted) {
          setStudents(firestoreStudents);
          setError('');
        }
      } catch (loadError) {
        if (isMounted) {
          setError('No s\'han pogut carregar els alumnes de Firestore.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredStudents = students.filter((student) =>
    (student.Name ?? '').toLowerCase().includes(normalizedSearchTerm)
  );

  return (
    <section className="students-screen">
      <div className="students-screen__intro">
        <p className="students-screen__eyebrow">Alumnes</p>
        <h1>Llistat d&apos;alumnes</h1>
        <p className="students-screen__description">
          Dades carregades des de la col·lecció <strong>Alumni</strong> de
          Cloud Firestore. Des del llistat pots obrir la fitxa completa de cada alumne.
        </p>
      </div>

      <div className="students-search">
        <label className="students-search__label" htmlFor="students-search">
          Cercar alumne
        </label>
        <div className="students-search__field">
          <input
            id="students-search"
            className="students-search__input"
            type="text"
            value={searchTerm}
            placeholder="Escriu el nom de l'alumni"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm ? (
            <button
              className="students-search__clear"
              type="button"
              aria-label="Esborrar cerca d'alumnes"
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <p className="students-screen__status" role="status">
          Carregant alumnes...
        </p>
      ) : null}

      {error ? (
        <p className="students-screen__status students-screen__status--error" role="alert">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && students.length === 0 ? (
        <p className="students-screen__status">No hi ha alumnes disponibles.</p>
      ) : null}

      {!isLoading && !error && students.length > 0 && filteredStudents.length === 0 ? (
        <p className="students-screen__status">
          No s&apos;ha trobat cap alumne amb aquest nom.
        </p>
      ) : null}

      <div className="students-grid">
        {filteredStudents.map((student) => (
          <article className="student-card" key={student.id ?? student.Name}>
            <div className="student-card__image-wrap">
              <img
                className="student-card__image"
                src={getImageWithFallback(student.PhotoURL, 'student', student.Name)}
                alt={student.Name ?? 'Alumne'}
              />
            </div>
            <div className="student-card__body">
              <div className="student-card__header">
                <div>
                  <p className="student-card__label">Name</p>
                  <h2>{student.Name ?? 'Sense nom'}</h2>
                </div>
                <button
                  className="student-card__details"
                  type="button"
                  aria-label={`Obrir fitxa de ${student.Name ?? 'l alumne'}`}
                  onClick={() => onOpenStudentDetails(student.id)}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path
                      d="M12 5c5.5 0 9.5 5.9 9.7 6.2a1.4 1.4 0 0 1 0 1.6C21.5 13.1 17.5 19 12 19S2.5 13.1 2.3 12.8a1.4 1.4 0 0 1 0-1.6C2.5 10.9 6.5 5 12 5Zm0 2C8.4 7 5.4 10.4 4.4 12 5.4 13.6 8.4 17 12 17s6.6-3.4 7.6-5C18.6 10.4 15.6 7 12 7Zm0 1.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
              <p className="student-card__meta">
                {student.linkedRestaurantCount > 0
                  ? `${student.linkedRestaurantCount} restaurant${
                    student.linkedRestaurantCount === 1 ? '' : 's'
                  } associat${student.linkedRestaurantCount === 1 ? '' : 's'}`
                  : 'Sense restaurants associats'}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default StudentsScreen;
