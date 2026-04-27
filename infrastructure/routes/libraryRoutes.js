const express = require('express');
const router = express.Router();
const libraryController = require('../../application/controllers/libraryController');
const { auth } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(auth);

router.post('/toggle', libraryController.toggleItem);
router.get('/my-library', libraryController.getMyLibrary);
router.get('/status', libraryController.checkStatus);

// Notas del usuario (CRUD)
router.post('/notes', libraryController.saveNote);
router.get('/notes', libraryController.getNotes);
router.put('/notes/:id', libraryController.updateNote);
router.delete('/notes/:id', libraryController.deleteNote);

module.exports = router;
