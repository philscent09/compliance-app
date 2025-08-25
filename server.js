const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
// --- NEW: Add the MongoDB client ---
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3000;

// --- NEW: MongoDB Connection Setup ---
// PASTE YOUR CONNECTION STRING FROM MONGODB ATLAS HERE
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// This variable will hold our database connection and be used in all API routes
let db; 

// This function connects to the database when the server starts
async function connectDB() {
    try {
        await client.connect();
        db = client.db("GovDocsRepo"); // You can name your database here
        console.log("Connected successfully to MongoDB");
    } catch (e) {
        console.error("Could not connect to MongoDB", e);
        process.exit(1);
    }
}

// --- Middleware ---
app.use(express.json());
app.use(express.static(__dirname)); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- File Storage Setup (Still Local) ---
// This part remains the same for now. It still saves uploaded files to your local './uploads' folder.
// This will be replaced in the final phase before deploying to Render.
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'GovDocsRepo', // This will create a folder in your Cloudinary account
        format: async (req, file) => 'pdf', // Or other formats like 'png', 'jpg'
        public_id: (req, file) => file.originalname.split('.')[0] + '-' + Date.now(),
    },
});

const upload = multer({ storage: storage });

// --- DEPRECATED: The data file paths and helper functions are no longer needed ---
// const dataDir = path.join(__dirname, 'data');
// const docsPath = path.join(dataDir, 'documents.json');
// const archivesPath = path.join(dataDir, 'archives.json');
// function readData(...) {}
// function writeData(...) {}

// --- REWRITTEN: API Routes using MongoDB ---

// GET all documents and archives from the database
app.get('/api/documents', async (req, res) => {
    try {
        const documents = await db.collection('documents').find().sort({ issuanceDate: -1 }).toArray();
        const archives = await db.collection('archives').find().sort({ archivedAt: -1 }).toArray();
        res.json({ documents, archives });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error fetching data." });
    }
});

// POST to create, update, or renew a document in the database
app.post('/api/documents', upload.single('attachment'), async (req, res) => {
    try {
        const docData = JSON.parse(req.body.document);
        const originalDocId = req.body.originalDocId;

        if (req.file) {
            docData.attachmentPath = req.file.path;
        }

        // If this is a renewal, archive the old document
        if (originalDocId) {
            const docToArchive = await db.collection('documents').findOne({ id: originalDocId });
            if (docToArchive) {
                docToArchive.archivedAt = new Date().toISOString();
                // Insert into archives and delete from active documents
                await db.collection('archives').insertOne(docToArchive);
                await db.collection('documents').deleteOne({ id: originalDocId });
            }
        }

        // Use 'upsert' to either update an existing document (e.g., adding a comment) or insert a new one
        await db.collection('documents').updateOne(
            { id: docData.id }, // Query by your custom UUID
            { $set: docData },   // The data to save
            { upsert: true }     // Option to insert if it doesn't exist
        );

        res.status(200).json({ message: 'Document saved successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error saving document." });
    }
});

// DELETE a document from the database
app.delete('/api/documents/:id', async (req, res) => {
    try {
        const docId = req.params.id;

        // Note: For a complete solution, you would add code here to delete
        // the file from Cloudinary as well, but for now, we will just delete the DB record.
        const result = await db.collection('documents').deleteOne({ id: docId });

        if (result.deletedCount === 1) {
            res.status(200).json({ message: 'Document deleted successfully' });
        } else {
            res.status(404).json({ message: 'Document not found' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error deleting document." });
    }
});

// --- NEW: Connect to DB and then start the server ---
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
});