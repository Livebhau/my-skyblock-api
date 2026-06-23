const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);

// Yeh hamara "Mini Database" (RAM Cache) hai
const cache = new Map();

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing!" });

    // 'LiveBhai' aur 'livebhai' ko same manne ke liye small letters me convert kiya
    const cacheKey = playerName.toLowerCase(); 
    const currentTime = Date.now();

    // ==========================================
    // STEP 1: CHECK CACHE (Pehle RAM me dhoondo)
    // ==========================================
    if (cache.has(cacheKey)) {
        const cachedData = cache.get(cacheKey);
        const ageInMilliseconds = currentTime - cachedData.timestamp;

        // 5 Minutes = 300,000 milliseconds (5 * 60 * 1000)
        if (ageInMilliseconds < 300000) { 
            console.log(`[⚡ CACHE HIT] ${playerName} ka data RAM se bheja!`);
            return res.status(200).json(cachedData.data);
        }
    }

    // ==========================================
    // STEP 2: FETCH FRESH (Agar cache me nahi mila)
    // ==========================================
    try {
        console.log(`[⏳ API CALL] ${playerName} ka fresh data Hypixel se laa rahe hain...`);
        const profiles = await hypixel.getSkyblockProfiles(playerName);
        
        const mpData = profiles.map(profile => {
            return {
                profileName: profile.profileName,
                magicPower: profile.me.accessories ? profile.me.accessories.magicPower : 0,
                selectedPower: profile.me.accessories ? profile.me.accessories.selectedPower : "None"
            };
        });

        // ==========================================
        // STEP 3: SAVE TO CACHE (Agle 5 min ke liye RAM me daal do)
        // ==========================================
        cache.set(cacheKey, {
            data: mpData,
            timestamp: currentTime
        });

        res.status(200).json(mpData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
