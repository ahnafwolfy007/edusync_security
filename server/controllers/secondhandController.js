const pool = require('../config/database');

// Get all secondhand products
const getSecondhandProducts = async (req, res) => {
  try {
    const { 
      category, 
      condition, 
      minPrice, 
      maxPrice, 
      sort = 'newest', 
      search,
      page = 1,
      limit = 20 
    } = req.query;

    let query = `
      SELECT 
        p.*,
        u.name as seller_name,
        u.avatar as seller_avatar,
        u.rating as seller_rating,
        u.is_verified as seller_verified,
        pi.image_url
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE p.type = 'secondhand' AND p.status = 'active'
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    // Add filters
    if (category) {
      query += ` AND p.category = $${paramIndex++}`;
      queryParams.push(category);
    }

    if (condition) {
      query += ` AND p.condition = $${paramIndex++}`;
      queryParams.push(condition);
    }

    if (minPrice) {
      query += ` AND p.price >= $${paramIndex++}`;
      queryParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ` AND p.price <= $${paramIndex++}`;
      queryParams.push(parseFloat(maxPrice));
    }

    if (search) {
      query += ` AND (p.title ILIKE $${paramIndex++} OR p.description ILIKE $${paramIndex++})`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Add sorting
    switch (sort) {
      case 'price_low':
        query += ' ORDER BY p.price ASC';
        break;
      case 'price_high':
        query += ' ORDER BY p.price DESC';
        break;
      case 'oldest':
        query += ' ORDER BY p.created_at ASC';
        break;
      case 'popular':
        query += ' ORDER BY p.views DESC, p.created_at DESC';
        break;
      default:
        query += ' ORDER BY p.created_at DESC';
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM products p 
      WHERE p.type = 'secondhand' AND p.status = 'active'
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (category) {
      countQuery += ` AND p.category = $${countParamIndex++}`;
      countParams.push(category);
    }

    if (condition) {
      countQuery += ` AND p.condition = $${countParamIndex++}`;
      countParams.push(condition);
    }

    if (minPrice) {
      countQuery += ` AND p.price >= $${countParamIndex++}`;
      countParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      countQuery += ` AND p.price <= $${countParamIndex++}`;
      countParams.push(parseFloat(maxPrice));
    }

    if (search) {
      countQuery += ` AND (p.title ILIKE $${countParamIndex++} OR p.description ILIKE $${countParamIndex++})`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Format products data
    const products = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      condition: row.condition,
      location: row.location,
      images: row.image_url ? [row.image_url] : [],
      timeAgo: getTimeAgo(row.created_at),
      views: row.views,
      seller: {
        id: row.seller_id,
        name: row.seller_name,
        avatar: row.seller_avatar,
        rating: row.seller_rating,
        isVerified: row.seller_verified
      }
    }));

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: (page * limit) < totalCount,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching secondhand products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
};

// Get single product details
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Increment view count
    await pool.query(
      'UPDATE products SET views = views + 1 WHERE id = $1',
      [id]
    );

    // Get product details
    const productQuery = `
      SELECT 
        p.*,
        u.name as seller_name,
        u.avatar as seller_avatar,
        u.rating as seller_rating,
        u.is_verified as seller_verified,
        u.phone as seller_phone,
        u.email as seller_email,
        array_agg(pi.image_url ORDER BY pi.is_primary DESC, pi.created_at ASC) as images
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.id = $1
      GROUP BY p.id, u.id
    `;

    const result = await pool.query(productQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = result.rows[0];

    // Get similar products
    const similarQuery = `
      SELECT p.*, pi.image_url
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE p.category = $1 AND p.id != $2 AND p.status = 'active'
      ORDER BY p.created_at DESC
      LIMIT 6
    `;

    const similarResult = await pool.query(similarQuery, [product.category, id]);

    res.json({
      success: true,
      product: {
        id: product.id,
        title: product.title,
        description: product.description,
        price: parseFloat(product.price),
        category: product.category,
        condition: product.condition,
        location: product.location,
        images: product.images.filter(img => img !== null),
        timeAgo: getTimeAgo(product.created_at),
        views: product.views,
        seller: {
          id: product.seller_id,
          name: product.seller_name,
          avatar: product.seller_avatar,
          rating: product.seller_rating,
          isVerified: product.seller_verified,
          phone: product.seller_phone,
          email: product.seller_email
        }
      },
      similarProducts: similarResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        price: parseFloat(row.price),
        image: row.image_url,
        timeAgo: getTimeAgo(row.created_at)
      }))
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product details'
    });
  }
};

// Create new secondhand product
const createSecondhandProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      price,
      category,
      condition,
      location,
      images = []
    } = req.body;

    // Validate required fields
    if (!title || !description || !price || !category || !condition) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Create product
    const productQuery = `
      INSERT INTO products (
        seller_id, title, description, price, category, condition, location, type, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'secondhand', 'active')
      RETURNING *
    `;

    const productResult = await pool.query(productQuery, [
      userId, title, description, parseFloat(price), category, condition, location
    ]);

    const productId = productResult.rows[0].id;

    // Add images if provided
    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await pool.query(
          'INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, $3)',
          [productId, images[i], i === 0]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Product listed successfully',
      productId
    });

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product'
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      title,
      description,
      price,
      category,
      condition,
      location,
      status
    } = req.body;

    // Check if user owns the product
    const ownerCheck = await pool.query(
      'SELECT seller_id FROM products WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (ownerCheck.rows[0].seller_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Update product
    const updateQuery = `
      UPDATE products 
      SET title = $1, description = $2, price = $3, category = $4, 
          condition = $5, location = $6, status = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      title, description, parseFloat(price), category, condition, location, status, id
    ]);

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product'
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user owns the product
    const ownerCheck = await pool.query(
      'SELECT seller_id FROM products WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (ownerCheck.rows[0].seller_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    // Soft delete - update status to 'deleted'
    await pool.query(
      'UPDATE products SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['deleted', id]
    );

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
};

// Toggle favorite product
const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if already favorited
    const existingFavorite = await pool.query(
      'SELECT id FROM user_favorites WHERE user_id = $1 AND product_id = $2',
      [userId, id]
    );

    if (existingFavorite.rows.length > 0) {
      // Remove from favorites
      await pool.query(
        'DELETE FROM user_favorites WHERE user_id = $1 AND product_id = $2',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Removed from favorites',
        isFavorite: false
      });
    } else {
      // Add to favorites
      await pool.query(
        'INSERT INTO user_favorites (user_id, product_id) VALUES ($1, $2)',
        [userId, id]
      );

      res.json({
        success: true,
        message: 'Added to favorites',
        isFavorite: true
      });
    }

  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating favorites'
    });
  }
};

// Get user's products
const getUserProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'active' } = req.query;

    const query = `
      SELECT 
        p.*,
        pi.image_url,
        COUNT(uf.id) as favorite_count
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      LEFT JOIN user_favorites uf ON p.id = uf.product_id
      WHERE p.seller_id = $1 AND p.status = $2 AND p.type = 'secondhand'
      GROUP BY p.id, pi.image_url
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [userId, status]);

    const products = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      condition: row.condition,
      image: row.image_url,
      status: row.status,
      views: row.views,
      favoriteCount: parseInt(row.favorite_count),
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      products
    });

  } catch (error) {
    console.error('Error fetching user products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your products'
    });
  }
};

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now - new Date(date)) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)} hours ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  }
};

module.exports = {
  getSecondhandProducts,
  getProductById,
  createSecondhandProduct,
  updateProduct,
  deleteProduct,
  toggleFavorite,
  getUserProducts
};
