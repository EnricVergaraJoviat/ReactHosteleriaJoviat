import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../helpers/firebase';
import {
  USER_REGISTRATIONS_COLLECTION,
  acceptUserRegistration,
  rejectUserRegistration,
} from '../../helpers/userRegistrations';
import './ManageRegistrationsScreen.css';

function ManageRegistrationsScreen() {
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRegistrations() {
      try {
        const snapshot = await getDocs(collection(db, USER_REGISTRATIONS_COLLECTION));
        const items = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));

        if (isMounted) {
          setRegistrations(items);
          setErrorMessage('');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage('No s\'han pogut carregar les altes pendents.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRegistrations();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleConfirmAction() {
    if (!pendingAction?.registration?.id) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (pendingAction.type === 'accept') {
        await acceptUserRegistration(pendingAction.registration);
        setSuccessMessage(`S'ha donat d'alta ${pendingAction.registration.Name}.`);
      } else {
        await rejectUserRegistration(pendingAction.registration.id);
        setSuccessMessage(`S'ha cancel.lat la sol.licitud de ${pendingAction.registration.Name}.`);
      }

      setRegistrations((current) =>
        current.filter((entry) => entry.id !== pendingAction.registration.id)
      );
      setPendingAction(null);
    } catch (error) {
      if (error?.code === 'auth/email-already-in-use') {
        setErrorMessage('Ja existeix un usuari amb aquest email.');
      } else if (error?.code === 'auth/invalid-email') {
        setErrorMessage('L\'email de la sol.licitud no es valid.');
      } else if (error?.code === 'auth/weak-password') {
        setErrorMessage('La contrasenya provisional no compleix els requisits d\'Authentication.');
      } else {
        setErrorMessage('No s\'ha pogut completar l\'accio. Torna-ho a provar.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="manage-registrations">
      <div className="manage-registrations__intro">
        <p className="manage-registrations__eyebrow">Administracio</p>
        <h1>Gestionar altes</h1>
        <p className="manage-registrations__description">
          Revisa les sol.licituds pendents i decideix si vols donar d&apos;alta l&apos;usuari o cancel.lar-la.
        </p>
      </div>

      <div className="manage-registrations__panel">
        {isLoading ? (
          <p className="manage-registrations__status">Carregant altes pendents...</p>
        ) : null}

        {!isLoading && errorMessage ? (
          <p className="manage-registrations__status manage-registrations__status--error">
            {errorMessage}
          </p>
        ) : null}

        {!isLoading && !errorMessage && successMessage ? (
          <p className="manage-registrations__status manage-registrations__status--success">
            {successMessage}
          </p>
        ) : null}

        {!isLoading && !errorMessage && registrations.length === 0 ? (
          <p className="manage-registrations__status">
            No hi ha cap sol.licitud d&apos;alta pendent.
          </p>
        ) : null}

        {!isLoading && registrations.length > 0 ? (
          <div className="manage-registrations__list" role="list">
            {registrations.map((registration) => (
              <article className="manage-registrations__card" key={registration.id} role="listitem">
                <div className="manage-registrations__card-content">
                  <h2>{registration.Name || 'Usuari sense nom'}</h2>
                  <p>{registration.Email || 'Sense email'}</p>
                </div>
                <div className="manage-registrations__actions">
                  <button
                    className="manage-registrations__button manage-registrations__button--accept"
                    type="button"
                    onClick={() => setPendingAction({ type: 'accept', registration })}
                  >
                    Acceptar
                  </button>
                  <button
                    className="manage-registrations__button manage-registrations__button--reject"
                    type="button"
                    onClick={() => setPendingAction({ type: 'reject', registration })}
                  >
                    Cancelar
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      {pendingAction ? (
        <div className="manage-registrations__dialog-layer">
          <div
            className="manage-registrations__dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="manage-registrations-confirmation-title"
          >
            <h2 id="manage-registrations-confirmation-title">
              {pendingAction.type === 'accept' ? 'Confirmar alta' : 'Confirmar cancel.lacio'}
            </h2>
            <p>
              {pendingAction.type === 'accept'
                ? `Estas segur que vols donar d'alta a ${pendingAction.registration.Name}?`
                : `Estas segur que vols cancel.lar l'alta de ${pendingAction.registration.Name}?`}
            </p>
            <div className="manage-registrations__dialog-actions">
              <button
                className="manage-registrations__button manage-registrations__button--ghost"
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={isSubmitting}
              >
                No
              </button>
              <button
                className="manage-registrations__button manage-registrations__button--accept"
                type="button"
                onClick={handleConfirmAction}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processant...' : 'Si'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ManageRegistrationsScreen;
