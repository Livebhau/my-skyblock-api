const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);
const cache = new Map();

function formatNum(num) {
    if (!num || isNaN(num)) return "0";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
}

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing!" });

    const cacheKey = playerName.toLowerCase() + "_master";
    if (cache.has(cacheKey) && (Date.now() - cache.get(cacheKey).timestamp < 300000)) {
        return res.status(200).json(cache.get(cacheKey).data);
    }

    try {
        // 1. UUID nikalo
        const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${playerName}`);
        if (!mojangRes.ok) return res.status(404).json({ error: "Player Mojang par nahi mila!" });
        const mojangData = await mojangRes.json();
        const uuid = mojangData.id;

        // 2. Parallel Fetch: Hypixel Reborn (For Skills/Dungeons) + Status + SkyCrypt
        const [profiles, statusRes, nwRes] = await Promise.all([
            hypixel.getSkyblockProfiles(playerName, { fetchFairySouls: false }).catch(() => []),
            fetch(`https://api.hypixel.net/status?key=${process.env.HYPIXEL_KEY}&uuid=${uuid}`),
            fetch(`https://sky.shiiyu.moe/api/v2/profile/${uuid}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36' }
            }).catch(() => null)
        ]);

        if (!profiles || profiles.length === 0) return res.status(404).json({ error: "No SkyBlock profiles found!" });

        // 3. PERFECT ACTIVE PROFILE FINDER (By Last Save)
        let activeProf = profiles[0];
        let maxSaveTime = 0;
        for (const p of profiles) {
            if (p.me && p.me.lastSave > maxSaveTime) {
                maxSaveTime = p.me.lastSave;
                activeProf = p;
            }
        }

        const me = activeProf.me;

        // 4. Player Location
        let loc = "🔴 Offline";
        if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.success && statusData.session?.online) {
                const s = statusData.session;
                loc = s.gameType === "SKYBLOCK" ? `🟢 Online (${s.mode || "SkyBlock"})` : `🟡 Playing ${s.gameType}`;
            }
        }

        // 5. 100% Accurate SkyCrypt Networth (Matching exact Profile ID)
        let nwStr = "0", unsoulNw = "0";
        if (nwRes && nwRes.ok) {
            const nwJson = await nwRes.json();
            const profileIdNoDashes = activeProf.profileId.replace(/-/g, ''); // UUID format fix
            
            // Seedha usi profile me ghuso jo active hai
            const scProfile = nwJson.profiles[profileIdNoDashes];
            if (scProfile && scProfile.data?.networth) {
                nwStr = formatNum(scProfile.data.networth.networth);
                unsoulNw = formatNum(scProfile.data.networth.unsoulboundNetworth);
            }
        }

        // 6. Active Pet & MP
        let pet = "None";
        if (me.pets) {
            const activeP = me.pets.find(p => p.active);
            if (activeP) pet = `${activeP.rarity} ${activeP.type}`.replace(/_/g, ' ');
        }
        let mp = me.highestMagicalPower || me.magicalPower?.total || me.accessories?.magicPower || 0;

        // 7. Final Response
        const finalOutput = {
            username: mojangData.name,
            profileName: activeProf.profileName || "Profile",
            statusLocation: loc,
            skyblockLevel: me.level ? (Math.round(me.level * 100) / 100) : 0,
            skillAverage: me.skills?.average ? (Math.round(me.skills.average * 100) / 100) : 0,
            purseCoins: formatNum(me.purse || 0),
            networthFormatted: nwStr,
            unsoulboundFormatted: unsoulNw,
            magicPower: mp,
            powerStone: me.accessories?.selectedPower || "None",
            activePet: pet,
            
            // Dungeons & HOTM Data Restored!
            catacombsLevel: me.dungeons?.experience?.level || 0,
            selectedClass: me.dungeons?.classes?.selected || "None",
            secretsFound: me.dungeons?.secrets || 0,
            f7Clears: me.dungeons?.completions?.catacombs?.Floor_7 || 0,
            m7Clears: me.dungeons?.completions?.masterCatacombs?.Floor_7 || 0,
            hotmLevel: me.hotm?.experience?.level || 0,
            hotmAbility: me.hotm?.ability || "None"
        };

        cache.set(cacheKey, { data: finalOutput, timestamp: Date.now() });
        res.status(200).json(finalOutput);

    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};
