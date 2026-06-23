const Hypixel = require('hypixel-api-reborn');
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing!" });

    try {
        const profiles = await hypixel.getSkyblockProfiles(playerName);
        const mpData = profiles.map(profile => {
            return {
                profileName: profile.profileName,
                // '.me.accessories' se sirf magic power aur talismans ka data nikalta hai
                magicPower: profile.me.accessories ? profile.me.accessories.magicPower : 0,
                selectedPower: profile.me.accessories ? profile.me.accessories.selectedPower : "None"
            };
        });
        res.status(200).json(mpData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
