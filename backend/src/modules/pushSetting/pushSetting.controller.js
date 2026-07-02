const PushSetting = require('./pushSetting.model');

exports.savePushSettings = async (req, res) => {
    try {
        const { deviceId, eventType, channels, enabled } = req.body;
        const userEmail = req.user ? req.user.email : null;

        if (!deviceId || !eventType) {
            return res.status(400).json({ message: 'deviceId and eventType are required' });
        }

        const filter = { deviceId, eventType };
        if (userEmail) filter.userEmail = userEmail;

        const update = {
            channels: (channels || []).map(Number),
            enabled: enabled !== false,
            userEmail
        };

        const pushSetting = await PushSetting.findOneAndUpdate(filter, update, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        });

        res.json({ success: true, setting: pushSetting });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getPushSettings = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const userEmail = req.user ? req.user.email : null;

        const filter = { deviceId };
        if (userEmail) filter.userEmail = userEmail;

        const settings = await PushSetting.find(filter);
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
