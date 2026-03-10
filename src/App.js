import { useState } from 'react';
import AppShell from './components/AppShell/AppShell';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import StudentsScreen from './screens/StudentsScreen/StudentsScreen';

function App() {
  const [activeView, setActiveView] = useState('home');

  return (
    <AppShell activeView={activeView} onNavigate={setActiveView}>
      {activeView === 'students' ? <StudentsScreen /> : <HomeScreen />}
    </AppShell>
  );
}

export default App;
