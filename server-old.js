const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.static(__dirname)); // Serve HTML, CSS, client-side JS
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Make uploads folder accessible

// --- File Storage Setup ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.originalname.split('.')[0] + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- Data File Paths ---
const dataDir = path.join(__dirname, 'data');
const docsPath = path.join(dataDir, 'documents.json');
const archivesPath = path.join(dataDir, 'archives.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Helper functions to read/write local JSON files
function readData(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
        return [];
    }
}

function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error(`Error writing to ${filePath}:`, err);
    }
}

// --- API Routes ---

app.get('/api/documents', (req, res) => {
    const documents = readData(docsPath);
    const archives = readData(archivesPath);
    res.json({ documents, archives });
});

app.post('/api/documents', upload.single('attachment'), (req, res) => {
    const docData = JSON.parse(req.body.document);
    // This new variable will tell the server to archive the old document
    const originalDocId = req.body.originalDocId; 

    if (req.file) {
        docData.attachmentPath = `uploads/${req.file.filename}`;
    }

    let documents = readData(docsPath);
    let archives = readData(archivesPath);

    // If an originalDocId is provided, this is a renewal. Archive the old doc.
    if (originalDocId) {
        const oldDocIndex = documents.findIndex(doc => doc.id === originalDocId);
        if (oldDocIndex > -1) {
            // Remove the old document from the active list
            const [docToArchive] = documents.splice(oldDocIndex, 1);
            // Add metadata and move it to the archives
            docToArchive.archivedAt = new Date().toISOString();
            archives.unshift(docToArchive);
        }
    }

    const existingIndex = documents.findIndex(doc => doc.id === docData.id);

    if (existingIndex > -1) {
        // This is an edit (like adding a comment)
        documents[existingIndex] = { ...documents[existingIndex], ...docData };
    } else {
        // This is a new document (or the new version from a renewal)
        documents.push(docData);
    }

    // Write the changes to BOTH files
    writeData(docsPath, documents);
    writeData(archivesPath, archives);

    res.status(200).json({ message: 'Document saved successfully' });
});

app.delete('/api/documents/:id', (req, res) => {
    const docId = req.params.id;
    let documents = readData(docsPath);
    const updatedDocuments = documents.filter(doc => doc.id !== docId);

    writeData(docsPath, updatedDocuments);
    res.status(200).json({ message: 'Document deleted successfully' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server.');
});