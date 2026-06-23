const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing!" });

    try {
        const profiles = await hypixel.getSkyblockProfiles(playerName);
        const skillsData = profiles.map(profile => {
            return {
                profileName: profile.profileName,
                skills: profile.me.skills // Sirf skills ka data filter kiya
            };
        });
        res.status(200).json(skillsData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
