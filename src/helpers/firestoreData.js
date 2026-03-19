import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

function mapSnapshot(snapshot) {
  return snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }));
}

function getReferenceId(referenceValue) {
  if (!referenceValue) {
    return '';
  }

  if (typeof referenceValue === 'string') {
    if (referenceValue.includes('/')) {
      const pathSegments = referenceValue.split('/').filter(Boolean);
      return pathSegments[pathSegments.length - 1] ?? '';
    }

    return referenceValue;
  }

  if (typeof referenceValue.id === 'string' && referenceValue.id) {
    return referenceValue.id;
  }

  if (typeof referenceValue.path === 'string' && referenceValue.path) {
    const pathSegments = referenceValue.path.split('/').filter(Boolean);
    return pathSegments[pathSegments.length - 1] ?? '';
  }

  return '';
}

function createLookupById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

async function loadFirestoreCollections() {
  const [studentsSnapshot, restaurantsSnapshot, relationsSnapshot] = await Promise.all([
    getDocs(collection(db, 'Alumni')),
    getDocs(collection(db, 'Restaurant')),
    getDocs(collection(db, 'Rest-Alum')),
  ]);

  return {
    students: mapSnapshot(studentsSnapshot),
    restaurants: mapSnapshot(restaurantsSnapshot),
    relations: mapSnapshot(relationsSnapshot),
  };
}

async function loadStudentRestaurantGraph() {
  const { students, restaurants, relations } = await loadFirestoreCollections();
  const studentsById = createLookupById(students);
  const restaurantsById = createLookupById(restaurants);
  const restaurantLinksByStudentId = new Map();
  const studentLinksByRestaurantId = new Map();

  relations.forEach((relation) => {
    const studentId = getReferenceId(relation.id_alumni);
    const restaurantId = getReferenceId(relation.id_restaurant);

    if (!studentId || !restaurantId) {
      return;
    }

    const student = studentsById.get(studentId);
    const restaurant = restaurantsById.get(restaurantId);

    if (!student || !restaurant) {
      return;
    }

    const restaurantsForStudent = restaurantLinksByStudentId.get(studentId) ?? [];
    if (!restaurantsForStudent.some((entry) => entry.id === restaurant.id)) {
      restaurantsForStudent.push({
        ...restaurant,
        relationId: relation.id,
        role: relation.rol ?? '',
        currentJob: Boolean(relation.current_job),
      });
      restaurantLinksByStudentId.set(studentId, restaurantsForStudent);
    }

    const studentsForRestaurant = studentLinksByRestaurantId.get(restaurantId) ?? [];
    if (!studentsForRestaurant.some((entry) => entry.id === student.id)) {
      studentsForRestaurant.push({
        ...student,
        relationId: relation.id,
        role: relation.rol ?? '',
        currentJob: Boolean(relation.current_job),
      });
      studentLinksByRestaurantId.set(restaurantId, studentsForRestaurant);
    }
  });

  return {
    students: students.map((student) => {
      const linkedRestaurants = restaurantLinksByStudentId.get(student.id) ?? [];

      return {
        ...student,
        linkedRestaurants,
        linkedRestaurantCount: linkedRestaurants.length,
      };
    }),
    restaurants: restaurants.map((restaurant) => {
      const linkedStudents = studentLinksByRestaurantId.get(restaurant.id) ?? [];

      return {
        ...restaurant,
        linkedStudents,
        linkedStudentCount: linkedStudents.length,
      };
    }),
  };
}

export { getReferenceId, loadFirestoreCollections, loadStudentRestaurantGraph };
