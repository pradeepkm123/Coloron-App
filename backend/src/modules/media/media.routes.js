const express = require('express');
const router = express.Router();
const mediaController = require('./media.controller');
const { protect } = require('../../middleware/auth.middleware');

router.post('/', protect, mediaController.saveMedia);
router.get('/', protect, mediaController.getMediaList);

module.exports = router;
