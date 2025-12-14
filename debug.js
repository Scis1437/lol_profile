const API_KEY = "RGAPI-50c4a73c-e21a-4a12-9944-128e5db4868b"; // 🔴 PASTE KEY HERE

const MY_NAME = "Scientist";
const MY_TAG = "Cplay";

async function checkServer(platform) {
    try {
        console.log(`\n--- CHECKING ${platform.toUpperCase()} ---`);
        
        // 1. Get PUUID (Account-V1)
        const region = "asia"; 
        const accUrl = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(MY_NAME)}/${MY_TAG}?api_key=${API_KEY}`;
        const accRes = await fetch(accUrl);
        
        if (accRes.status === 401 || accRes.status === 403) {
            console.log("❌ CRITICAL: API Key is Invalid/Expired!");
            return false;
        }
        
        if (!accRes.ok) {
            console.log(`❌ Account lookup failed: ${accRes.status}`);
            return false;
        }
        
        const accData = await accRes.json();
        const puuid = accData.puuid;

        // 2. Get Summoner ID (Summoner-V4) - THIS IS THE KEY STEP
        const sumUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${API_KEY}`;
        const sumRes = await fetch(sumUrl);

        if (sumRes.status === 404) {
            console.log(`❌ Summoner not found on ${platform}. (You don't play here)`);
            return false;
        }

        const sumData = await sumRes.json();
        const summonerId = sumData.id;
        console.log(`✅ FOUND YOU! Summoner Level: ${sumData.summonerLevel}`);

        // 3. Get Rank (League-V4)
        const rankUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${API_KEY}`;
        const rankRes = await fetch(rankUrl);
        const rankData = await rankRes.json();

        if (rankData.length === 0) {
            console.log("⚠️ User exists, but has NO RANKED GAMES on this server.");
        } else {
            console.log("🏆 RANK DATA FOUND:");
            rankData.forEach(q => {
                console.log(`   - ${q.queueType}: ${q.tier} ${q.rank} (${q.leaguePoints} LP)`);
            });
        }
        return true; // We found the correct server!

    } catch (e) {
        console.log("❌ ERROR:", e.message);
        return false;
    }
}

async function run() {
    // We only check the two most likely servers for you
    console.log(`SEARCHING FOR: ${MY_NAME}#${MY_TAG}`);
    
    // Check Singapore/SEA (Most likely for 'SEA' players)
    const foundSG = await checkServer('sg2');
    if (foundSG) return; // Stop if found

    // Check Thailand (Since you are in TH)
    await checkServer('th2');
}

run();