import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { View } from '../types';

interface HeaderProps {
    isLoggedIn: boolean;
    currentView: View;
    navigateTo: (view: View) => void;
    logout: () => void;
}

const NavButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}> = ({ onClick, isActive, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-sky-800 text-white'
        : 'text-sky-100 hover:bg-sky-600 hover:text-white'
    }`}
  >
    {children}
  </button>
);

const AuthButton: React.FC<{onClick: () => void, children: React.ReactNode, primary?: boolean}> = ({ onClick, children, primary=false }) => (
    <button
        onClick={onClick}
        className={`font-semibold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-colors duration-150 text-sm
            ${primary 
                ? 'bg-white text-sky-700 hover:bg-sky-100 focus:ring-sky-500' 
                : 'bg-sky-600 text-white hover:bg-sky-500 focus:ring-sky-400'
            }`
        }
    >
        {children}
    </button>
);


const Header: React.FC<HeaderProps> = ({ isLoggedIn, currentView, navigateTo, logout }) => {
  const { currentUser } = useAuth();

  return (
    <header className="bg-sky-700 text-white p-4 shadow-md sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center cursor-pointer" onClick={() => navigateTo(isLoggedIn ? 'dashboard' : 'analyzer')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mr-3 text-sky-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09l2.846.813-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L24 5.25l-.813 2.846a4.5 4.5 0 0 0-3.09 3.09L18.25 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09L12 18.75l.813-2.846a4.5 4.5 0 0 0 3.09 3.09L18.25 12Z" />
            </svg>
            <div>
                <h1 className="text-2xl font-bold">Pega LSA Assistant</h1>
            </div>
        </div>

        {isLoggedIn && currentUser ? (
           <div className="flex items-center space-x-2 sm:space-x-4">
               <nav className="hidden sm:flex items-center space-x-2 bg-sky-700 p-1 rounded-lg">
                   <NavButton onClick={() => navigateTo('dashboard')} isActive={currentView === 'dashboard'}>Dashboard</NavButton>
                   <NavButton onClick={() => navigateTo('analyzer')} isActive={currentView === 'analyzer'}>Analyzer</NavButton>
               </nav>

                <div className="flex items-center space-x-3">
                    {currentUser.picture && <img src={currentUser.picture} alt="Profile" className="w-8 h-8 rounded-full" />}
                    <span className="text-sm text-sky-200 hidden md:block">Welcome, <span className="font-semibold">{currentUser.name}</span></span>
                    <button
                        onClick={logout}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition-colors duration-150 flex items-center"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1.5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                         </svg>
                        Logout
                    </button>
                </div>
           </div>
        ) : (
            <div className="flex items-center space-x-3">
                <AuthButton onClick={() => navigateTo('signup')} primary>Sign Up</AuthButton>
                <AuthButton onClick={() => navigateTo('login')}>Sign In</AuthButton>
            </div>
        )}
      </div>
        {isLoggedIn && (
             <nav className="sm:hidden mt-3 bg-sky-600 p-1 rounded-lg flex justify-around">
               <NavButton onClick={() => navigateTo('dashboard')} isActive={currentView === 'dashboard'}>Dashboard</NavButton>
               <NavButton onClick={() => navigateTo('analyzer')} isActive={currentView === 'analyzer'}>Analyzer</NavButton>
            </nav>
        )}
    </header>
  );
};

export default Header;