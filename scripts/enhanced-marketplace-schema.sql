-- Additional tables for expanded marketplace features

-- Business verification and management
CREATE TABLE business_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL, -- 'restaurant', 'shop', 'service', etc.
    description TEXT,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    business_license VARCHAR(255),
    documents JSON, -- Store uploaded document URLs
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Business shops/stores
CREATE TABLE business_shops (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    application_id INTEGER REFERENCES business_applications(id),
    shop_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'electronics', 'clothing', 'books', etc.
    logo_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    opening_hours JSON, -- Store opening hours
    delivery_available BOOLEAN DEFAULT false,
    delivery_radius INTEGER, -- in km
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Business products
CREATE TABLE business_products (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES business_shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    images JSON, -- Array of image URLs
    stock_quantity INTEGER DEFAULT 0,
    sku VARCHAR(100),
    weight DECIMAL(8,2), -- in kg
    dimensions JSON, -- {length, width, height}
    is_available BOOLEAN DEFAULT true,
    tags JSON, -- Array of tags
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Food vendors and catering
CREATE TABLE food_vendors (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255) NOT NULL,
    description TEXT,
    cuisine_type VARCHAR(100), -- 'bengali', 'chinese', 'indian', etc.
    logo_url VARCHAR(500),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    delivery_areas JSON, -- Array of delivery areas
    preparation_time INTEGER DEFAULT 30, -- in minutes
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'inactive'
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Food items
CREATE TABLE food_items (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES food_vendors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'main_course', 'appetizer', 'dessert', etc.
    price DECIMAL(10,2) NOT NULL,
    images JSON,
    is_vegetarian BOOLEAN DEFAULT false,
    is_vegan BOOLEAN DEFAULT false,
    spice_level VARCHAR(20), -- 'mild', 'medium', 'hot'
    preparation_time INTEGER DEFAULT 20, -- in minutes
    is_available BOOLEAN DEFAULT true,
    ingredients JSON, -- Array of ingredients
    allergens JSON, -- Array of allergens
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Food orders
CREATE TABLE food_orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES users(id),
    vendor_id INTEGER REFERENCES food_vendors(id),
    order_items JSON NOT NULL, -- Array of {item_id, quantity, price, notes}
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_date DATE NOT NULL,
    delivery_time TIME,
    delivery_address TEXT NOT NULL,
    customer_phone VARCHAR(20),
    special_instructions TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'
    payment_method VARCHAR(50) DEFAULT 'cash_on_delivery',
    payment_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Rental products
CREATE TABLE rental_products (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'electronics', 'furniture', 'vehicles', etc.
    daily_rate DECIMAL(10,2) NOT NULL,
    weekly_rate DECIMAL(10,2),
    monthly_rate DECIMAL(10,2),
    security_deposit DECIMAL(10,2) NOT NULL,
    images JSON,
    condition VARCHAR(50), -- 'excellent', 'good', 'fair'
    availability_status VARCHAR(50) DEFAULT 'available',
    location TEXT,
    pickup_required BOOLEAN DEFAULT true,
    delivery_available BOOLEAN DEFAULT false,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    min_rental_days INTEGER DEFAULT 1,
    max_rental_days INTEGER DEFAULT 30,
    rules_terms TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Rental bookings
CREATE TABLE rental_bookings (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES rental_products(id),
    renter_id INTEGER REFERENCES users(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    daily_rate DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'active', 'completed', 'cancelled'
    payment_status VARCHAR(50) DEFAULT 'pending',
    pickup_date DATE,
    return_date DATE,
    condition_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Accommodation listings
CREATE TABLE accommodations (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    property_type VARCHAR(100), -- 'apartment', 'house', 'room', 'hostel'
    address TEXT NOT NULL,
    area VARCHAR(100),
    city VARCHAR(100),
    rent_amount DECIMAL(10,2) NOT NULL,
    rent_type VARCHAR(50), -- 'monthly', 'weekly', 'daily'
    bedrooms INTEGER,
    bathrooms INTEGER,
    size_sqft INTEGER,
    floor_number INTEGER,
    total_floors INTEGER,
    furnishing VARCHAR(50), -- 'furnished', 'semi_furnished', 'unfurnished'
    facilities JSON, -- Array of facilities
    images JSON,
    availability_date DATE,
    is_available BOOLEAN DEFAULT true,
    security_deposit DECIMAL(10,2),
    advance_payment DECIMAL(10,2),
    utilities_included BOOLEAN DEFAULT false,
    pet_allowed BOOLEAN DEFAULT false,
    smoking_allowed BOOLEAN DEFAULT false,
    contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Free marketplace items
CREATE TABLE free_items (
    id SERIAL PRIMARY KEY,
    giver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    condition VARCHAR(50), -- 'excellent', 'good', 'fair', 'poor'
    images JSON,
    location TEXT,
    pickup_required BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    claimed_by INTEGER REFERENCES users(id),
    claimed_at TIMESTAMP,
    pickup_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin statistics tracking
CREATE TABLE admin_statistics (
    id SERIAL PRIMARY KEY,
    stat_date DATE NOT NULL,
    total_users INTEGER DEFAULT 0,
    new_users_today INTEGER DEFAULT 0,
    total_businesses INTEGER DEFAULT 0,
    pending_verifications INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    active_listings INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notice board
CREATE TABLE notices (
    id SERIAL PRIMARY KEY,
    author_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100), -- 'general', 'academic', 'event', 'urgent'
    priority VARCHAR(50) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    target_audience VARCHAR(100), -- 'all', 'students', 'businesses', 'specific'
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    views_count INTEGER DEFAULT 0,
    attachment_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User roles and permissions
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'admin', 'moderator', 'business_owner', 'customer'
    permissions JSON, -- Array of permissions
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Business orders
CREATE TABLE business_orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES users(id),
    shop_id INTEGER REFERENCES business_shops(id),
    order_items JSON NOT NULL, -- Array of {product_id, quantity, price}
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_address TEXT,
    customer_phone VARCHAR(20),
    order_notes TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
    payment_method VARCHAR(50), -- 'wallet', 'demo_bkash', 'demo_nagad', 'cash_on_delivery'
    payment_status VARCHAR(50) DEFAULT 'pending',
    estimated_delivery TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_business_applications_status ON business_applications(status);
CREATE INDEX idx_business_shops_category ON business_shops(category);
CREATE INDEX idx_business_products_shop_id ON business_products(shop_id);
CREATE INDEX idx_food_vendors_status ON food_vendors(status);
CREATE INDEX idx_food_orders_customer_id ON food_orders(customer_id);
CREATE INDEX idx_food_orders_vendor_id ON food_orders(vendor_id);
CREATE INDEX idx_rental_products_category ON rental_products(category);
CREATE INDEX idx_accommodations_city ON accommodations(city);
CREATE INDEX idx_free_items_is_available ON free_items(is_available);
CREATE INDEX idx_notices_is_active ON notices(is_active);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
