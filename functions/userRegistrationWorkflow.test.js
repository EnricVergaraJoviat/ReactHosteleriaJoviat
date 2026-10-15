const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { RESTAURANT_ROLES, validateRegistration, restaurantFromPlace, approveWorkplaceRegistration } = require('./userRegistrationWorkflow');

const request = { Email: 'alumni@example.com', Name: 'Alumni Joviat', LegalTermsAccepted: true, LegalTermsAcceptedAt: 123,
  Restaurant: { GooglePlaceId: 'place-1', Name: 'Restaurant Nou' }, Role: 'kitchen' };

// In-memory transaction fixture: reads observe committed records; staged writes
// are committed together, or discarded on failure. No live accounts are used.
function fixture({ existingRestaurant = false, failCommit = false, failEmail = false } = {}) {
  const records = new Map([['UserRegistrations/request-1', request]]);
  if (existingRestaurant) records.set('Restaurant/existing', { GooglePlaceId: 'place-1', Name: 'Original name', PhotoURL: 'original.jpg' });
  let sequence = 0;
  let queue = Promise.resolve();
  const accounts = new Map();
  const calls = { prepare: 0, cleanup: 0, email: 0 };
  const ref = (path) => ({ path, id: path.split('/')[1], get: async () => snapshot(path) });
  const snapshot = (path) => {
    const data = records.get(path);
    return { ref: ref(path), id: path.split('/')[1], exists: data !== undefined, data: () => data };
  };
  const query = (collection, field, value) => ({ collection, field, value, limit() { return this; }, async get() {
    const docs = [...records].filter(([path, data]) => path.startsWith(`${collection}/`) && data[field] === value).map(([path]) => snapshot(path));
    return { docs, empty: !docs.length };
  } });
  const db = {
    collection: (name) => ({ doc: (id = `auto-${++sequence}`) => ref(`${name}/${id}`), where: (field, op, value) => query(name, field, value) }),
    runTransaction(callback) {
      const result = queue.then(async () => {
        const pending = [];
        const transaction = {
          get: async (target) => target.path ? snapshot(target.path) : target.get(),
          create: (target, data) => pending.push(() => { assert.ok(!records.has(target.path)); records.set(target.path, data); }),
          delete: (target) => pending.push(() => records.delete(target.path)),
        };
        await callback(transaction);
        if (failCommit) throw new Error('commit unavailable');
        pending.forEach((write) => write());
      });
      queue = result.catch(() => {});
      return result;
    },
  };
  const dependencies = {
    db,
    auth: {
      async createUser({ email, password }) {
        if (accounts.has(email)) throw Object.assign(new Error('exists'), { code: 'auth/email-already-exists' });
        accounts.set(email, password); return { uid: email };
      },
      async deleteUser(uid) { accounts.delete(uid); },
    },
    registrationSnapshot: snapshot('UserRegistrations/request-1'), password: 'temporary123', timestamp: () => 456,
    async prepareRestaurant(id) {
      calls.prepare++;
      return { data: { Name: 'Verified name', GooglePlaceId: id, PhotoURL: 'stored.jpg' }, cleanup: async () => { calls.cleanup++; } };
    },
    async sendWelcome() { calls.email++; if (failEmail) throw new Error('SMTP unavailable'); },
    logError() {},
  };
  return { dependencies, records, accounts, calls, snapshot };
}

test('requires consent, a valid place and one of the actual roles on the server', () => {
  const valid = { email: ' ALUMNI@example.com ', name: ' Alumni ', hasAcceptedLegalTerms: true, googlePlaceId: 'place-1', role: 'kitchen' };
  assert.equal(validateRegistration(valid).email, 'alumni@example.com');
  for (const invalid of [{ hasAcceptedLegalTerms: false }, { googlePlaceId: '' }, { googlePlaceId: '../place' }, { role: 'admin' }, { role: ['kitchen'] }, { email: 'invalid' }, { name: '  ' }]) {
    assert.throws(() => validateRegistration({ ...valid, ...invalid }), { code: 'invalid-argument' });
  }
  const frontend = readFileSync(require.resolve('../src/helpers/restaurantRoles.js'), 'utf8');
  const roles = [...frontend.split('];')[0].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
  assert.deepEqual(RESTAURANT_ROLES, roles);
});

test('maps verified place metadata to the existing restaurant schema', () => {
  const data = restaurantFromPlace({ googlePlaceId: 'place-1', name: 'Restaurant', latitude: 41, longitude: 2, primaryType: 'restaurant', types: ['restaurant'], photoUrl: 'photo.jpg' });
  assert.deepEqual(data.Location, { latitude: 41, longitude: 2 });
  assert.equal(data.PhotoURL, 'photo.jpg');
  assert.equal(data.PrimaryType, 'restaurant');
  assert.equal(restaurantFromPlace({ googlePlaceId: 'p', name: 'N' }).Location, '');
  assert.throws(() => restaurantFromPlace({ googlePlaceId: 'p' }), { code: 'invalid-argument' });
});

test('creates the restaurant, alumni and current workplace atomically, then sends access details', async () => {
  const f = fixture();
  const result = await approveWorkplaceRegistration(f.dependencies);
  assert.equal(f.records.get('Restaurant/google_place-1').PhotoURL, 'stored.jpg');
  const student = f.records.get(`Alumni/${result.studentId}`);
  assert.equal(student.Email, request.Email);
  assert.equal(student.LegalTermsAcceptedAt, 123);
  const relation = f.records.get(`Rest-Alum/${result.studentId}_${result.restaurantId}`);
  assert.equal(relation.id_restaurant.path, 'Restaurant/google_place-1');
  assert.equal(relation.id_alumni.path, `Alumni/${result.studentId}`);
  assert.deepEqual(relation.rol, ['kitchen']);
  assert.equal(relation.current_job, true);
  assert.equal(f.records.has('UserRegistrations/request-1'), false);
  assert.equal(result.emailSent, true);
  assert.equal(result.restaurantCreated, true);
  assert.equal(result.restaurantName, 'Verified name');
  assert.deepEqual(f.calls, { prepare: 1, cleanup: 0, email: 1 });
});

test('reuses an existing Google Place without overwriting it or importing another photo', async () => {
  const f = fixture({ existingRestaurant: true });
  const result = await approveWorkplaceRegistration(f.dependencies);
  assert.equal(result.restaurantId, 'existing');
  assert.equal(result.restaurantCreated, false);
  assert.equal(result.restaurantName, 'Original name');
  assert.equal(f.records.get('Restaurant/existing').Name, 'Original name');
  assert.equal(f.calls.prepare, 0);
});

test('two simultaneous alumni approvals for the same new place create only one establishment', async () => {
  const f = fixture();
  f.records.set('UserRegistrations/request-2', { ...request, Email: 'second@example.com', Role: 'owner' });
  const [first, second] = await Promise.all([
    approveWorkplaceRegistration(f.dependencies),
    approveWorkplaceRegistration({ ...f.dependencies, registrationSnapshot: f.snapshot('UserRegistrations/request-2') }),
  ]);
  assert.equal(first.restaurantId, second.restaurantId);
  assert.deepEqual([first.restaurantCreated, second.restaurantCreated], [true, false]);
  assert.equal(second.restaurantName, 'Verified name');
  assert.equal([...f.records.keys()].filter((path) => path.startsWith('Restaurant/')).length, 1);
  assert.equal([...f.records.keys()].filter((path) => path.startsWith('Rest-Alum/')).length, 2);
  assert.equal(f.calls.cleanup, 1);
});

test('a failed transaction retains the request and removes the new auth account and unused photo', async () => {
  const f = fixture({ failCommit: true });
  await assert.rejects(approveWorkplaceRegistration(f.dependencies), /commit unavailable/);
  assert.deepEqual([...f.records.keys()], ['UserRegistrations/request-1']);
  assert.equal(f.accounts.size, 0);
  assert.deepEqual(f.calls, { prepare: 1, cleanup: 1, email: 0 });
});

test('Google import failure leaves the request pending without creating any account', async () => {
  const f = fixture();
  f.dependencies.prepareRestaurant = async () => { throw new Error('photo unavailable'); };
  await assert.rejects(approveWorkplaceRegistration(f.dependencies), /photo unavailable/);
  assert.deepEqual([...f.records.keys()], ['UserRegistrations/request-1']);
  assert.equal(f.accounts.size, 0);
  assert.equal(f.calls.email, 0);
});

test('rejects a request modified during approval and rolls back the new account', async () => {
  const f = fixture();
  const prepare = f.dependencies.prepareRestaurant;
  f.dependencies.prepareRestaurant = async (id) => {
    f.records.set('UserRegistrations/request-1', { ...request, Role: 'owner' });
    return prepare(id);
  };
  await assert.rejects(approveWorkplaceRegistration(f.dependencies), { code: 'failed-precondition' });
  assert.equal(f.accounts.size, 0);
  assert.equal(f.records.get('UserRegistrations/request-1').Role, 'owner');
  assert.equal(f.calls.cleanup, 1);
});

test('a repeated approval cannot create a second account or relation', async () => {
  const f = fixture();
  await approveWorkplaceRegistration(f.dependencies);
  await assert.rejects(approveWorkplaceRegistration(f.dependencies), { code: 'auth/email-already-exists' });
  assert.equal(f.accounts.size, 1);
  assert.equal([...f.records.keys()].filter((path) => path.startsWith('Rest-Alum/')).length, 1);
  assert.equal(f.calls.email, 1);
});

test('email failure reports a warning while preserving the completed account and workplace', async () => {
  const f = fixture({ failEmail: true });
  const result = await approveWorkplaceRegistration(f.dependencies);
  assert.equal(result.emailSent, false);
  assert.equal(result.restaurantCreated, true);
  assert.equal(result.restaurantName, 'Verified name');
  assert.ok(f.records.has(`Alumni/${result.studentId}`));
  assert.ok(f.records.has(`Rest-Alum/${result.studentId}_${result.restaurantId}`));
  assert.equal(f.accounts.size, 1);
  assert.equal(f.records.has('UserRegistrations/request-1'), false);
});

test('public callables reject incomplete registrations and unauthenticated approvals before writes', async () => {
  const { createUserRegistration, createStudentAccount } = require('./index');
  await assert.rejects(createUserRegistration.run({ data: { email: 'a@example.com', name: 'A', hasAcceptedLegalTerms: true } }), { code: 'invalid-argument' });
  await assert.rejects(createStudentAccount.run({ data: {} }), { code: 'unauthenticated' });
});
