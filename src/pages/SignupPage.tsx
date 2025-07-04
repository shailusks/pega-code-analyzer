import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { View } from '../types';

interface SignupPageProps {
  onSignupSuccess: () => void;
  navigateTo: (view: View) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignupSuccess, navigateTo }) => {
    const { signup } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await signup(name, email, password);
            onSignupSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to create account.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
                <div className="text-center">
                    <div onClick={() => navigateTo('analyzer')} className="inline-flex items-center justify-center mb-4 cursor-pointer group">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mr-3 text-sky-600 group-hover:text-sky-700 transition-colors">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09l2.846.813-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L24 5.25l-.813 2.846a4.5 4.5 0 0 0-3.09 3.09L18.25 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09L12 18.75l.813-2.846a4.5 4.5 0 0 0 3.09 3.09L18.25 12Z" />
                        </svg>
                        <h1 className="text-3xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">Pega LSA Assistant</h1>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-700">Create an Account</h2>
                    <p className="mt-2 text-sm text-gray-500">Get started by creating a local account</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    <div>
                        <label htmlFor="name" className="text-sm font-bold text-gray-600 block">Full Name</label>
                        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required
                            className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-sky-500"/>
                    </div>
                    <div>
                        <label htmlFor="email-signup" className="text-sm font-bold text-gray-600 block">Email</label>
                        <input id="email-signup" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                            className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-sky-500"/>
                    </div>
                    <div>
                        <label htmlFor="password-signup" className="text-sm font-bold text-gray-600 block">Password</label>
                        <input id="password-signup" type="password" value={password} onChange={e => setPassword(e.target.value)} required
                            className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-sky-500"/>
                    </div>
                    <button type="submit" disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50">
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="text-center pt-2 text-sm text-gray-600">
                    Already have an account?{' '}
                    <button onClick={() => navigateTo('login')} className="font-medium text-sky-600 hover:underline">
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;