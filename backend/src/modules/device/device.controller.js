const Device = require('./device.model');
const User = require('../auth/user.model');

exports.getDevices = async (req, res) => {
    try {
        const email = req.user.email;
        const devices = await Device.find({ userEmail: email });
        res.json(devices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.addOrUpdateDevice = async (req, res) => {
    try {
        const email = req.user.email;
        const deviceData = { ...req.body, userEmail: email };

        // Use the hardware serial or unique NVR ID as the key
        const filter = { id: deviceData.id, userEmail: email };
        const device = await Device.findOneAndUpdate(filter, deviceData, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        });

        res.status(201).json(device);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.deleteDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const email = req.user.email;
        await Device.findOneAndDelete({ id, userEmail: email });
        res.json({ message: 'Device deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getDeviceSettings = async (req, res) => {
    try {
        const { id: deviceId } = req.params;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const settings = user.pushSettings.find(ps => ps.deviceId === deviceId);

        if (!settings) {
            return res.json({
                success: true,
                settings: {
                    enabled: true,
                    channels: [],
                    global: { enablePush: true }
                }
            });
        }

        res.json({
            success: true,
            settings
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateDeviceSettings = async (req, res) => {
    try {
        const { id: deviceId } = req.params;
        const settings = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update or add pushSettings for this device
        let psIndex = user.pushSettings.findIndex(ps => ps.deviceId === deviceId);

        const normalizedChannels = (settings.channels || []).map(ch => ({
            channelId: parseInt(ch.channelId !== undefined ? ch.channelId : (ch.id || 0)),
            human: !!ch.human,
            vehicle: !!ch.vehicle,
            faceDet: !!ch.faceDet || !!ch.face_det,
            faceRec: !!ch.faceRec || !!ch.face_rec,
            intrusion: !!ch.intrusion,
            line: !!ch.line,
            loitering: !!ch.loitering,
            crowd: !!ch.crowd,
            tamper: !!ch.tamper || !!ch.tampering,
            motion: !!ch.motion || !!ch.enabled, // enabled is used for motion in UI
            sensor: !!ch.sensor,
        }));

        const newSetting = {
            deviceId,
            enabled: settings.global?.enablePush !== false,
            global: settings.global,
            system: settings.system,
            channels: normalizedChannels
        };

        if (psIndex !== -1) {
            user.pushSettings[psIndex] = newSetting;
        } else {
            user.pushSettings.push(newSetting);
        }

        // Global device-level switch (Affects all users)
        if (settings.global && typeof settings.global.enablePush === 'boolean') {
            await Device.findOneAndUpdate({ id: deviceId }, { pushEnabled: settings.global.enablePush });
        }

        // Also update legacy subscribedDeviceIds if needed
        if (!user.subscribedDeviceIds.includes(deviceId)) {
            user.subscribedDeviceIds.push(deviceId);
        }

        await user.save();
        res.json({ message: 'Push settings updated', success: true });
    } catch (err) {
        console.error('[DeviceController] Settings update error:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.syncDeviceChannels = async (req, res) => {
    try {
        const { id: deviceId } = req.params;
        const email = req.user.email;
        const { maxChannelCount, channels } = req.body;

        const device = await Device.findOne({ id: deviceId, userEmail: email });
        if (!device) return res.status(404).json({ message: 'Device not found' });

        const oldChannels = device.channels || [];
        const newChannels = channels || [];

        const oldChannelNumbers = new Set(oldChannels.map(ch => ch.channelNo));
        const newChannelNumbers = new Set(newChannels.map(ch => ch.channelNo));

        const addedChannels = newChannels.filter(ch => !oldChannelNumbers.has(ch.channelNo));
        const removedChannels = oldChannels.filter(ch => !newChannelNumbers.has(ch.channelNo));

        console.log(`[ChannelSync] Device: ${device.name}`);
        console.log(`[ChannelSync] Max capacity: ${maxChannelCount}`);
        console.log(`[ChannelSync] Previous configured count: ${oldChannels.length}`);
        console.log(`[ChannelSync] Latest configured count: ${newChannels.length}`);
        console.log(`[ChannelSync] Added channels: ${addedChannels.map(ch => 'CH' + ch.channelNo).join(', ') || 'None'}`);
        console.log(`[ChannelSync] Removed channels: ${removedChannels.map(ch => 'CH' + ch.channelNo).join(', ') || 'None'}`);
        console.log(`[ChannelSync] Online count: ${newChannels.filter(ch => ch.isOnline).length}`);
        console.log(`[ChannelSync] Final channels: ${newChannels.map(ch => ch.channelNo).join(',')}`);

        // Update the channel fields
        device.channels = newChannels;
        device.addedChannelCount = newChannels.length;
        device.onlineChannelCount = newChannels.filter(ch => ch.isOnline).length;
        device.maxChannelCount = maxChannelCount || device.maxChannelCount;
        device.lastChannelSyncAt = new Date();
        
        // Also update legacy channelCount just in case for backward compatibility
        device.channelCount = maxChannelCount || device.channelCount;

        await device.save();
        res.json({ message: 'Channels synchronized successfully', device });
    } catch (err) {
        console.error('[DeviceController] Sync channels error:', err);
        res.status(500).json({ message: err.message });
    }
};
