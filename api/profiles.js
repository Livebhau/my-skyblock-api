const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);
const cache = new Map();

// Helper: Paise ko format karne ke liye (Billion/Million)
function formatNum(num) {
    if (!num || isNaN(num)) return "0";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
}

// Helper: UUID me dashes add karne ke liye (Hypixel ke naye update ke liye)
function addDashes(uuid) {
    return uuid.substr(0,8)+"-"+uuid.substr(8,4)+"-"+uuid.substr(12,4)+"-"+uuid.substr(16,4)+"-"+uuid.substr(20);
}

// Custom HOTM Calculator (Kyunki library HOTM track karne me fail ho rahi hai)
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
        const apiKey = process.env.HYPIXEL_KEY;

        // 1. Mojang se UUID nikalo
        const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${playerName}`);
        if (!mojangRes.ok) return res.status(404).json({ error: "Player Mojang par nahi mila!" });
        const mojangData = await mojangRes.json();
        const uuid = mojangData.id;
        const dashedUuid = addDashes(uuid); // Yeh Hypixel ke naye API structure ke liye zaroori hai

        // 2. Parallel Data Fetching
        const [rebornProfiles, statusRes, nwRes, rawRes] = await Promise.all([
            hypixel.getSkyblockProfiles(playerName, { fetchFairySouls: false }).catch(() => []),
            fetch(`https://api.hypixel.net/status?key=${apiKey}&uuid=${uuid}`).catch(() => null),
            fetch(`https://sky.shiiyu.moe/api/v2/profile/${uuid}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36' }
            }).catch(() => null),
            fetch(`https://api.hypixel.net/v2/skyblock/profiles?key=${apiKey}&uuid=${uuid}`).catch(() => null)
        ]);

        // 3. Raw API se 'Aakhiri baar kheli gayi' Profile uthao
        let rawActiveProf = null;
        let maxSaveTime = 0;
        let rawData = null;

        if (rawRes && rawRes.ok) {
            const rawJson = await rawRes.json();
            if (rawJson.profiles) {
                for (const p of rawJson.profiles) {
                    // Hypixel ya toh normal UUID dega ya dashed UUID
                    const member = p.members[uuid] || p.members[dashedUuid];
                    if (member && member.last_save && member.last_save > maxSaveTime) {
                        maxSaveTime = member.last_save;
                        rawActiveProf = p;
                        rawData = member; // Isme player ka saara kachha data hai
                    }
                }
            }
        }

        if (!rawActiveProf || !rawData) return res.status(404).json({ error: "Is player ka koi data nahi mila!" });

        // 4. Status Check
        let loc = "🔴 Offline";
        if (statusRes && statusRes.ok) {
            const statusJson = await statusRes.json();
            if (statusJson.success && statusJson.session?.online) {
                const s = statusJson.session;
                loc = s.gameType === "SKYBLOCK" ? `🟢 Online (${s.mode || "SkyBlock"})` : `🟡 Playing ${s.gameType}`;
            }
        }

        // 5. SkyCrypt Networth (Strict Current Match)
        let nwStr = "0", unsoulNw = "0";
        if (nwRes && nwRes.ok) {
            const nwJson = await nwRes.json();
            if (nwJson.profiles) {
                // Seedha us profile me jao jisme current: true likha ho
                for (const key in nwJson.profiles) {
                    if (nwJson.profiles[key].current) {
                        const nData = nwJson.profiles[key].data?.networth;
                        if (nData) {
                            nwStr = formatNum(nData.networth);
                            unsoulNw = formatNum(nData.unsoulboundNetworth);
                        }
                        break; // Milte hi loop rok do
                    }
                }
            }
        }

        // 6. HOTM & MP directly from RAW Data (Library bypass kardi)
        let hotmLvl = 0;
        let hotmAb = "None";
        const miningCore = rawData.player_data?.mining_core || rawData.mining_core;
        if (miningCore) {
            hotmLvl = getHotmLevel(miningCore.experience);
            hotmAb = (miningCore.selected_pickaxe_ability || "None").replace(/_/g, ' ').toLowerCase();
        }

        const mp = rawData.accessory_bag_storage?.highest_magical_power || 0;
        const mpStone = rawData.accessory_bag_storage?.selected_power || "None";
        const purse = rawData.currencies?.coin_purse || 0;

        // 7. Library (Reborn) se Dungeons aur Skills ka data uthao (Easy format hota hai)
        let skAvg = 0, sbLvl = 0, cataLvl = 0, sClass = "None", sec = 0, f7 = 0, m7 = 0;
        let petName = "None", petRarity = "COMMON", petItem = "None";

        if (rebornProfiles && rebornProfiles.length > 0) {
            // Raw Profile ID ko match karke ekdum wahi profile uthao
            const activeReborn = rebornProfiles.find(p => p.profileId === rawActiveProf.profile_id);
            if (activeReborn && activeReborn.me) {
                const me = activeReborn.me;
                sbLvl = me.level ? (Math.round(me.level * 100) / 100) : 0;
                skAvg = me.skills?.average ? (Math.round(me.skills.average * 100) / 100) : 0;
                
                cataLvl = me.dungeons?.experience?.level || 0;
                sClass = me.dungeons?.classes?.selected || "None";
                sec = me.dungeons?.secrets || 0;
                f7 = me.dungeons?.completions?.catacombs?.Floor_7 || 0;
                m7 = me.dungeons?.completions?.masterCatacombs?.Floor_7 || 0;

                if (me.pets) {
                    const activeP = me.pets.find(p => p.active);
                    if (activeP) {
                        petRarity = activeP.tier || activeP.rarity;
                        petName = activeP.type.replace(/_/g, ' ').toLowerCase();
                        petItem = (activeP.heldItem || "None").replace(/_/g, ' ').toLowerCase();
                    }
                }
            }
        }

        const finalOutput = {
            username: mojangData.name,
            profileName: rawActiveProf.cute_name || "Profile",
            statusLocation: loc,
            skyblockLevel: sbLvl,
            skillAverage: skAvg,
            purseCoins: formatNum(purse),
            networthFormatted: nwStr,
            unsoulboundFormatted: unsoulNw,
            magicPower: mp,
            powerStone: mpStone,
            activePetName: petName,
            activePetRarity: petRarity,
            activePetItem: petItem,
            catacombsLevel: cataLvl,
            selectedClass: sClass,
            secretsFound: sec,
            f7Clears: f7,
            m7Clears: m7,
            hotmLevel: hotmLvl,
            hotmAbility: hotmAb
        };

        cache.set(cacheKey, { data: finalOutput, timestamp: Date.now() });
        res.status(200).json(finalOutput);

    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};
