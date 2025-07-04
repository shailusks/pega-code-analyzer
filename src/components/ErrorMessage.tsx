
import React from 'react';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-6 rounded-md shadow" role="alert">
      <div className="flex">
        <div className="py-1">
          <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM11.414 10l2.829-2.828a1 1 0 1 0-1.414-1.414L10 8.586 7.172 5.757a1 1 0 0 0-1.414 1.414L8.586 10l-2.828 2.828a1 1 0 1 0 1.414 1.414L10 11.414l2.828 2.829a1 1 0 0 0 1.414-1.414L11.414 10z"/></svg>
        </div>
        <div>
          <p className="font-bold">Analysis Error</p>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;