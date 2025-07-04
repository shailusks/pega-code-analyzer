import React, { useState, useEffect, useMemo } from 'react';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { CustomStandard, SeverityLevel, ExtractedRule, isPegaAnalysisError, LlmProvider, ImportPreview } from '../types';
import { extractStandardsFromTextGemini } from '../services/geminiService';
import ToggleSwitch from './ToggleSwitch';
import ImportPreviewModal from './ImportPreviewModal';

interface CustomStandardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  standards: CustomStandard[];
  onAdd: (standard: Omit<CustomStandard, 'id' | 'isEnabled'>) => void;
  onAddMultiple: (standards: Omit<CustomStandard, 'id' | 'isEnabled'>[]) => void;
  onUpdate: (standard: CustomStandard) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onSync: (standardsFromFile: { id?: string; name: string; description: string; severity: SeverityLevel }[]) => void;
  effectiveApiKey: string;
  analysisModelName: string;
  llmProvider: LlmProvider;
  isLoggedIn: boolean;
  initialStandardToEdit?: CustomStandard | null;
}

const severityOptions = Object.values(SeverityLevel).filter(s => s !== SeverityLevel.UNKNOWN);
const generateTempUUID = () => `temp-${crypto.randomUUID()}`;
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


const CustomStandardsModal: React.FC<CustomStandardsModalProps> = ({
  isOpen,
  onClose,
  standards,
  onAdd,
  onAddMultiple,
  onUpdate,
  onDelete,
  onToggle,
  onSync,
  effectiveApiKey,
  analysisModelName,
  llmProvider,
  isLoggedIn,
  initialStandardToEdit,
}) => {
  const [editingStandard, setEditingStandard] = useState<CustomStandard | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>(SeverityLevel.MAJOR);
  const [formError, setFormError] = useState('');
  
  // File import states
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState<boolean>(false);
  const [docImportError, setDocImportError] = useState<string>('');
  const [excelImportError, setExcelImportError] = useState<string>('');
  const [extractedRules, setExtractedRules] = useState<ExtractedRule[]>([]);
  
  // View and preview states
  const [view, setView] = useState<'main' | 'review'>('main');
  const [isImportPreviewModalOpen, setIsImportPreviewModalOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<ImportPreview | null>(null);

  // State for guest table
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof CustomStandard; direction: 'ascending' | 'descending' }>({ key: 'id', direction: 'ascending' });

  const isEditOnlyMode = !!initialStandardToEdit;

  const cleanUpState = () => {
    setName('');
    setDescription('');
    setSeverity(SeverityLevel.MAJOR);
    setEditingStandard(null);
    setFormError('');
    setWordFile(null);
    setDocImportError('');
    setExcelImportError('');
    setIsAnalyzingDoc(false);
    setExtractedRules([]);
    setView('main');
    setIsImportPreviewModalOpen(false);
    setImportPreviewData(null);
    setCurrentPage(1);
    setSortConfig({ key: 'id', direction: 'ascending' });
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSeverity(SeverityLevel.MAJOR);
    setEditingStandard(null);
    setFormError('');
  };
  
  const handleModalClose = () => {
      cleanUpState();
      onClose();
  };

  useEffect(() => {
    if (isOpen) {
        if (initialStandardToEdit) {
            setEditingStandard(initialStandardToEdit);
        } else {
            cleanUpState();
        }
    } else {
        cleanUpState();
    }
  }, [isOpen, initialStandardToEdit]);
  
  useEffect(() => {
    if (editingStandard) {
        setName(editingStandard.name);
        setDescription(editingStandard.description);
        setSeverity(editingStandard.severity);
        // Scroll form into view on smaller screens when an item is selected for editing
        document.getElementById('standard-form')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [editingStandard]);

  const sortedStandards = useMemo(() => {
    let sortedItems = [...standards];
    if (sortConfig.key) {
      sortedItems.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'severity') {
          valA = severityOrder[a.severity];
          valB = severityOrder[b.severity];
        } else {
          valA = a[sortConfig.key];
          valB = b[sortConfig.key];
        }

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortedItems;
  }, [standards, sortConfig]);

  const totalPages = Math.ceil(sortedStandards.length / RULES_PER_PAGE);
  const paginatedStandards = sortedStandards.slice(
    (currentPage - 1) * RULES_PER_PAGE,
    currentPage * RULES_PER_PAGE
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage === 0 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [standards, currentPage, totalPages]);


  const requestSort = (key: keyof CustomStandard) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };


  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setFormError('Rule Name and Description cannot be empty.');
      return;
    }
    
    if (editingStandard) {
      onUpdate({ ...editingStandard, name, description, severity });
    } else {
      onAdd({ name, description, severity });
    }

    if (isEditOnlyMode) {
      handleModalClose();
    } else {
      resetForm();
    }
  };

  const handleCancelEdit = () => {
    if (isEditOnlyMode) {
        handleModalClose();
    } else {
        resetForm();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this standard?')) {
        onDelete(id);
    }
  };
  
  const handleExport = () => {
    const dataToExport = standards.map(s => ({
        ID: s.id,
        Name: s.name,
        Description: s.description,
        Severity: s.severity,
        IsEnabled: s.isEnabled,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CustomStandards');
    XLSX.writeFile(workbook, 'PegaLSA_CustomStandards.xlsx');
  };
  
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImport(file);
    }
    e.target.value = '';
  };
  
  const handleImport = (file: File) => {
    setExcelImportError('');

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
                 setImportPreviewData({
                    added: [],
                    updated: [],
                    deleted: [...standards],
                    rawData: [],
                 });
                 setIsImportPreviewModalOpen(true);
                 return;
            }
            
            const headers = (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[] || []).map(h => h.trim().toLowerCase());
            const requiredHeaders = ['name', 'description', 'severity'];

            for (const header of requiredHeaders) {
                if (!headers.includes(header)) {
                    throw new Error(`Missing required column: "${header}". Please check the file format (expected columns: ID, Name, Description, Severity, IsEnabled).`);
                }
            }

            const parsedStandardsFromFile: { id?: string; name: string; description: string; severity: SeverityLevel }[] = [];
            const validSeverities = new Set(Object.values(SeverityLevel));
            const findKeyCaseInsensitive = (obj: object, key: string) => Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());

            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                const nameKey = findKeyCaseInsensitive(row, 'name');
                const descriptionKey = findKeyCaseInsensitive(row, 'description');
                const severityKey = findKeyCaseInsensitive(row, 'severity');
                const idKey = findKeyCaseInsensitive(row, 'id');

                const standardName = nameKey ? row[nameKey]?.trim() : undefined;
                const standardDesc = descriptionKey ? row[descriptionKey]?.trim() : undefined;
                const standardSeverity = severityKey ? (row[severityKey]?.trim() as SeverityLevel) : undefined;
                const standardId = idKey ? row[idKey]?.toString().trim() : undefined;

                if (!standardName || !standardDesc) {
                    throw new Error(`Row ${i + 2}: 'Name' and 'Description' columns cannot be empty.`);
                }
                if (!standardSeverity || !validSeverities.has(standardSeverity)) {
                    throw new Error(`Row ${i + 2}: Invalid or missing 'Severity'. Must be one of: ${Object.values(SeverityLevel).filter(s => s !== 'Unknown').join(', ')}.`);
                }
                parsedStandardsFromFile.push({ id: standardId, name: standardName, description: standardDesc, severity: standardSeverity });
            }
            
            const existingStandardsMap = new Map(standards.map(s => [s.id, s]));
            const fileIds = new Set(parsedStandardsFromFile.map(s => s.id).filter(id => id));
            const added: ImportPreview['added'] = [];
            const updated: ImportPreview['updated'] = [];
            const deleted: ImportPreview['deleted'] = [];

            for (const newStandard of parsedStandardsFromFile) {
                if (newStandard.id && existingStandardsMap.has(newStandard.id)) {
                    const oldStandard = existingStandardsMap.get(newStandard.id)!;
                    if (oldStandard.name !== newStandard.name || oldStandard.description !== newStandard.description || oldStandard.severity !== newStandard.severity) {
                        updated.push({ old: oldStandard, new: { name: newStandard.name, description: newStandard.description, severity: newStandard.severity } });
                    }
                } else {
                    added.push({ name: newStandard.name, description: newStandard.description, severity: newStandard.severity });
                }
            }
            
            for (const oldStandard of standards) {
                if (!fileIds.has(oldStandard.id)) {
                    deleted.push(oldStandard);
                }
            }

            setImportPreviewData({ added, updated, deleted, rawData: parsedStandardsFromFile });
            setIsImportPreviewModalOpen(true);

        } catch (err: any) {
            console.error("Error processing Excel file:", err);
            setExcelImportError(`Failed to process file. Error: ${err.message || 'Unknown error'}`);
        }
    };
    reader.onerror = () => {
        setExcelImportError("Failed to read the file.");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    if (importPreviewData) {
        onSync(importPreviewData.rawData);
    }
    setIsImportPreviewModalOpen(false);
    setImportPreviewData(null);
  };

  const handleWordFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocImportError('');
    const file = e.target.files?.[0];
    if (file) {
      setWordFile(file);
    }
  };

  const handleAnalyzeDoc = async () => {
      if (!wordFile) {
          setDocImportError("Please select a .docx file to analyze.");
          return;
      }
      if (llmProvider !== LlmProvider.GEMINI) {
          setDocImportError("This feature is currently only supported for the Google Gemini provider.");
          return;
      }
      if (!effectiveApiKey) {
          setDocImportError("API Key is not set. Please configure it before analyzing a document.");
          return;
      }

      setIsAnalyzingDoc(true);
      setDocImportError('');

      try {
          const arrayBuffer = await wordFile.arrayBuffer();
          const { value: text } = await mammoth.extractRawText({ arrayBuffer });
          
          const result = await extractStandardsFromTextGemini(text, effectiveApiKey, analysisModelName);

          if (isPegaAnalysisError(result)) {
              setDocImportError(`AI analysis failed: ${result.error}`);
              return;
          }

          if (result.length === 0) {
              setDocImportError("The AI could not extract any distinct rules from the document. The document might be empty or not contain recognizable standards.");
              return;
          }

          setExtractedRules(result.map(rule => ({ ...rule, tempId: generateTempUUID(), severity: SeverityLevel.MAJOR })));
          setView('review');

      } catch (err: any) {
          console.error("Error processing Word file:", err);
          setDocImportError(`Failed to process file. Error: ${err.message || 'Unknown error'}`);
      } finally {
          setIsAnalyzingDoc(false);
      }
  };

  const handleUpdateExtractedRule = (tempId: string, field: keyof ExtractedRule, value: string) => {
      setExtractedRules(prev => prev.map(rule => rule.tempId === tempId ? { ...rule, [field]: value } : rule));
  };

  const handleRemoveExtractedRule = (tempId: string) => {
      setExtractedRules(prev => prev.filter(rule => rule.tempId !== tempId));
  };
  
  const handleAddAllExtractedRules = () => {
      const newStandards = extractedRules.map(({ tempId, ...rest }) => rest);
      onAddMultiple(newStandards);
      handleModalClose();
  };

  const renderFullView = () => (
    <>
        {view === 'main' && (
             <div className="flex justify-between items-center mb-6">
                <h2 id="customStandardsModalTitle" className="text-xl sm:text-2xl font-semibold text-gray-800">
                    Manage Custom Standards
                </h2>
                <button onClick={handleModalClose} className="text-gray-500 hover:text-gray-700 focus:outline-none" aria-label="Close Custom Standards Modal">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
            </div>
        )}

        {!isLoggedIn && view === 'main' && (
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700 rounded-md text-sm">
                <p><strong className="font-semibold">Note:</strong> You are not logged in. These standards will only be saved for your current session and will be lost when you close this tab.</p>
            </div>
        )}
       
        {view === 'main' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* --- LEFT COLUMN: ADD/EDIT FORM --- */}
              <div id="standard-form" className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">{editingStandard ? 'Edit Standard' : 'Add New Standard'}</h3>
                  <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                      <div>
                          <label htmlFor="standardName" className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                          <input id="standardName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Avoid Property-Set in Activities"
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"/>
                      </div>
                      <div>
                          <label htmlFor="standardDescription" className="block text-sm font-medium text-gray-700 mb-1">Description / Instruction for AI</label>
                          <textarea id="standardDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the rule and what the AI should look for..."
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-y"/>
                      </div>
                      <div>
                          <label htmlFor="standardSeverity" className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                          <select id="standardSeverity" value={severity} onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
                              {severityOptions.map(level => <option key={level} value={level}>{level}</option>)}
                          </select>
                      </div>
                      {formError && <p className="text-sm text-red-600">{formError}</p>}
                      <div className="flex items-center gap-4">
                          <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50">
                              {editingStandard ? 'Update Standard' : 'Add Standard'}
                          </button>
                          {editingStandard && (
                              <button type="button" onClick={() => resetForm()} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400">
                                  Cancel Edit
                              </button>
                          )}
                      </div>
                  </form>
              </div>
              
              {/* --- RIGHT COLUMN: DATA MANAGEMENT --- */}
              <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Data Management & Import</h3>
                  <div className="p-4 bg-gray-50 rounded-lg border space-y-4 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-gray-700">Export to Excel</h4>
                                <p className="text-sm text-gray-600 mt-1 mb-2">Save all current standards to an .xlsx file.</p>
                                <button onClick={handleExport} disabled={standards.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow text-sm disabled:opacity-50">
                                    Export All
                                </button>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold text-gray-700">Import from Excel</h4>
                                <p className="text-sm text-gray-600 mt-1 mb-2">Replace standards with content from an .xlsx file.</p>
                                <input type="file" id="excel-import-input" className="hidden" accept=".xlsx, .xls" onChange={handleExcelFileChange} />
                                <button onClick={() => document.getElementById('excel-import-input')?.click()} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow text-sm">
                                    Import & Sync
                                </button>
                                {excelImportError && <p className="text-sm text-red-600 mt-2">{excelImportError}</p>}
                            </div>
                        </div>

                      <div className="pt-4 border-t">
                          <h4 className="font-semibold text-gray-700">Import from Word Document</h4>
                          <div className="text-sm text-gray-600 mt-1">
                              <p>Upload a .docx file with standards in plain text. The AI will extract them. (Gemini provider & API key required).</p>
                          </div>
                          <div className="mt-2">
                              <input id="wordFileInput" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleWordFileChange}
                                  className="block w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"/>
                          </div>
                          <button onClick={handleAnalyzeDoc} disabled={!wordFile || isAnalyzingDoc || !effectiveApiKey}
                              className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center">
                              {isAnalyzingDoc ? 'Analyzing...' : 'Analyze & Extract from Word'}
                          </button>
                          {docImportError && <p className="text-sm text-red-600 mt-2">{docImportError}</p>}
                      </div>
                  </div>
              </div>
            </div>

            {!isLoggedIn && (
                <div className="mt-8 pt-6 border-t">
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Your Current Session Standards ({standards.length})</h3>
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
                                        <td className="px-6 py-4 whitespace-nowrap"><ToggleSwitch id={`modal-toggle-${standard.id}`} checked={standard.isEnabled} onChange={() => onToggle(standard.id)} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => setEditingStandard(standard)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                            <button onClick={() => handleDelete(standard.id)} className="text-red-600 hover:text-red-900 ml-4">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {sortedStandards.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No custom standards defined for this session.</p>
                                </div>
                            )}
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            > Previous </button>
                            <span className="text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            > Next </button>
                        </div>
                    )}
                </div>
            )}
          </>
        ) : (
          // --- REVIEW VIEW ---
          <div>
              <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Review Extracted Standards</h3>
              <p className="text-sm text-gray-600 mb-4">Review the rules extracted by the AI. You can edit them, set their severity, and remove any that are incorrect.</p>
              <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2 -mr-2">
                  {extractedRules.map((rule, index) => (
                      <div key={rule.tempId} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex justify-between items-center mb-2">
                              <label htmlFor={`name-${rule.tempId}`} className="font-semibold text-gray-700">Rule #{index + 1}</label>
                              <button onClick={() => handleRemoveExtractedRule(rule.tempId)} className="text-xs font-medium text-red-500 hover:text-red-700">Remove</button>
                          </div>
                          <div className="space-y-3">
                              <div>
                                  <label htmlFor={`name-${rule.tempId}`} className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                                  <input id={`name-${rule.tempId}`} type="text" value={rule.name} onChange={e => handleUpdateExtractedRule(rule.tempId, 'name', e.target.value)}
                                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500" />
                              </div>
                              <div>
                                  <label htmlFor={`desc-${rule.tempId}`} className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                                  <textarea id={`desc-${rule.tempId}`} value={rule.description} onChange={e => handleUpdateExtractedRule(rule.tempId, 'description', e.target.value)}
                                      rows={3} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500 resize-y" />
                              </div>
                              <div>
                                  <label htmlFor={`sev-${rule.tempId}`} className="block text-sm font-medium text-gray-600 mb-1">Severity</label>
                                  <select id={`sev-${rule.tempId}`} value={rule.severity} onChange={e => handleUpdateExtractedRule(rule.tempId, 'severity', e.target.value as SeverityLevel)}
                                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500">
                                      {severityOptions.map(level => <option key={level} value={level}>{level}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
              <div className="mt-6 pt-4 border-t flex justify-end items-center gap-4">
                  <button onClick={() => setView('main')} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-md">
                      Cancel
                  </button>
                  <button onClick={handleAddAllExtractedRules} disabled={extractedRules.length === 0}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md disabled:opacity-50">
                      Add {extractedRules.length} Rule(s)
                  </button>
              </div>
          </div>
        )}
        
        {view === 'main' && (
            <div className="mt-8 pt-4 border-t text-right">
                <button onClick={handleModalClose} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors">
                    Close
                </button>
            </div>
        )}
    </>
  );

  const renderEditOnlyView = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 id="customStandardsModalTitle" className="text-xl sm:text-2xl font-semibold text-gray-800">
            Edit Standard
        </h2>
        <button onClick={handleModalClose} className="text-gray-500 hover:text-gray-700 focus:outline-none" aria-label="Close Edit Standard Modal">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="standardName-edit" className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
            <input id="standardName-edit" type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"/>
        </div>
        <div>
            <label htmlFor="standardDescription-edit" className="block text-sm font-medium text-gray-700 mb-1">Description / Instruction for AI</label>
            <textarea id="standardDescription-edit" value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-y"/>
        </div>
        <div>
            <label htmlFor="standardSeverity-edit" className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select id="standardSeverity-edit" value={severity} onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
                {severityOptions.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        
        <div className="mt-8 pt-4 border-t flex justify-end items-center gap-4">
            <button type="button" onClick={handleCancelEdit} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-md">
                Cancel
            </button>
            <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50">
                Update Standard
            </button>
        </div>
      </form>
    </>
  );

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
      onClick={handleModalClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customStandardsModalTitle"
    >
        <>
            <div
                className={`bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full ${isEditOnlyMode ? 'max-w-lg' : 'max-w-5xl'} transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow`}
                onClick={(e) => e.stopPropagation()}
            >
                {isEditOnlyMode ? renderEditOnlyView() : renderFullView()}
            </div>
            <ImportPreviewModal
                isOpen={isImportPreviewModalOpen}
                onClose={() => setIsImportPreviewModalOpen(false)}
                onConfirm={handleConfirmImport}
                previewData={importPreviewData}
            />
            <style>
                {`
                @keyframes modalShow {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-modalShow {
                    animation: modalShow 0.3s forwards;
                }
                /* Custom scrollbar for modal content */
                .max-h-[60vh] {
                    max-height: 60vh;
                }
                .max-h-[calc(80vh-150px)] {
                    max-height: calc(80vh - 150px);
                }
                `}
            </style>
        </>
    </div>
  );
};

export default CustomStandardsModal;