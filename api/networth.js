const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);
const cache = new Map();

// Helper function Networth ko "Billion/Million" me convert karne ke liye
function formatNumber(num) {
    if (!num) return "0";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + ' Billion';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + ' Million';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toString();
}

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing!" });

    const cacheKey = playerName.toLowerCase() + "_overview";
    const currentTime = Date.now();

    // 5-Minute Cache
    if (cache.has(cacheKey) && (currentTime - cache.get(cacheKey).timestamp < 300000)) {
        return res.status(200).json(cache.get(cacheKey).data);
    }

    try {
        // STEP 1: Hypixel API Reborn se baaki standard data lekar aao
        const profiles = await hypixel.getSkyblockProfiles(playerName);
        const activeProfile = profiles.find(profile => profile.selected);
        if (!activeProfile) return res.status(404).json({ error: "No active profile found!" });

        const me = activeProfile.me;
        const uuid = me.uuid; // Player ka unique UUID mil gaya

        // STEP 2: SkyCrypt se Networth uthao halke se (Chrome Browser User-Agent dalkar)
        let networthVal = 0;
        let formattedNw = "Calculating/API Locked";
        
        try {
            const nwResponse = await fetch(`https://sky.shiiyu.moe/api/v2/profile/${uuid}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                }
            });
            
            if (nwResponse.ok) {
                const nwData = await nwResponse.json();
                // SkyCrypt ke profiles me se current/active profile ka loop chalaya
                for (const pId in nwData.profiles) {
                    if (nwData.profiles[pId].current) {
                        const nwObj = nwData.profiles[pId].data?.networth;
                        if (nwObj && nwObj.networth) {
                            networthVal = Math.floor(nwObj.networth);
                            formattedNw = formatNumber(nwObj.networth);
                        }
                        break;
                    }
                }
            }
        } catch (err) {
            console.log("Networth bypass failed in background, setting defaults.");
        }

        // STEP 3: Active Pet nikalne ka logic
        let activePetName = "None";
        if (me.pets) {
            const currentPet = me.pets.find(p => p.active);
            if (currentPet) activePetName = `${currentPet.rarity} ${currentPet.type}`;
        }

        // STEP 4: Final JSON Response jisme networth successfully add ho chuki hai
        const cleanSummary = {
            username: playerName,
            profileName: activeProfile.profileName,
            gameMode: activeProfile.gameMode || "Normal",
            skyblockLevel: me.level ? Math.round(me.level * 100) / 100 : 0,
            networth: networthVal,               // Raw number (eg. 245000000)
            formattedNetworth: formattedNw,       // Sundar string (eg. "24.52 Billion")
            purse: me.purse ? Math.floor(me.purse) : 0,
            fairySouls: me.fairySouls || 0,
            skillAverage: me.skills ? Math.round(me.skills.average * 100) / 100 : 0,
            selectedClass: me.dungeons ? me.dungeons.classes.selected : "None",
            catacombsLevel: me.dungeons ? me.dungeons.experience.level : 0,
            activePet: activePetName
        };

        // Cache database save
        cache.set(cacheKey, { data: cleanSummary, timestamp: currentTime });
        res.status(200).json(cleanSummary);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
