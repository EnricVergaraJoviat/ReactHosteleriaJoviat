import { addDoc, collection, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getReferenceId, loadStudentRestaurantGraph } from './firestoreData';

export async function associateRestaurantRegistration(registration, restaurantId) {
  const { students } = await loadStudentRestaurantGraph();
  const studentId = getReferenceId(registration.id_alumni);
  const email = (registration.Email ?? '').trim().toLowerCase();
  const matches = students.filter((student) => studentId
    ? student.id === studentId
    : email && (student.Email ?? '').trim().toLowerCase() === email);

  if (!restaurantId || matches.length !== 1) {
    throw new Error('Unable to identify the requesting alumni.');
  }

  const student = matches[0];
  if (!student.linkedRestaurants.some((restaurant) => restaurant.id === restaurantId)) {
    await addDoc(collection(db, 'Rest-Alum'), {
      id_alumni: doc(db, 'Alumni', student.id),
      id_restaurant: doc(db, 'Restaurant', restaurantId),
      rol: [],
      current_job: false,
      createdAt: serverTimestamp(),
    });
  }
}
