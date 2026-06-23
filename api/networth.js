const cache = new Map();

function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return "0";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + ' Billion';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + ' Million';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toString();
}

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing! ?name=PlayerName lagao" });

    const cacheKey = playerName.toLowerCase() + "_nw";
    if (cache.has(cacheKey) && (Date.now() - cache.get(cacheKey).timestamp < 300000)) {
        return res.status(200).json(cache.get(cacheKey).data);
    }

    try {
        // STEP 1: Pehle naam se UUID nikalo (SkyCrypt UUID par 10x zyada stable rehta hai)
        const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${playerName}`);
        if (!mojangRes.ok) return res.status(404).json({ error: `Player '${playerName}' Mojang par nahi mila.` });
        const mojangData = await mojangRes.json();
        const uuid = mojangData.id;

        // STEP 2: Asli insaan jaisa 'User-Agent' dalkar Cloudflare ko bypass karo
        const response = await fetch(`https://sky.shiiyu.moe/api/v2/profile/${uuid}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: "SkyCrypt ke Cloudflare ne humara server block kar diya hai!", 
                http_status: response.status 
            });
        }

        const data = await response.json();
        if (data.error) return res.status(400).json({ error: "SkyCrypt Error: " + data.error });

        const profiles = data.profiles;
        if (!profiles) return res.status(404).json({ error: "SkyCrypt par is bande ka koi data nahi hai." });

        // Active profile dhoondo
        let activeProfile = null;
        for (const pId in profiles) {
            if (profiles[pId].current) {
                activeProfile = profiles[pId];
                break;
            }
        }

        if (!activeProfile) return res.status(404).json({ error: "Koi active profile nahi mili." });

        const nw = activeProfile.data?.networth;
        
        // Agar profile nayi hai aur SkyCrypt ne calculate hi nahi ki:
        if (!nw || nw.networth === undefined) {
            return res.status(404).json({ 
                error: "Networth is calculating...", 
                tip: `Bhai, is bande ki networth SkyCrypt ke server par ready nahi hai. Ek baar browser me 'https://sky.shiiyu.moe/stats/${playerName}' open karke unka math trigger karo, aur 10 second baad yahan refresh maro!`
            });
        }

        const result = {
            username: mojangData.name,
            activeProfileName: activeProfile.cute_name,
            totalNetworth: Math.floor(nw.networth || 0),
            formattedNetworth: formatNumber(nw.networth),
            unsoulboundNetworth: Math.floor(nw.unsoulboundNetworth || 0),
            formattedUnsoulbound: formatNumber(nw.unsoulboundNetworth),
            breakdown: {
                wardrobe: formatNumber(nw.types?.wardrobe?.total || 0),
                inventory: formatNumber(nw.types?.inventory?.total || 0),
                storage: formatNumber(nw.types?.storage?.total || nw.types?.personal_vault?.total || 0),
                pets: formatNumber(nw.types?.pets?.total || 0),
                accessories: formatNumber(nw.types?.accessories?.total || 0),
                armor: formatNumber(nw.types?.armor?.total || 0),
                equipment: formatNumber(nw.types?.equipment?.total || 0),
                sacks: formatNumber(nw.types?.sacks?.total || 0)
            }
        };

        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ error: "Networth Engine Crash", details: error.message });
    }
};
