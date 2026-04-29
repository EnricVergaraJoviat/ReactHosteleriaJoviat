import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';

const USER_REGISTRATIONS_COLLECTION = 'UserRegistrations';
const DEFAULT_STUDENT_PASSWORD = 'joviat123';
const createStudentAccount = httpsCallable(functions, 'createStudentAccount');

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

async function createUserRegistration({ email, name }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);

  if (!normalizedEmail || !normalizedName) {
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
      'An alumni user already exists with this email.'
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
      'An alumni user already exists with this email.'
    );
  }

  await createStudentAccount({
    studentData: {
      Name: normalizedName,
      Email: normalizedEmail,
      isExAlumni: false,
    },
    password: DEFAULT_STUDENT_PASSWORD,
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
  DEFAULT_STUDENT_PASSWORD,
  acceptUserRegistration,
  createUserRegistration,
  rejectUserRegistration,
};
