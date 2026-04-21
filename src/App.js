import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import AppShell from './components/AppShell/AppShell';
import AdminScreen from './screens/AdminScreen/AdminScreen';
import AddRestaurantScreen from './screens/AddRestaurantScreen/AddRestaurantScreen';
import AddStudentScreen from './screens/AddStudentScreen/AddStudentScreen';
import { auth } from './helpers/firebase';
import { db } from './helpers/firebase';
import AuthScreen from './screens/AuthScreen/AuthScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import ManageRegistrationsScreen from './screens/ManageRegistrationsScreen/ManageRegistrationsScreen';
import RestaurantDetailScreen from './screens/RestaurantDetailScreen/RestaurantDetailScreen';
import RestaurantsScreen from './screens/RestaurantsScreen/RestaurantsScreen';
import StudentDetailScreen from './screens/StudentDetailScreen/StudentDetailScreen';
import StudentsScreen from './screens/StudentsScreen/StudentsScreen';
import { loadStudentRestaurantGraph } from './helpers/firestoreData';
import { createUserRegistration } from './helpers/userRegistrations';

function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'L\'email no te un format valid.';
    case 'auth/missing-password':
      return 'Has d\'introduir la contrasenya.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'L\'email o la contrasenya no son correctes.';
    case 'auth/too-many-requests':
      return 'Hi ha hagut massa intents. Torna-ho a provar mes tard.';
    default:
      return 'No s\'ha pogut iniciar sessio. Torna-ho a provar.';
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function App() {
  const [activeView, setActiveView] = useState('home');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentDetailOrigin, setStudentDetailOrigin] = useState('students');
  const [studentFormMode, setStudentFormMode] = useState('create');
  const [studentFormInitialData, setStudentFormInitialData] = useState(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [restaurantDetailOrigin, setRestaurantDetailOrigin] = useState('restaurants');
  const [restaurantFormMode, setRestaurantFormMode] = useState('create');
  const [restaurantFormInitialData, setRestaurantFormInitialData] = useState(null);
  const [authViewMode, setAuthViewMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isAdministrator, setIsAdministrator] = useState(false);
  const [currentStudentProfile, setCurrentStudentProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthViewMode(user ? 'status' : 'login');
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadUserAccessState() {
      if (!currentUser?.email) {
        setIsAdministrator(false);
        setCurrentStudentProfile(null);
        return;
      }

      try {
        const [snapshot, { students }] = await Promise.all([
          getDocs(collection(db, 'Administrator')),
          loadStudentRestaurantGraph(),
        ]);
        const normalizedUserEmail = currentUser.email.trim().toLowerCase();
        const administratorExists = snapshot.docs.some((entry) => {
          const emailValue = entry.data()?.Email;
          return (
            typeof emailValue === 'string' &&
            emailValue.trim().toLowerCase() === normalizedUserEmail
          );
        });
        const studentProfile = students.find((entry) =>
          normalizeEmail(entry.Email) === normalizedUserEmail
        ) ?? null;

        if (!isCancelled) {
          setIsAdministrator(administratorExists);
          setCurrentStudentProfile(studentProfile);
        }
      } catch (error) {
        if (!isCancelled) {
          setIsAdministrator(false);
          setCurrentStudentProfile(null);
        }
      }
    }

    loadUserAccessState();

    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  function handleNavigate(view) {
    if (view === 'edit-profile') {
      if (currentStudentProfile) {
        setSelectedStudentId(currentStudentProfile.id);
        setStudentFormMode('edit');
        setStudentFormInitialData(currentStudentProfile);
        setActiveView('edit-student');
      }
      return;
    }

    setActiveView(view);

    if (
      view !== 'student-detail'
      && view !== 'restaurant-detail'
      && view !== 'edit-student'
      && view !== 'edit-restaurant'
    ) {
      setSelectedStudentId('');
    }

    if (view !== 'student-detail') {
      setStudentDetailOrigin('students');
    }

    if (view !== 'restaurant-detail' && view !== 'edit-restaurant') {
      setSelectedRestaurantId('');
      setRestaurantDetailOrigin('restaurants');
    }

    if (view !== 'add-student' && view !== 'edit-student') {
      setStudentFormMode('create');
      setStudentFormInitialData(null);
    }

    if (view !== 'add-restaurant' && view !== 'edit-restaurant') {
      setRestaurantFormMode('create');
      setRestaurantFormInitialData(null);
    }
  }

  function handleOpenStudentDetails(studentId, origin = 'students') {
    setSelectedStudentId(studentId);
    setStudentDetailOrigin(origin);
    setActiveView('student-detail');
  }

  async function handleEditStudent(studentId) {
    try {
      const { students } = await loadStudentRestaurantGraph();
      const selectedStudent = students.find((entry) => entry.id === studentId) ?? null;

      if (!selectedStudent) {
        return;
      }

      const canEditStudent = isAdministrator
        || (
          normalizeEmail(currentUser?.email)
          && normalizeEmail(selectedStudent.Email) === normalizeEmail(currentUser?.email)
        );

      if (!canEditStudent) {
        setActiveView('student-detail');
        return;
      }

      setSelectedStudentId(studentId);
      setStudentFormMode('edit');
      setStudentFormInitialData(selectedStudent);
      setActiveView('edit-student');
    } catch (error) {
      setActiveView('student-detail');
    }
  }

  function handleOpenRestaurantDetails(restaurantId, origin) {
    setSelectedRestaurantId(restaurantId);
    setRestaurantDetailOrigin(origin);
    setActiveView('restaurant-detail');
  }

  async function handleEditRestaurant(restaurantId) {
    if (!isAdministrator) {
      setActiveView('restaurant-detail');
      return;
    }

    try {
      const { restaurants } = await loadStudentRestaurantGraph();
      const selectedRestaurant = restaurants.find((entry) => entry.id === restaurantId) ?? null;

      if (!selectedRestaurant) {
        return;
      }

      setSelectedRestaurantId(restaurantId);
      setRestaurantFormMode('edit');
      setRestaurantFormInitialData(selectedRestaurant);
      setActiveView('edit-restaurant');
    } catch (error) {
      setActiveView('restaurant-detail');
    }
  }

  function handleAuthAction() {
    setAuthErrorMessage('');
    setAuthViewMode(currentUser ? 'logout' : 'login');
    setActiveView('auth');
  }

  async function handleLogin({ email, password }) {
    setAuthErrorMessage('');
    setIsAuthSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setAuthViewMode('status');
      setActiveView('auth');
    } catch (error) {
      setAuthErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleLogout() {
    setAuthErrorMessage('');
    setIsAuthSubmitting(true);

    try {
      await signOut(auth);
      setAuthViewMode('login');
      setActiveView('home');
    } catch (error) {
      setAuthErrorMessage('No s\'ha pogut tancar la sessio. Torna-ho a provar.');
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleRequestAccess({ email, name }) {
    await createUserRegistration({ email, name });
  }

  let screen = <HomeScreen />;

  if (activeView === 'restaurants') {
    screen = <RestaurantsScreen onOpenRestaurantDetails={handleOpenRestaurantDetails} />;
  }

  if (activeView === 'students') {
    screen = <StudentsScreen onOpenStudentDetails={handleOpenStudentDetails} />;
  }

  if (activeView === 'student-detail' && selectedStudentId) {
    screen = (
      <StudentDetailScreen
        isAuthenticated={Boolean(currentUser)}
        isAdministrator={isAdministrator}
        currentUserEmail={currentUser?.email ?? ''}
        studentId={selectedStudentId}
        onBack={() => handleNavigate(studentDetailOrigin)}
        onDeleted={() => handleNavigate('students')}
        onEdit={handleEditStudent}
        onOpenRestaurantDetails={handleOpenRestaurantDetails}
      />
    );
  }

  if (activeView === 'restaurant-detail' && selectedRestaurantId) {
    screen = (
      <RestaurantDetailScreen
        isAdministrator={isAdministrator}
        restaurantId={selectedRestaurantId}
        onBack={() => handleNavigate(restaurantDetailOrigin)}
        onDeleted={() => handleNavigate('restaurants')}
        onEdit={handleEditRestaurant}
        onOpenStudentDetails={handleOpenStudentDetails}
      />
    );
  }

  if (activeView === 'auth') {
    screen = (
      <AuthScreen
        errorMessage={authErrorMessage}
        isAuthenticated={Boolean(currentUser)}
        isSubmitting={isAuthSubmitting}
        mode={authViewMode}
        userEmail={currentUser?.email ?? ''}
        onClearError={() => setAuthErrorMessage('')}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onRequestAccess={handleRequestAccess}
      />
    );
  }

  if (isAdministrator && activeView === 'add-student') {
    screen = <AddStudentScreen mode="create" isAdministrator={isAdministrator} />;
  }

  if (isAdministrator && activeView === 'add-restaurant') {
    screen = <AddRestaurantScreen mode="create" />;
  }

  if (isAdministrator && activeView === 'edit-restaurant' && restaurantFormInitialData) {
    screen = (
      <AddRestaurantScreen
        mode="edit"
        restaurant={restaurantFormInitialData}
        onSaved={(restaurantId) => handleOpenRestaurantDetails(restaurantId, 'restaurants')}
      />
    );
  }

  const canEditSelectedStudent = studentFormInitialData
    && (
      isAdministrator
      || normalizeEmail(studentFormInitialData.Email) === normalizeEmail(currentUser?.email)
    );

  if (activeView === 'edit-student' && studentFormInitialData && canEditSelectedStudent) {
    screen = (
      <AddStudentScreen
        mode="edit"
        isAdministrator={isAdministrator}
        student={studentFormInitialData}
        onSaved={(studentId) => handleOpenStudentDetails(studentId, 'students')}
      />
    );
  }

  if (isAdministrator && activeView === 'manage-registrations') {
    screen = <ManageRegistrationsScreen />;
  }

  return (
    <AppShell
      activeView={
        activeView === 'student-detail'
          ? 'students'
          : activeView === 'edit-student'
          ? 'students'
          : activeView === 'edit-restaurant'
          ? 'restaurants'
          : activeView === 'restaurant-detail'
            ? 'restaurants'
            : activeView
      }
      isAdministrator={isAdministrator}
      isAuthenticated={Boolean(currentUser)}
      hasStudentProfile={Boolean(currentStudentProfile)}
      onAuthAction={handleAuthAction}
      onNavigate={handleNavigate}
    >
      {screen}
    </AppShell>
  );
}

export default App;
