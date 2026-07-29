const pool = require('../../infrastructure/database/db');

class ChatRepository {
    async createConversation(userId, title) {
        return { id: 'ephemeral', title, user_id: userId };
    }

    async addMessage(conversationId, sender, content) {
        return { id: Date.now(), conversation_id: conversationId, sender, content };
    }

    async getConversationsByUserId(userId) {
        return [];
    }

    async getMessagesByConversationId(conversationId, userId) {
        return [];
    }

    async updateTitle(conversationId, newTitle, userId) {
        return { id: conversationId, title: newTitle, user_id: userId };
    }

    async deleteConversation(conversationId, userId) {
        return true;
    }
}

module.exports = ChatRepository;