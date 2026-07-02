const Media = require('./media.model');

/**
 * @desc    Save media metadata (snapshot or local recording)
 * @route   POST /api/media
 * @access  Private
 */
exports.saveMedia = async (req, res) => {
    try {
        const {
            type,
            fileName,
            filePath,
            channelId,
            deviceName,
            thumbnailPath,
            userEmail,
            userId
        } = req.body;

        if (!type || !fileName || !filePath || channelId === undefined || !deviceName) {
            return res.status(400).json({ message: 'Missing required media metadata fields' });
        }

        const newMedia = await Media.create({
            type,
            fileName,
            filePath,
            channelId,
            deviceName,
            thumbnailPath,
            userEmail: userEmail || req.user.email,
            userId: userId || req.user._id,
        });

        console.log(`[MediaController] Media metadata saved for ${type}: ${fileName}`);
        res.status(201).json(newMedia);
    } catch (error) {
        console.error('[MediaController] Save Media Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get saved media metadata list
 * @route   GET /api/media
 * @access  Private
 */
exports.getMediaList = async (req, res) => {
    try {
        const { type } = req.query;
        const query = {
            $or: [
                { userId: req.user._id },
                { userEmail: req.user.email }
            ]
        };
        if (type) {
            query.type = type;
        }

        const mediaList = await Media.find(query).sort({ createdAt: -1 });
        res.json(mediaList);
    } catch (error) {
        console.error('[MediaController] Get Media List Error:', error);
        res.status(500).json({ message: error.message });
    }
};
