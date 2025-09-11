const dbConfig = require('../config/db');

class ChatController {
  // Create or get existing chat between buyer and seller for an item
  async createOrGetChat(req, res) {
    try {
      const userId = req.user.userId;
      const { itemId, otherUserId } = req.body; // other party (seller or buyer)
      if (!itemId || !otherUserId) {
        return res.status(400).json({ success: false, message: 'itemId and otherUserId required' });
      }
      const db = dbConfig.getDB();

      // Determine seller and buyer roles
      // Fetch item to know seller
      const itemResult = await db.query('SELECT seller_id FROM secondhand_items WHERE item_id = $1', [itemId]);
      if (itemResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
      const sellerId = itemResult.rows[0].seller_id;
      const buyerId = userId === sellerId ? otherUserId : userId;

      // Upsert chat
      const chatResult = await db.query(`
        INSERT INTO chats (item_id, seller_id, buyer_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (item_id, seller_id, buyer_id) DO UPDATE SET updated_at = NOW()
        RETURNING *
      `, [itemId, sellerId, buyerId]);

      // Return existing messages
      const messages = await db.query(
        'SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY created_at ASC',
        [chatResult.rows[0].chat_id]
      );

      res.json({ success: true, data: { chat: chatResult.rows[0], messages: messages.rows } });
    } catch (error) {
      console.error('Create/get chat error:', error);
      res.status(500).json({ success: false, message: 'Failed to create or get chat' });
    }
  }

  // Send message
  async sendMessage(req, res) {
    try {
      const userId = req.user.userId;
      const { chatId } = req.params;
      const { content } = req.body;
      if (!content || !chatId) {
        return res.status(400).json({ success: false, message: 'chatId and content required' });
      }
      const db = dbConfig.getDB();

      // Ensure user belongs to chat
      const chat = await db.query('SELECT * FROM chats WHERE chat_id = $1 AND (seller_id = $2 OR buyer_id = $2)', [chatId, userId]);
      if (chat.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Not authorized for this chat' });
      }

      const messageResult = await db.query(`
        INSERT INTO chat_messages (chat_id, sender_id, content)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [chatId, userId, content]);

      await db.query('UPDATE chats SET updated_at = NOW() WHERE chat_id = $1', [chatId]);

      res.status(201).json({ success: true, data: { message: messageResult.rows[0] } });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  }

  // Get messages in a chat
  async getMessages(req, res) {
    try {
      const userId = req.user.userId;
      const { chatId } = req.params;
      const db = dbConfig.getDB();

      const chat = await db.query('SELECT * FROM chats WHERE chat_id = $1 AND (seller_id = $2 OR buyer_id = $2)', [chatId, userId]);
      if (chat.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Not authorized for this chat' });
      }

      const messages = await db.query('SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
      res.json({ success: true, data: { messages: messages.rows } });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ success: false, message: 'Failed to get messages' });
    }
  }

  // List chats for user
  async listChats(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.getDB();
      const chats = await db.query(`
        SELECT c.*, si.item_name,
          (SELECT content FROM chat_messages WHERE chat_id = c.chat_id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM chat_messages WHERE chat_id = c.chat_id ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM chats c
        LEFT JOIN secondhand_items si ON c.item_id = si.item_id
        WHERE c.seller_id = $1 OR c.buyer_id = $1
        ORDER BY COALESCE(last_message_at, c.created_at) DESC
      `, [userId]);
      res.json({ success: true, data: { chats: chats.rows } });
    } catch (error) {
      console.error('List chats error:', error);
      res.status(500).json({ success: false, message: 'Failed to list chats' });
    }
  }
}

module.exports = new ChatController();
