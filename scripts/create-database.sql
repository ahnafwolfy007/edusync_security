-- EduSync Database Schema
-- Run this script in pgAdmin 4 to create the complete database structure

-- Create the database (run this separately if needed)
-- CREATE DATABASE edusync;

-- Connect to the edusync database before running the rest

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role_id INT NOT NULL REFERENCES roles(role_id),
    institution VARCHAR(100),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Business Applications Table
CREATE TABLE IF NOT EXISTS business_applications (
    application_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    business_name VARCHAR(150) NOT NULL,
    business_type VARCHAR(100),
    license_info TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    applied_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    review_comments TEXT
);

-- Businesses Table (Small Business Shops)
CREATE TABLE IF NOT EXISTS businesses (
    business_id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(user_id),
    business_name VARCHAR(150) NOT NULL,
    business_type VARCHAR(100),
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Business Products Table
CREATE TABLE IF NOT EXISTS business_products (
    product_id SERIAL PRIMARY KEY,
    business_id INT NOT NULL REFERENCES businesses(business_id),
    product_name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0),
    terms_conditions TEXT, -- Seller defined T&C
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Business Orders Table
CREATE TABLE IF NOT EXISTS business_orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    business_id INT NOT NULL REFERENCES businesses(business_id),
    order_date TIMESTAMP DEFAULT NOW(),
    payment_method VARCHAR(20) NOT NULL, -- 'demo_bkash', 'cash_on_delivery'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'delivered', 'cancelled'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Business Order Items Table
CREATE TABLE IF NOT EXISTS business_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES business_orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES business_products(product_id),
    quantity INT NOT NULL CHECK (quantity > 0)
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

-- Second-hand Items Table
CREATE TABLE IF NOT EXISTS secondhand_items (
    item_id SERIAL PRIMARY KEY,
    seller_id INT NOT NULL REFERENCES users(user_id),
    category_id INT REFERENCES categories(category_id),
    item_name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    condition VARCHAR(50),
    terms_conditions TEXT, -- Disclaimer
    posted_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Second-hand Orders Table
CREATE TABLE IF NOT EXISTS secondhand_orders (
    order_id SERIAL PRIMARY KEY,
    buyer_id INT NOT NULL REFERENCES users(user_id),
    item_id INT NOT NULL REFERENCES secondhand_items(item_id),
    order_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending'
);

-- Rental Products Table
CREATE TABLE IF NOT EXISTS rental_products (
    rental_id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(user_id),
    category_id INT REFERENCES categories(category_id),
    product_name VARCHAR(150) NOT NULL,
    description TEXT,
    rent_per_day DECIMAL(12,2) NOT NULL CHECK (rent_per_day >= 0),
    available_from DATE,
    terms_conditions TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Rental Orders Table
CREATE TABLE IF NOT EXISTS rental_orders (
    rental_order_id SERIAL PRIMARY KEY,
    renter_id INT NOT NULL REFERENCES users(user_id),
    rental_id INT NOT NULL REFERENCES rental_products(rental_id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Food Vendors Table
CREATE TABLE IF NOT EXISTS food_vendors (
    vendor_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    shop_name VARCHAR(150) NOT NULL,
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

-- Food Items Table
CREATE TABLE IF NOT EXISTS food_items (
    food_item_id SERIAL PRIMARY KEY,
    vendor_id INT NOT NULL REFERENCES food_vendors(vendor_id),
    item_name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Food Item Images Table
CREATE TABLE IF NOT EXISTS food_item_images (
    image_id SERIAL PRIMARY KEY,
    food_item_id INT NOT NULL REFERENCES food_items(food_item_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL
);

-- Food Orders Table
CREATE TABLE IF NOT EXISTS food_orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    vendor_id INT NOT NULL REFERENCES food_vendors(vendor_id),
    order_date DATE NOT NULL CHECK (order_date <= NOW() + INTERVAL '7 days'),
    order_placed_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
);

-- Food Order Items Table
CREATE TABLE IF NOT EXISTS food_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES food_orders(order_id) ON DELETE CASCADE,
    food_item_id INT NOT NULL REFERENCES food_items(food_item_id),
    quantity INT NOT NULL CHECK (quantity > 0)
);

-- Payments Table (used for business marketplace payments)
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    buyer_id INT NOT NULL REFERENCES users(user_id),
    seller_id INT NOT NULL REFERENCES users(user_id),
    product_id INT REFERENCES business_products(product_id),
    amount DECIMAL(14,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'wallet', 'demo_bkash', 'cash_on_delivery'
    platform_fee DECIMAL(14,2) DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    transaction_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Wallets Table (one per user)
CREATE TABLE IF NOT EXISTS wallets (
    wallet_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(user_id),
    balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions Table (wallet movements)
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL REFERENCES wallets(wallet_id),
    amount DECIMAL(14,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- e.g., 'payment_in', 'payment_out', 'withdrawal', 'refund'
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Lost & Found Items Table
CREATE TABLE IF NOT EXISTS lost_found_items (
    item_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    item_type VARCHAR(50) NOT NULL, -- 'lost' or 'found'
    title VARCHAR(150),
    description TEXT,
    location VARCHAR(255),
    contact_info VARCHAR(255),
    is_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notices Table
CREATE TABLE IF NOT EXISTS notices (
    notice_id SERIAL PRIMARY KEY,
    posted_by INT NOT NULL REFERENCES users(user_id),
    title VARCHAR(150),
    content TEXT,
    category VARCHAR(100),
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_business ON business_products(business_id);
CREATE INDEX IF NOT EXISTS idx_secondhand_seller ON secondhand_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_secondhand_category ON secondhand_items(category_id);
CREATE INDEX IF NOT EXISTS idx_payments_buyer ON payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payments_seller ON payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);

-- Insert initial roles
INSERT INTO roles (role_name) VALUES 
    ('admin'),
    ('moderator'), 
    ('student'),
    ('business_owner'),
    ('food_vendor')
ON CONFLICT (role_name) DO NOTHING;

-- Insert initial categories
INSERT INTO categories (category_name) VALUES 
    ('Electronics'),
    ('Books & Stationery'),
    ('Clothing & Accessories'),
    ('Furniture'),
    ('Sports Equipment'),
    ('Musical Instruments'),
    ('Vehicles'),
    ('Kitchen Appliances'),
    ('Home Decor'),
    ('Textbooks'),
    ('Laptops & Computers'),
    ('Study Materials'),
    ('Accommodation'),
    ('Event Equipment'),
    ('Mobile Phones'),
    ('Cameras'),
    ('Headphones'),
    ('Bags & Backpacks'),
    ('Shoes'),
    ('Watches')
ON CONFLICT (category_name) DO NOTHING;

-- Create a sample admin user (password: Admin@123)
INSERT INTO users (full_name, email, password_hash, role_id, institution, location) VALUES 
    ('System Administrator', 'admin@edusync.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LwbE7/GqMzm9YJtV6', 1, 'EduSync Platform', 'System')
ON CONFLICT (email) DO NOTHING;

COMMIT;
