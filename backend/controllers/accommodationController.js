const dbConfig = require('../config/db');

class AccommodationController {
  // Get all accommodation properties
  async getAllProperties(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        area, 
        property_type, 
        min_rent, 
        max_rent, 
        search 
      } = req.query;
      
      const offset = (page - 1) * limit;
      const db = dbConfig.db;
      
      let query = `
        SELECT 
          ap.*,
          u.full_name as owner_name,
          u.phone as owner_phone,
          (SELECT image_url FROM accommodation_images WHERE property_id = ap.property_id AND is_primary = true LIMIT 1) as primary_image
        FROM accommodation_properties ap
        JOIN users u ON ap.owner_id = u.user_id
        WHERE ap.is_available = true
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      if (area) {
        query += ` AND ap.area ILIKE $${paramIndex}`;
        queryParams.push(`%${area}%`);
        paramIndex++;
      }
      
      if (property_type) {
        query += ` AND ap.property_type = $${paramIndex}`;
        queryParams.push(property_type);
        paramIndex++;
      }
      
      if (min_rent) {
        query += ` AND ap.rent_amount >= $${paramIndex}`;
        queryParams.push(parseFloat(min_rent));
        paramIndex++;
      }
      
      if (max_rent) {
        query += ` AND ap.rent_amount <= $${paramIndex}`;
        queryParams.push(parseFloat(max_rent));
        paramIndex++;
      }
      
      if (search) {
        query += ` AND (ap.title ILIKE $${paramIndex} OR ap.description ILIKE $${paramIndex} OR ap.location ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY ap.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(parseInt(limit), parseInt(offset));
      
      const result = await db.query(query, queryParams);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Get accommodation properties error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch accommodation properties'
      });
    }
  }

  // Get single property with images
  async getProperty(req, res) {
    try {
      const { id } = req.params;
      const db = dbConfig.db;
      
      // Get property details
      const propertyQuery = `
        SELECT 
          ap.*,
          u.full_name as owner_name,
          u.phone as owner_phone,
          u.email as owner_email
        FROM accommodation_properties ap
        JOIN users u ON ap.owner_id = u.user_id
        WHERE ap.property_id = $1
      `;
      
      const propertyResult = await db.query(propertyQuery, [id]);
      
      if (propertyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }
      
      // Get property images
      const imagesQuery = `
        SELECT * FROM accommodation_images 
        WHERE property_id = $1 
        ORDER BY is_primary DESC, image_id ASC
      `;
      
      const imagesResult = await db.query(imagesQuery, [id]);
      
      const property = propertyResult.rows[0];
      property.images = imagesResult.rows;
      
      res.json({
        success: true,
        data: property
      });
      
    } catch (error) {
      console.error('Get accommodation property error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch property details'
      });
    }
  }

  // Post new accommodation property
  async createProperty(req, res) {
    try {
      const userId = req.user.userId;
      const {
        property_type,
        title,
        description,
        location,
        area,
        rent_amount,
        deposit_amount = 0,
        property_size,
        amenities = [],
        available_from,
        contact_phone,
        contact_email,
        images = []
      } = req.body;
      
      if (!property_type || !title || !location || !rent_amount) {
        return res.status(400).json({
          success: false,
          message: 'Property type, title, location, and rent amount are required'
        });
      }
      
      if (rent_amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Rent amount must be greater than 0'
        });
      }
      
      const db = dbConfig.db;
      
      await db.query('BEGIN');
      
      try {
        // Create property
        const propertyQuery = `
          INSERT INTO accommodation_properties (
            owner_id, property_type, title, description, location, area,
            rent_amount, deposit_amount, property_size, amenities, 
            available_from, contact_phone, contact_email, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          RETURNING *
        `;
        
        const propertyValues = [
          userId,
          property_type,
          title,
          description,
          location,
          area,
          parseFloat(rent_amount),
          parseFloat(deposit_amount),
          property_size,
          amenities,
          available_from,
          contact_phone,
          contact_email
        ];
        
        const propertyResult = await db.query(propertyQuery, propertyValues);
        const property = propertyResult.rows[0];
        
        // Add images if provided
        if (images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            await db.query(
              'INSERT INTO accommodation_images (property_id, image_url, is_primary) VALUES ($1, $2, $3)',
              [property.property_id, images[i], i === 0]
            );
          }
        }
        
        await db.query('COMMIT');
        
        res.status(201).json({
          success: true,
          data: property,
          message: 'Property posted successfully'
        });
        
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Create accommodation property error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to post property'
      });
    }
  }

  // Submit inquiry for property
  async submitInquiry(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { message, contact_phone, preferred_date } = req.body;
      
      const db = dbConfig.db;
      
      // Check if property exists and is available
      const propertyCheck = await db.query(
        'SELECT property_id FROM accommodation_properties WHERE property_id = $1 AND is_available = true',
        [id]
      );
      
      if (propertyCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found or not available'
        });
      }
      
      // Create inquiry
      const inquiryQuery = `
        INSERT INTO accommodation_inquiries (
          property_id, inquirer_id, message, contact_phone, preferred_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;
      
      const result = await db.query(inquiryQuery, [
        id,
        userId,
        message,
        contact_phone,
        preferred_date
      ]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Inquiry submitted successfully'
      });
      
    } catch (error) {
      console.error('Submit accommodation inquiry error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit inquiry'
      });
    }
  }

  // Get user's posted properties
  async getMyProperties(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;
      
      const query = `
        SELECT 
          ap.*,
          (SELECT COUNT(*) FROM accommodation_inquiries WHERE property_id = ap.property_id) as inquiry_count,
          (SELECT image_url FROM accommodation_images WHERE property_id = ap.property_id AND is_primary = true LIMIT 1) as primary_image
        FROM accommodation_properties ap
        WHERE ap.owner_id = $1
        ORDER BY ap.created_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Get my accommodation properties error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch your properties'
      });
    }
  }

  // Get inquiries for user's properties
  async getPropertyInquiries(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const db = dbConfig.db;
      
      // Check if user owns the property
      const ownershipCheck = await db.query(
        'SELECT property_id FROM accommodation_properties WHERE property_id = $1 AND owner_id = $2',
        [id, userId]
      );
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only view inquiries for your own properties'
        });
      }
      
      const query = `
        SELECT 
          ai.*,
          u.full_name as inquirer_name,
          u.email as inquirer_email
        FROM accommodation_inquiries ai
        JOIN users u ON ai.inquirer_id = u.user_id
        WHERE ai.property_id = $1
        ORDER BY ai.created_at DESC
      `;
      
      const result = await db.query(query, [id]);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Get property inquiries error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inquiries'
      });
    }
  }

  // Update property
  async updateProperty(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const updateData = req.body;
      
      const db = dbConfig.db;
      
      // Check ownership
      const ownershipCheck = await db.query(
        'SELECT property_id FROM accommodation_properties WHERE property_id = $1 AND owner_id = $2',
        [id, userId]
      );
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own properties'
        });
      }
      
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      const allowedFields = [
        'title', 'description', 'rent_amount', 'deposit_amount',
        'property_size', 'amenities', 'available_from', 'is_available',
        'contact_phone', 'contact_email'
      ];
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          values.push(updateData[field]);
          paramIndex++;
        }
      });
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(id);
      
      const query = `
        UPDATE accommodation_properties 
        SET ${updateFields.join(', ')}
        WHERE property_id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await db.query(query, values);
      
      res.json({
        success: true,
        data: result.rows[0],
        message: 'Property updated successfully'
      });
      
    } catch (error) {
      console.error('Update accommodation property error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update property'
      });
    }
  }

  // Delete property
  async deleteProperty(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const db = dbConfig.db;
      
      // Check ownership
      const ownershipCheck = await db.query(
        'SELECT property_id FROM accommodation_properties WHERE property_id = $1 AND owner_id = $2',
        [id, userId]
      );
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own properties'
        });
      }
      
      await db.query('DELETE FROM accommodation_properties WHERE property_id = $1', [id]);
      
      res.json({
        success: true,
        message: 'Property deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete accommodation property error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete property'
      });
    }
  }
}

module.exports = new AccommodationController();
