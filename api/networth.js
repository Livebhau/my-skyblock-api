const cache = new Map();

// Helper function: 1540000000 ko sundar sa "1.54B" ya "15.4M" likhne ke liye
function formatNumber(num) {
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
        // Asli Pro-Move: SkyCrypt ki Open API ko as an 'Upstream Engine' use kar rahe hain
        const response = await fetch(`https://sky.shiiyu.moe/api/v2/profile/${playerName}`);
        if (!response.ok) return res.status(404).json({ error: "Player nahi mila ya SkyCrypt down hai!" });

        const data = await response.json();
        const profiles = data.profiles;

        // Active profile dhoondo
        let activeProfile = null;
        for (const key in profiles) {
            if (profiles[key].current) {
                activeProfile = profiles[key];
                break;
            }
        }

        if (!activeProfile || !activeProfile.data?.networth?.networth) {
            return res.status(404).json({ error: "Is account ki Networth API ne calculate nahi ki (Shayad API band hai)!" });
        }

        const nw = activeProfile.data.networth;

        const result = {
            username: playerName,
            activeProfileName: activeProfile.cute_name,
            totalNetworth: Math.floor(nw.networth),
            formattedNetworth: formatNumber(nw.networth),
            unsoulboundNetworth: Math.floor(nw.unsoulboundNetworth || 0), // Wo saman jo trade/sell ho sakta hai
            formattedUnsoulbound: formatNumber(nw.unsoulboundNetworth || 0),
            breakdown: {
                inventory: formatNumber(nw.types?.inventory?.total || 0),
                wardrobe: formatNumber(nw.types?.wardrobe?.total || 0),
                armor: formatNumber(nw.types?.armor?.total || 0),
                equipment: formatNumber(nw.types?.equipment?.total || 0),
                pets: formatNumber(nw.types?.pets?.total || 0),
                accessories: formatNumber(nw.types?.accessories?.total || 0),
                personalVault: formatNumber(nw.types?.personal_vault?.total || 0),
                sacks: formatNumber(nw.types?.sacks?.total || 0)
            }
        };

        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ error: "Networth Engine Error: " + error.message });
    }
};
