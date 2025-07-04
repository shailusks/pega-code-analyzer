import { CustomStandard } from "../types";

// --- Mock Backend API Service ---
// In a real-world application, these functions would make `fetch` calls to a secure backend API.
// The backend would then use the official MongoDB driver to interact with the database.
// For this simulation, we use localStorage to mock the database persistence per-user, per-API-endpoint.

const MOCK_DB_PREFIX = 'pegaLsaAssistant_mockApi_';

/**
 * Simulates hashing the API endpoint to create a unique key for localStorage.
 */
const getStorageKeyForEndpoint = (apiEndpoint: string, userId: string): string => {
    // Simple hash function for demonstration.
    const hash = apiEndpoint.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) & 0xFFFFFFFF, 0).toString(16);
    return `${MOCK_DB_PREFIX}${userId}_${hash}`;
}

/**
 * Simulates a backend health check endpoint.
 * @param endpoint - The backend API endpoint URL.
 * @returns A promise that resolves to a success or failure object.
 */
export const verifyConnection = async (endpoint: string): Promise<{ success: boolean; message: string }> => {
    return new Promise(resolve => {
        setTimeout(() => {
            try {
                const url = new URL(endpoint);
                if (url.protocol === 'http:' || url.protocol === 'https:') {
                    resolve({ success: true, message: 'Connection to backend endpoint established.' });
                } else {
                    resolve({ success: false, message: 'Invalid URL protocol. Must be http or https.' });
                }
            } catch (e) {
                resolve({ success: false, message: 'Invalid URL format for API endpoint.' });
            }
        }, 1000); // Simulate network delay
    });
};

/**
 * Simulates fetching custom standards for a user from a backend API.
 * @param apiEndpoint - The backend API endpoint URL.
 * @param userId - The ID of the current user.
 * @returns A promise that resolves to an array of CustomStandard.
 */
export const getStandardsFromDb = async (apiEndpoint: string, userId: string): Promise<CustomStandard[]> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const dbKey = getStorageKeyForEndpoint(apiEndpoint, userId);
                const storedData = localStorage.getItem(dbKey);
                if (storedData) {
                    resolve(JSON.parse(storedData));
                } else {
                    resolve([]); // No data yet for this user on this backend
                }
            } catch (error) {
                console.error('Mock API Get Error:', error);
                reject(new Error('Failed to retrieve data from the mock backend.'));
            }
        }, 500); // Simulate network delay
    });
};

/**
 * Simulates saving custom standards for a user via a backend API.
 * @param apiEndpoint - The backend API endpoint URL.
 * @param userId - The ID of the current user.
 * @param standards - The array of standards to save.
 * @returns A promise that resolves to a success object.
 */
export const saveStandardsToDb = async (apiEndpoint: string, userId: string, standards: CustomStandard[]): Promise<{ success: boolean }> => {
     return new Promise((resolve, reject) => {
        try {
            const dbKey = getStorageKeyForEndpoint(apiEndpoint, userId);
            localStorage.setItem(dbKey, JSON.stringify(standards));
            resolve({ success: true });
        } catch (error) {
            console.error('Mock API Save Error:', error);
            reject(new Error('Failed to save data to the mock backend.'));
        }
    });
};