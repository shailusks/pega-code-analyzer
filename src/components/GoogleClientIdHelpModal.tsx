import React from 'react';

interface GoogleClientIdHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoogleClientIdHelpModal: React.FC<GoogleClientIdHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
        className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="googleClientIdHelpModalTitle"
    >
      <div 
        className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-2xl transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="googleClientIdHelpModalTitle" className="text-xl sm:text-2xl font-semibold text-gray-800">
            How to get your Google Client ID
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close Google Client ID Help Modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4 text-gray-700 max-h-[60vh] overflow-y-auto pr-2">
          <p>To enable Google Sign-In, you need an OAuth 2.0 Client ID from the Google Cloud Platform. Follow these steps to create one:</p>
          <ol className="list-decimal list-inside space-y-3 pl-4">
            <li>
              Go to the Google Cloud Console Credentials page: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 underline font-medium">console.cloud.google.com/apis/credentials</a>.
            </li>
            <li>
              Click <strong className="font-semibold">"+ CREATE CREDENTIALS"</strong> at the top of the page and select <strong className="font-semibold">"OAuth client ID"</strong>.
            </li>
            <li>
                If prompted, configure your <strong className="font-semibold">"OAuth consent screen"</strong>.
                <ul className="list-disc list-inside pl-6 mt-2 space-y-1 text-sm">
                    <li>Select <strong className="font-semibold">"External"</strong> and click "Create".</li>
                    <li>Fill in the required fields (App name, User support email, Developer contact information).</li>
                    <li>Click <strong className="font-semibold">"SAVE AND CONTINUE"</strong> through the "Scopes" and "Test users" sections. You don't need to add anything here for this purpose.</li>
                    <li>Go back to the dashboard once you've saved the consent screen.</li>
                </ul>
            </li>
             <li>
                After setting up the consent screen (or if you already have one), you'll be taken back to the "Create OAuth client ID" page.
                <ul className="list-disc list-inside pl-6 mt-2 space-y-1 text-sm">
                    <li>For <strong className="font-semibold">"Application type"</strong>, select <strong className="font-semibold">"Web application"</strong>.</li>
                    <li>Give it a name, e.g., "Pega LSA Assistant".</li>
                    <li>Under <strong className="font-semibold">"Authorized JavaScript origins"</strong>, click <strong className="font-semibold">"+ ADD URI"</strong> and enter the URL where this application is hosted. For local development, this is often `http://localhost:3000` or the specific port you are using. For a deployed app, it's the `https://...` URL.</li>
                    <li>You can leave <strong className="font-semibold">"Authorized redirect URIs"</strong> empty for the Google Identity Services library.</li>
                </ul>
            </li>
            <li>
              Click <strong className="font-semibold">"Create"</strong>.
            </li>
            <li>
              A dialog will appear showing your <strong className="font-semibold">"Your Client ID"</strong>. Copy this value.
            </li>
            <li>
              Return to the login screen of this application and paste the copied Client ID into the input field.
            </li>
          </ol>
           <div className="mt-6 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded-md text-sm">
            <p className="font-semibold">Important:</p>
            <p>If you are using this app on a different URL (e.g., after deploying it), you must add that new URL to the "Authorized JavaScript origins" list in your Google Cloud Console credentials settings for Google Sign-In to work.</p>
          </div>
        </div>

        <div className="mt-8 text-right">
          <button
            onClick={onClose}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
      <style>
        {`
          @keyframes modalShow {
            0% { transform: scale(0.95); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-modalShow {
            animation: modalShow 0.3s forwards;
          }
        `}
      </style>
    </div>
  );
};

export default GoogleClientIdHelpModal;