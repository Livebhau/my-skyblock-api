const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);
const cache = new Map();

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing!" });

    const cacheKey = playerName.toLowerCase() + "_dungeons";
    if (cache.has(cacheKey) && (Date.now() - cache.get(cacheKey).timestamp < 300000)) return res.status(200).json(cache.get(cacheKey).data);

    try {
        const profiles = await hypixel.getSkyblockProfiles(playerName);
        const activeProfile = profiles.find(p => p.selected);
        if (!activeProfile) return res.status(404).json({ error: "Active profile not found!" });

        const d = activeProfile.me.dungeons;
        const result = {
            username: playerName,
            catacombsLevel: d?.experience?.level || 0,
            selectedClass: d?.classes?.selected || "None",
            secretsFound: d?.secrets || 0,
            f7Clears: d?.completions?.catacombs?.Floor_7 || 0,
            m7Clears: d?.completions?.masterCatacombs?.Floor_7 || 0
        };

        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        res.status(200).json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
};
