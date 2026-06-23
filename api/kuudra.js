const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);
const cache = new Map();

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing!" });

    const cacheKey = playerName.toLowerCase() + "_kuudra";
    if (cache.has(cacheKey) && (Date.now() - cache.get(cacheKey).timestamp < 300000)) return res.status(200).json(cache.get(cacheKey).data);

    try {
        const profiles = await hypixel.getSkyblockProfiles(playerName);
        const activeProfile = profiles.find(p => p.selected);
        if (!activeProfile) return res.status(404).json({ error: "Active profile not found!" });

        const c = activeProfile.me.crimson;
        const result = {
            username: playerName,
            faction: c?.faction || "None",
            mageRep: c?.reputation?.mages || 0,
            barbarianRep: c?.reputation?.barbarians || 0,
            kuudraTiers: {
                basic: c?.kuudra?.none || 0,
                hot: c?.kuudra?.hot || 0,
                burning: c?.kuudra?.burning || 0,
                fiery: c?.kuudra?.fiery || 0,
                infernal: c?.kuudra?.infernal || 0
            }
        };

        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        res.status(200).json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
};
