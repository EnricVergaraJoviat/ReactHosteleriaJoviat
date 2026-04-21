import { useEffect, useState } from 'react';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import SmartImage from '../../components/SmartImage/SmartImage';
import { ReactComponent as SearchIcon } from '../../assets/icons/search.svg';
import { ReactComponent as StudentRestaurantsIcon } from '../../assets/icons/student-restaurants.svg';
import { useI18n } from '../../i18n/I18nContext';
import './StudentsScreen.css';

const STUDENTS_PER_PAGE = 8;

function StudentsScreen({ onOpenStudentDetails }) {
  const { t } = useI18n();
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
          setError(t('students.loadError'));
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
  }, [t]);

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
        <p className="students-screen__eyebrow">{t('common.students')}</p>
        <h1>{t('students.title')}</h1>
      </div>

      <div className="students-search">
        <label className="students-search__label" htmlFor="students-search">
          <span>{t('students.search')}</span>
          <span className="students-search__count">
            {t('list.showing', { filtered: filteredStudents.length, total: students.length })}
          </span>
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
            placeholder={t('students.placeholder')}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm ? (
            <button
              className="students-search__clear"
              type="button"
              aria-label={t('students.clearSearch')}
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {!isLoading && !error && filteredStudents.length > STUDENTS_PER_PAGE ? (
        <nav className="students-pagination" aria-label={t('students.pagination')}>
          <p className="students-pagination__summary">
            {t('list.rangeStudents', { start: rangeStart, end: rangeEnd, total: filteredStudents.length })}
          </p>
          <div className="students-pagination__controls">
            <button
              className="students-pagination__arrow"
              type="button"
              aria-label={t('list.previousPage')}
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
                    aria-label={t('list.goToPage', { page: pageNumber })}
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
              aria-label={t('list.nextPage')}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              ›
            </button>
          </div>
        </nav>
      ) : null}

      {isLoading ? (
        <div className="students-screen__status students-screen__status--loading" role="status">
          <span className="students-screen__spinner" aria-hidden="true" />
          <span>{t('students.loading')}</span>
        </div>
      ) : null}

      {error ? (
        <p className="students-screen__status students-screen__status--error" role="alert">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && students.length === 0 ? (
        <p className="students-screen__status">{t('students.empty')}</p>
      ) : null}

      {!isLoading && !error && students.length > 0 && filteredStudents.length === 0 ? (
        <p className="students-screen__status">
          {t('students.noResults')}
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
                alt={student.Name ?? t('common.student')}
              />
            </div>
            <div className="student-card__body">
              <h2>{student.Name ?? t('common.noName')}</h2>
              <p className="student-card__status">
                {student.isExAlumni ? t('common.exStudent') : t('common.student')}
              </p>
              <div className="student-card__meta">
                <span className="student-card__meta-icon" aria-hidden="true">
                  <StudentRestaurantsIcon focusable="false" />
                </span>
                <span>
                  {student.linkedRestaurantCount > 0
                    ? t('students.restaurantCount', {
                      count: student.linkedRestaurantCount,
                      plural: student.linkedRestaurantCount === 1 ? '' : 's',
                    })
                    : t('students.restaurantCount', { count: 0, plural: 's' })}
                </span>
              </div>
              <button
                className="student-card__details"
                type="button"
                aria-label={t('students.openDetails', { name: student.Name ?? t('common.student') })}
                onClick={() => onOpenStudentDetails(student.id)}
              >
                {t('common.details')}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default StudentsScreen;
