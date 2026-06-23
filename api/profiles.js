const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);
const cache = new Map();

// Helper to handle dashes in UUID for Hypixel API v2
function addDashes(uuid) {
    return uuid.substr(0,8)+"-"+uuid.substr(8,4)+"-"+uuid.substr(12,4)+"-"+uuid.substr(16,4)+"-"+uuid.substr(20);
}

// HOTM Level Calculator
function getHotmLevel(xp) {
    if (!xp) return 0;
    const thresholds = [0, 3000, 12000, 37000, 97000, 197000, 347000, 747000, 1147000, 1547000];
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (xp >= thresholds[i]) return i + 1;
    }
    return 1;
}

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing!" });

    const cacheKey = playerName.toLowerCase() + "_master";
    if (cache.has(cacheKey) && (Date.now() - cache.get(cacheKey).timestamp < 300000)) {
        return res.status(200).json(cache.get(cacheKey).data);
    }

    try {
        const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${playerName}`);
        if (!mojangRes.ok) return res.status(404).json({ error: "Player not found" });
        const mojangData = await mojangRes.json();
        const uuid = mojangData.id;
        const dashedUuid = addDashes(uuid);

        // Fetch Data
        const [rebornProfiles, statusRes, nwRes, rawRes] = await Promise.all([
            hypixel.getSkyblockProfiles(playerName, { fetchFairySouls: false }).catch(() => null),
            fetch(`https://api.hypixel.net/status?key=${process.env.HYPIXEL_KEY}&uuid=${uuid}`).catch(() => null),
            fetch(`https://sky.shiiyu.moe/api/v2/profile/${uuid}`).catch(() => null),
            fetch(`https://api.hypixel.net/v2/skyblock/profiles?key=${process.env.HYPIXEL_KEY}&uuid=${uuid}`).catch(() => null)
        ]);

        if (!rebornProfiles) return res.status(404).json({ error: "Data unavailable" });

        // Logic to find current profile
        let activeProf = rebornProfiles.find(p => p.selected) || rebornProfiles[0];
        
        // Match Raw Data
        let rawData = null;
        if (rawRes && rawRes.ok) {
            const rawJson = await rawRes.json();
            const prof = rawJson.profiles?.find(p => p.profile_id.replace(/-/g, '') === activeProf.profileId.replace(/-/g, ''));
            if (prof) rawData = prof.members[uuid] || prof.members[dashedUuid];
        }

        // Networth Logic
        let nw = "0", unsoul = "0";
        if (nwRes && nwRes.ok) {
            const nwJson = await nwRes.json();
            const scProf = Object.values(nwJson.profiles).find(p => p.current);
            if (scProf && scProf.data?.networth) {
                nw = scProf.data.networth.networth.toLocaleString();
                unsoul = scProf.data.networth.unsoulboundNetworth.toLocaleString();
            }
        }

        // HOTM Logic
        let hotmLvl = 0, hotmAb = "None";
        if (rawData?.player_data?.mining_core) {
            hotmLvl = getHotmLevel(rawData.player_data.mining_core.experience);
            hotmAb = rawData.player_data.mining_core.selected_pickaxe_ability?.replace(/_/g, ' ') || "None";
        }

        res.status(200).json({
            profileName: activeProf.cuteName,
            skyblockLevel: activeProf.me.level || 0,
            networthFormatted: nw,
            unsoulboundFormatted: unsoul,
            hotmLevel: hotmLvl,
            hotmAbility: hotmAb,
            // ... rest of your existing fields
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
