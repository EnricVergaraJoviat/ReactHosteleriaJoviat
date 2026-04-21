import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { app, db } from './firebase';

const USER_REGISTRATIONS_COLLECTION = 'UserRegistrations';
const DEFAULT_STUDENT_PASSWORD = '1234';

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function createUserRegistration({ email, name }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);

  if (!normalizedEmail || !normalizedName) {
    throw new Error('missing-registration-data');
  }

  return addDoc(collection(db, USER_REGISTRATIONS_COLLECTION), {
    Email: normalizedEmail,
    Name: normalizedName,
    createdAt: serverTimestamp(),
  });
}

async function acceptUserRegistration(registration) {
  if (!registration?.id) {
    throw new Error('missing-registration-id');
  }

  const normalizedEmail = normalizeEmail(registration.Email);
  const normalizedName = normalizeName(registration.Name);

  if (!normalizedEmail || !normalizedName) {
    throw new Error('missing-registration-data');
  }

  const secondaryApp = initializeApp(
    app.options,
    `user-registration-${registration.id}-${Date.now()}`
  );
  const secondaryAuth = getAuth(secondaryApp);

  try {
    await createUserWithEmailAndPassword(
      secondaryAuth,
      normalizedEmail,
      DEFAULT_STUDENT_PASSWORD
    );

    await addDoc(collection(db, 'Alumni'), {
      Name: normalizedName,
      Email: normalizedEmail,
      Password: DEFAULT_STUDENT_PASSWORD,
      isExAlumni: false,
      createdAt: serverTimestamp(),
    });

    await deleteDoc(doc(db, USER_REGISTRATIONS_COLLECTION, registration.id));
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch (error) {}

    await deleteApp(secondaryApp);
  }
}

async function rejectUserRegistration(registrationId) {
  if (!registrationId) {
    throw new Error('missing-registration-id');
  }

  await deleteDoc(doc(db, USER_REGISTRATIONS_COLLECTION, registrationId));
}

export {
  USER_REGISTRATIONS_COLLECTION,
  DEFAULT_STUDENT_PASSWORD,
  acceptUserRegistration,
  createUserRegistration,
  rejectUserRegistration,
};
