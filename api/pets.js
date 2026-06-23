const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);
const cache = new Map();

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing!" });

    const cacheKey = playerName.toLowerCase() + "_pets";
    if (cache.has(cacheKey) && (Date.now() - cache.get(cacheKey).timestamp < 300000)) return res.status(200).json(cache.get(cacheKey).data);

    try {
        const profiles = await hypixel.getSkyblockProfiles(playerName);
        const activeProfile = profiles.find(p => p.selected);
        if (!activeProfile) return res.status(404).json({ error: "Active profile not found!" });

        const pets = activeProfile.me.pets || [];
        const activePet = pets.find(p => p.active);
        const result = {
            username: playerName,
            totalPets: pets.length,
            legendaryOrMythic: pets.filter(p => p.rarity === 'LEGENDARY' || p.rarity === 'MYTHIC').length,
            activePetName: activePet ? `${activePet.rarity} ${activePet.type}` : "None",
            activePetItem: activePet?.heldItem || "None"
        };

        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        res.status(200).json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
};
