const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);
const cache = new Map();

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing! URL ke end me ?name=PlayerName lagao" });

    const cacheKey = playerName.toLowerCase() + "_mp";
    const currentTime = Date.now();

    // 5-Minute Cache Check
    if (cache.has(cacheKey) && (currentTime - cache.get(cacheKey).timestamp < 300000)) {
        return res.status(200).json(cache.get(cacheKey).data);
    }

    try {
        const profiles = await hypixel.getSkyblockProfiles(playerName);
        
        // 1. SIRF Active Profile nikalne ka strict filter
        const activeProfile = profiles.find(profile => profile.selected === true);

        if (!activeProfile) {
            return res.status(404).json({ error: "Bhai, is player ki koi active profile nahi mili!" });
        }

        // 2. Exact MP nikalna (Aapke data dump ke hisaab se)
        const stats = activeProfile.me;
        const mp = stats.highestMagicalPower || 0;

        // 3. Final Clean Data
        const result = {
            username: playerName,
            activeProfileName: activeProfile.profileName,
            magicPower: mp,
            warning: mp === 0 ? "Game me /api me jaakar INVENTORY API ON karo!" : "All Good"
        };

        // Cache me save karo
        cache.set(cacheKey, { data: result, timestamp: currentTime });

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ error: "API Error: " + error.message });
    }
};
