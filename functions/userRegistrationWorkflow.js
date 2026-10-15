const { HttpsError } = require('firebase-functions/v2/https');

const RESTAURANT_ROLES = ['owner', 'diningRoom', 'kitchen', 'advisory', 'manager', 'pastryBakery', 'innovation', 'sales', 'teacher'];
const validPlaceId = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,255}$/.test(value);

function validateRegistration(data) {
  const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
  const name = typeof data?.name === 'string' ? data.name.trim() : '';
  const googlePlaceId = typeof data?.googlePlaceId === 'string' ? data.googlePlaceId.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 200
      || data?.hasAcceptedLegalTerms !== true || !validPlaceId(googlePlaceId) || !RESTAURANT_ROLES.includes(data?.role)) {
    throw new HttpsError('invalid-argument', 'Personal details, legal consent, an establishment and a valid role are required.');
  }
  return { email, name, googlePlaceId, role: data.role };
}

function restaurantFromPlace(place) {
  if (!validPlaceId(place?.googlePlaceId) || !place?.name) {
    throw new HttpsError('invalid-argument', 'The selected establishment could not be verified.');
  }
  return {
    Name: place.name,
    Address: place.address || '',
    Phone: place.phone || '',
    Email: '',
    Website: place.website || '',
    GoogleMapsURL: place.googleMapsUrl || '',
    PhotoURL: place.photoUrl || '',
    Rating: place.rating || '',
    BusinessStatus: place.businessStatus || '',
    GooglePlaceId: place.googlePlaceId,
    GooglePhotoName: place.googlePhotoName || '',
    PrimaryType: place.primaryType || '',
    PrimaryTypeDisplayName: place.primaryTypeDisplayName || '',
    GoogleMapsTypeLabels: place.googleMapsTypeLabels || {},
    Types: Array.isArray(place.types) ? place.types : [],
    Location: Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
      ? { latitude: place.latitude, longitude: place.longitude } : '',
  };
}

// The caller authenticates the administrator. All account data comes from the
// saved request; client-supplied student fields cannot change an approval.
async function approveWorkplaceRegistration({ db, auth, registrationSnapshot, password, timestamp, prepareRestaurant, sendWelcome, logError }) {
  const registration = registrationSnapshot.data();
  if (!registration) throw new HttpsError('not-found', 'This request has already been processed.');
  const { email, name, googlePlaceId, role } = validateRegistration({
    email: registration.Email, name: registration.Name,
    hasAcceptedLegalTerms: registration.LegalTermsAccepted,
    googlePlaceId: registration.Restaurant?.GooglePlaceId, role: registration.Role,
  });
  const restaurantQuery = db.collection('Restaurant').where('GooglePlaceId', '==', googlePlaceId).limit(1);
  const existing = await restaurantQuery.get();
  let prepared;
  let account;
  let committed = false;
  let usedPreparedRestaurant = false;
  const studentRef = db.collection('Alumni').doc();
  let restaurantId;

  try {
    if (existing.empty) prepared = await prepareRestaurant(googlePlaceId);
    account = await auth.createUser({ email, password });
    await db.runTransaction(async (transaction) => {
      // A stable document also serializes approvals for the same new place.
      const placeRef = db.collection('Restaurant').doc(`google_${googlePlaceId}`);
      const [current, alumni, restaurants, placeSnapshot] = await Promise.all([
        transaction.get(registrationSnapshot.ref),
        transaction.get(db.collection('Alumni').where('Email', '==', email).limit(1)),
        transaction.get(restaurantQuery),
        transaction.get(placeRef),
      ]);
      if (!current.exists) throw new HttpsError('not-found', 'This request has already been processed.');
      const latest = current.data();
      if (latest.Email !== registration.Email || latest.Name !== registration.Name
          || latest.Role !== role || latest.Restaurant?.GooglePlaceId !== googlePlaceId
          || latest.LegalTermsAccepted !== true) {
        throw new HttpsError('failed-precondition', 'The request changed. Reload it before approving.');
      }
      if (!alumni.empty) throw new HttpsError('already-exists', 'An Alumni user already exists with this email.');
      const restaurantRef = restaurants.docs[0]?.ref || (placeSnapshot.exists ? placeSnapshot.ref : placeRef);
      usedPreparedRestaurant = restaurants.empty && !placeSnapshot.exists;
      if (usedPreparedRestaurant) {
        if (!prepared) throw new HttpsError('aborted', 'The establishment changed. Please retry.');
        transaction.create(restaurantRef, { ...prepared.data, createdAt: timestamp() });
      }
      restaurantId = restaurantRef.id;
      transaction.create(studentRef, {
        Name: name, Email: email, PhotoURL: '', Bio: '', Phone: '', LinkedIn: '', Instagram: '',
        VisibleContactToAlumniNetwork: true, LegalTermsAcceptedAt: registration.LegalTermsAcceptedAt || null,
        PromotionYear: null, JoviatStudies: [], createdAt: timestamp(),
      });
      transaction.create(db.collection('Rest-Alum').doc(`${studentRef.id}_${restaurantId}`), {
        id_alumni: studentRef, id_restaurant: restaurantRef, rol: [role], current_job: true, createdAt: timestamp(),
      });
      transaction.delete(registrationSnapshot.ref);
    });
    committed = true;
  } catch (error) {
    if (account) await auth.deleteUser(account.uid).catch((cleanupError) => logError('Unable to roll back auth account', cleanupError));
    throw error;
  } finally {
    if (prepared?.cleanup && (!committed || !usedPreparedRestaurant)) {
      await prepared.cleanup().catch((error) => logError('Unable to clean up unused restaurant photo', error));
    }
  }

  // Email failure must never undo a committed account and its workplace.
  let emailSent = true;
  try { await sendWelcome({ email, name, password }); }
  catch (error) { emailSent = false; logError('Account approved but welcome email failed', error); }
  return { studentId: studentRef.id, restaurantId, emailSent };
}

module.exports = { RESTAURANT_ROLES, validateRegistration, restaurantFromPlace, approveWorkplaceRegistration };
