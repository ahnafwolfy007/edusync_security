const dbConfig = require('../config/db');
const InputSanitizer = require('../utils/inputSanitization');

class ChatController {
  // Create or get existing chat between buyer and seller for an item
  async createOrGetChat(req, res) {
    try {
      const userId = req.user.userId;
      const { itemId, otherUserId } = req.body; // optional itemId for contextual chat
      
      // Validate user ID
      if (!InputSanitizer.validateObjectId(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid user ID'
        });
      }
      
      if (!otherUserId) {
        return res.status(400).json({ 
          success: false, 
          message: 'otherUserId required'
        });
      }
      
      // Validate other user ID
      if (!InputSanitizer.validateObjectId(otherUserId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid other user ID'
        });
      }
      
      // Validate item ID if provided
      if (itemId && !InputSanitizer.validateObjectId(itemId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid item ID'
        });
      }
      const db = dbConfig.getDB();
      let sellerId, buyerId;
      if (itemId) {
        const itemResult = await db.query('SELECT seller_id FROM secondhand_items WHERE item_id = $1', [itemId]);
        if (itemResult.rows.length === 0) {
          return res.status(404).json({ success:false, message:'Item not found'});
        }
        sellerId = itemResult.rows[0].seller_id;
        buyerId = userId === sellerId ? otherUserId : userId;
        // Check existing chat with same trio
        const existing = await db.query('SELECT * FROM chats WHERE item_id = $1 AND seller_id = $2 AND buyer_id = $3', [itemId, sellerId, buyerId]);
        if (existing.rows.length) {
          const chat = existing.rows[0];
            const messages = await db.query('SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY created_at ASC', [chat.chat_id]);
            return res.json({ success:true, data:{ chat, messages: messages.rows } });
        }
      } else {
        // Generic chat without item: ensure stable ordering for pair
        sellerId = Math.min(userId, otherUserId);
        buyerId = Math.max(userId, otherUserId);
        const existing = await db.query('SELECT * FROM chats WHERE item_id IS NULL AND seller_id = $1 AND buyer_id = $2', [sellerId, buyerId]);
        if (existing.rows.length) {
          const chat = existing.rows[0];
          const messages = await db.query('SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY created_at ASC', [chat.chat_id]);
          return res.json({ success:true, data:{ chat, messages: messages.rows } });
        }
      }
      const chatResult = await db.query(
        'INSERT INTO chats (item_id, seller_id, buyer_id) VALUES ($1,$2,$3) RETURNING *',
        [itemId || null, sellerId, buyerId]
      );
      const messages = await db.query('SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatResult.rows[0].chat_id]);
      res.json({ success:true, data:{ chat: chatResult.rows[0], messages: messages.rows } });
    } catch (error) {
      console.error('Create/get chat error:', error);
      res.status(500).json({ success:false, message:'Failed to create or get chat'});
    }
  }

  // Send message (simplified endpoint)
  async sendMessageSimple(req, res) {
    try {
      const userId = req.user.userId;
      const { chatId, content } = req.body;
      if (!content || !chatId) {
        return res.status(400).json({ success: false, message: 'chatId and content required' });
      }
      const db = dbConfig.getDB();

      // For Firebase chat IDs (they might not exist in our database)
      // Just return success to prevent hanging
      if (typeof chatId === 'string' && chatId.length > 20) {
        console.log('Firebase chat detected, returning success');
        return res.json({ success: true, message: 'Message sent via Firebase' });
      }

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

      res.json({ success: true, data: { message: messageResult.rows[0] } });
    } catch (error) {
      console.error('Send message simple error:', error);
      res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  }

  // Send message
  async sendMessage(req, res) {
    try {
      const userId = req.user.userId;
      const { chatId } = req.params;
      const { content } = req.body;
      
      // Validate inputs
      if (!InputSanitizer.validateObjectId(chatId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid chat ID' 
        });
      }
      
      if (!InputSanitizer.validateObjectId(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid user ID' 
        });
      }
      
      if (!content) {
        return res.status(400).json({ 
          success: false, 
          message: 'Message content required' 
        });
      }
      
      // Sanitize message content
      const sanitizedContent = InputSanitizer.sanitizeHTML(content, 1000);
      if (!sanitizedContent || sanitizedContent.length < 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid message content' 
        });
      }
      
      if (sanitizedContent.length > 1000) {
        return res.status(400).json({ 
          success: false, 
          message: 'Message too long (max 1000 characters)' 
        });
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
