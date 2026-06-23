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
        const apiKey = process.env.HYPIXEL_KEY;

        // 1. Get exact UUID from Mojang
        const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${playerName}`);
        if (!mojangRes.ok) return res.status(404).json({ error: "Player Mojang par nahi mila!" });
        const mojangData = await mojangRes.json();
        const uuid = mojangData.id;

        // 2. Fetch 3 APIs simultaneously (Parallel Engine)
        const [sbRes, statusRes, nwRes] = await Promise.all([
            fetch(`https://api.hypixel.net/v2/skyblock/profiles?key=${apiKey}&uuid=${uuid}`),
            fetch(`https://api.hypixel.net/status?key=${apiKey}&uuid=${uuid}`),
            fetch(`https://sky.shiiyu.moe/api/v2/profile/${uuid}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36' }
            }).catch(() => null)
        ]);

        const sbData = await sbRes.json();
        const statusData = await statusRes.json();

        if (!sbData.success || !sbData.profiles || sbData.profiles.length === 0) {
            return res.status(404).json({ error: "No SkyBlock profiles found!" });
        }

        // =========================================================
        // 3. THE BULLETPROOF ACTIVE PROFILE SELECTOR (By Last Save)
        // =========================================================
        let activeProf = sbData.profiles[0];
        let maxSaveTime = 0;

        for (const p of sbData.profiles) {
            const member = p.members[uuid];
            if (member && member.last_save && member.last_save > maxSaveTime) {
                maxSaveTime = member.last_save;
                activeProf = p;
            }
        }

        const me = activeProf.members[uuid];

        // 4. Extract Real Location
        let loc = "🔴 Offline";
        if (statusData.success && statusData.session?.online) {
            const s = statusData.session;
            loc = s.gameType === "SKYBLOCK" ? `🟢 Online (${s.map || "SkyBlock"})` : `🟡 Playing ${s.gameType}`;
        }

        // 5. SkyBlock Level (V2 format: leveling.experience / 100)
        let level = 0;
        if (me.leveling?.experience) level = (me.leveling.experience / 100).toFixed(2);
        else if (me.player_data?.skyblock_level?.level) level = me.player_data.skyblock_level.level;

        // 6. Magic Power
        const mp = me.accessory_bag_storage?.highest_magical_power || 0;
        const mpStone = me.accessory_bag_storage?.selected_power || "None";

        // 7. Extract Networth & Skills from SkyCrypt match
        let nwStr = "0 Coins", unsoulNw = "0", skillAvg = "0.0";
        if (nwRes && nwRes.ok) {
            const nwJson = await nwRes.json();
            for (const k in nwJson.profiles) {
                if (nwJson.profiles[k].current) {
                    const nObj = nwJson.profiles[k].data?.networth;
                    if (nObj) {
                        nwStr = formatNum(nObj.networth);
                        unsoulNw = formatNum(nObj.unsoulboundNetworth);
                    }
                    const skObj = nwJson.profiles[k].data?.skills?.skills;
                    if (skObj) {
                        let tot = 0, cnt = 0;
                        ['mining','foraging','enchanting','farming','combat','fishing','alchemy','taming'].forEach(s => {
                            if (skObj[s]?.level) { tot += skObj[s].level; cnt++; }
                        });
                        if (cnt > 0) skillAvg = (tot / cnt).toFixed(2);
                    }
                    break;
                }
            }
        }

        // 8. Active Pet
        let pet = "None";
        if (me.pets) {
            const activeP = me.pets.find(p => p.active);
            if (activeP) pet = `${activeP.tier || activeP.rarity} ${activeP.type}`.replace(/_/g, ' ');
        }

        const finalOutput = {
            username: mojangData.name,
            profileName: activeProf.cute_name || "Profile",
            statusLocation: loc,
            skyblockLevel: level,
            skillAverage: skillAvg,
            purseCoins: formatNum(me.currencies?.coin_purse || 0),
            networthFormatted: nwStr,
            unsoulboundFormatted: unsoulNw,
            magicPower: mp,
            powerStone: mpStone,
            activePet: pet
        };

        cache.set(cacheKey, { data: finalOutput, timestamp: Date.now() });
        res.status(200).json(finalOutput);

    } catch (e) { res.status(500).json({ error: e.message }); }
};
            
