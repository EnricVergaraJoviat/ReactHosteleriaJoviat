import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../helpers/firebase';
import './StudentsScreen.css';

function StudentsScreen() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      try {
        const snapshot = await getDocs(collection(db, 'Alumni'));
        const firestoreStudents = snapshot.docs.map((studentDoc) => ({
          id: studentDoc.id,
          ...studentDoc.data(),
        }));

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

  return (
    <section className="students-screen">
      <div className="students-screen__intro">
        <p className="students-screen__eyebrow">Alumnes</p>
        <h1>Llistat d&apos;alumnes</h1>
        <p className="students-screen__description">
          Dades carregades des de la col·lecció <strong>Alumni</strong> de
          Cloud Firestore. Cada alumne mostra les propietats Name i PhotoURL.
        </p>
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

      <div className="students-grid">
        {students.map((student) => (
          <article className="student-card" key={student.id ?? student.Name}>
            <div className="student-card__image-wrap">
              {student.PhotoURL ? (
                <img
                  className="student-card__image"
                  src={student.PhotoURL}
                  alt={student.Name ?? 'Alumne'}
                />
              ) : null}
            </div>
            <div className="student-card__body">
              <p className="student-card__label">Name</p>
              <h2>{student.Name ?? 'Sense nom'}</h2>
              <p className="student-card__meta">
                {student.PhotoURL ? 'PhotoURL disponible' : 'PhotoURL no disponible'}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default StudentsScreen;
