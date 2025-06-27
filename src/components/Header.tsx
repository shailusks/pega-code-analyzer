
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-sky-700 text-white p-6 shadow-md">
      <div className="container mx-auto flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mr-3 text-sky-300">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09l2.846.813-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L24 5.25l-.813 2.846a4.5 4.5 0 0 0-3.09 3.09L18.25 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09L12 18.75l.813-2.846a4.5 4.5 0 0 0 3.09 3.09L18.25 12Z" />
        </svg>
        <div>
            <h1 className="text-3xl font-bold">Pega LSA Assistant - Code Analyser</h1>
            <p className="text-sky-200">AI-Powered Pega Code Review & Optimization</p>
        </div>
      </div>
    </header>
  );
};

export default Header;