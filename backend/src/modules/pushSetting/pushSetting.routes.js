const express = require('express');
const router = express.Router();
const pushSettingController = require('./pushSetting.controller');
const { protect } = require('../../middleware/auth.middleware');

router.post('/save', protect, pushSettingController.savePushSettings);
router.get('/:deviceId', protect, pushSettingController.getPushSettings);

module.exports = router;
