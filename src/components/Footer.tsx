
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-gray-300 p-6 mt-12 text-center">
      <div className="container mx-auto">
        <p>Created by Shailendra Sankhala.</p>
        <p className="mt-1">&copy; {new Date().getFullYear()} Pega LSA Assistant - Code Analyser. Powered by Gemini.</p>
        <p className="text-sm text-gray-500 mt-2">
          This tool provides suggestions based on AI analysis and should be used as a supplementary review aid. Always apply professional judgment.
        </p>
      </div>
    </footer>
  );
};

export default Footer;