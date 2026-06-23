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

function addDashes(uuid) {
    return uuid.substr(0,8)+"-"+uuid.substr(8,4)+"-"+uuid.substr(12,4)+"-"+uuid.substr(16,4)+"-"+uuid.substr(20);
}

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

        const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${playerName}`);
        if (!mojangRes.ok) return res.status(404).json({ error: "Yeh player exist nahi karta!" });
        const mojangData = await mojangRes.json();
        const uuid = mojangData.id;
        const dashedUuid = addDashes(uuid);

        // Fetching sab ek sath, par crash hone par NULL return karega
        const [rebornProfiles, statusRes, nwRes, rawRes] = await Promise.all([
            hypixel.getSkyblockProfiles(playerName, { fetchFairySouls: false }).catch(() => null),
            fetch(`https://api.hypixel.net/status?key=${apiKey}&uuid=${uuid}`).catch(() => null),
            fetch(`https://sky.shiiyu.moe/api/v2/profile/${uuid}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36' }
            }).catch(() => null),
            fetch(`https://api.hypixel.net/v2/skyblock/profiles?key=${apiKey}&uuid=${uuid}`).catch(() => null)
        ]);

        // 1. Agar Library ko data na mile toh error do
        if (!rebornProfiles || rebornProfiles.length === 0) {
            return res.status(404).json({ error: "Is player ne kabhi Skyblock nahi khela!" });
        }

        // 2. Asli Active Profile dhoondo (Library ke sahare)
        let activeReborn = rebornProfiles.find(p => p.selected);
        if (!activeReborn) {
            let maxSave = 0;
            for (const p of rebornProfiles) {
                if (p.me && p.me.lastSave > maxSave) {
                    maxSave = p.me.lastSave;
                    activeReborn = p;
                }
            }
        }
        if (!activeReborn) activeReborn = rebornProfiles[0]; // Ultimate Backup

        const me = activeReborn.me;
        const activeProfileId = activeReborn.profileId;

        // 3. Location Status
        let loc = "🔴 Offline";
        if (statusRes && statusRes.ok) {
            const statusJson = await statusRes.json();
            if (statusJson.success && statusJson.session?.online) {
                const s = statusJson.session;
                loc = s.gameType === "SKYBLOCK" ? `🟢 Online (${s.mode || "SkyBlock"})` : `🟡 Playing ${s.gameType}`;
            }
        }

        // 4. SkyCrypt Networth
        let nwStr = "0", unsoulNw = "0";
        if (nwRes && nwRes.ok) {
            const nwJson = await nwRes.json();
            if (nwJson.profiles) {
                for (const key in nwJson.profiles) {
                    if (nwJson.profiles[key].current) {
                        const nData = nwJson.profiles[key].data?.networth;
                        if (nData) {
                            nwStr = formatNum(nData.networth);
                            unsoulNw = formatNum(nData.unsoulboundNetworth);
                        }
                        break;
                    }
                }
            }
        }

        // 5. Default Values (Agar Raw API fail ho jaye)
        let hotmLvl = 0, hotmAb = "None";
        let mp = me.highestMagicalPower || me.magicalPower?.total || me.accessories?.magicPower || 0;
        let mpStone = me.accessories?.selectedPower || "None";
        let purse = me.purse || 0;

        // 6. HOTM & MP directly from RAW Data (Agar available ho)
        if (rawRes && rawRes.ok) {
            const rawJson = await rawRes.json();
            if (rawJson.profiles) {
                // Exact same profile id match karo
                const rawProf = rawJson.profiles.find(p => p.profile_id.replace(/-/g, '') === activeProfileId.replace(/-/g, ''));
                if (rawProf) {
                    const rawData = rawProf.members[uuid] || rawProf.members[dashedUuid];
                    if (rawData) {
                        const miningCore = rawData.player_data?.mining_core || rawData.mining_core;
                        if (miningCore) {
                            hotmLvl = getHotmLevel(miningCore.experience);
                            hotmAb = (miningCore.selected_pickaxe_ability || "None").replace(/_/g, ' ').toLowerCase();
                        }
                        if (rawData.accessory_bag_storage) {
                            mp = rawData.accessory_bag_storage.highest_magical_power || mp;
                            mpStone = rawData.accessory_bag_storage.selected_power || mpStone;
                        }
                        if (rawData.currencies?.coin_purse) purse = rawData.currencies.coin_purse;
                    }
                }
            }
        }

        // 7. Baaki saara data Library se
        let sbLvl = me.level ? (Math.round(me.level * 100) / 100) : 0;
        let skAvg = me.skills?.average ? (Math.round(me.skills.average * 100) / 100) : 0;
        
        let cataLvl = me.dungeons?.experience?.level || 0;
        let sClass = me.dungeons?.classes?.selected || "None";
        let sec = me.dungeons?.secrets || 0;
        let f7 = me.dungeons?.completions?.catacombs?.Floor_7 || 0;
        let m7 = me.dungeons?.completions?.masterCatacombs?.Floor_7 || 0;

        let petName = "None", petRarity = "COMMON", petItem = "None";
        if (me.pets) {
            const activeP = me.pets.find(p => p.active);
            if (activeP) {
                petRarity = activeP.tier || activeP.rarity;
                petName = activeP.type.replace(/_/g, ' ').toLowerCase();
                petItem = (activeP.heldItem || "None").replace(/_/g, ' ').toLowerCase();
            }
        }

        const finalOutput = {
            username: mojangData.name,
            profileName: activeReborn.cuteName || "Profile",
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
