const dbConfig = require('../config/db');
const { customInputValidator } = require('../security');

// Helper to get role name from request (assumes middleware added role_name on auth)
function isPrivileged(role) {
  return ['admin', 'moderator'].includes(role);
}

// GET all lost & found items with optional filters
const getAllLostFoundItems = async (req, res) => {
  try {
    const { type, search, limit = 50, offset = 0 } = req.query;
    const params = [];
    const where = [];
    if (type) { params.push(type); where.push(`item_type = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`); where.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }
    let q = 'SELECT * FROM lost_found_items';
    if (where.length) q += ' WHERE ' + where.join(' AND ');
    q += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit); params.push(offset);
    const db = dbConfig.getDB();
    const { rows } = await db.query(q, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getLostFoundItemById = async (req, res) => {
  try {
    const db = dbConfig.getDB();
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM lost_found_items WHERE item_id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createLostFoundItem = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const role = req.user?.role_name;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { item_type, title, description, location, contact_info } = req.body;
    const validation = customInputValidator({ item_type, title });
    if (!validation.valid) return res.status(400).json({ success: false, message: 'Invalid input', issues: validation.issues });
    if (!['lost', 'found'].includes(item_type)) return res.status(400).json({ success: false, message: 'item_type must be lost or found' });
    const db = dbConfig.getDB();
    const { rows } = await db.query(
      `INSERT INTO lost_found_items (user_id, item_type, title, description, location, contact_info) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [userId, item_type, title, description, location, contact_info]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateLostFoundItem = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const role = req.user?.role_name;
    const { id } = req.params;
    const db = dbConfig.getDB();
    const existing = await db.query('SELECT * FROM lost_found_items WHERE item_id=$1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing.rows[0].user_id !== userId && !isPrivileged(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const fields = ['item_type','title','description','location','contact_info','is_claimed'];
    const updates = [];
    const params = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f} = $${params.length}`); }});
    if (!updates.length) return res.json({ success: true, data: existing.rows[0] });
    params.push(id);
    const { rows } = await db.query(`UPDATE lost_found_items SET ${updates.join(', ')}, created_at = created_at WHERE item_id = $${params.length} RETURNING *`, params);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteLostFoundItem = async (req, res) => {
  try {
    const userId = req.user?.user_id; const role = req.user?.role_name; const { id } = req.params;
    const db = dbConfig.getDB();
    const existing = await db.query('SELECT user_id FROM lost_found_items WHERE item_id=$1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing.rows[0].user_id !== userId && !isPrivileged(role)) return res.status(403).json({ success: false, message: 'Forbidden' });
    await db.query('DELETE FROM lost_found_items WHERE item_id=$1', [id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUserLostFoundItems = async (req, res) => {
  try {
    const userId = req.user?.user_id; if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = dbConfig.getDB();
    const { rows } = await db.query('SELECT * FROM lost_found_items WHERE user_id=$1 ORDER BY created_at DESC', [userId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const searchLostFoundItems = async (req, res) => {
  try {
    const { q } = req.query; if (!q) return res.json({ success: true, data: [] });
    const db = dbConfig.getDB();
    const { rows } = await db.query('SELECT * FROM lost_found_items WHERE title ILIKE $1 OR description ILIKE $1 ORDER BY created_at DESC LIMIT 100', ['%'+q+'%']);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const markAsFound = async (req, res) => {
  try {
    const { id } = req.params; const userId = req.user?.user_id; const role = req.user?.role_name; const db = dbConfig.getDB();
    const existing = await db.query('SELECT * FROM lost_found_items WHERE item_id=$1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing.rows[0].user_id !== userId && !isPrivileged(role)) return res.status(403).json({ success: false, message: 'Forbidden' });
    const { rows } = await db.query('UPDATE lost_found_items SET is_claimed = TRUE WHERE item_id=$1 RETURNING *', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const claimItem = async (req, res) => {
  try {
    const { id } = req.params; const db = dbConfig.getDB();
    const existing = await db.query('SELECT * FROM lost_found_items WHERE item_id=$1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing.rows[0].is_claimed) return res.status(400).json({ success: false, message: 'Already claimed' });
    const { rows } = await db.query('UPDATE lost_found_items SET is_claimed = TRUE WHERE item_id=$1 RETURNING *', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllLostFoundItems, getLostFoundItemById, createLostFoundItem, updateLostFoundItem, deleteLostFoundItem, getUserLostFoundItems, searchLostFoundItems, markAsFound, claimItem };
