import { useEffect, useState } from 'react';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import SmartImage from '../../components/SmartImage/SmartImage';
import { ReactComponent as SearchIcon } from '../../assets/icons/search.svg';
import { ReactComponent as StudentRestaurantsIcon } from '../../assets/icons/student-restaurants.svg';
import './StudentsScreen.css';

const STUDENTS_PER_PAGE = 8;

function StudentsScreen({ onOpenStudentDetails }) {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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
  const totalPages = Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE);
  const visibleStudents = filteredStudents.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE
  );
  const rangeStart = filteredStudents.length === 0
    ? 0
    : ((currentPage - 1) * STUDENTS_PER_PAGE) + 1;
  const rangeEnd = Math.min(currentPage * STUDENTS_PER_PAGE, filteredStudents.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearchTerm]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <section className="students-screen">
      <div className="students-screen__intro">
        <p className="students-screen__eyebrow">Alumnes</p>
        <h1>Llistat d&apos;alumnes</h1>
      </div>

      <div className="students-search">
        <label className="students-search__label" htmlFor="students-search">
          Cercar alumne
        </label>
        <div className="students-search__field">
          <span className="students-search__icon" aria-hidden="true">
            <SearchIcon focusable="false" />
          </span>
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

      {!isLoading && !error && filteredStudents.length > STUDENTS_PER_PAGE ? (
        <nav className="students-pagination" aria-label="Paginacio d'alumnes">
          <p className="students-pagination__summary">
            {rangeStart} a {rangeEnd} de {filteredStudents.length} alumnes
          </p>
          <div className="students-pagination__controls">
            <button
              className="students-pagination__arrow"
              type="button"
              aria-label="Pagina anterior"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              ‹
            </button>
            <div className="students-pagination__pages">
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;

                return (
                  <button
                    key={pageNumber}
                    className={`students-pagination__page${
                      pageNumber === currentPage ? ' students-pagination__page--active' : ''
                    }`}
                    type="button"
                    aria-label={`Anar a la pagina ${pageNumber}`}
                    aria-current={pageNumber === currentPage ? 'page' : undefined}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            <button
              className="students-pagination__arrow"
              type="button"
              aria-label="Pagina seguent"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              ›
            </button>
          </div>
        </nav>
      ) : null}

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
        {visibleStudents.map((student) => (
          <article className="student-card" key={student.id ?? student.Name}>
            <div className="student-card__image-wrap">
              <SmartImage
                className="student-card__image"
                src={student.PhotoURL}
                type="student"
                label={student.Name}
                alt={student.Name ?? 'Alumne'}
              />
            </div>
            <div className="student-card__body">
              <h2>{student.Name ?? 'Sense nom'}</h2>
              <p className="student-card__status">
                {student.isExAlumni ? 'Exalumne' : 'Alumne'}
              </p>
              <div className="student-card__meta">
                <span className="student-card__meta-icon" aria-hidden="true">
                  <StudentRestaurantsIcon focusable="false" />
                </span>
                <span>
                  {student.linkedRestaurantCount > 0
                    ? `${student.linkedRestaurantCount} restaurant${
                      student.linkedRestaurantCount === 1 ? '' : 's'
                    } associat${student.linkedRestaurantCount === 1 ? '' : 's'}`
                    : '0 restaurants associats'}
                </span>
              </div>
              <button
                className="student-card__details"
                type="button"
                aria-label={`Obrir fitxa de ${student.Name ?? 'l alumne'}`}
                onClick={() => onOpenStudentDetails(student.id)}
              >
                Veure detalls
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default StudentsScreen;
