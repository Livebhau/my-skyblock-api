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

// Custom HOTM Level Calculator (Library ke bugs ko bypass karne ke liye)
function getHotmLevel(xp) {
    if (!xp) return 0;
    if (xp >= 1547000) return 10;
    if (xp >= 1147000) return 9;
    if (xp >= 747000) return 8;
    if (xp >= 347000) return 7;
    if (xp >= 197000) return 6;
    if (xp >= 97000) return 5;
    if (xp >= 37000) return 4;
    if (xp >= 12000) return 3;
    if (xp >= 3000) return 2;
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
        if (!mojangRes.ok) return res.status(404).json({ error: "Player Mojang par nahi mila!" });
        const mojangData = await mojangRes.json();
        const uuid = mojangData.id;

        // 4 APIs PARALLEL: Hypixel Reborn + Status + SkyCrypt + RAW Hypixel API
        const [profiles, statusRes, nwRes, rawRes] = await Promise.all([
            hypixel.getSkyblockProfiles(playerName, { fetchFairySouls: false }).catch(() => []),
            fetch(`https://api.hypixel.net/status?key=${process.env.HYPIXEL_KEY}&uuid=${uuid}`),
            fetch(`https://sky.shiiyu.moe/api/v2/profile/${uuid}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36' }
            }).catch(() => null),
            fetch(`https://api.hypixel.net/v2/skyblock/profiles?key=${process.env.HYPIXEL_KEY}&uuid=${uuid}`).catch(() => null)
        ]);

        if (!profiles || profiles.length === 0) return res.status(404).json({ error: "No SkyBlock profiles found!" });

        let activeProf = profiles[0];
        let maxSaveTime = 0;
        for (const p of profiles) {
            if (p.me && p.me.lastSave > maxSaveTime) {
                maxSaveTime = p.me.lastSave;
                activeProf = p;
            }
        }

        const me = activeProf.me;

        let loc = "🔴 Offline";
        if (statusRes && statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.success && statusData.session?.online) {
                const s = statusData.session;
                loc = s.gameType === "SKYBLOCK" ? `🟢 Online (${s.mode || "SkyBlock"})` : `🟡 Playing ${s.gameType}`;
            }
        }

        let nwStr = "0", unsoulNw = "0";
        if (nwRes && nwRes.ok) {
            const nwJson = await nwRes.json();
            const profileIdNoDashes = activeProf.profileId.replace(/-/g, ''); 
            const scProfile = nwJson.profiles[profileIdNoDashes];
            if (scProfile && scProfile.data?.networth) {
                nwStr = formatNum(scProfile.data.networth.networth);
                unsoulNw = formatNum(scProfile.data.networth.unsoulboundNetworth);
            }
        }

        let petName = "None", petRarity = "COMMON", petItem = "None";
        if (me.pets) {
            const activeP = me.pets.find(p => p.active);
            if (activeP) {
                petRarity = activeP.tier || activeP.rarity;
                petName = activeP.type.replace(/_/g, ' ').toLowerCase();
                petItem = (activeP.heldItem || "None").replace(/_/g, ' ').toLowerCase();
            }
        }

        let mp = me.highestMagicalPower || me.magicalPower?.total || me.accessories?.magicPower || 0;
        
        // ==========================================
        // THE HOTM RAW EXTRACTOR (Bypass Library)
        // ==========================================
        let hotmLvl = me.hotm?.experience?.level || 0;
        let hotmAb = me.hotm?.ability || "None";
        
        if (rawRes && rawRes.ok) {
            const rawJson = await rawRes.json();
            const rawProf = rawJson.profiles?.find(p => p.profile_id.replace(/-/g, '') === activeProf.profileId.replace(/-/g, ''));
            if (rawProf && rawProf.members[uuid]) {
                const rm = rawProf.members[uuid];
                // Hypixel API update fallback (player_data check)
                const miningCore = rm.player_data?.mining_core || rm.mining_core;
                if (miningCore) {
                    const xp = miningCore.experience || 0;
                    hotmLvl = getHotmLevel(xp); // Manual XP to Tier calculation
                    
                    if (miningCore.selected_pickaxe_ability) {
                        hotmAb = miningCore.selected_pickaxe_ability.replace(/_/g, ' ').toLowerCase();
                    }
                }
            }
        }

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
            activePetName: petName,
            activePetRarity: petRarity,
            activePetItem: petItem,
            catacombsLevel: me.dungeons?.experience?.level || 0,
            selectedClass: me.dungeons?.classes?.selected || "None",
            secretsFound: me.dungeons?.secrets || 0,
            f7Clears: me.dungeons?.completions?.catacombs?.Floor_7 || 0,
            m7Clears: me.dungeons?.completions?.masterCatacombs?.Floor_7 || 0,
            hotmLevel: hotmLvl,
            hotmAbility: hotmAb
        };

        cache.set(cacheKey, { data: finalOutput, timestamp: Date.now() });
        res.status(200).json(finalOutput);

    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};
