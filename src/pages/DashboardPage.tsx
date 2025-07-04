import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { CustomStandard, LlmProvider, SeverityLevel, ImportPreview } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useCustomStandards } from '../hooks/useCustomStandards';
import { GEMINI_ANALYSIS_MODEL_NAME } from '../constants';
import CustomStandardsModal from '../components/CustomStandardsModal';
import AddStandardModal from '../components/AddStandardModal';
import ToggleSwitch from '../components/ToggleSwitch';
import ImportPreviewModal from '../components/ImportPreviewModal';
import { useMongoDb } from '../contexts/MongoDbContext';
import { MongoDbHelpModal } from '../components/MongoDbHelpModal';

const RULES_PER_PAGE = 10;

const severityOrder: Record<SeverityLevel, number> = {
    [SeverityLevel.CRITICAL]: 4,
    [SeverityLevel.MAJOR]: 3,
    [SeverityLevel.MINOR]: 2,
    [SeverityLevel.INFO]: 1,
    [SeverityLevel.UNKNOWN]: 0,
};

const SortIcon: React.FC<{ direction?: 'ascending' | 'descending' }> = ({ direction }) => {
    if (!direction) {
        return <svg className="w-4 h-4 inline-block ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    }
    if (direction === 'ascending') {
        return <svg className="w-4 h-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg className="w-4 h-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
};

const BackendSyncCard: React.FC = () => {
    const { 
        connect, 
        disconnect, 
        isConnected, 
        isConnecting, 
        apiEndpoint, 
        connectionError 
    } = useMongoDb();
    
    const [endpointInput, setEndpointInput] = useState('');
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    const handleConnect = () => {
        if (endpointInput.trim()) {
            connect(endpointInput.trim());
        }
    };
    
    const handleDisconnect = () => {
      setEndpointInput('');
      disconnect();
    };

    const getStatusIndicator = () => {
        if (isConnecting) {
            return <div className="text-sm text-yellow-600 flex items-center"><svg className="animate-spin h-4 w-4 mr-2 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Connecting...</div>;
        }
        if (connectionError) {
            return <div className="text-sm text-red-600 font-semibold">Error: {connectionError}</div>;
        }
        if (isConnected) {
            return <div className="text-sm text-green-600 font-semibold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>Connected</div>;
        }
        return <div className="text-sm text-gray-500">Not Connected</div>;
    };

    return (
        <>
        <div className="bg-slate-50 p-6 rounded-xl shadow-lg border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-gray-700">Backend Sync</h3>
                <p className="text-sm text-gray-600 mt-1">Optionally, sync standards with a secure backend API.</p>
              </div>
              {getStatusIndicator()}
            </div>

            <div className="mt-4 space-y-3">
                {isConnected ? (
                    <div>
                        <p className="text-sm text-gray-700">Standards are being synced with your backend. All changes are saved remotely.</p>
                        <p className="text-xs text-gray-500 break-all mt-1">API Endpoint: {apiEndpoint}</p>
                        <button 
                            onClick={handleDisconnect}
                            className="mt-3 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={endpointInput}
                                onChange={(e) => setEndpointInput(e.target.value)}
                                placeholder="Paste Backend API Endpoint URL here"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500"
                                disabled={isConnecting}
                            />
                             <button 
                                onClick={() => setIsHelpModalOpen(true)} 
                                className="text-sky-600 hover:text-sky-800 flex-shrink-0"
                                title="How to set up a backend API">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12V8.25Z" /></svg>
                              </button>
                        </div>
                        <button
                            onClick={handleConnect}
                            disabled={isConnecting || !endpointInput.trim()}
                            className="mt-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {isConnecting ? 'Connecting...' : 'Connect'}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">If not connected, standards are saved to your browser's local storage.</p>
                    </div>
                )}
            </div>
        </div>
        <MongoDbHelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
        </>
    );
};


const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
      standards, 
      addStandard, 
      addMultipleStandards, 
      updateStandard, 
      deleteStandard, 
      toggleStandardIsEnabled,
      syncStandards,
      isLoading: standardsLoading,
      error: standardsError,
  } = useCustomStandards(currentUser?.id || null);

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [standardToEdit, setStandardToEdit] = useState<CustomStandard | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof CustomStandard; direction: 'ascending' | 'descending' }>({ key: 'id', direction: 'ascending' });
  
  const handleOpenManageModal = () => {
    setStandardToEdit(null);
    setIsManageModalOpen(true);
  };

  const handleOpenModalForEdit = (standard: CustomStandard) => {
    setStandardToEdit(standard);
    setIsManageModalOpen(true);
  };
  
  const handleCloseManageModal = () => {
    setIsManageModalOpen(false);
    setStandardToEdit(null);
  };

  const handleDelete = (id: string) => {
      if (window.confirm('Are you sure you want to delete this standard?')) {
          deleteStandard(id);
      }
  };

  const filteredAndSortedStandards = useMemo(() => {
    let filteredItems = [...standards];

    if (statusFilter !== 'all') {
      const isEnabled = statusFilter === 'enabled';
      filteredItems = filteredItems.filter(s => s.isEnabled === isEnabled);
    }

    if (severityFilter !== 'all') {
      filteredItems = filteredItems.filter(s => s.severity === severityFilter);
    }

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filteredItems = filteredItems.filter(s =>
        s.name.toLowerCase().includes(lowerCaseQuery) ||
        s.description.toLowerCase().includes(lowerCaseQuery) ||
        s.id.toLowerCase().includes(lowerCaseQuery)
      );
    }

    if (sortConfig.key) {
      filteredItems.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'severity') {
          valA = severityOrder[a.severity];
          valB = severityOrder[b.severity];
        } else {
          valA = a[sortConfig.key];
          valB = b[sortConfig.key];
        }

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredItems;
  }, [standards, searchQuery, severityFilter, statusFilter, sortConfig]);
  
  const requestSort = (key: keyof CustomStandard) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const totalPages = Math.ceil(filteredAndSortedStandards.length / RULES_PER_PAGE);
  const paginatedStandards = filteredAndSortedStandards.slice(
    (currentPage - 1) * RULES_PER_PAGE,
    currentPage * RULES_PER_PAGE
  );
  
   useEffect(() => {
        if(currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        } else if (totalPages === 0) {
            setCurrentPage(1);
        }
    }, [filteredAndSortedStandards, currentPage, totalPages]);


  return (
    <>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-gray-800">My Dashboard</h2>
        <BackendSyncCard />
        
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
              <h3 className="text-xl font-semibold text-gray-700">Custom Analysis Standards ({standards.length})</h3>
              <div className="flex flex-wrap gap-3">
                  <button onClick={() => setIsAddModalOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md">
                      Add New Standard
                  </button>
                  <button onClick={handleOpenManageModal} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md">
                      Manage All Standards
                  </button>
              </div>
          </div>
          
          {standardsLoading && <p>Loading standards...</p>}
          {standardsError && <p className="text-red-500">Error loading standards: {standardsError}</p>}
          
          {!standardsLoading && !standardsError && (
            <>
              {/* Filter and Search Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input
                      type="text"
                      placeholder="Search by name, description, or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  />
                  <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                      <option value="all">All Severities</option>
                      {Object.values(SeverityLevel).filter(s => s !== 'Unknown').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                      <option value="all">All Statuses</option>
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                  </select>
              </div>

              {/* Table of Standards */}
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('id')}>
                                  ID <SortIcon direction={sortConfig.key === 'id' ? sortConfig.direction : undefined} />
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('name')}>
                                  Name <SortIcon direction={sortConfig.key === 'name' ? sortConfig.direction : undefined} />
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('severity')}>
                                  Severity <SortIcon direction={sortConfig.key === 'severity' ? sortConfig.direction : undefined} />
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedStandards.map(standard => (
                              <tr key={standard.id} className={!standard.isEnabled ? 'bg-gray-50' : ''}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{standard.id}</td>
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{standard.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            {
                                                [SeverityLevel.CRITICAL]: 'bg-red-100 text-red-800',
                                                [SeverityLevel.MAJOR]: 'bg-orange-100 text-orange-800',
                                                [SeverityLevel.MINOR]: 'bg-yellow-100 text-yellow-800',
                                                [SeverityLevel.INFO]: 'bg-sky-100 text-sky-800'
                                            }[standard.severity] || 'bg-gray-100 text-gray-800'
                                        }`}>{standard.severity}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap"><ToggleSwitch id={`table-toggle-${standard.id}`} checked={standard.isEnabled} onChange={() => toggleStandardIsEnabled(standard.id)} /></td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <button onClick={() => handleOpenModalForEdit(standard)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                      <button onClick={() => handleDelete(standard.id)} className="text-red-600 hover:text-red-900 ml-4">Delete</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                   {filteredAndSortedStandards.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No standards match the current filters.</p>
                        </div>
                    )}
              </div>

              {/* Pagination */}
               {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                      <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                          Previous
                      </button>
                      <span className="text-sm text-gray-700">
                          Page {currentPage} of {totalPages}
                      </span>
                      <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                          Next
                      </button>
                  </div>
              )}
            </>
          )}

        </div>
      </div>
      
      {/* Modals */}
      <CustomStandardsModal
        isOpen={isManageModalOpen}
        onClose={handleCloseManageModal}
        standards={standards}
        onAdd={addStandard}
        onAddMultiple={addMultipleStandards}
        onUpdate={updateStandard}
        onDelete={deleteStandard}
        onToggle={toggleStandardIsEnabled}
        onSync={syncStandards}
        effectiveApiKey={'placeholder'} // Not used for data management, but required by component
        analysisModelName={GEMINI_ANALYSIS_MODEL_NAME} // Required but only used for doc import
        llmProvider={LlmProvider.GEMINI} // Required but only used for doc import
        isLoggedIn={!!currentUser}
        initialStandardToEdit={standardToEdit}
      />
      
      <AddStandardModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(newStandard) => {
          addStandard(newStandard);
          setIsAddModalOpen(false); // Close modal on successful add
        }}
      />
    </>
  );
};

export default DashboardPage;