import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { View } from './types';

import Header from './components/Header';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AnalyzerPage from './pages/AnalyzerPage';

const App: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [view, setView] = useState<View>(currentUser ? 'dashboard' : 'analyzer');

  const handleLoginSuccess = () => {
    setView('dashboard');
  };

  const handleLogout = () => {
    logout();
    setView('analyzer');
  };
  
  const navigateTo = (targetView: View) => {
      setView(targetView);
  }

  const renderContent = () => {
    switch (view) {
      case 'login':
        return <LoginPage onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} />;
      case 'signup':
        return <SignupPage onSignupSuccess={handleLoginSuccess} navigateTo={navigateTo} />;
      case 'dashboard':
        // Protected route: if not logged in, redirect to login.
        if (!currentUser) {
            return <LoginPage onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} />;
        }
        return <DashboardPage />;
      case 'analyzer':
      default:
        return <AnalyzerPage />;
    }
  };

  // Render login/signup pages standalone without the main layout
  if (view === 'login' || view === 'signup') {
    return renderContent();
  }

  // Render main layout for analyzer and dashboard
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans">
      <Header
        isLoggedIn={!!currentUser}
        currentView={view}
        navigateTo={navigateTo}
        logout={handleLogout}
      />
      <main className="container mx-auto p-4 sm:p-6 md:p-8 flex-grow w-full">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default App;