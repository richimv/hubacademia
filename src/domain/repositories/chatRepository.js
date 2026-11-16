class ChatRepository {
    async createConversation(userId, title) {
        return { id: 'ephemeral', title, user_id: userId };
    }

    async addMessage(conversationId, sender, content) {
        return { id: Date.now(), conversation_id: conversationId, sender, content };
    }

    async getConversationsByUserId(_userId) {
        return [];
    }

    async getMessagesByConversationId(_conversationId, _userId) {
        return [];
    }

    async updateTitle(conversationId, newTitle, userId) {
        return { id: conversationId, title: newTitle, user_id: userId };
    }

    async deleteConversation(_conversationId, _userId) {
        return true;
    }
}

module.exports = ChatRepository;
