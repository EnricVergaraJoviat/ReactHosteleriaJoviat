import { useState } from 'react';
import AppShell from './components/AppShell/AppShell';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import RestaurantDetailScreen from './screens/RestaurantDetailScreen/RestaurantDetailScreen';
import RestaurantsScreen from './screens/RestaurantsScreen/RestaurantsScreen';
import StudentDetailScreen from './screens/StudentDetailScreen/StudentDetailScreen';
import StudentsScreen from './screens/StudentsScreen/StudentsScreen';

function App() {
  const [activeView, setActiveView] = useState('home');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentDetailOrigin, setStudentDetailOrigin] = useState('students');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [restaurantDetailOrigin, setRestaurantDetailOrigin] = useState('restaurants');

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

  return (
    <AppShell
      activeView={
        activeView === 'student-detail'
          ? 'students'
          : activeView === 'restaurant-detail'
            ? 'restaurants'
            : activeView
      }
      onNavigate={handleNavigate}
    >
      {screen}
    </AppShell>
  );
}

export default App;
