import React from 'react';

interface MongoDbHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CodeBlock: React.FC<{ children: string }> = ({ children }) => (
    <pre className="bg-gray-900 text-white p-4 rounded-md text-xs overflow-x-auto">
        <code>{children}</code>
    </pre>
);

export const MongoDbHelpModal: React.FC<MongoDbHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }
  
  const nodeJsExample = `
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const app = express();
const port = 3001; // Or any port you prefer

// --- Configuration ---
// IMPORTANT: Store your connection string in environment variables, not in code!
// Example: mongodb+srv://<user>:<password>@cluster.mongodb.net/
const MONGO_URI = process.env.MONGO_CONNECTION_STRING; 
if (!MONGO_URI) {
    console.error("MONGO_CONNECTION_STRING environment variable not set.");
    process.exit(1);
}

const DB_NAME = 'pegaLsaStandards';
const COLLECTION_NAME = 'customStandards';

let db;

// --- Database Connection ---
async function connectToDb() {
    if (db) return db;
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Successfully connected to MongoDB');
    return db;
}

// --- Middleware ---
app.use(cors()); // Allow requests from your frontend application
app.use(express.json()); // To parse JSON request bodies

// --- API Endpoints ---

// A simple health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

// GET standards for a specific user
app.get('/api/standards/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const database = await connectToDb();
        const userStandardsDoc = await database.collection(COLLECTION_NAME).findOne({ userId });
        
        // Return the standards array, or an empty array if no document is found
        res.status(200).json(userStandardsDoc ? userStandardsDoc.standards : []);
    } catch (error) {
        console.error("GET /api/standards/:userId Error:", error);
        res.status(500).json({ error: 'Failed to fetch standards' });
    }
});

// POST (save/update) standards for a specific user
app.post('/api/standards/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // The frontend sends the entire array of standards in the request body
        const { standards } = req.body; 

        if (!Array.isArray(standards)) {
            return res.status(400).json({ error: 'Request body must contain a "standards" array.' });
        }

        const database = await connectToDb();
        
        await database.collection(COLLECTION_NAME).updateOne(
            { userId },
            { $set: { userId, standards } }, // Overwrite the standards array
            { upsert: true } // Creates the document if it doesn't exist for the user
        );
        
        res.status(200).json({ success: true, message: 'Standards saved successfully.' });
    } catch (error) {
        console.error("POST /api/standards/:userId Error:", error);
        res.status(500).json({ error: 'Failed to save standards' });
    }
});

// --- Start Server ---
app.listen(port, () => {
    console.log(\`Backend server running at http://localhost:\${port}\`);
    connectToDb().catch(err => {
        console.error("Failed to connect to database on startup:", err);
        process.exit(1);
    });
});
`;

  return (
    <div 
        className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mongoDbHelpModalTitle"
    >
      <div 
        className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-3xl transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="mongoDbHelpModalTitle" className="text-xl sm:text-2xl font-semibold text-gray-800">
            Backend API for Data Sync
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close Help Modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4 text-gray-700 max-h-[70vh] overflow-y-auto pr-2">
          <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-800 rounded-md">
            <h4 className="font-bold">Important Security Note</h4>
            <p className="text-sm">Connecting a frontend application directly to a database is a major security risk. It exposes your secret database credentials (username, password) to anyone using the app. The correct and secure approach is to use a backend API as an intermediary.</p>
          </div>

          <h3 className="text-lg font-semibold mt-4">How it Works</h3>
          <p>This application syncs your custom standards by communicating with a backend API endpoint that you provide. This ensures your data is persisted securely in your own database (like MongoDB Atlas) without exposing any credentials to the browser.</p>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Your Frontend (this app) sends requests to your Backend API.</li>
            <li>Your Backend API (which you create and host) receives these requests.</li>
            <li>Your Backend API securely connects to your database to save or retrieve data.</li>
            <li>Your Backend API sends the results back to the Frontend.</li>
          </ol>
          
           <h3 className="text-lg font-semibold mt-4">Setting up Your Backend</h3>
           <p>You'll need to create and host a simple backend service. Here is a conceptual example using Node.js, Express, and the official MongoDB driver. You can adapt this to any backend technology you prefer.</p>

           <div className="mt-2 space-y-2">
               <h4 className="font-semibold">Step 1: Create a Node.js Project</h4>
               <p className="text-sm">Initialize a new Node.js project and install the necessary packages:</p>
               <CodeBlock>npm init -y\nnpm install express mongodb cors dotenv</CodeBlock>
               <p className="text-sm">Create a <code className="bg-gray-200 p-1 rounded">.env</code> file in your project root to securely store your MongoDB connection string:</p>
               <CodeBlock>MONGO_CONNECTION_STRING="mongodb+srv://..."</CodeBlock>

               <h4 className="font-semibold">Step 2: Create the Server File</h4>
               <p className="text-sm">Create a file (e.g., <code className="bg-gray-200 p-1 rounded">server.js</code>) and add the following code. This example sets up the required API endpoints to get and save standards.</p>
               <CodeBlock>{nodeJsExample}</CodeBlock>

               <h4 className="font-semibold">Step 3: Run Your Backend</h4>
               <p className="text-sm">Start your server. You'll also need `dotenv` to load your environment variable.</p>
               <CodeBlock>node -r dotenv/config server.js</CodeBlock>

               <h4 className="font-semibold">Step 4: Connect the Frontend</h4>
               <p className="text-sm">Once your backend is running (e.g., at <code className="bg-gray-200 p-1 rounded">http://localhost:3001</code>), paste that URL into the "Backend API Endpoint" input field on the dashboard and click "Connect".</p>
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
