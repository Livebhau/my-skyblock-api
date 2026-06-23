const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);

module.exports = async (req, res) => {
    const playerName = req.query.name;

    // 1. Agar URL mein naam missing hai, toh LiveBhai nahi dikhayega, sidha error dega
    if (!playerName) {
        return res.status(400).json({ error: "Bhai, URL ke end mein ?name=PlayerKaNaam lagana zaroori hai!" });
    }

    try {
        const profiles = await hypixel.getSkyblockProfiles(playerName);
        
        // 2. Yeh trick kisi bhi Co-op member ka data hata degi aur SIRF search kiye gaye player ka data bachega
        const strictPlayerData = profiles.map(profile => {
            return {
                profileName: profile.profileName,
                profileId: profile.profileId,
                playerStats: profile.me  // '.me' Hypixel API Reborn ka feature hai jo sirf specific player nikalta hai
            };
        });

        res.status(200).json(strictPlayerData);
    } catch (error) {
        res.status(500).json({ error: "Hypixel se data nahi aaya: " + error.message });
    }
};
