const express = require('express');
const router = express.Router();
const eventController = require('./event.controller');

// Create a new event (stored in DB — no push notification)
router.post('/', eventController.createEvent);

// Retrieve events by criteria
router.get('/', eventController.getEvents);

// Mark as read
router.put('/:id/read', eventController.markRead);

// Soft delete
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
