import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import AppShell from './components/AppShell/AppShell';
import AdminScreen from './screens/AdminScreen/AdminScreen';
import AddRestaurantScreen from './screens/AddRestaurantScreen/AddRestaurantScreen';
import AddStudentScreen from './screens/AddStudentScreen/AddStudentScreen';
import { auth, db, functions } from './helpers/firebase';
import AuthScreen from './screens/AuthScreen/AuthScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import ManageRegistrationsScreen from './screens/ManageRegistrationsScreen/ManageRegistrationsScreen';
import RestaurantDetailScreen from './screens/RestaurantDetailScreen/RestaurantDetailScreen';
import RestaurantsScreen from './screens/RestaurantsScreen/RestaurantsScreen';
import StudentDetailScreen from './screens/StudentDetailScreen/StudentDetailScreen';
import StudentsScreen from './screens/StudentsScreen/StudentsScreen';
import { loadStudentRestaurantGraph } from './helpers/firestoreData';
import { createUserRegistration } from './helpers/userRegistrations';
import { useI18n } from './i18n/I18nContext';

function getAuthErrorMessage(error, t) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return t('auth.invalidEmail');
    case 'auth/missing-password':
      return t('auth.missingPassword');
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return t('auth.invalidCredentials');
    case 'auth/too-many-requests':
      return t('auth.tooManyRequests');
    default:
      return t('auth.loginFailed');
  }
}

function getPasswordResetErrorMessage(error, t) {
  switch (error?.code) {
    case 'functions/invalid-argument':
    case 'invalid-argument':
      return t('auth.invalidEmail');
    case 'functions/not-found':
    case 'not-found':
    case 'auth/user-not-found':
      return t('auth.passwordResetEmailNotFound');
    case 'functions/failed-precondition':
    case 'failed-precondition':
      return t('auth.passwordResetEmailNotConfigured');
    default:
      return t('auth.passwordResetError');
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getInitialActiveView() {
  const pathname = typeof window !== 'undefined'
    ? window.location.pathname.replace(/\/+$/, '')
    : '';

  if (pathname === '/login') {
    return 'auth';
  }

  return 'home';
}

const APP_HISTORY_KEY = 'react-hosteleria-joviat';

function isAppHistoryState(state) {
  return state?.app === APP_HISTORY_KEY;
}

function App() {
  const { t } = useI18n();
  const notifyRestaurantRegistrationApproved = httpsCallable(functions, 'sendRestaurantRegistrationApprovedEmail');
  const sendLoginPasswordResetEmail = httpsCallable(functions, 'sendPasswordResetEmail');
  const [activeView, setActiveView] = useState(getInitialActiveView);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentDetailOrigin, setStudentDetailOrigin] = useState('students');
  const [studentFormMode, setStudentFormMode] = useState('create');
  const [studentFormInitialData, setStudentFormInitialData] = useState(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [restaurantDetailOrigin, setRestaurantDetailOrigin] = useState('restaurants');
  const [restaurantFormMode, setRestaurantFormMode] = useState('create');
  const [restaurantFormInitialData, setRestaurantFormInitialData] = useState(null);
  const [pendingRestaurantRegistration, setPendingRestaurantRegistration] = useState(null);
  const [authViewMode, setAuthViewMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isAdministrator, setIsAdministrator] = useState(false);
  const [currentStudentProfile, setCurrentStudentProfile] = useState(null);
  const navigationStateRef = useRef({
    activeView,
    selectedStudentId,
    studentDetailOrigin,
    selectedRestaurantId,
    restaurantDetailOrigin,
  });

  useEffect(() => {
    navigationStateRef.current = {
      activeView,
      selectedStudentId,
      studentDetailOrigin,
      selectedRestaurantId,
      restaurantDetailOrigin,
    };
  }, [
    activeView,
    selectedStudentId,
    studentDetailOrigin,
    selectedRestaurantId,
    restaurantDetailOrigin,
  ]);

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

  const clearViewStateFor = useCallback((view) => {
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
      setPendingRestaurantRegistration(null);
    }
  }, []);

  const navigateToView = useCallback((view) => {
    setActiveView(view);
    clearViewStateFor(view);
  }, [clearViewStateFor]);

  function pushAppHistoryState(historyState) {
    if (typeof window === 'undefined') {
      return;
    }

    window.history.pushState(
      { app: APP_HISTORY_KEY, ...historyState },
      '',
      window.location.href
    );
  }

  function handleDetailBack(fallbackView) {
    if (
      typeof window !== 'undefined'
      && isAppHistoryState(window.history.state)
      && (
        window.history.state.view === 'student-detail'
        || window.history.state.view === 'restaurant-detail'
      )
    ) {
      window.history.back();
      return;
    }

    navigateToView(fallbackView);
  }

  useEffect(() => {
    function handlePopState(event) {
      if (isAppHistoryState(event.state)) {
        if (event.state.view === 'student-detail' && event.state.studentId) {
          setSelectedStudentId(event.state.studentId);
          setStudentDetailOrigin(event.state.origin ?? 'students');
          setActiveView('student-detail');
          return;
        }

        if (event.state.view === 'restaurant-detail' && event.state.restaurantId) {
          setSelectedRestaurantId(event.state.restaurantId);
          setRestaurantDetailOrigin(event.state.origin ?? 'restaurants');
          setActiveView('restaurant-detail');
          return;
        }
      }

      const currentNavigation = navigationStateRef.current;

      if (currentNavigation.activeView === 'student-detail') {
        navigateToView(currentNavigation.studentDetailOrigin || 'students');
        return;
      }

      if (currentNavigation.activeView === 'restaurant-detail') {
        navigateToView(currentNavigation.restaurantDetailOrigin || 'restaurants');
      }
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigateToView]);

  async function handleNavigate(view) {
    if (view === 'edit-profile') {
      if (currentStudentProfile) {
        let selectedProfile = currentStudentProfile;

        try {
          const { students } = await loadStudentRestaurantGraph();
          selectedProfile = students.find((entry) => entry.id === currentStudentProfile.id)
            ?? students.find((entry) =>
              normalizeEmail(entry.Email) === normalizeEmail(currentUser?.email)
            )
            ?? currentStudentProfile;
          setCurrentStudentProfile(selectedProfile);
        } catch (error) {}

        setSelectedStudentId(selectedProfile.id);
        setStudentFormMode('edit');
        setStudentFormInitialData(selectedProfile);
        setActiveView('edit-student');
      }
      return;
    }

    navigateToView(view);
  }

  function handleOpenStudentDetails(studentId, origin = 'students') {
    pushAppHistoryState({
      view: 'student-detail',
      studentId,
      origin,
    });
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

  function handleOpenRestaurantDetails(restaurantId, origin = 'restaurants') {
    pushAppHistoryState({
      view: 'restaurant-detail',
      restaurantId,
      origin,
    });
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

  function handleManageRestaurantRegistration(registration, placeDetails) {
    setRestaurantFormMode('create');
    setPendingRestaurantRegistration(registration);
    setRestaurantFormInitialData({
      Name: placeDetails.name ?? '',
      Address: placeDetails.address ?? '',
      Phone: placeDetails.phone ?? '',
      Email: '',
      Website: placeDetails.website ?? '',
      GoogleMapsURL: placeDetails.googleMapsUrl || registration.GoogleMapsShareUrl || '',
      PhotoURL: placeDetails.photoUrl ?? '',
      Rating: placeDetails.rating ?? '',
      BusinessStatus: placeDetails.businessStatus ?? '',
      GooglePlaceId: placeDetails.googlePlaceId ?? '',
      GooglePhotoName: placeDetails.googlePhotoName ?? '',
      PrimaryType: placeDetails.primaryType ?? '',
      PrimaryTypeDisplayName: placeDetails.primaryTypeDisplayName ?? '',
      Types: Array.isArray(placeDetails.types) ? placeDetails.types : [],
      Location:
        typeof placeDetails.latitude === 'number' && typeof placeDetails.longitude === 'number'
          ? {
              latitude: placeDetails.latitude,
              longitude: placeDetails.longitude,
            }
          : '',
    });
    setActiveView('add-restaurant');
  }

  async function handleRestaurantCreated(restaurantId, restaurantName) {
    if (pendingRestaurantRegistration?.id) {
      try {
        if (normalizeEmail(pendingRestaurantRegistration.Email)) {
          await notifyRestaurantRegistrationApproved({
            email: pendingRestaurantRegistration.Email,
            alumniName: pendingRestaurantRegistration.Name ?? '',
            restaurantName: restaurantName ?? restaurantFormInitialData?.Name ?? '',
          });
        }

        await deleteDoc(doc(db, 'RestaruantsRegistrations', pendingRestaurantRegistration.id));
      } catch (error) {}
    }

    setPendingRestaurantRegistration(null);
  }

  function handleAuthAction() {
    setAuthErrorMessage('');
    setAuthViewMode(currentUser ? 'logout' : 'login');
    setActiveView('auth');
  }

  function handleOpenRegister() {
    setAuthErrorMessage('');
    setAuthViewMode(currentUser ? 'status' : 'request');
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
      setAuthErrorMessage(getAuthErrorMessage(error, t));
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
      setAuthErrorMessage(t('auth.logoutFailed'));
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleRequestAccess({ email, name }) {
    await createUserRegistration({ email, name });
  }

  async function handlePasswordReset({ email }) {
    try {
      await sendLoginPasswordResetEmail({ email: normalizeEmail(email) });
    } catch (error) {
      throw new Error(getPasswordResetErrorMessage(error, t));
    }
  }

  let screen = (
    <HomeScreen
      onNavigate={(view) => {
        if (view === 'register') {
          handleOpenRegister();
          return;
        }

        handleNavigate(view);
      }}
    />
  );

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
        onBack={() => handleDetailBack(studentDetailOrigin)}
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
        onBack={() => handleDetailBack(restaurantDetailOrigin)}
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
        onPasswordReset={handlePasswordReset}
        onRequestAccess={handleRequestAccess}
      />
    );
  }

  if (isAdministrator && activeView === 'add-student') {
    screen = <AddStudentScreen mode="create" isAdministrator={isAdministrator} />;
  }

  if (isAdministrator && activeView === 'add-restaurant') {
    screen = (
      <AddRestaurantScreen
        mode="create"
        restaurant={restaurantFormInitialData}
        onSaved={handleRestaurantCreated}
        onOpenCreatedRestaurant={(restaurantId) => handleOpenRestaurantDetails(restaurantId, 'restaurants')}
      />
    );
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
  const isEditingOwnStudentProfile = activeView === 'edit-student'
    && studentFormInitialData
    && !isAdministrator
    && normalizeEmail(studentFormInitialData.Email) === normalizeEmail(currentUser?.email);

  if (activeView === 'edit-student' && studentFormInitialData && canEditSelectedStudent) {
    screen = (
      <AddStudentScreen
        mode="edit"
        canChangePassword={!isAdministrator}
        isAdministrator={isAdministrator}
        student={studentFormInitialData}
        onSaved={(studentId) => handleOpenStudentDetails(studentId, 'students')}
      />
    );
  }

  if (isAdministrator && activeView === 'manage-registrations') {
    screen = (
      <ManageRegistrationsScreen
        onManageRestaurantRegistration={handleManageRestaurantRegistration}
      />
    );
  }

  return (
    <AppShell
      activeView={
        activeView === 'student-detail'
          ? 'students'
          : activeView === 'edit-student'
          ? isEditingOwnStudentProfile
            ? 'edit-profile'
            : 'students'
          : activeView === 'edit-restaurant'
          ? 'restaurants'
          : activeView === 'restaurant-detail'
            ? 'restaurants'
            : activeView
      }
      isAdministrator={isAdministrator}
      isAuthenticated={Boolean(currentUser)}
      currentStudentProfile={currentStudentProfile}
      currentUserEmail={currentUser?.email ?? ''}
      hasStudentProfile={Boolean(currentStudentProfile)}
      onAuthAction={handleAuthAction}
      onNavigate={handleNavigate}
    >
      {screen}
    </AppShell>
  );
}

export default App;
