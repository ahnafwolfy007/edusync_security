const pool = require('../config/database');

// Get all rental listings
const getRentalListings = async (req, res) => {
  try {
    const { 
      type = 'all', // 'housing', 'items', 'all'
      category, 
      minPrice, 
      maxPrice, 
      location,
      sort = 'newest', 
      search,
      page = 1,
      limit = 20 
    } = req.query;

    let query = `
      SELECT 
        r.*,
        u.name as owner_name,
        u.avatar as owner_avatar,
        u.rating as owner_rating,
        u.is_verified as owner_verified,
        u.phone as owner_phone,
        ri.image_url
      FROM rentals r
      LEFT JOIN users u ON r.owner_id = u.id
      LEFT JOIN rental_images ri ON r.id = ri.rental_id AND ri.is_primary = true
      WHERE r.status = 'available'
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    // Add filters
    if (type !== 'all') {
      query += ` AND r.type = $${paramIndex++}`;
      queryParams.push(type);
    }

    if (category) {
      query += ` AND r.category = $${paramIndex++}`;
      queryParams.push(category);
    }

    if (minPrice) {
      query += ` AND r.price_per_period >= $${paramIndex++}`;
      queryParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ` AND r.price_per_period <= $${paramIndex++}`;
      queryParams.push(parseFloat(maxPrice));
    }

    if (location) {
      query += ` AND r.location ILIKE $${paramIndex++}`;
      queryParams.push(`%${location}%`);
    }

    if (search) {
      query += ` AND (r.title ILIKE $${paramIndex++} OR r.description ILIKE $${paramIndex++})`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Add sorting
    switch (sort) {
      case 'price_low':
        query += ' ORDER BY r.price_per_period ASC';
        break;
      case 'price_high':
        query += ' ORDER BY r.price_per_period DESC';
        break;
      case 'popular':
        query += ' ORDER BY r.views DESC, r.created_at DESC';
        break;
      default:
        query += ' ORDER BY r.created_at DESC';
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM rentals r 
      WHERE r.status = 'available'
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (type !== 'all') {
      countQuery += ` AND r.type = $${countParamIndex++}`;
      countParams.push(type);
    }

    if (category) {
      countQuery += ` AND r.category = $${countParamIndex++}`;
      countParams.push(category);
    }

    if (minPrice) {
      countQuery += ` AND r.price_per_period >= $${countParamIndex++}`;
      countParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      countQuery += ` AND r.price_per_period <= $${countParamIndex++}`;
      countParams.push(parseFloat(maxPrice));
    }

    if (location) {
      countQuery += ` AND r.location ILIKE $${countParamIndex++}`;
      countParams.push(`%${location}%`);
    }

    if (search) {
      countQuery += ` AND (r.title ILIKE $${countParamIndex++} OR r.description ILIKE $${countParamIndex++})`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Format rental data
    const rentals = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      category: row.category,
      pricePerPeriod: parseFloat(row.price_per_period),
      pricingPeriod: row.pricing_period,
      location: row.location,
      address: row.address,
      images: row.image_url ? [row.image_url] : [],
      amenities: row.amenities ? JSON.parse(row.amenities) : [],
      features: row.features ? JSON.parse(row.features) : [],
      availableFrom: row.available_from,
      availableTo: row.available_to,
      views: row.views,
      timeAgo: getTimeAgo(row.created_at),
      owner: {
        id: row.owner_id,
        name: row.owner_name,
        avatar: row.owner_avatar,
        rating: row.owner_rating,
        isVerified: row.owner_verified,
        phone: row.owner_phone
      }
    }));

    res.json({
      success: true,
      rentals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: (page * limit) < totalCount,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching rental listings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rental listings'
    });
  }
};

// Get single rental details
const getRentalById = async (req, res) => {
  try {
    const { id } = req.params;

    // Increment view count
    await pool.query(
      'UPDATE rentals SET views = views + 1 WHERE id = $1',
      [id]
    );

    // Get rental details
    const rentalQuery = `
      SELECT 
        r.*,
        u.name as owner_name,
        u.avatar as owner_avatar,
        u.rating as owner_rating,
        u.is_verified as owner_verified,
        u.phone as owner_phone,
        u.email as owner_email,
        array_agg(ri.image_url ORDER BY ri.is_primary DESC, ri.created_at ASC) as images
      FROM rentals r
      LEFT JOIN users u ON r.owner_id = u.id
      LEFT JOIN rental_images ri ON r.id = ri.rental_id
      WHERE r.id = $1
      GROUP BY r.id, u.id
    `;

    const result = await pool.query(rentalQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rental listing not found'
      });
    }

    const rental = result.rows[0];

    // Get similar rentals
    const similarQuery = `
      SELECT r.*, ri.image_url
      FROM rentals r
      LEFT JOIN rental_images ri ON r.id = ri.rental_id AND ri.is_primary = true
      WHERE r.category = $1 AND r.id != $2 AND r.status = 'available'
      ORDER BY r.created_at DESC
      LIMIT 6
    `;

    const similarResult = await pool.query(similarQuery, [rental.category, id]);

    res.json({
      success: true,
      rental: {
        id: rental.id,
        title: rental.title,
        description: rental.description,
        type: rental.type,
        category: rental.category,
        pricePerPeriod: parseFloat(rental.price_per_period),
        pricingPeriod: rental.pricing_period,
        location: rental.location,
        address: rental.address,
        images: rental.images.filter(img => img !== null),
        amenities: rental.amenities ? JSON.parse(rental.amenities) : [],
        features: rental.features ? JSON.parse(rental.features) : [],
        availableFrom: rental.available_from,
        availableTo: rental.available_to,
        views: rental.views,
        timeAgo: getTimeAgo(rental.created_at),
        owner: {
          id: rental.owner_id,
          name: rental.owner_name,
          avatar: rental.owner_avatar,
          rating: rental.owner_rating,
          isVerified: rental.owner_verified,
          phone: rental.owner_phone,
          email: rental.owner_email
        }
      },
      similarRentals: similarResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        pricePerPeriod: parseFloat(row.price_per_period),
        pricingPeriod: row.pricing_period,
        image: row.image_url,
        location: row.location,
        timeAgo: getTimeAgo(row.created_at)
      }))
    });

  } catch (error) {
    console.error('Error fetching rental:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rental details'
    });
  }
};

// Create new rental listing
const createRentalListing = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      type, // 'housing' or 'items'
      category,
      pricePerPeriod,
      pricingPeriod, // 'daily', 'weekly', 'monthly', 'yearly'
      location,
      address,
      amenities = [],
      features = [],
      availableFrom,
      availableTo,
      images = []
    } = req.body;

    // Validate required fields
    if (!title || !description || !type || !category || !pricePerPeriod || !pricingPeriod || !location) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Create rental listing
    const rentalQuery = `
      INSERT INTO rentals (
        owner_id, title, description, type, category, price_per_period, 
        pricing_period, location, address, amenities, features, 
        available_from, available_to, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'available')
      RETURNING *
    `;

    const rentalResult = await pool.query(rentalQuery, [
      userId, title, description, type, category, parseFloat(pricePerPeriod),
      pricingPeriod, location, address, JSON.stringify(amenities), 
      JSON.stringify(features), availableFrom, availableTo
    ]);

    const rentalId = rentalResult.rows[0].id;

    // Add images if provided
    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await pool.query(
          'INSERT INTO rental_images (rental_id, image_url, is_primary) VALUES ($1, $2, $3)',
          [rentalId, images[i], i === 0]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Rental listing created successfully',
      rentalId
    });

  } catch (error) {
    console.error('Error creating rental listing:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating rental listing'
    });
  }
};

// Update rental listing
const updateRentalListing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      title,
      description,
      pricePerPeriod,
      pricingPeriod,
      location,
      address,
      amenities,
      features,
      availableFrom,
      availableTo,
      status
    } = req.body;

    // Check if user owns the rental
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM rentals WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rental listing not found'
      });
    }

    if (ownerCheck.rows[0].owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this rental listing'
      });
    }

    // Update rental listing
    const updateQuery = `
      UPDATE rentals 
      SET title = $1, description = $2, price_per_period = $3, pricing_period = $4,
          location = $5, address = $6, amenities = $7, features = $8,
          available_from = $9, available_to = $10, status = $11, updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      title, description, parseFloat(pricePerPeriod), pricingPeriod,
      location, address, JSON.stringify(amenities), JSON.stringify(features),
      availableFrom, availableTo, status, id
    ]);

    res.json({
      success: true,
      message: 'Rental listing updated successfully',
      rental: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating rental listing:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating rental listing'
    });
  }
};

// Delete rental listing
const deleteRentalListing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user owns the rental
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM rentals WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rental listing not found'
      });
    }

    if (ownerCheck.rows[0].owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this rental listing'
      });
    }

    // Soft delete - update status to 'deleted'
    await pool.query(
      'UPDATE rentals SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['deleted', id]
    );

    res.json({
      success: true,
      message: 'Rental listing deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting rental listing:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting rental listing'
    });
  }
};

// Create rental inquiry
const createRentalInquiry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rentalId } = req.params;
    const { message, moveInDate, duration } = req.body;

    // Check if rental exists and is available
    const rentalCheck = await pool.query(
      'SELECT owner_id, status FROM rentals WHERE id = $1',
      [rentalId]
    );

    if (rentalCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rental listing not found'
      });
    }

    if (rentalCheck.rows[0].status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Rental is not available'
      });
    }

    if (rentalCheck.rows[0].owner_id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot inquire about your own rental'
      });
    }

    // Check if user already has an inquiry for this rental
    const existingInquiry = await pool.query(
      'SELECT id FROM rental_inquiries WHERE rental_id = $1 AND inquirer_id = $2 AND status != $3',
      [rentalId, userId, 'cancelled']
    );

    if (existingInquiry.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active inquiry for this rental'
      });
    }

    // Create inquiry
    await pool.query(
      `INSERT INTO rental_inquiries (rental_id, inquirer_id, message, move_in_date, duration, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [rentalId, userId, message, moveInDate, duration]
    );

    res.status(201).json({
      success: true,
      message: 'Rental inquiry sent successfully'
    });

  } catch (error) {
    console.error('Error creating rental inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending rental inquiry'
    });
  }
};

// Get user's rental listings
const getUserRentals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'available' } = req.query;

    const query = `
      SELECT 
        r.*,
        ri.image_url,
        COUNT(riq.id) as inquiry_count
      FROM rentals r
      LEFT JOIN rental_images ri ON r.id = ri.rental_id AND ri.is_primary = true
      LEFT JOIN rental_inquiries riq ON r.id = riq.rental_id AND riq.status = 'pending'
      WHERE r.owner_id = $1 AND r.status = $2
      GROUP BY r.id, ri.image_url
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [userId, status]);

    const rentals = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      category: row.category,
      pricePerPeriod: parseFloat(row.price_per_period),
      pricingPeriod: row.pricing_period,
      location: row.location,
      image: row.image_url,
      status: row.status,
      views: row.views,
      inquiryCount: parseInt(row.inquiry_count),
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      rentals
    });

  } catch (error) {
    console.error('Error fetching user rentals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your rental listings'
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
  getRentalListings,
  getRentalById,
  createRentalListing,
  updateRentalListing,
  deleteRentalListing,
  createRentalInquiry,
  getUserRentals
};
