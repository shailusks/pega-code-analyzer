import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { View } from '../types';
import GoogleClientIdHelpModal from '../components/GoogleClientIdHelpModal';

interface LoginPageProps {
  onLoginSuccess: () => void;
  navigateTo: (view: View) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, navigateTo }) => {
  const { 
    isGoogleClientInitialized, 
    googleClientId, 
    setGoogleClientIdFromInput,
    currentUser,
    login 
  } = useAuth();

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Local state for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');

  useEffect(() => {
    if (currentUser) {
      onLoginSuccess();
    }
  }, [currentUser, onLoginSuccess]);

  useEffect(() => {
    if (isGoogleClientInitialized && googleClientId && googleButtonRef.current) {
      if (googleButtonRef.current.childElementCount === 0) { // Prevent re-rendering the button
          window.google.accounts.id.renderButton(
          googleButtonRef.current,
          { theme: 'outline', size: 'large', type: 'standard', text: 'signin_with', width: '300' }
        );
      }
    }
  }, [isGoogleClientInitialized, googleClientId]);

  const handleLocalLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);
      try {
          await login(email, password);
          onLoginSuccess();
      } catch (err: any) {
          setError(err.message || "Failed to log in.");
      } finally {
          setIsLoading(false);
      }
  }
  
  const handleSetClientId = () => {
    if(clientIdInput.trim()){
      setGoogleClientIdFromInput(clientIdInput);
    }
  }

  return (
    <>
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
            <div onClick={() => navigateTo('analyzer')} className="inline-flex items-center justify-center mb-4 cursor-pointer group">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mr-3 text-sky-600 group-hover:text-sky-700 transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09l2.846.813-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L24 5.25l-.813 2.846a4.5 4.5 0 0 0-3.09 3.09L18.25 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09L12 18.75l.813-2.846a4.5 4.5 0 0 0 3.09 3.09L18.25 12Z" />
                 </svg>
                 <h1 className="text-3xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">Pega LSA Assistant</h1>
            </div>
          <h2 className="text-2xl font-bold text-gray-700">Sign In</h2>
          <p className="mt-2 text-sm text-gray-500">Access your dashboard and analyzer</p>
        </div>

        {/* Local Login Form */}
        <form onSubmit={handleLocalLogin} className="space-y-4">
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <div>
                <label htmlFor="email" className="text-sm font-bold text-gray-600 block">Email</label>
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-sky-500"/>
            </div>
            <div>
                <label htmlFor="password-login" className="text-sm font-bold text-gray-600 block">Password</label>
                <input id="password-login" type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-sky-500"/>
            </div>
            <button type="submit" disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50">
                {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
        </form>

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-sm text-gray-500">Or</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Google Sign-In */}
        <div className="flex flex-col items-center space-y-4">
            {!googleClientId ? (
                 <div className="w-full p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800" role="alert">
                    <p className="font-semibold mb-2">Google Sign-In Is Not Configured</p>
                    <p className="text-sm mb-3">To use Google Sign-In, please provide your Google OAuth Client ID below.</p>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={clientIdInput} 
                        onChange={e => setClientIdInput(e.target.value)}
                        placeholder="Paste Google Client ID here"
                        className="w-full p-2 border border-yellow-300 rounded-md text-sm"
                      />
                      <button 
                        onClick={() => setIsHelpModalOpen(true)} 
                        className="text-yellow-600 hover:text-yellow-800"
                        title="How to get a Google Client ID">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12V8.25Z" /></svg>
                      </button>
                    </div>
                    <button onClick={handleSetClientId} className="w-full mt-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700">
                      Set Client ID & Enable Google Sign-In
                    </button>
                </div>
            ) : (
                <div ref={googleButtonRef} id="google-signin-button"></div>
            )}
        </div>
        
        <div className="text-center pt-2 text-sm text-gray-600">
             Don't have an account?{' '}
             <button onClick={() => navigateTo('signup')} className="font-medium text-sky-600 hover:underline">
              Sign Up
            </button>
             {' or '}
             <button onClick={() => navigateTo('analyzer')} className="font-medium text-sky-600 hover:underline">
              Continue as Guest
            </button>
        </div>
      </div>
    </div>
    <GoogleClientIdHelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </>
  );
};

export default LoginPage;