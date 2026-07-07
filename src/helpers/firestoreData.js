import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { normalizeRestaurantRoles } from './restaurantRoles';

const getPublicStudentRestaurantGraph = httpsCallable(functions, 'getPublicStudentRestaurantGraph');

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

function addRelationLink(linksByOwnerId, ownerId, linkedItem, relation) {
  const linksForOwner = linksByOwnerId.get(ownerId) ?? [];
  const existingLink = linksForOwner.find((entry) => entry.id === linkedItem.id);
  const relationRoles = normalizeRestaurantRoles(relation.rol);

  if (existingLink) {
    existingLink.roles = [
      ...new Set([
        ...normalizeRestaurantRoles(existingLink.roles ?? existingLink.role),
        ...relationRoles,
      ]),
    ];
    existingLink.role = existingLink.roles;
    existingLink.currentJob = existingLink.currentJob || Boolean(relation.current_job);
    existingLink.relationIds = [
      ...new Set([
        ...(existingLink.relationIds ?? []),
        existingLink.relationId,
        relation.id,
      ].filter(Boolean)),
    ];
    existingLink.relationId = existingLink.relationIds[0] ?? existingLink.relationId ?? '';
    return;
  }

  linksForOwner.push({
    ...linkedItem,
    relationId: relation.id,
    relationIds: relation.id ? [relation.id] : [],
    role: relationRoles,
    roles: relationRoles,
    currentJob: Boolean(relation.current_job),
  });
  linksByOwnerId.set(ownerId, linksForOwner);
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

async function loadPublicFirestoreCollections() {
  const response = await getPublicStudentRestaurantGraph();
  const data = response.data ?? {};

  return {
    students: Array.isArray(data.students) ? data.students : [],
    restaurants: Array.isArray(data.restaurants) ? data.restaurants : [],
    relations: Array.isArray(data.relations) ? data.relations : [],
  };
}

async function loadStudentRestaurantGraph({ includePrivateStudentFields = true } = {}) {
  const { students, restaurants, relations } = includePrivateStudentFields
    ? await loadFirestoreCollections()
    : await loadPublicFirestoreCollections();
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

    addRelationLink(restaurantLinksByStudentId, studentId, restaurant, relation);
    addRelationLink(studentLinksByRestaurantId, restaurantId, student, relation);
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
