const LibraryRepository = require('../../domain/repositories/libraryRepository');
const libraryRepo = new LibraryRepository();

exports.toggleItem = async (req, res) => {
    try {
        const { type, id, action } = req.body; // type: 'course'|'book', action: 'save'|'favorite'
        const userId = req.user.id; // From auth middleware

        if (!['course', 'book'].includes(type)) {
            return res.status(400).json({ error: 'Invalid type' });
        }
        if (!['save', 'favorite'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const dbField = action === 'save' ? 'is_saved' : 'is_favorite';
        let result;

        if (type === 'course') {
            result = await libraryRepo.toggleCourse(userId, id, dbField);
        } else {
            result = await libraryRepo.toggleBook(userId, id, dbField);
        }

        res.json({ success: true, item: result });
    } catch (error) {
        console.error('Toggle library item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getMyLibrary = async (req, res) => {
    try {
        const userId = req.user.id;
        const library = await libraryRepo.getUserLibrary(userId);
        let notes = [];
        try { notes = await libraryRepo.getUserNotes(userId); } catch (e) { /* tabla no existe aún */ }
        res.json({ ...library, notes });
    } catch (error) {
        console.error('Get library error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.checkStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const status = await libraryRepo.getUserLibraryIds(userId);
        res.json(status);
    } catch (error) {
        console.error('Check status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ==========================================
// NOTAS DEL USUARIO
// ==========================================

exports.saveNote = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, content, sourceType, sourceConversationId } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'El contenido de la nota no puede estar vacío.' });
        }

        const note = await libraryRepo.saveNote(userId, {
            title: title || 'Nota sin título',
            content: content.trim(),
            sourceType: sourceType || 'manual',
            sourceConversationId: sourceConversationId || null
        });

        res.status(201).json({ success: true, note });
    } catch (error) {
        console.error('Save note error:', error);
        res.status(500).json({ error: 'Error al guardar la nota.' });
    }
};

exports.getNotes = async (req, res) => {
    try {
        const userId = req.user.id;
        const notes = await libraryRepo.getUserNotes(userId);
        res.json(notes);
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ error: 'Error al obtener las notas.' });
    }
};

exports.updateNote = async (req, res) => {
    try {
        const userId = req.user.id;
        const noteId = parseInt(req.params.id, 10);
        const { title, content } = req.body;

        const updated = await libraryRepo.updateNote(userId, noteId, { title, content });
        if (!updated) {
            return res.status(404).json({ error: 'Nota no encontrada.' });
        }
        res.json({ success: true, note: updated });
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ error: 'Error al actualizar la nota.' });
    }
};

exports.deleteNote = async (req, res) => {
    try {
        const userId = req.user.id;
        const noteId = parseInt(req.params.id, 10);

        const deleted = await libraryRepo.deleteNote(userId, noteId);
        if (!deleted) {
            return res.status(404).json({ error: 'Nota no encontrada.' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Error al eliminar la nota.' });
    }
};
