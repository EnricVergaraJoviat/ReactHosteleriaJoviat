import { deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

async function deleteRestaurant(restaurant) {
  if (!restaurant?.id) {
    throw new Error('missing-restaurant-id');
  }

  const relationIds = [
    ...new Set(
      (restaurant.linkedStudents ?? [])
        .flatMap((student) => student.relationIds ?? student.relationId)
        .filter(Boolean)
    ),
  ];

  await Promise.all(
    relationIds.map((relationId) => deleteDoc(doc(db, 'Rest-Alum', relationId)))
  );

  await deleteDoc(doc(db, 'Restaurant', restaurant.id));
}

export { deleteRestaurant };
