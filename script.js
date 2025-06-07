// File: script.js (Modified for GitHub Pages - Static JSON)

document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const playerListContainer = document.getElementById('playerListContainer');
    const teamFilterSelect = document.getElementById('teamFilter');
    const sortButtonContainer = document.querySelector('.sort-buttons');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    // State Variables
    let staticPlayerData = []; // Holds data from players-static.json
    let dynamicPlayerDataByName = {}; // Holds data from players-dynamic.json
    let fullSortedFilteredList = []; // Holds the processed, combined list
    let numVisiblePlayers = 10;
    const playersPerLoad = 10;
    let isFilterPopulated = false;
    let currentSortKey = 'name';
    let currentSortDirection = 'asc';

    /**
     * Fetches BOTH static and dynamic JSON files directly.
     * Combines them and triggers rendering.
     */
    async function fetchAndCombineData() {
        console.log("Fetching local JSON data...");
        if (!playerListContainer.querySelector('.player-card') && !playerListContainer.querySelector('.error-message')) {
            playerListContainer.innerHTML = '<div class="loading-message">Loading player data...</div>';
        }

        try {
            // Use Promise.all to fetch both files concurrently
            const [staticResponse, dynamicResponse] = await Promise.all([
                fetch('players-static.json'),
                fetch('players-dynamic.json')
            ]);

            if (!staticResponse.ok) { throw new Error(`Failed to load players-static.json: ${staticResponse.statusText}`); }
            if (!dynamicResponse.ok) { throw new Error(`Failed to load players-dynamic.json: ${dynamicResponse.statusText}`); }

            staticPlayerData = await staticResponse.json();
            dynamicPlayerDataByName = await dynamicResponse.json();

            // Combine static and dynamic data
            const combinedData = staticPlayerData.map(staticPlayer => {
                const dynamicStats = dynamicPlayerDataByName[staticPlayer.name] || { runs: 0, wickets: 0 };
                return {
                    ...staticPlayer,
                    runs: dynamicStats.runs,
                    wickets: dynamicStats.wickets
                };
            });

            // Populate filter if needed (based on combined data now)
            if (!isFilterPopulated && combinedData.length > 0) {
                populateTeamFilter(combinedData);
                isFilterPopulated = true;
            }

            // Process and render (using the combined data)
            // Note: We pass combinedData here, processAndRenderPlayers will recalculate metrics
            processAndRenderPlayers(combinedData);
            console.log("Player cards updated from local JSON data.");

        } catch (error) {
            console.error("Error fetching or processing local JSON data:", error);
            if (!playerListContainer.querySelector('.player-card')) {
                playerListContainer.innerHTML = `<p class="error-message">Could not load player data: ${error.message}. Check JSON files.</p>`;
            } else {
                console.warn("Failed to update player data from JSON files.");
            }
            loadMoreBtn.style.display = 'none'; // Hide button on error
        }
    }

    /**
     * Calculates performance metrics (per LAKH).
     */
    function calculateMetricsForPlayers(players) {
        // Calculation logic remains the same
        return players.map(player => {
            const priceCr = player.priceCr || 0;
            const runs = player.runs || 0;
            const wickets = player.wickets || 0;
            const priceLakhs = priceCr * 10;
            const runsPerLakh = (priceLakhs > 0 && runs > 0) ? parseFloat((runs / priceLakhs).toFixed(2)) : null;
            const wicketsPerLakh = (priceLakhs > 0 && wickets > 0) ? parseFloat((wickets / priceLakhs).toFixed(2)) : null;
            return { ...player, runsPerLakh, wicketsPerLakh };
        });
    }

    /**
     * Populates the team filter select dropdown.
     */
    function populateTeamFilter(players) {
        // Logic remains the same
        const teams = new Set();
        players.forEach(player => { if (player.team) { teams.add(player.team); } });
        const sortedTeams = [...teams].sort();
        teamFilterSelect.innerHTML = '<option value="all">All Teams</option>';
        sortedTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team; option.textContent = team;
            teamFilterSelect.appendChild(option);
        });
        if (!isFilterPopulated) {
            teamFilterSelect.addEventListener('change', handleFilterOrSortChange);
        }
    }

    /**
     * Sorts an array of player objects.
     */
    function sortPlayers(players, key, direction) {
        // Logic remains the same
        players.sort((a, b) => {
            let valueA = a[key]; let valueB = b[key];
            const numericKeys = ['priceCr', 'runs', 'wickets', 'runsPerLakh', 'wicketsPerLakh'];
            if (numericKeys.includes(key)) {
                valueA = parseFloat(valueA) || 0; valueB = parseFloat(valueB) || 0;
                return direction === 'asc' ? valueA - valueB : valueB - valueA;
            } else {
                valueA = (valueA || '').toString().toLowerCase(); valueB = (valueB || '').toString().toLowerCase();
                if (valueA < valueB) return direction === 'asc' ? -1 : 1;
                if (valueA > valueB) return direction === 'asc' ? 1 : -1;
                return 0;
            }
        });
    }

    /**
     * Updates the visual state of the sort buttons.
     */
    function updateSortButtonState() {
        // Logic remains the same
        const buttons = sortButtonContainer.querySelectorAll('.sort-btn');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.sortKey === currentSortKey);
        });
    }

    /**
     * Central function to process data: filters, calculates metrics, sorts,
     * stores the full result, and then triggers rendering of the visible portion.
     * Now takes combinedData as input.
     */
    function processAndRenderPlayers(combinedData) { // Accepts combined data
        const selectedTeam = teamFilterSelect.value;

        // 1. Filter Data
        const filteredPlayers = combinedData.filter(player => // Use combinedData input
            selectedTeam === 'all' || player.team === selectedTeam
        );

        // 2. Calculate Metrics
        const playersWithMetrics = calculateMetricsForPlayers(filteredPlayers);

        // 3. Sort Data
        const sortedPlayers = [...playersWithMetrics];
        sortPlayers(sortedPlayers, currentSortKey, currentSortDirection);

        // Store the fully processed list
        fullSortedFilteredList = sortedPlayers;

        // 4. Render the visible portion
        renderVisiblePlayerCards();

        // 5. Update UI elements
        updateSortButtonState();
        updateLoadMoreButtonState();
    }

    /**
    * Renders only the currently visible slice of players.
    */
    function renderVisiblePlayerCards() {
        // Logic remains the same
        playerListContainer.innerHTML = '';
        const playersToDisplay = fullSortedFilteredList.slice(0, numVisiblePlayers);
        if (playersToDisplay.length > 0) {
            playersToDisplay.forEach((player, index) => {
                const rank = index + 1;
                const playerCardHTML = generatePlayerCardHTML(player, rank);
                playerListContainer.insertAdjacentHTML('beforeend', playerCardHTML);
            });
        } else {
            playerListContainer.innerHTML = '<p class="error-message">No players found matching your criteria.</p>';
        }
    }

    /**
     * Controls the visibility of the "Load More" button.
     */
    function updateLoadMoreButtonState() {
        // Logic remains the same
        if (numVisiblePlayers < fullSortedFilteredList.length) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    /**
     * Generates the HTML string for a single player card, including rank.
     */
    function generatePlayerCardHTML(player, rank) {
        // Logic remains the same
        const priceDisplay = player.priceCr ? `${player.priceCr} Cr` : 'N/A';
        const runsDisplay = (player.runs !== null && player.runs !== undefined) ? player.runs : '--';
        const wicketsDisplay = (player.wickets !== null && player.wickets !== undefined) ? player.wickets : '--';
        const runsMetricDisplay = (player.runsPerLakh !== undefined && player.runsPerLakh !== null) ? player.runsPerLakh.toFixed(2) : '--';
        const wicketsMetricDisplay = (player.wicketsPerLakh !== undefined && player.wicketsPerLakh !== null) ? player.wicketsPerLakh.toFixed(2) : '--';
        const hasRuns = runsDisplay !== '--';
        const hasWickets = wicketsDisplay !== '--';
        const hasRunsMetric = runsMetricDisplay !== '--';
        const hasWicketsMetric = wicketsMetricDisplay !== '--';

        return `
            <div class="player-card" data-player-id="${player.id}" data-team="${player.team || ''}">
                <div class="player-photo-container">
                     <div class="player-rank">${rank}</div>
                     <img src="${player.photoUrl}" alt="${player.name}" class="player-photo" onerror="this.src='https://via.placeholder.com/300x200/cccccc/ffffff.png?text=Image+Not+Found';">
                </div>
                <div class="player-info">
                    <h2 class="player-name">${player.name}</h2>
                    <p class="player-team">${player.team || 'Unknown Team'}</p>
                    <div class="player-stats">
                        
                        <p class="stat-line price-line"><i class="fas fa-tag stat-icon price-icon"></i>Auction Price: <span class="value price-value">${priceDisplay}</span></p><hr class="stat-divider">
                        <div class="core-stats">
                            <p class="stat-line"><i class="fas fa-person-running stat-icon runs-icon"></i>Runs: <span class="value runs-value" ${!hasRuns ? 'data-placeholder="true"' : ''}>${runsDisplay}</span></p>
                            <p class="stat-line"><i class="fas fa-bowling-ball stat-icon wickets-icon"></i>Wickets: <span class="value wickets-value" ${!hasWickets ? 'data-placeholder="true"' : ''}>${wicketsDisplay}</span></p>
                        </div><hr class="stat-divider">
                        <div class="performance-metrics">
                             <p class="performance-sentence"><span class="metric-value runs-metric" ${!hasRunsMetric ? 'data-placeholder="true"' : ''}>${runsMetricDisplay}</span> Runs per 10 Lakhs</p>
                              <p class="performance-sentence"><span class="metric-value wickets-metric" ${!hasWicketsMetric ? 'data-placeholder="true"' : ''}>${wicketsMetricDisplay}</span> Wickets per 10 Lakhs</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Handles changes in filter or sort selections. Resets pagination.
     */
     function handleFilterOrSortChange() {
         numVisiblePlayers = 10; // Reset pagination
         // Need to re-fetch/re-combine to ensure data is current before processing
         // In this static setup, fetchAndCombineData primarily re-reads local files
         fetchAndCombineData();
     }

    // --- Event Listeners ---
    sortButtonContainer.addEventListener('click', (event) => {
        // Sort logic remains the same, triggers handleFilterOrSortChange
        if (event.target.classList.contains('sort-btn')) {
            const newSortKey = event.target.dataset.sortKey;
            if (newSortKey === currentSortKey) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortKey = newSortKey;
                currentSortDirection = (currentSortKey === 'name') ? 'asc' : 'desc';
            }
            handleFilterOrSortChange();
        }
    });

    loadMoreBtn.addEventListener('click', () => {
        // Load more logic remains the same
        numVisiblePlayers += playersPerLoad;
        renderVisiblePlayerCards();
        updateLoadMoreButtonState();
    });

    // --- Initial Load & Auto-Refresh (Note: Refresh is less meaningful now) ---
    fetchAndCombineData(); // Initial fetch of local JSON files

    // This interval will just re-read the static files every minute.
    // It won't get new data unless you manually update the files and refresh the page.
    // Keep it if you plan to manually update files while viewing, otherwise optional.
    setInterval(fetchAndCombineData, 60000);

});