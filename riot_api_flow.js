// CONFIGURATION
const API_KEY = process.env.RIOT_API_KEY;
const REGION = "sea"; // 'americas', 'europe', 'asia', or 'sea'
const GAME_NAME = "Scientist";
const TAG_LINE = "Cplay";

async function getRiotData() {
    try {
        console.log(`--- Step 1: Getting PUUID for ${GAME_NAME}#${TAG_LINE} ---`);
        
        // 1. Get PUUID from Riot ID
        const accountUrl = `https://${REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(GAME_NAME)}/${TAG_LINE}`;
        const accountData = await fetchWithKey(accountUrl);
        
        if (!accountData.puuid) throw new Error("PUUID not found in response.");
        const puuid = accountData.puuid;
        console.log(`✅ Success! PUUID: ${puuid}\n`);

        // 2. Get Match History (List of IDs)
        console.log(`--- Step 2: Getting Match List ---`);
        const matchIdsUrl = `https://${REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=5`;
        const matchIds = await fetchWithKey(matchIdsUrl);

        if (!matchIds || matchIds.length === 0) {
            console.log("No matches found for this player.");
            return;
        }
        console.log(`✅ Found ${matchIds.length} matches. Latest Match ID: ${matchIds[0]}\n`);

        // 3. Get Specific Match Details
        console.log(`--- Step 3: Getting Details for Match ${matchIds[0]} ---`);
        const matchDetailUrl = `https://${REGION}.api.riotgames.com/lol/match/v5/matches/${matchIds[0]}`;
        const matchData = await fetchWithKey(matchDetailUrl);

        // 4. Extract some interesting data
        const gameDuration = (matchData.info.gameDuration / 60).toFixed(2);
        const mode = matchData.info.gameMode;
        
        // Find our player in the participants list to get their stats
        const playerStats = matchData.info.participants.find(p => p.puuid === puuid);
        const champion = playerStats.championName;
        const kda = `${playerStats.kills}/${playerStats.deaths}/${playerStats.assists}`;
        const win = playerStats.win ? "VICTORY" : "DEFEAT";

        console.log("------------------------------------------------");
        console.log(`Game Mode:    ${mode}`);
        console.log(`Duration:     ${gameDuration} minutes`);
        console.log(`Result:       ${win}`);
        console.log(`Champion:     ${champion}`);
        console.log(`K/D/A:        ${kda}`);
        console.log("------------------------------------------------");

    } catch (error) {
        console.error("❌ ERROR:", error.message);
    }
}

// Helper function to handle Headers and Errors
async function fetchWithKey(url) {
    const response = await fetch(url, {
        headers: {
            "X-Riot-Token": API_KEY
        }
    });

    if (!response.ok) {
        throw new Error(`API Request failed: ${response.status} ${response.statusText} \nURL: ${url}`);
    }

    return await response.json();
}

// Execute
getRiotData();