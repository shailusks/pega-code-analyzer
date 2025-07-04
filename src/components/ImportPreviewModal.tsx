import React from 'react';
import { CustomStandard, SeverityLevel, ImportPreview } from '../types';

interface ImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    previewData: ImportPreview | null;
}

const DetailCard: React.FC<{
    title: string;
    count: number;
    colorClass: string;
    children: React.ReactNode;
}> = ({ title, count, colorClass, children }) => {
    if (count === 0) return null;
    return (
        <div>
            <h3 className={`text-lg font-semibold mb-2 p-2 rounded-md ${colorClass}`}>
                {title} ({count})
            </h3>
            <ul className="space-y-3 text-sm max-h-40 overflow-y-auto pr-2">
                {children}
            </ul>
        </div>
    );
};


const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ isOpen, onClose, onConfirm, previewData }) => {
    if (!isOpen || !previewData) {
        return null;
    }
    
    const { added, updated, deleted } = previewData;
    const totalChanges = added.length + updated.length + deleted.length;

    return (
        <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="importPreviewModalTitle"
        >
            <div
                className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-2xl transform transition-all duration-300 ease-in-out"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 id="importPreviewModalTitle" className="text-xl sm:text-2xl font-semibold text-gray-800">
                        Confirm Import Sync
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 focus:outline-none" aria-label="Close Import Preview">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <p className="text-gray-600 mb-6">
                    Review the changes below. Confirming will replace your current standards list with the content from the file. This action cannot be undone.
                </p>

                {totalChanges === 0 ? (
                     <div className="text-center p-6 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-medium text-gray-700">No Changes Detected</h3>
                        <p className="text-gray-500 mt-1">The imported file matches your current standards list. There is nothing to sync.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <DetailCard title="Standards to be Added" count={added.length} colorClass="bg-green-100 text-green-800">
                            {added.map((item, index) => (
                                <li key={index} className="p-2 bg-green-50 rounded">
                                    <strong className="font-semibold block">{item.name}</strong>
                                    <p className="text-gray-600 truncate" title={item.description}>{item.description}</p>
                                </li>
                            ))}
                        </DetailCard>

                        <DetailCard title="Standards to be Updated" count={updated.length} colorClass="bg-blue-100 text-blue-800">
                            {updated.map((item) => (
                                <li key={item.old.id} className="p-2 bg-blue-50 rounded">
                                    <strong className="font-semibold block">{item.old.name} ({item.old.id})</strong>
                                    {item.old.name !== item.new.name && <p><strong>Name:</strong> <span className="text-red-600 line-through">{item.old.name}</span> → <span className="text-green-600">{item.new.name}</span></p>}
                                    {item.old.description !== item.new.description && <p><strong>Desc:</strong> <span className="text-red-600 line-through truncate" title={item.old.description}>{item.old.description}</span> → <span className="text-green-600 truncate" title={item.new.description}>{item.new.description}</span></p>}
                                    {item.old.severity !== item.new.severity && <p><strong>Severity:</strong> <span className="text-red-600">{item.old.severity}</span> → <span className="text-green-600">{item.new.severity}</span></p>}
                                </li>
                            ))}
                        </DetailCard>

                        <DetailCard title="Standards to be Deleted" count={deleted.length} colorClass="bg-red-100 text-red-800">
                           {deleted.map((item) => (
                                <li key={item.id} className="p-2 bg-red-50 rounded">
                                    <strong className="font-semibold block">{item.name} ({item.id})</strong>
                                    <p className="text-gray-600 truncate" title={item.description}>{item.description}</p>
                                </li>
                            ))}
                        </DetailCard>
                    </div>
                )}


                <div className="mt-8 pt-6 border-t flex justify-end items-center gap-4">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg shadow-md">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={totalChanges === 0}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirm Sync
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportPreviewModal;