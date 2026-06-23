const Hypixel = require('hypixel-api-reborn');

// Dhyan do: Maine variable ka naam 'HYPIXEL_KEY' rakha hai jo aapke screenshot me tha
const hypixel = new Hypixel.Client(process.env.HYPIXEL_KEY);

module.exports = async (req, res) => {
    const playerName = req.query.name || 'LiveBhai';

    try {
        const profiles = await hypixel.getSkyblockProfiles(playerName);
        res.status(200).json(profiles);
    } catch (error) {
        res.status(500).json({ error: "Bhai Hypixel se data nahi aaya: " + error.message });
    }
};
