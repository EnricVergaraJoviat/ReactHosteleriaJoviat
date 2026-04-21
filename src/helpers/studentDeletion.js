import { deleteApp, initializeApp } from 'firebase/app';
import {
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { app, db, storage } from './firebase';

async function deleteStudentAccount(student) {
  if (!student?.id) {
    throw new Error('missing-student-id');
  }

  const normalizedEmail = student.Email?.trim();
  const normalizedPassword = student.Password?.trim();

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('missing-student-auth-data');
  }

  const secondaryApp = initializeApp(
    app.options,
    `student-delete-${student.id}-${Date.now()}`
  );
  const secondaryAuth = getAuth(secondaryApp);
  let authenticatedStudent = null;

  try {
    const credential = await signInWithEmailAndPassword(
      secondaryAuth,
      normalizedEmail,
      normalizedPassword
    );
    authenticatedStudent = credential.user;

    if (student.PhotoURL) {
      try {
        await deleteObject(ref(storage, student.PhotoURL));
      } catch (error) {
        if (error?.code !== 'storage/object-not-found') {
          throw error;
        }
      }
    }

    const relationIds = [
      ...new Set(
        (student.linkedRestaurants ?? [])
          .map((restaurant) => restaurant.relationId)
          .filter(Boolean)
      ),
    ];

    await Promise.all(
      relationIds.map((relationId) => deleteDoc(doc(db, 'Rest-Alum', relationId)))
    );

    await deleteDoc(doc(db, 'Alumni', student.id));
    await deleteUser(authenticatedStudent);
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch (error) {}

    await deleteApp(secondaryApp);
  }
}

export { deleteStudentAccount };
