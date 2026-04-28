import { useEffect, useMemo, useState } from 'react';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import {
  CURRENTLY_STUDYING_PROMOTION_VALUE,
  createPromotionYears,
  formatPromotionYear,
} from '../../helpers/promotionYears';
import SmartImage from '../../components/SmartImage/SmartImage';
import { ReactComponent as SearchIcon } from '../../assets/icons/search.svg';
import { ReactComponent as SettingsIcon } from '../../assets/icons/settings.svg';
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
  const [areFiltersOpen, setAreFiltersOpen] = useState(true);
  const [studentTypeFilter, setStudentTypeFilter] = useState('all');
  const [currentWorkFilter, setCurrentWorkFilter] = useState('all');
  const [promotionYearFilter, setPromotionYearFilter] = useState('all');
  const promotionYears = useMemo(createPromotionYears, []);

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
  const filteredStudents = students.filter((student) => {
    const matchesSearch = (student.Name ?? '').toLowerCase().includes(normalizedSearchTerm);
    const matchesType = studentTypeFilter === 'all'
      || (studentTypeFilter === 'students' && !student.isExAlumni)
      || (studentTypeFilter === 'exStudents' && student.isExAlumni);
    const hasCurrentWork = (student.linkedRestaurants ?? []).some((restaurant) => restaurant.currentJob);
    const matchesCurrentWork = currentWorkFilter === 'all'
      || (currentWorkFilter === 'current' && hasCurrentWork)
      || (currentWorkFilter === 'notCurrent' && !hasCurrentWork);
    const matchesPromotionYear = promotionYearFilter === 'all'
      || String(student.PromotionYear ?? '') === promotionYearFilter;

    return matchesSearch && matchesType && matchesCurrentWork && matchesPromotionYear;
  });
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
  }, [normalizedSearchTerm, studentTypeFilter, currentWorkFilter, promotionYearFilter]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <section className="students-screen">
      <div className="students-screen__intro">
        <h1>{t('students.title')}</h1>
      </div>

      <div className="students-search">
        <label className="students-search__label" htmlFor="students-search">
          <span>{t('students.search')}</span>
          <span className="students-search__count">
            {t('list.showing', { filtered: filteredStudents.length, total: students.length })}
          </span>
        </label>
        <div className="students-search__controls">
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
          <button
            className={`students-filters__toggle${areFiltersOpen ? ' students-filters__toggle--active' : ''}`}
            type="button"
            aria-label={t('filters.moreOptions')}
            aria-expanded={areFiltersOpen}
            onClick={() => setAreFiltersOpen((current) => !current)}
          >
            <SettingsIcon focusable="false" />
          </button>
        </div>
      </div>

      <div className="students-filters">
        {areFiltersOpen ? (
          <div className="students-filters__panel">
            <label className="students-filters__field" htmlFor="students-type-filter">
              <span>{t('filters.studentType')}</span>
              <select
                id="students-type-filter"
                value={studentTypeFilter}
                onChange={(event) => setStudentTypeFilter(event.target.value)}
              >
                <option value="all">{t('filters.allStudents')}</option>
                <option value="students">{t('common.student')}</option>
                <option value="exStudents">{t('common.exStudent')}</option>
              </select>
            </label>
            <label className="students-filters__field" htmlFor="students-current-work-filter">
              <span>{t('filters.currentWork')}</span>
              <select
                id="students-current-work-filter"
                value={currentWorkFilter}
                onChange={(event) => setCurrentWorkFilter(event.target.value)}
              >
                <option value="all">{t('filters.anyCurrentWork')}</option>
                <option value="current">{t('filters.currentlyWorking')}</option>
                <option value="notCurrent">{t('filters.notCurrentlyWorking')}</option>
              </select>
            </label>
            <label className="students-filters__field" htmlFor="students-promotion-year-filter">
              <span>{t('forms.promotionYear')}</span>
              <select
                id="students-promotion-year-filter"
                value={promotionYearFilter}
                onChange={(event) => setPromotionYearFilter(event.target.value)}
              >
                <option value="all">{t('filters.anyYear')}</option>
                <option value={CURRENTLY_STUDYING_PROMOTION_VALUE}>
                  {t('students.currentlyStudying')}
                </option>
                {promotionYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
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
              {student.PromotionYear ? (
                <p className="student-card__promotion-year">
                  {formatPromotionYear(t, student.PromotionYear)}
                </p>
              ) : null}
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
