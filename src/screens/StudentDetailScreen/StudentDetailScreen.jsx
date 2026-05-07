import { useEffect, useState } from 'react';
import SmartImage from '../../components/SmartImage/SmartImage';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import { getJoviatStudyLabels } from '../../helpers/joviatStudies';
import { formatPromotionYear } from '../../helpers/promotionYears';
import { deleteStudentAccount } from '../../helpers/studentDeletion';
import { useI18n } from '../../i18n/I18nContext';
import './StudentDetailScreen.css';

function formatLink(value, prefix) {
  if (!value) {
    return '';
  }

  if (prefix === 'https://' && /^https?:\/\//i.test(value)) {
    return value;
  }

  return `${prefix}${value}`;
}

function formatInstagramLink(value) {
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://instagram.com/${value.replace(/^@+/, '')}`;
}

function formatInstagramDisplayValue(value) {
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const { pathname } = new URL(value);
      const username = pathname.split('/').filter(Boolean)[0];

      return username ? `@${username}` : 'Instagram';
    } catch (error) {
      return 'Instagram';
    }
  }

  return value.startsWith('@') ? value : `@${value}`;
}

function DetailIcon({ type }) {
  switch (type) {
    case 'edit':
      return (
        <svg viewBox="0 0 24 24">
          <path
            d="M4.8 16.9 16.2 5.5a2.1 2.1 0 0 1 3 0l.3.3a2.1 2.1 0 0 1 0 3L8.1 20.2l-4 .8.7-4.1Zm2 1.1.5-.1L18.1 7.1l-.2-.2L7.1 17.7l-.3.3Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'delete':
      return (
        <svg viewBox="0 0 24 24">
          <path
            d="M8.5 4.5 9.4 3h5.2l.9 1.5H20v2H4v-2h4.5Zm-2.3 4h11.6l-.7 11.1A1.5 1.5 0 0 1 15.6 21H8.4a1.5 1.5 0 0 1-1.5-1.4L6.2 8.5Zm3.1 2 .4 8h1.7l-.3-8H9.3Zm3.6 0-.3 8h1.7l.4-8h-1.8Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'email':
      return (
        <svg viewBox="0 0 24 24">
          <path
            d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm14 3.2-6.4 4.4a1 1 0 0 1-1.2 0L5 8.2V17h14V8.2ZM6.3 7l5.7 3.9L17.7 7H6.3Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'phone':
      return (
        <svg viewBox="0 0 24 24">
          <path
            d="M6.7 4.2 9 3.5a1.5 1.5 0 0 1 1.8.9l1 2.3a1.5 1.5 0 0 1-.4 1.7l-1.1 1a10.7 10.7 0 0 0 4.3 4.3l1-1.1a1.5 1.5 0 0 1 1.7-.4l2.3 1a1.5 1.5 0 0 1 .9 1.8l-.7 2.3a2.2 2.2 0 0 1-2.2 1.6C10.6 18.9 5.1 13.4 5.1 6.4a2.2 2.2 0 0 1 1.6-2.2Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24">
          <path
            d="M6.5 8.8H3.8V20h2.7V8.8ZM5.2 4A1.6 1.6 0 1 0 5.2 7.2A1.6 1.6 0 0 0 5.2 4Zm6.2 4.8H8.8V20h2.7v-5.9c0-1.6.8-2.6 2.1-2.6 1.2 0 1.8.8 1.8 2.5v6H18v-6.6c0-3-1.6-4.8-4.1-4.8-1.2 0-2 .5-2.5 1.2v-1Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24">
          <path
            d="M8 4.5h8A3.5 3.5 0 0 1 19.5 8v8a3.5 3.5 0 0 1-3.5 3.5H8A3.5 3.5 0 0 1 4.5 16V8A3.5 3.5 0 0 1 8 4.5Zm8 2.2h0M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

function ContactItem({ label, value, href, icon, displayValue }) {
  const { t } = useI18n();

  return (
    <div className="student-detail__contact-item">
      <p className="student-detail__contact-label">{label}</p>
      {value ? (
        href ? (
          <a
            className="student-detail__contact-value student-detail__contact-value--link student-detail__contact-value--with-icon"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            <span className="student-detail__contact-value-icon" aria-hidden="true">
              <DetailIcon type={icon} />
            </span>
            <span>{displayValue ?? value}</span>
          </a>
        ) : (
          <p className={`student-detail__contact-value${icon ? ' student-detail__contact-value--with-icon' : ''}`}>
            {icon ? (
              <span className="student-detail__contact-value-icon" aria-hidden="true">
                <DetailIcon type={icon} />
              </span>
            ) : null}
            <span>{displayValue ?? value}</span>
          </p>
        )
      ) : (
        <p className="student-detail__contact-value student-detail__contact-value--muted">
          {t('common.notAvailable')}
        </p>
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M10.7 5.3 4 12l6.7 6.7 1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function StudentDetailScreen({
  studentId,
  isAuthenticated,
  isAdministrator,
  currentUserEmail,
  onBack,
  onDeleted,
  onEdit,
  onOpenRestaurantDetails,
}) {
  const { t } = useI18n();
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const normalizedCurrentUserEmail = typeof currentUserEmail === 'string'
    ? currentUserEmail.trim().toLowerCase()
    : '';

  useEffect(() => {
    let isMounted = true;

    async function loadStudent() {
      try {
        const { students } = await loadStudentRestaurantGraph();
        const selectedStudent = students.find((entry) => entry.id === studentId) ?? null;

        if (isMounted) {
          setStudent(selectedStudent);
          setError(selectedStudent ? '' : t('detail.studentMissing'));
        }
      } catch (loadError) {
        if (isMounted) {
          setError(t('detail.studentLoadError'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStudent();

    return () => {
      isMounted = false;
    };
  }, [studentId, t]);

  function handleStartDelete() {
    setActionMessage('');
    setIsDeleteDialogOpen(true);
  }

  function handleCancelDelete() {
    if (isDeleting) {
      return;
    }

    setIsDeleteDialogOpen(false);
  }

  async function handleConfirmDelete() {
    if (!student) {
      return;
    }

    setActionMessage('');
    setIsDeleting(true);

    try {
      await deleteStudentAccount(student);
      setIsDeleteDialogOpen(false);
      onDeleted?.(student.id);
    } catch (deleteError) {
      if (deleteError?.message === 'missing-student-auth-data') {
        setActionMessage(t('detail.studentDeleteAuthError'));
      } else {
        setActionMessage(t('detail.studentDeleteError'));
      }
    } finally {
      setIsDeleting(false);
    }
  }

  function handleEdit() {
    setActionMessage('');
    onEdit?.(student.id);
  }

  if (isLoading) {
    return (
      <section className="student-detail">
        <p className="student-detail__status" role="status">{t('detail.studentLoading')}</p>
      </section>
    );
  }

  if (error || !student) {
    return (
      <section className="student-detail">
        <button className="student-detail__back" type="button" onClick={onBack}>
          <span className="student-detail__back-icon" aria-hidden="true">
            <BackIcon />
          </span>
          {t('common.backToList')}
        </button>
        <p className="student-detail__status student-detail__status--error" role="alert">
          {error || t('detail.studentMissing')}
        </p>
      </section>
    );
  }

  const normalizedStudentEmail = typeof student.Email === 'string'
    ? student.Email.trim().toLowerCase()
    : '';
  const canEditStudent = isAdministrator || (
    normalizedCurrentUserEmail
    && normalizedStudentEmail
    && normalizedCurrentUserEmail === normalizedStudentEmail
  );
  const canDeleteStudent = isAdministrator;
  const hasStudentActivity = (student.linkedRestaurants?.length ?? 0) > 0;
  const allowsContactVisibility = student.VisibleContactToAlumniNetwork ?? true;
  const canViewContactDetails = isAuthenticated && (
    canDeleteStudent
    || allowsContactVisibility
    || hasStudentActivity
  );
  const joviatStudyLabels = getJoviatStudyLabels(student.JoviatStudies ?? student.Studies);

  return (
    <section className="student-detail">
      <div className="student-detail__header">
        <button className="student-detail__back" type="button" onClick={onBack}>
          <span className="student-detail__back-icon" aria-hidden="true">
            <BackIcon />
          </span>
          {t('common.backToList')}
        </button>
      </div>

      <div className="student-detail__hero">
        <div className="student-detail__photo-column">
          <div className="student-detail__photo-wrap">
            <SmartImage
              className="student-detail__photo"
              src={student.PhotoURL}
              type="student"
              label={student.Name}
              alt={student.Name ?? t('common.student')}
            />
          </div>
        </div>
        <div className="student-detail__hero-body">
          <p className="student-detail__eyebrow">{t('detail.studentSheet')}</p>
          <h1>{student.Name ?? t('common.noName')}</h1>
          <div className="student-detail__student-status" role="group" aria-label={t('forms.joviatStudies')}>
            {joviatStudyLabels.length ? joviatStudyLabels.map((studyLabel) => (
              <span
                className="student-detail__student-status-option student-detail__student-status-option--active"
                key={studyLabel}
              >
                {studyLabel}
              </span>
            )) : (
              <span className="student-detail__student-status-option">
                {t('forms.joviatStudiesMissing')}
              </span>
            )}
          </div>
          {student.PromotionYear ? (
            <p className="student-detail__promotion-year">
              {formatPromotionYear(t, student.PromotionYear)}
            </p>
          ) : null}
          {canEditStudent || canDeleteStudent ? (
            <div className="student-detail__admin-actions">
              {canEditStudent ? (
                <button
                  className="student-detail__action student-detail__action--secondary"
                  type="button"
                  onClick={handleEdit}
                >
                  <span className="student-detail__action-icon" aria-hidden="true">
                    <DetailIcon type="edit" />
                  </span>
                  {t('common.edit')}
                </button>
              ) : null}
              {canDeleteStudent ? (
                <button
                  className="student-detail__action student-detail__action--danger"
                  type="button"
                  onClick={handleStartDelete}
                >
                  <span className="student-detail__action-icon" aria-hidden="true">
                    <DetailIcon type="delete" />
                  </span>
                  {t('common.delete')}
                </button>
              ) : null}
            </div>
          ) : null}
          {actionMessage ? (
            <p className="student-detail__action-message" role="status">
              {actionMessage}
            </p>
          ) : null}
        </div>
      </div>

      {canViewContactDetails ? (
        <section className="student-detail__panel">
          <h2>{t('common.contact')}</h2>
          <div className="student-detail__contacts">
            <ContactItem
              label="Email"
              value={student.Email}
              href={student.Email ? `mailto:${student.Email}` : ''}
              icon="email"
            />
            <ContactItem
              label={t('common.phone')}
              value={student.Phone}
              href={student.Phone ? `tel:${student.Phone}` : ''}
              icon="phone"
            />
            <ContactItem
              label="LinkedIn"
              value={student.LinkedIn}
              href={student.LinkedIn ? formatLink(student.LinkedIn, 'https://') : ''}
              icon="linkedin"
              displayValue="URL"
            />
            <ContactItem
              label="Instagram"
              value={student.Instagram}
              href={student.Instagram ? formatInstagramLink(student.Instagram) : ''}
              icon="instagram"
              displayValue={student.Instagram ? formatInstagramDisplayValue(student.Instagram) : ''}
            />
          </div>
        </section>
      ) : null}

      <section className="student-detail__panel">
        <div className="student-detail__panel-heading">
          <h2>{t('common.restaurants')}</h2>
          <p>
            {student.linkedRestaurants?.length
              ? t('detail.studentRestaurantsText')
              : t('detail.studentRestaurantsEmpty')}
          </p>
        </div>

        {student.linkedRestaurants?.length ? (
          <div className="student-detail__restaurants">
            {student.linkedRestaurants.map((restaurant) => (
              <article className="student-detail__restaurant-card" key={`${student.id}-${restaurant.id}`}>
                <div className="student-detail__restaurant-image-wrap">
                  <SmartImage
                    className="student-detail__restaurant-image"
                    src={restaurant.PhotoURL}
                    type="restaurant"
                    label={restaurant.Name}
                    alt={restaurant.Name ?? t('common.restaurant')}
                  />
                </div>
                <div className="student-detail__restaurant-body">
                  <h3>{restaurant.Name ?? t('common.noName')}</h3>
                  <p className="student-detail__restaurant-address">
                    {restaurant.Address ?? t('common.addressUnavailable')}
                  </p>
                  <p className={`student-detail__restaurant-status${restaurant.currentJob ? '' : ' student-detail__restaurant-status--muted'}`}>
                    {restaurant.currentJob ? t('common.currentJob') : t('common.previousExperience')}
                  </p>
                  <button
                    className="student-detail__details"
                    type="button"
                    aria-label={t('restaurants.openDetails', { name: restaurant.Name ?? t('common.restaurant') })}
                    onClick={() => onOpenRestaurantDetails(restaurant.id, 'student-detail')}
                  >
                    {t('common.details')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {isDeleteDialogOpen ? (
        <div
          className="student-detail__dialog-backdrop"
          role="presentation"
          onClick={handleCancelDelete}
        >
          <div
            className="student-detail__dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="student-delete-title"
            aria-describedby="student-delete-description"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="student-delete-title">{t('detail.deleteStudentTitle')}</h2>
            <p id="student-delete-description">
              {t('detail.deleteStudentDescription')}
            </p>
            <div className="student-detail__dialog-actions">
              <button
                className="student-detail__action student-detail__action--secondary"
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </button>
              <button
                className="student-detail__action student-detail__action--danger"
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? t('detail.deleting') : t('detail.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default StudentDetailScreen;
