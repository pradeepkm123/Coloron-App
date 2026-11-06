const express = require('express');
const router = express.Router();
const deviceController = require('./device.controller');
const { protect } = require('../../middleware/auth.middleware');

router.get('/', protect, deviceController.getDevices);
router.post('/', protect, deviceController.addOrUpdateDevice);
router.delete('/:id', protect, deviceController.deleteDevice);
router.get('/:id(*)/settings', protect, deviceController.getDeviceSettings);
router.put('/:id(*)/settings', protect, deviceController.updateDeviceSettings);
router.put('/:id(*)/channels/sync', protect, deviceController.syncDeviceChannels);

module.exports = router;
