const dbConfig = require('../config/db');

// Map DB row to frontend-friendly object
function mapItem(row) {
  return {
    id: row.item_id,
    title: row.item_name,
    description: row.description,
    price: parseFloat(row.price),
    condition: row.condition,
    location: row.location || null,
    images: [],
    timeAgo: row.posted_at,
    views: row.views || 0,
    inquiries: row.inquiries || 0,
    seller: {
      id: row.seller_id,
      name: row.seller_name || 'Seller',
      avatar: null,
      isVerified: false
    }
  };
}

// Get all items with filters
const getAllSecondhandItems = async (req, res) => {
  try {
    const {
      category, // not used yet due to schema simplicity
      condition,
      minPrice,
      maxPrice,
      search,
      sort = 'newest',
      page = 1,
      limit = 30
    } = req.query;

    const db = dbConfig.getDB();

    let query = `
      SELECT si.*, u.full_name as seller_name
      FROM secondhand_items si
      JOIN users u ON si.seller_id = u.user_id
      WHERE si.is_active = true
    `;
    const params = [];
    let idx = 1;

    if (condition && condition !== 'all') {
      query += ` AND LOWER(si.condition) = LOWER($${idx++})`;
      params.push(condition);
    }
    if (minPrice) {
      query += ` AND si.price >= $${idx++}`;
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      query += ` AND si.price <= $${idx++}`;
      params.push(parseFloat(maxPrice));
    }
    if (search) {
      query += ` AND (LOWER(si.item_name) LIKE LOWER($${idx}) OR LOWER(si.description) LIKE LOWER($${idx}))`;
      params.push(`%${search}%`);
      idx++;
    }

    // Sorting
    if (sort === 'price_low') query += ' ORDER BY si.price ASC';
    else if (sort === 'price_high') query += ' ORDER BY si.price DESC';
    else if (sort === 'oldest') query += ' ORDER BY si.posted_at ASC';
    else query += ' ORDER BY si.posted_at DESC';

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${idx++} OFFSET $${idx}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(mapItem)
    });
  } catch (error) {
    console.error('Secondhand getAll error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSecondhandItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = dbConfig.getDB();
    const result = await db.query(
      `SELECT si.*, u.full_name as seller_name
       FROM secondhand_items si
       JOIN users u ON si.seller_id = u.user_id
       WHERE si.item_id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, data: mapItem(result.rows[0]) });
  } catch (error) {
    console.error('Secondhand getById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createSecondhandItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { item_name, description, price, condition, category_id, terms_conditions } = req.body;
    const db = dbConfig.getDB();
    
    if (!item_name || !description || !price) {
      return res.status(400).json({
        success: false,
        message: 'Item name, description, and price are required'
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0'
      });
    }

    // Process uploaded images
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => {
        // Create relative URL path for the uploaded file
        const relativePath = file.path.replace(/\\/g, '/').replace(/.*uploads\//, '/uploads/');
        return relativePath;
      });
    }

    // First, let's check if the images column exists, if not add it
    try {
      await db.query(`
        ALTER TABLE secondhand_items 
        ADD COLUMN IF NOT EXISTS images TEXT
      `);
    } catch (alterError) {
      console.log('Images column might already exist:', alterError.message);
    }

    const query = `
      INSERT INTO secondhand_items (
        seller_id, item_name, description, price, condition, category_id, terms_conditions, images, posted_at, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), TRUE)
      RETURNING *
    `;

    const values = [
      userId,
      item_name.trim(),
      description.trim(),
      parseFloat(price),
      condition || 'good',
      category_id || null,
      terms_conditions || null,
      JSON.stringify(imageUrls)
    ];

    const result = await db.query(query, values);
    
    res.status(201).json({
      success: true,
      message: 'Secondhand item created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create secondhand item error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create secondhand item',
      error: error.message 
    });
  }
};

const updateSecondhandItem = async (req, res) => {
  try {
    // Not implemented in this iteration
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteSecondhandItem = async (req, res) => {
  try {
    // Not implemented in this iteration
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUserSecondhandItems = async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = dbConfig.getDB();
    const result = await db.query(
      `SELECT si.*, u.full_name as seller_name
       FROM secondhand_items si
       JOIN users u ON si.seller_id = u.user_id
       WHERE si.seller_id = $1
       ORDER BY si.posted_at DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows.map(mapItem) });
  } catch (error) {
    console.error('Secondhand getUserItems error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const searchSecondhandItems = async (req, res) => {
  try {
    const { q } = req.query;
    const db = dbConfig.getDB();
    if (!q) {
      return res.json({ success: true, data: [] });
    }
    const result = await db.query(
      `SELECT si.*, u.full_name as seller_name
       FROM secondhand_items si
       JOIN users u ON si.seller_id = u.user_id
       WHERE si.is_active = true AND (LOWER(si.item_name) LIKE LOWER($1) OR LOWER(si.description) LIKE LOWER($1))
       ORDER BY si.posted_at DESC
       LIMIT 50`,
      [`%${q}%`]
    );
    res.json({ success: true, data: result.rows.map(mapItem) });
  } catch (error) {
    console.error('Secondhand search error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllSecondhandItems,
  getSecondhandItemById,
  createSecondhandItem,
  updateSecondhandItem,
  deleteSecondhandItem,
  getUserSecondhandItems,
  searchSecondhandItems
};
