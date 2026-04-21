import { useEffect, useState } from 'react';
import SmartImage from '../../components/SmartImage/SmartImage';
import { loadStudentRestaurantGraph } from '../../helpers/firestoreData';
import { deleteStudentAccount } from '../../helpers/studentDeletion';
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

function ContactItem({ label, value, href }) {
  return (
    <div className="student-detail__contact-item">
      <p className="student-detail__contact-label">{label}</p>
      {value ? (
        href ? (
          <a className="student-detail__contact-value student-detail__contact-value--link" href={href} target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : (
          <p className="student-detail__contact-value">{value}</p>
        )
      ) : (
        <p className="student-detail__contact-value student-detail__contact-value--muted">
          No disponible
        </p>
      )}
    </div>
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
          setError(selectedStudent ? '' : 'No s\'ha trobat la fitxa de l\'alumne.');
        }
      } catch (loadError) {
        if (isMounted) {
          setError('No s\'ha pogut carregar la fitxa de l\'alumne.');
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
  }, [studentId]);

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
        setActionMessage(
          'No s\'ha pogut eliminar l\'usuari d\'Authentication perque falten les credencials de l\'alumne.'
        );
      } else {
        setActionMessage('No s\'ha pogut eliminar l\'alumne. Torna-ho a provar.');
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
        <p className="student-detail__status" role="status">Carregant fitxa de l&apos;alumne...</p>
      </section>
    );
  }

  if (error || !student) {
    return (
      <section className="student-detail">
        <button className="student-detail__back" type="button" onClick={onBack}>
          Tornar al llistat
        </button>
        <p className="student-detail__status student-detail__status--error" role="alert">
          {error || 'No s\'ha trobat la fitxa de l\'alumne.'}
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

  return (
    <section className="student-detail">
      <div className="student-detail__header">
        <button className="student-detail__back" type="button" onClick={onBack}>
          Tornar al llistat
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
              alt={student.Name ?? 'Alumne'}
            />
          </div>
          <p className="student-detail__student-status">
            {student.isExAlumni ? 'Exalumne' : 'Alumne'}
          </p>
        </div>
        <div className="student-detail__hero-body">
          <p className="student-detail__eyebrow">Fitxa d&apos;alumne</p>
          <h1>{student.Name ?? 'Sense nom'}</h1>
          {canEditStudent || canDeleteStudent ? (
            <div className="student-detail__admin-actions">
              {canEditStudent ? (
                <button
                  className="student-detail__action student-detail__action--secondary"
                  type="button"
                  onClick={handleEdit}
                >
                  Editar
                </button>
              ) : null}
              {canDeleteStudent ? (
                <button
                  className="student-detail__action student-detail__action--danger"
                  type="button"
                  onClick={handleStartDelete}
                >
                  Eliminar
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

      {isAuthenticated ? (
        <section className="student-detail__panel">
          <h2>Contacte</h2>
          <div className="student-detail__contacts">
            <ContactItem
              label="Email"
              value={student.Email}
              href={student.Email ? `mailto:${student.Email}` : ''}
            />
            <ContactItem
              label="Phone"
              value={student.Phone}
              href={student.Phone ? `tel:${student.Phone}` : ''}
            />
            <ContactItem
              label="LinkedIn"
              value={student.LinkedIn}
              href={student.LinkedIn ? formatLink(student.LinkedIn, 'https://') : ''}
            />
          </div>
        </section>
      ) : null}

      <section className="student-detail__panel">
        <div className="student-detail__panel-heading">
          <h2>Restaurants</h2>
          <p>
            {student.linkedRestaurants?.length
              ? 'Restaurants on ha treballat o treballa actualment.'
              : 'Encara no hi ha restaurants vinculats a aquest alumne.'}
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
                    alt={restaurant.Name ?? 'Restaurant'}
                  />
                </div>
                <div className="student-detail__restaurant-body">
                  <div className="student-detail__restaurant-topline">
                    <h3>{restaurant.Name ?? 'Sense nom'}</h3>
                    <div className="student-detail__restaurant-actions">
                      {restaurant.currentJob ? (
                        <span className="student-detail__badge">Actualment</span>
                      ) : null}
                      <button
                        className="student-detail__details"
                        type="button"
                        aria-label={`Obrir fitxa de ${restaurant.Name ?? 'restaurant'}`}
                        onClick={() => onOpenRestaurantDetails(restaurant.id, 'student-detail')}
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <path
                            d="M12 5c5.5 0 9.5 5.9 9.7 6.2a1.4 1.4 0 0 1 0 1.6C21.5 13.1 17.5 19 12 19S2.5 13.1 2.3 12.8a1.4 1.4 0 0 1 0-1.6C2.5 10.9 6.5 5 12 5Zm0 2C8.4 7 5.4 10.4 4.4 12 5.4 13.6 8.4 17 12 17s6.6-3.4 7.6-5C18.6 10.4 15.6 7 12 7Zm0 1.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="student-detail__restaurant-address">
                    {restaurant.Address ?? 'Adreca no disponible'}
                  </p>
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
            <h2 id="student-delete-title">Vols eliminar aquest alumne?</h2>
            <p id="student-delete-description">
              S&apos;eliminara la foto de l&apos;alumne, les relacions amb restaurants, la fitxa d&apos;Alumni i el compte d&apos;Authentication.
            </p>
            <div className="student-detail__dialog-actions">
              <button
                className="student-detail__action student-detail__action--secondary"
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                Cancel.lar
              </button>
              <button
                className="student-detail__action student-detail__action--danger"
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminant...' : 'Confirmar eliminacio'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default StudentDetailScreen;
