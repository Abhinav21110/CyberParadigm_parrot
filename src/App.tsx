import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Challenges } from './pages/Challenges';
import { Courses } from './pages/Courses';
import { Community } from './pages/Community';
import { XssChallenge } from './pages/XssChallenge';

type Page = 'dashboard' | 'courses' | 'challenges' | 'community' | 'xss';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const handleNavigateToChallenge = (challengeId: string) => {
    if (challengeId === 'xss') {
      setCurrentPage('xss');
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'courses':
        return <Courses />;
      case 'challenges':
        return <Challenges onNavigateToChallenge={handleNavigateToChallenge} />;
      case 'community':
        return <Community />;
      case 'xss':
        return <XssChallenge />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Toaster />
      <Sonner />
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />
      {renderPage()}
    </div>
  );
}

export default App;
