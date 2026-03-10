import { useState } from 'react';
import AppShell from './components/AppShell/AppShell';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import RestaurantsScreen from './screens/RestaurantsScreen/RestaurantsScreen';
import StudentsScreen from './screens/StudentsScreen/StudentsScreen';

function App() {
  const [activeView, setActiveView] = useState('home');

  let screen = <HomeScreen />;

  if (activeView === 'restaurants') {
    screen = <RestaurantsScreen />;
  }

  if (activeView === 'students') {
    screen = <StudentsScreen />;
  }

  return (
    <AppShell activeView={activeView} onNavigate={setActiveView}>
      {screen}
    </AppShell>
  );
}

export default App;
