import React from 'react';
import { LlmProvider, LLM_PROVIDER_NAMES } from '../types'; // Assuming types are here

interface ApiKeyHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProvider: LlmProvider;
}

const ApiKeyHelpModal: React.FC<ApiKeyHelpModalProps> = ({ isOpen, onClose, selectedProvider }) => {
  if (!isOpen) {
    return null;
  }

  const getTitle = () => {
    switch (selectedProvider) {
      case LlmProvider.GEMINI:
        return "How to get your Google Gemini API Key";
      case LlmProvider.OPENAI:
        return "How to get your OpenAI API Key";
      case LlmProvider.AZURE_OPENAI:
        return "How to get your Azure OpenAI API Key & Endpoint";
      default:
        return "API Key Help";
    }
  };

  const renderGeminiHelp = () => (
    <>
      <p>You can provide your Google Gemini API Key in two ways: by entering it directly into the UI (recommended for quick testing) or by setting an environment variable named <code className="bg-gray-200 p-1 rounded">API_KEY</code> (recommended for better security).</p>
      <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700 rounded-md text-sm">
        <p><strong className="font-semibold">Note:</strong> An API key entered in the UI will always take precedence over an environment variable.</p>
      </div>
      <p className="mt-4">To obtain your API Key:</p>
      <ol className="list-decimal list-inside space-y-2 pl-4">
        <li>
          Go to Google AI Studio: <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 underline font-medium">https://aistudio.google.com/</a>.
        </li>
        <li>Sign in with your Google account.</li>
        <li>
          In the left-hand navigation panel, click on <strong className="font-semibold">"Get API key"</strong>.
        </li>
        <li>
          You might be prompted to create or select a Google Cloud project. Follow the on-screen instructions.
        </li>
        <li>
          Once a project is configured, click <strong className="font-semibold">"Create API key"</strong>.
        </li>
        <li>Your new API key will be displayed. Copy this key.</li>
        <li>
          Return to this application, paste the copied key into the API key input field, and click <strong className="font-semibold">"Set Configuration"</strong>.
        </li>
      </ol>
      
    </>
  );

  const renderOpenAIHelp = () => (
    <>
      <p>Follow these steps to obtain your OpenAI API Key from the OpenAI Platform:</p>
      <ol className="list-decimal list-inside space-y-2 pl-4">
        <li>
          Go to the OpenAI API keys page: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 underline font-medium">https://platform.openai.com/api-keys</a>.
        </li>
        <li>Sign in with your OpenAI account.</li>
        <li>
          Click on the <strong className="font-semibold">"+ Create new secret key"</strong> button.
        </li>
        <li>
          Optionally, give your key a name (e.g., "PegaCodeAnalyzer").
        </li>
        <li>
          Click <strong className="font-semibold">"Create secret key"</strong>.
        </li>
        <li>Your new API key will be displayed. Copy this key immediately, as you won't be able to see it again.</li>
        <li>
          Return to this application, paste the copied key into the API key input field, and click <strong className="font-semibold">"Set Configuration"</strong>.
        </li>
      </ol>
    </>
  );

  const renderAzureOpenAIHelp = () => (
    <>
      <p>Follow these steps to obtain your Azure OpenAI API Key and Endpoint from the Azure Portal:</p>
      <ol className="list-decimal list-inside space-y-2 pl-4">
        <li>
          Navigate to your Azure OpenAI resource in the <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 underline font-medium">Azure Portal</a>.
        </li>
        <li>If you don't have an Azure OpenAI resource, you'll need to create one first. This involves selecting a subscription, resource group, region, and pricing tier.</li>
        <li>
          Once in your Azure OpenAI resource, under <strong className="font-semibold">"Resource Management"</strong> in the left navigation pane, select <strong className="font-semibold">"Keys and Endpoint"</strong>.
        </li>
        <li>
          You will find two keys (KEY 1, KEY 2) and an Endpoint URL. Copy one of the keys and the Endpoint URL.
        </li>
        <li>
          Return to this application. Paste the copied key into the "Azure OpenAI API Key" input field and the Endpoint URL into the "Azure OpenAI Endpoint URL" input field.
        </li>
        <li>
          Click <strong className="font-semibold">"Set Configuration"</strong>.
        </li>
        <li>
          <strong className="font-semibold">Important:</strong> You also need to have a model deployed within your Azure OpenAI resource (e.g., a gpt-3.5-turbo or gpt-4 deployment). The application uses predefined deployment names (see constants file); ensure your deployment names in Azure match these or update the constants accordingly.
        </li>
      </ol>
    </>
  );


  return (
    <div 
        className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apiKeyHelpModalTitle"
    >
      <div 
        className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="apiKeyHelpModalTitle" className="text-xl sm:text-2xl font-semibold text-gray-800">
            {getTitle()}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close API Key Help Modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4 text-gray-700 max-h-[60vh] overflow-y-auto pr-2">
          {selectedProvider === LlmProvider.GEMINI && renderGeminiHelp()}
          {selectedProvider === LlmProvider.OPENAI && renderOpenAIHelp()}
          {selectedProvider === LlmProvider.AZURE_OPENAI && renderAzureOpenAIHelp()}
          
          <div className="mt-6 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded-md">
            <p className="font-semibold">Important Security Notice:</p>
            <p className="text-sm">Treat your API keys and service credentials like passwords. Do not share them publicly or embed them directly in client-side code that might be exposed. For production applications, consider more secure methods of key management (e.g., server-side proxy, secrets managers).</p>
          </div>
        </div>

        <div className="mt-8 text-right">
          <button
            onClick={onClose}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition-colors"
          >
            Close
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

export default ApiKeyHelpModal;