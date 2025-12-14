// 1. Load Environment Variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;
const API_KEY = process.env.RIOT_API_KEY;

// --- 🔒 CONFIGURATION ---
const MY_NAME = "Scientist";
const MY_TAG = "Cplay";

// 🌏 REGION SETTINGS
const ACCOUNT_REGION = "asia"; // For looking up PUUID
const MATCH_REGION = "sea";    // For Match History
const PLATFORM_ID = "sg2";     // ✅ CONFIRMED: Your rank is here!

// Middleware
app.use(cors());
app.use(express.static('.'));

// Helper: Fetch URL with Key
async function fetchWithKey(url) {
    const response = await fetch(url, { headers: { "X-Riot-Token": API_KEY } });
    
    if (response.status === 401 || response.status === 403) {
        throw new Error("KEY_EXPIRED"); 
    }
    // If not found (404), return null so we don't crash
    if (response.status === 404) return null;

    if (!response.ok) {
        throw new Error(`Riot API Error: ${response.status}`);
    }

    return await response.json();
}

// --- ROUTE 1: Get Rank Data ---
app.get('/api/my-rank', async (req, res) => {
    try {
        console.log(`🏆 Fetching Rank from ${PLATFORM_ID}...`);

        // 1. Get PUUID
        const accountUrl = `https://${ACCOUNT_REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(MY_NAME)}/${MY_TAG}`;
        const accountData = await fetchWithKey(accountUrl);
        if (!accountData) throw new Error("User not found");
        
        const puuid = accountData.puuid;

        // 2. Get Summoner ID (needed for Rank)
        const summonerUrl = `https://${PLATFORM_ID}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
        const summonerData = await fetchWithKey(summonerUrl);
        if (!summonerData) throw new Error("Summoner not found on " + PLATFORM_ID);
        
        const summonerId = summonerData.id;

        // 3. Get Rank Entries
        const leagueUrl = `https://${PLATFORM_ID}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
        const leagueData = await fetchWithKey(leagueUrl);

        // 4. Safety Check & Filter
        if (!Array.isArray(leagueData)) {
            return res.json({ solo: null, flex: null });
        }

        const solo = leagueData.find(q => q.queueType === "RANKED_SOLO_5x5") || null;
        const flex = leagueData.find(q => q.queueType === "RANKED_FLEX_SR") || null;

        res.json({ solo, flex });

    } catch (error) {
        console.error("❌ Rank Error:", error.message);
        if (error.message === "KEY_EXPIRED") return res.status(403).json({ error: "Key Expired" });
        res.status(500).json({ error: error.message });
    }
});

// --- ROUTE 2: Get Last 10 Matches ---
app.get('/api/my-history', async (req, res) => {
    try {
        console.log(`🔎 Fetching Last 10 Matches...`);
        
        // 1. Get PUUID
        const accountUrl = `https://${ACCOUNT_REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(MY_NAME)}/${MY_TAG}`;
        const accData = await fetchWithKey(accountUrl);
        const puuid = accData.puuid;

        // 2. Get Match IDs (Count = 10)
        const matchIdsUrl = `https://${MATCH_REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10`;
        const matchIds = await fetchWithKey(matchIdsUrl);

        if (!matchIds || matchIds.length === 0) return res.json([]);

        // 3. Fetch Details (10 requests is safe for rate limit)
        const matchesData = await Promise.all(matchIds.map(id => 
            fetchWithKey(`https://${MATCH_REGION}.api.riotgames.com/lol/match/v5/matches/${id}`)
        ));

        // 4. Clean Data
        const cleanedData = matchesData.map(match => {
            const p = match.info.participants.find(p => p.puuid === puuid);
            return {
                matchId: match.metadata.matchId,
                mode: match.info.gameMode,
                champion: p.championName,
                kills: p.kills, deaths: p.deaths, assists: p.assists,
                win: p.win,
                kda: ((p.kills + p.assists) / (p.deaths || 1)).toFixed(2),
                cs: p.totalMinionsKilled + p.neutralMinionsKilled
            };
        });

        res.json(cleanedData);

    } catch (error) {
        console.error("❌ History Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});