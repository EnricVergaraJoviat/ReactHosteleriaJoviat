import { useEffect, useMemo, useState } from 'react';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import {
  getRestaurantRoleOptions,
  normalizeRestaurantRoles as normalizeRestaurantRoleList,
} from '../../helpers/restaurantRoles';
import {
  getJoviatStudyLabels,
  getJoviatStudyOptions,
  normalizeJoviatStudies,
} from '../../helpers/joviatStudies';
import {
  CURRENTLY_STUDYING_PROMOTION_VALUE,
  createPromotionYears,
  formatPromotionYear,
} from '../../helpers/promotionYears';
import SmartImage from '../../components/SmartImage/SmartImage';
import { ReactComponent as SearchIcon } from '../../assets/icons/search.svg';
import { ReactComponent as SettingsIcon } from '../../assets/icons/settings.svg';
import { ReactComponent as StudentRestaurantsIcon } from '../../assets/icons/student-restaurants.svg';
import alumniTitleImage from '../../assets/images/Alumni.png';
import { useI18n } from '../../i18n/I18nContext';
import './StudentsScreen.css';

const STUDENTS_PER_PAGE = 8;
const joviatStudyOptions = getJoviatStudyOptions();
const allJoviatStudyValues = joviatStudyOptions.map((studyOption) => studyOption.value);

function StudentsScreen({ onOpenStudentDetails }) {
  const { t } = useI18n();
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [areFiltersOpen, setAreFiltersOpen] = useState(true);
  const [areStudyFiltersOpen, setAreStudyFiltersOpen] = useState(false);
  const [areRoleFiltersOpen, setAreRoleFiltersOpen] = useState(false);
  const [studyFilters, setStudyFilters] = useState(allJoviatStudyValues);
  const [currentWorkFilter, setCurrentWorkFilter] = useState('all');
  const [promotionYearFilter, setPromotionYearFilter] = useState('all');
  const [roleFilters, setRoleFilters] = useState([]);
  const promotionYears = useMemo(createPromotionYears, []);
  const restaurantRoleOptions = useMemo(() => getRestaurantRoleOptions(t), [t]);

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
    const normalizedStudentStudies = normalizeJoviatStudies(student.JoviatStudies ?? student.Studies);
    const matchesStudies = normalizedStudentStudies.length === 0
      ? studyFilters.length === allJoviatStudyValues.length
      : studyFilters.some((studyFilter) => normalizedStudentStudies.includes(studyFilter));
    const hasCurrentWork = (student.linkedRestaurants ?? []).some((restaurant) => restaurant.currentJob);
    const matchesCurrentWork = currentWorkFilter === 'all'
      || (currentWorkFilter === 'current' && hasCurrentWork)
      || (currentWorkFilter === 'notCurrent' && !hasCurrentWork);
    const matchesPromotionYear = promotionYearFilter === 'all'
      || String(student.PromotionYear ?? '') === promotionYearFilter;
    const normalizedStudentRoles = (student.linkedRestaurants ?? [])
      .flatMap((restaurant) => normalizeRestaurantRoleList(restaurant.roles ?? restaurant.role))
      .filter(Boolean);
    const matchesRole = roleFilters.length === 0
      || roleFilters.some((roleFilter) => normalizedStudentRoles.includes(roleFilter));

    return matchesSearch && matchesStudies && matchesCurrentWork && matchesPromotionYear && matchesRole;
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
  }, [normalizedSearchTerm, studyFilters, currentWorkFilter, promotionYearFilter, roleFilters]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function handleStudyFilterToggle(studyValue) {
    setStudyFilters((current) => {
      if (current.includes(studyValue)) {
        return current.length === 1
          ? current
          : current.filter((entry) => entry !== studyValue);
      }

      return [...current, studyValue];
    });
  }

  function handleRoleFilterToggle(roleValue) {
    setRoleFilters((current) => (
      current.includes(roleValue)
        ? current.filter((entry) => entry !== roleValue)
        : [...current, roleValue]
    ));
  }

  return (
    <section className="students-screen">
      <div className="students-screen__intro">
        <div className="students-screen__title-row">
          <img className="students-screen__title-icon" src={alumniTitleImage} alt="" aria-hidden="true" />
          <h1>{t('students.title')}</h1>
        </div>
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
            <div className="students-filters__field students-filters__field--studies">
              <button
                className={`students-filters__role-trigger${areStudyFiltersOpen ? ' students-filters__role-trigger--open' : ''}`}
                type="button"
                aria-expanded={areStudyFiltersOpen}
                onClick={() => setAreStudyFiltersOpen((current) => !current)}
              >
                <span>{t('filters.joviatStudies')}</span>
              </button>
              {areStudyFiltersOpen ? (
                <div className="students-filters__role-box">
                  <div className="students-filters__role-actions">
                    <button
                      className="students-filters__role-action"
                      type="button"
                      onClick={() => setStudyFilters(allJoviatStudyValues)}
                    >
                      {t('filters.selectAllStudies')}
                    </button>
                  </div>
                  <div className="students-filters__role-list">
                    {joviatStudyOptions.map((studyOption) => (
                      <label className="students-filters__role-option" key={studyOption.value}>
                        <input
                          type="checkbox"
                          checked={studyFilters.includes(studyOption.value)}
                          disabled={studyFilters.length === 1 && studyFilters.includes(studyOption.value)}
                          onChange={() => handleStudyFilterToggle(studyOption.value)}
                        />
                        <span>{studyOption.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
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
            <div className="students-filters__field students-filters__field--roles">
              <button
                className={`students-filters__role-trigger${areRoleFiltersOpen ? ' students-filters__role-trigger--open' : ''}`}
                type="button"
                aria-expanded={areRoleFiltersOpen}
                onClick={() => setAreRoleFiltersOpen((current) => !current)}
              >
                <span>{t('forms.role')}</span>
              </button>
              {areRoleFiltersOpen ? (
                <div className="students-filters__role-box">
                  <div className="students-filters__role-actions">
                    <button
                      className="students-filters__role-action"
                      type="button"
                      onClick={() => setRoleFilters(restaurantRoleOptions.map((roleOption) => roleOption.value))}
                    >
                      {t('filters.selectAllRoles')}
                    </button>
                    <button
                      className="students-filters__role-action"
                      type="button"
                      onClick={() => setRoleFilters([])}
                    >
                      {t('filters.clearRoles')}
                    </button>
                  </div>
                  <div className="students-filters__role-list">
                    {restaurantRoleOptions.map((roleOption) => (
                      <label className="students-filters__role-option" key={roleOption.value}>
                        <input
                          type="checkbox"
                          checked={roleFilters.includes(roleOption.value)}
                          onChange={() => handleRoleFilterToggle(roleOption.value)}
                        />
                        <span>{roleOption.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
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
        {visibleStudents.map((student) => {
          const joviatStudyLabels = getJoviatStudyLabels(student.JoviatStudies ?? student.Studies);

          return (
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
                  {joviatStudyLabels.length
                    ? joviatStudyLabels.join(', ')
                    : t('forms.joviatStudiesMissing')}
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
          );
        })}
      </div>
    </section>
  );
}

export default StudentsScreen;
