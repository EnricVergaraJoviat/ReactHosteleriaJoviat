import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';

const USER_REGISTRATIONS_COLLECTION = 'UserRegistrations';
const createStudentAccount = httpsCallable(functions, 'createStudentAccount');
const TEMPORARY_PASSWORD_LENGTH = 12;
const TEMPORARY_PASSWORD_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function createRegistrationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function generateTemporaryPassword() {
  const randomValues = new Uint32Array(TEMPORARY_PASSWORD_LENGTH);
  const cryptoApi = typeof window !== 'undefined' ? window.crypto : null;

  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(randomValues);
  } else {
    randomValues.forEach((_, index) => {
      randomValues[index] = Math.floor(Math.random() * TEMPORARY_PASSWORD_CHARACTERS.length);
    });
  }

  return Array.from(randomValues, (value) =>
    TEMPORARY_PASSWORD_CHARACTERS[value % TEMPORARY_PASSWORD_CHARACTERS.length]
  ).join('');
}

function getTimestampMillis(value) {
  if (typeof value?.toMillis === 'function') {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return value;
  }

  return null;
}

async function createUserRegistration({ email, name, hasAcceptedLegalTerms }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);

  if (!normalizedEmail || !normalizedName || !hasAcceptedLegalTerms) {
    throw new Error('missing-registration-data');
  }

  const [alumniSnapshot, registrationsSnapshot] = await Promise.all([
    getDocs(collection(db, 'Alumni')),
    getDocs(collection(db, USER_REGISTRATIONS_COLLECTION)),
  ]);
  const alumniExists = alumniSnapshot.docs.some((entry) =>
    normalizeEmail(entry.data()?.Email) === normalizedEmail
  );

  if (alumniExists) {
    throw createRegistrationError(
      'alumni/email-already-exists',
      'An Alumni user already exists with this email.'
    );
  }

  const pendingRegistrationExists = registrationsSnapshot.docs.some((entry) =>
    normalizeEmail(entry.data()?.Email) === normalizedEmail
  );

  if (pendingRegistrationExists) {
    throw createRegistrationError(
      'user-registration/email-already-pending',
      'A pending access request already exists with this email.'
    );
  }

  return addDoc(collection(db, USER_REGISTRATIONS_COLLECTION), {
    Email: normalizedEmail,
    Name: normalizedName,
    LegalTermsAccepted: true,
    LegalTermsAcceptedAt: serverTimestamp(),
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

  const alumniSnapshot = await getDocs(collection(db, 'Alumni'));
  const alumniExists = alumniSnapshot.docs.some((entry) =>
    normalizeEmail(entry.data()?.Email) === normalizedEmail
  );

  if (alumniExists) {
    throw createRegistrationError(
      'alumni/email-already-exists',
      'An Alumni user already exists with this email.'
    );
  }

  await createStudentAccount({
    studentData: {
      Name: normalizedName,
      Email: normalizedEmail,
      LegalTermsAcceptedAtMillis: getTimestampMillis(registration.LegalTermsAcceptedAt),
    },
    password: generateTemporaryPassword(),
    deleteRegistrationId: registration.id,
  });
}

async function rejectUserRegistration(registrationId) {
  if (!registrationId) {
    throw new Error('missing-registration-id');
  }

  await deleteDoc(doc(db, USER_REGISTRATIONS_COLLECTION, registrationId));
}

export {
  USER_REGISTRATIONS_COLLECTION,
  acceptUserRegistration,
  createUserRegistration,
  rejectUserRegistration,
};
