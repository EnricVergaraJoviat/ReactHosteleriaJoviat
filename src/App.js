import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import AppShell from './components/AppShell/AppShell';
import AdminScreen from './screens/AdminScreen/AdminScreen';
import AddStudentScreen from './screens/AddStudentScreen/AddStudentScreen';
import { auth } from './helpers/firebase';
import { db } from './helpers/firebase';
import AuthScreen from './screens/AuthScreen/AuthScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import RestaurantDetailScreen from './screens/RestaurantDetailScreen/RestaurantDetailScreen';
import RestaurantsScreen from './screens/RestaurantsScreen/RestaurantsScreen';
import StudentDetailScreen from './screens/StudentDetailScreen/StudentDetailScreen';
import StudentsScreen from './screens/StudentsScreen/StudentsScreen';

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

function App() {
  const [activeView, setActiveView] = useState('home');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentDetailOrigin, setStudentDetailOrigin] = useState('students');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [restaurantDetailOrigin, setRestaurantDetailOrigin] = useState('restaurants');
  const [authViewMode, setAuthViewMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isAdministrator, setIsAdministrator] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthViewMode(user ? 'status' : 'login');
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadAdministratorState() {
      if (!currentUser?.email) {
        setIsAdministrator(false);
        return;
      }

      try {
        const snapshot = await getDocs(collection(db, 'Administrator'));
        const normalizedUserEmail = currentUser.email.trim().toLowerCase();
        const administratorExists = snapshot.docs.some((entry) => {
          const emailValue = entry.data()?.Email;
          return (
            typeof emailValue === 'string' &&
            emailValue.trim().toLowerCase() === normalizedUserEmail
          );
        });

        if (!isCancelled) {
          setIsAdministrator(administratorExists);
        }
      } catch (error) {
        if (!isCancelled) {
          setIsAdministrator(false);
        }
      }
    }

    loadAdministratorState();

    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  function handleNavigate(view) {
    setActiveView(view);

    if (view !== 'student-detail' && view !== 'restaurant-detail') {
      setSelectedStudentId('');
    }

    if (view !== 'student-detail') {
      setStudentDetailOrigin('students');
    }

    if (view !== 'restaurant-detail') {
      setSelectedRestaurantId('');
      setRestaurantDetailOrigin('restaurants');
    }
  }

  function handleOpenStudentDetails(studentId, origin = 'students') {
    setSelectedStudentId(studentId);
    setStudentDetailOrigin(origin);
    setActiveView('student-detail');
  }

  function handleOpenRestaurantDetails(restaurantId, origin) {
    setSelectedRestaurantId(restaurantId);
    setRestaurantDetailOrigin(origin);
    setActiveView('restaurant-detail');
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
        studentId={selectedStudentId}
        onBack={() => handleNavigate(studentDetailOrigin)}
        onOpenRestaurantDetails={handleOpenRestaurantDetails}
      />
    );
  }

  if (activeView === 'restaurant-detail' && selectedRestaurantId) {
    screen = (
      <RestaurantDetailScreen
        restaurantId={selectedRestaurantId}
        onBack={() => handleNavigate(restaurantDetailOrigin)}
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
      />
    );
  }

  if (isAdministrator && activeView === 'add-student') {
    screen = <AddStudentScreen />;
  }

  if (
    isAdministrator &&
    ['add-restaurant', 'manage-registrations'].includes(activeView)
  ) {
    screen = <AdminScreen view={activeView} />;
  }

  return (
    <AppShell
      activeView={
        activeView === 'student-detail'
          ? 'students'
          : activeView === 'restaurant-detail'
            ? 'restaurants'
            : activeView
      }
      isAdministrator={isAdministrator}
      isAuthenticated={Boolean(currentUser)}
      onAuthAction={handleAuthAction}
      onNavigate={handleNavigate}
    >
      {screen}
    </AppShell>
  );
}

export default App;
