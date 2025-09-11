const dbConfig = require('../config/db');

// Return notifications for the authenticated user.
// For now, we surface global notices as notifications and mark them unread by default.
const getNotifications = async (req, res) => {
  try {
    let notifications = [];

    try {
      const db = dbConfig.getDB();
      const result = await db.query(
        `SELECT notice_id AS id, title, content AS message, category AS type, created_at
         FROM notices
         ORDER BY created_at DESC
         LIMIT 100`
      );

      notifications = result.rows.map((row) => ({
        id: row.id,
        title: row.title || 'Notice',
        message: row.message || '',
        type: row.type || 'system',
        is_read: false,
        created_at: row.created_at,
        action_url: null,
      }));
    } catch (dbErr) {
      // If DB is not initialized or table absent, fall back to empty list
      notifications = [];
    }

    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// Mark a single notification as read (no-op placeholder for now)
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Notification id required' });
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('markAsRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read (no-op placeholder for now)
const markAllAsRead = async (req, res) => {
  try {
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
  }
};

// Delete a notification (no-op placeholder for now)
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Notification id required' });
    return res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('deleteNotification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
