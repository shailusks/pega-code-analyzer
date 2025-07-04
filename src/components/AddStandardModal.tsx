import React, { useState } from 'react';
import { CustomStandard, SeverityLevel } from '../types';

interface AddStandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (standard: Omit<CustomStandard, 'id' | 'isEnabled'>) => void;
}

const severityOptions = Object.values(SeverityLevel).filter(s => s !== SeverityLevel.UNKNOWN);

const AddStandardModal: React.FC<AddStandardModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>(SeverityLevel.MAJOR);
  const [formError, setFormError] = useState('');

  if (!isOpen) {
    return null;
  }
  
  const cleanUpAndClose = () => {
    setName('');
    setDescription('');
    setSeverity(SeverityLevel.MAJOR);
    setFormError('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setFormError('Rule Name and Description cannot be empty.');
      return;
    }
    
    onAdd({ name, description, severity });
    // The parent component will close the modal upon successful addition.
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
      onClick={cleanUpAndClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="addStandardModalTitle"
    >
      <div
        className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="addStandardModalTitle" className="text-xl sm:text-2xl font-semibold text-gray-800">
            Add New Standard
          </h2>
          <button onClick={cleanUpAndClose} className="text-gray-500 hover:text-gray-700 focus:outline-none" aria-label="Close Add Standard Modal">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="add-standardName" className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
            <input
              id="add-standardName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Avoid Property-Set in Activities"
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label htmlFor="add-standardDescription" className="block text-sm font-medium text-gray-700 mb-1">Description / Instruction for AI</label>
            <textarea
              id="add-standardDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the rule and what the AI should look for..."
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-y"
            />
          </div>
          <div>
            <label htmlFor="add-standardSeverity" className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              id="add-standardSeverity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              {severityOptions.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          
          <div className="mt-8 pt-4 border-t flex justify-end items-center gap-4">
            <button
              type="button"
              onClick={cleanUpAndClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"
            >
              Add Standard
            </button>
          </div>
        </form>
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

export default AddStandardModal;