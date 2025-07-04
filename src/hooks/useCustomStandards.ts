import { useState, useEffect, useCallback } from 'react';
import { CustomStandard, SeverityLevel } from '../types';
import { useMongoDb } from '../contexts/MongoDbContext';
import { getStandardsFromDb, saveStandardsToDb } from '../services/mongoDbService';

const ID_PREFIX = 'STDN-';
const GUEST_STORAGE_KEY = 'pegaLsaAssistant_customStandards_guest';


export const useCustomStandards = (userId: string | null) => {
  const { isConnected, apiEndpoint, isConnecting: isDbConnecting } = useMongoDb();
  
  const [standards, setStandards] = useState<CustomStandard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const getLocalStorageKey = useCallback(() => {
    return userId ? `pegaLsaAssistant_customStandards_${userId}` : GUEST_STORAGE_KEY;
  }, [userId]);


  // Effect to load standards from the correct source (DB or localStorage)
  useEffect(() => {
    const loadStandards = async () => {
      setIsLoading(true);
      setError(null);
      
      // Don't load anything while the DB is in the process of connecting. Wait for a final state.
      if (isDbConnecting) {
        return;
      }

      if (userId && isConnected && apiEndpoint) {
        // --- Load from mock backend API ---
        try {
          const dbStandards = await getStandardsFromDb(apiEndpoint, userId);
          setStandards(dbStandards);
        } catch (e: any)          {
          console.error("Failed to load standards from mock API", e);
          setError(e.message || "An error occurred while fetching standards from the backend.");
          setStandards([]);
        }
      } else {
        // --- Load from localStorage for logged-in user (not using DB) or guest ---
        try {
          const storageKey = getLocalStorageKey();
          const storedStandards = window.localStorage.getItem(storageKey);
          if (storedStandards) {
            const parsedStandards = JSON.parse(storedStandards) as CustomStandard[];
             // Simple migration for old ID formats
            const needsMigration = parsedStandards.some(s => !s.id.startsWith(ID_PREFIX));
            if (needsMigration) {
                let idCounter = 0;
                setStandards(parsedStandards.map(s => ({ ...s, id: `${ID_PREFIX}${++idCounter}` })));
            } else {
                setStandards(parsedStandards);
            }
          } else {
            setStandards([]);
          }
        } catch (err) {
          console.error("Error reading custom standards from localStorage", err);
          setError("Failed to load standards from local browser storage.");
          setStandards([]);
        }
      }
      setIsLoading(false);
    };

    loadStandards();
  }, [userId, isConnected, apiEndpoint, isDbConnecting, getLocalStorageKey]);

  // Effect to save standards to the correct source
  useEffect(() => {
    // Do not save if still loading to prevent overwriting loaded data with an empty initial array
    if (isLoading) return;
    
    // Debounce wrapper
    const handler = setTimeout(() => {
      if (userId && isConnected && apiEndpoint) {
        // --- Save to mock backend API ---
        saveStandardsToDb(apiEndpoint, userId, standards).catch(e => {
            console.error("Failed to save standards to mock API", e);
            // Optionally set an error state here to notify the user
        });
      } else {
        // --- Save to localStorage ---
        try {
          const storageKey = getLocalStorageKey();
          window.localStorage.setItem(storageKey, JSON.stringify(standards));
        } catch (error) {
          console.error("Error saving custom standards to localStorage", error);
        }
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(handler);

  }, [standards, userId, isConnected, apiEndpoint, isLoading, getLocalStorageKey]);


  const getNextId = useCallback((currentStandards: CustomStandard[]) => {
    const maxId = currentStandards.reduce((max, s) => {
        const currentIdNum = parseInt(s.id.replace(ID_PREFIX, ''), 10);
        return isNaN(currentIdNum) ? max : Math.max(max, currentIdNum);
    }, 0);
    return `${ID_PREFIX}${maxId + 1}`;
  }, []);

  const addStandard = useCallback((standard: Omit<CustomStandard, 'id' | 'isEnabled'>) => {
    setStandards(prevStandards => {
      const newStandard: CustomStandard = {
        ...standard,
        id: getNextId(prevStandards),
        isEnabled: true,
      };
      return [...prevStandards, newStandard];
    });
  }, [getNextId]);
  
  const addMultipleStandards = useCallback((newStandards: Omit<CustomStandard, 'id' | 'isEnabled'>[]) => {
    setStandards(prevStandards => {
        let maxId = prevStandards.reduce((max, s) => {
            const currentIdNum = parseInt(s.id.replace(ID_PREFIX, ''), 10);
            return isNaN(currentIdNum) ? max : Math.max(max, currentIdNum);
        }, 0);

        const standardsToAdd: CustomStandard[] = newStandards.map(standard => {
            maxId++;
            return {
                ...standard,
                id: `${ID_PREFIX}${maxId}`,
                isEnabled: true,
            };
        });
        return [...prevStandards, ...standardsToAdd];
    });
  }, []);

  const syncStandards = useCallback((standardsFromFile: { id?: string; name: string; description: string; severity: SeverityLevel }[]) => {
      setStandards(prevStandards => {
          const existingIsEnabledMap = new Map(prevStandards.map(s => [s.id, s.isEnabled]));
          
          const maxExistingId = prevStandards.reduce((max, s) => {
              const currentIdNum = parseInt(s.id.replace(ID_PREFIX, ''), 10);
              return isNaN(currentIdNum) ? max : Math.max(max, currentIdNum);
          }, 0);
          
          let maxIdInFile = 0;
          const fileIds = new Set<string>();
          for (const item of standardsFromFile) {
              if (item.id && item.id.startsWith(ID_PREFIX)) {
                  fileIds.add(item.id);
                  const currentIdNum = parseInt(item.id.replace(ID_PREFIX, ''), 10);
                  if (!isNaN(currentIdNum)) {
                      maxIdInFile = Math.max(maxIdInFile, currentIdNum);
                  }
              }
          }

          let nextIdCounter = Math.max(maxExistingId, maxIdInFile);

          const finalStandardsList = standardsFromFile.map(item => {
              let id = item.id;
              
              if (!id || !id.startsWith(ID_PREFIX)) {
                  nextIdCounter++;
                  id = `${ID_PREFIX}${nextIdCounter}`;
              }

              return {
                  id,
                  name: item.name,
                  description: item.description,
                  severity: item.severity,
                  isEnabled: existingIsEnabledMap.get(id) ?? true,
              };
          });

          return finalStandardsList;
      });
  }, []);

  const updateStandard = useCallback((updatedStandard: CustomStandard) => {
    setStandards(prevStandards =>
      prevStandards.map(s => (s.id === updatedStandard.id ? updatedStandard : s))
    );
  }, []);

  const deleteStandard = useCallback((standardId: string) => {
    setStandards(prevStandards => prevStandards.filter(s => s.id !== standardId));
  }, []);

  const toggleStandardIsEnabled = useCallback((standardId: string) => {
    setStandards(prevStandards =>
      prevStandards.map(s =>
        s.id === standardId ? { ...s, isEnabled: !s.isEnabled } : s
      )
    );
  }, []);

  return {
    standards,
    addStandard,
    addMultipleStandards,
    updateStandard,
    deleteStandard,
    toggleStandardIsEnabled,
    syncStandards,
    isLoading,
    error
  };
};