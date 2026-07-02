const Event = require('./event.model');
const User = require('../auth/user.model');
const Device = require('../device/device.model');
const admin = require('../../utils/firebase');

const PushSetting = require('../pushSetting/pushSetting.model');

// ─── POST /api/events — Save event ───────────────────────────────────────────
/**
 * @desc    Create a new AI event (UI-only, no push notification sent)
 * @route   POST /api/events
 * @access  Public (internal use / from mobile SDK bridge)
 */
exports.createEvent = async (req, res) => {
    try {
        const { deviceId, channelId, type, timestamp, snapshotUrl, deviceName, channelName } = req.body;

        if (!deviceId || !type) {
            return res.status(400).json({ message: 'Missing required event fields' });
        }

        const newEvent = await Event.create({
            deviceId,
            channelId,
            type,
            timestamp: timestamp || new Date(),
            snapshotUrl,
            deviceName,
            channelName,
            features: req.body.features || {},
        });

        res.status(201).json(newEvent);

        // 🚀 Push Notification Logic
        (async () => {
            try {
                // 0. Check Device-Level Global Push (Affects all users)
                const device = await Device.findOne({ id: deviceId });
                if (device && device.pushEnabled === false) {
                    console.log(`[EventPush] 🚫 Notification skipped globally for device ${deviceId}`);
                    return;
                }

                // 1. Find all users subscribed to this device
                const users = await User.find({
                    subscribedDeviceIds: deviceId,
                    fcmToken: { $exists: true, $ne: '' }
                });

                console.log(`[EventPush] Found ${users.length} potential users for notification`);

                for (const user of users) {
                    // Find the user's settings for this device in their pushSettings array
                    const userDeviceSetting = (user.pushSettings || []).find(
                        ps => String(ps.deviceId) === String(deviceId)
                    );

                    // 1. Check User Message Subscription (Affects only current user)
                    const isMessageSubscriptionEnabled = userDeviceSetting 
                        ? (userDeviceSetting.global?.messageSubscription !== false)
                        : true;

                    if (!isMessageSubscriptionEnabled) {
                        console.log(`[EventPush] 🚫 Notification skipped: USER_SUBSCRIPTION is disabled for user ${user.email}`);
                        continue;
                    }

                    const eventTypeUpper = type.toUpperCase();
                    const isSystemEvent = [
                        'OFFLINE', 'CAMERA_OFFLINE', 'IPC_OFFLINE', 'VIDEO_LOSS', 'ILLEGAL_ACCESS',
                        'DISK_FULL', 'DISK_IO_ERROR', 'DISK_ERROR', 'NO_DISK', 'PULL_OUT_DISK',
                        'IP_CONFLICT', 'NETWORK_DISCONNECTION'
                    ].includes(eventTypeUpper);

                    // 2. Check specific event type activation
                    if (isSystemEvent) {
                        let sysEnabled = true;
                        if (userDeviceSetting && userDeviceSetting.global) {
                            if (['OFFLINE', 'CAMERA_OFFLINE', 'IPC_OFFLINE', 'VIDEO_LOSS'].includes(eventTypeUpper)) {
                                sysEnabled = userDeviceSetting.global.cameraOffline !== false;
                            } else if (['DISK_IO_ERROR', 'DISK_ERROR'].includes(eventTypeUpper)) {
                                sysEnabled = userDeviceSetting.global.diskError !== false;
                            } else if (eventTypeUpper === 'DISK_FULL') {
                                sysEnabled = userDeviceSetting.global.diskFull !== false;
                            } else if (eventTypeUpper === 'NO_DISK') {
                                sysEnabled = userDeviceSetting.global.noDisk !== false;
                            } else if (eventTypeUpper === 'PULL_OUT_DISK') {
                                sysEnabled = userDeviceSetting.global.pullOutDisk !== false;
                            } else if (eventTypeUpper === 'ILLEGAL_ACCESS') {
                                sysEnabled = userDeviceSetting.global.illegalAccess !== false;
                            } else if (eventTypeUpper === 'IP_CONFLICT') {
                                sysEnabled = userDeviceSetting.global.ipConflict !== false;
                            } else if (eventTypeUpper === 'NETWORK_DISCONNECTION') {
                                sysEnabled = userDeviceSetting.global.networkDisconnection !== false;
                            }
                        }
                        if (!sysEnabled) {
                            console.log(`[EventPush] 🚫 Notification skipped: System event ${eventTypeUpper} is disabled for user ${user.email}`);
                            continue;
                        }
                    } else {
                        // Channel-level AI/Motion alarms
                        let typeEnabled = true;
                        if (userDeviceSetting) {
                            const eventChId = parseInt(channelId, 10);
                            const channelSetting = (userDeviceSetting.channels || []).find(
                                ch => Number(ch.channelId) === eventChId
                            );

                            if (channelSetting) {
                                const typeKeyMap = {
                                    MOTION: 'motion',
                                    SENSOR: 'sensor',
                                    HUMAN_DETECTION: 'human',
                                    VEHICLE_DETECTION: 'vehicle',
                                    FACE_DETECTION: 'faceDet',
                                    FACE_RECOGNITION: 'faceRec',
                                    LINE_CROSSING: 'line',
                                    INTRUSION: 'intrusion',
                                    LOITERING: 'loitering',
                                    CROWD_DETECTION: 'crowd',
                                    TAMPERING: 'tamper'
                                };
                                const key = typeKeyMap[eventTypeUpper] || eventTypeUpper.toLowerCase();
                                typeEnabled = channelSetting[key] === true;
                            } else {
                                // If channels array is populated but this channel is missing, disable it.
                                // Otherwise if channels array is empty, default to true.
                                typeEnabled = (userDeviceSetting.channels || []).length === 0;
                            }
                        }

                        if (!typeEnabled) {
                            console.log(`[EventPush] 🚫 Notification skipped: ${eventTypeUpper} ch ${channelId} is not subscribed for user ${user.email}`);
                            continue;
                        }
                    }

                    // 3. Format Title & Body like SuperLive Plus
                    let notificationTitle = '';
                    if (eventTypeUpper === 'MOTION') {
                        notificationTitle = 'Motion Alarm';
                    } else if (
                        ['OFFLINE', 'CAMERA_OFFLINE', 'IPC_OFFLINE', 'VIDEO_LOSS'].includes(eventTypeUpper)
                    ) {
                        notificationTitle = 'Camera Offline';
                    } else if (eventTypeUpper === 'SENSOR') {
                        notificationTitle = 'Sensor Alarm';
                    } else if (eventTypeUpper === 'TAMPERING') {
                        notificationTitle = 'Tampering Alarm';
                    } else {
                        // Title Case for smart AI alerts (e.g. Human Detection Alert)
                        notificationTitle = eventTypeUpper
                            .replace(/_/g, ' ')
                            .toLowerCase()
                            .replace(/\b\w/g, c => c.toUpperCase()) + ' Alert';
                    }

                    const resolvedDeviceName = deviceName || 'NVR';
                    const resolvedChannelName = channelName || `CH${parseInt(channelId, 10) + 1}`;
                    
                    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
                    const eventTimeStr = (timestamp ? new Date(timestamp) : new Date()).toLocaleTimeString('en-US', timeOptions);
                    
                    const notificationBody = `Device : ${resolvedDeviceName}\nCamera : ${resolvedChannelName}\nTime   : ${eventTimeStr}`;

                    // 4. Send FCM
                    const message = {
                        notification: {
                            title: notificationTitle,
                            body: notificationBody,
                        },
                        data: {
                            deviceId,
                            channelId: String(channelId),
                            type,
                            eventId: String(newEvent._id),
                        },
                        token: user.fcmToken,
                        android: {
                            priority: 'high',
                            notification: {
                                channelId: 'vms_alarms',
                                icon: 'ic_notification',
                                color: '#A83232',
                            }
                        }
                    };

                    try {
                        await admin.messaging().send(message);
                        console.log(`[EventPush] ✅ Notification sent to user: ${user.email}`);
                    } catch (fcmError) {
                        console.error(`[EventPush] ❌ FCM failed for ${user.email}:`, fcmError.message);
                    }
                }
            } catch (innerError) {
                console.error('[EventPush] Internal error:', innerError);
            }
        })();
    } catch (error) {
        console.error('[EventController] Create Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get recent AI events
 * @route   GET /api/events
 * @access  Public
 */
exports.getEvents = async (req, res) => {
    try {
        const { deviceId, limit = 50, includeDeleted = false } = req.query;
        const query = { deleted: includeDeleted === 'true' };
        if (deviceId) query.deviceId = deviceId;

        const events = await Event.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Mark event as read
 * @route   PUT /api/events/:id/read
 */
exports.markRead = async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Soft delete an event
 * @route   DELETE /api/events/:id
 */
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, { deleted: true }, { new: true });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
