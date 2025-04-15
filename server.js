// File: server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs'); // File system module
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// === Data Storage ===
let staticPlayerData = [];
let dynamicPlayerDataByName = {}; // Store dynamic data keyed by name
let combinedPlayerData = []; // Holds static + dynamic (runs/wickets only)
let lastUpdateTime = null;

// === Load Static Data ===
function loadStaticData() {
    try {
        const filePath = path.join(__dirname, 'players-static.json');
        const fileData = fs.readFileSync(filePath, 'utf8');
        staticPlayerData = JSON.parse(fileData);
        console.log(`Static player data loaded successfully (${staticPlayerData.length} players).`);
    } catch (error) {
        console.error("FATAL ERROR loading static player data:", error);
        staticPlayerData = []; // Ensure it's an empty array on error
    }
}

// === Load Dynamic Data (using Name) ===
function loadDynamicData() {
    try {
        const filePath = path.join(__dirname, 'players-dynamic.json');
        // Check if file exists before reading
        if (!fs.existsSync(filePath)) {
            console.warn("Warning: players-dynamic.json not found. Dynamic stats will be 0.");
            dynamicPlayerDataByName = {};
            return;
        }
        const fileData = fs.readFileSync(filePath, 'utf8');
        dynamicPlayerDataByName = JSON.parse(fileData);
        console.log(`Dynamic player data loaded successfully (${Object.keys(dynamicPlayerDataByName).length} entries).`);
    } catch (error) {
        console.error("Error loading dynamic player data:", error);
        dynamicPlayerDataByName = {}; // Reset on error
    }
}

// === Combine Static and Dynamic Data ===
// This runs periodically or on demand
function combineData() {
    if (staticPlayerData.length === 0) {
        console.error("Cannot combine data: Static data not loaded.");
        return;
    }

    combinedPlayerData = staticPlayerData.map(staticPlayer => {
        // Find dynamic stats using the exact name as the key
        const dynamicStats = dynamicPlayerDataByName[staticPlayer.name] || { runs: 0, wickets: 0 };

        return {
            ...staticPlayer, // Include all static fields (id, name, team, priceCr, photoUrl)
            runs: dynamicStats.runs,
            wickets: dynamicStats.wickets
            // Metrics (runsPerCrore, wicketsPerCrore) are NOT calculated here anymore
        };
    });
    lastUpdateTime = new Date();
    console.log(`Player data combined. Last updated: ${lastUpdateTime.toLocaleTimeString()}`);
}

// --- Background Update Function ---
// Reloads data files and combines them
function updateDataInBackground() {
    console.log("Updating data in background...");
    // Reload both files in case they have been updated externally
    loadStaticData(); // Reload static (usually less necessary unless manually edited)
    loadDynamicData(); // Reload dynamic stats
    combineData(); // Re-combine the data
}


// === Middleware ===
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // To parse JSON bodies if needed later

// === API Endpoints ===
app.get('/api/players', (req, res) => {
    // Return the latest combined data (static info + runs/wickets)
    if (combinedPlayerData.length > 0) {
        res.json(combinedPlayerData);
    } else {
        // Handle case where data hasn't been loaded/combined yet
        res.status(503).json({ message: "Player data is currently unavailable or being processed. Please try again shortly." });
    }
});

// === Start Server ===
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);

    // Initial data load and combination on startup
    updateDataInBackground();

    // Set interval for subsequent updates (e.g., every 5 minutes)
    // This will reload the dynamic JSON file periodically
    setInterval(updateDataInBackground, 5 * 60 * 1000); // 300,000 ms = 5 minutes
});