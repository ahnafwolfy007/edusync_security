-- Roles Table
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

-- Users Table
CREATE TABLE users (
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
CREATE TABLE business_applications (
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
CREATE TABLE businesses (
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
CREATE TABLE business_products (
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
CREATE TABLE business_orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    business_id INT NOT NULL REFERENCES businesses(business_id),
    order_date TIMESTAMP DEFAULT NOW(),
    payment_method VARCHAR(20) NOT NULL, -- 'demo_bkash', 'cash_on_delivery'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'delivered', 'cancelled'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Business Order Items Table
CREATE TABLE business_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES business_orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES business_products(product_id),
    quantity INT NOT NULL CHECK (quantity > 0)
);

-- Categories Table
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

-- Second-hand Items Table
CREATE TABLE secondhand_items (
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
CREATE TABLE secondhand_orders (
    order_id SERIAL PRIMARY KEY,
    buyer_id INT NOT NULL REFERENCES users(user_id),
    item_id INT NOT NULL REFERENCES secondhand_items(item_id),
    order_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending'
);

-- Rental Products Table
CREATE TABLE rental_products (
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
CREATE TABLE rental_orders (
    rental_order_id SERIAL PRIMARY KEY,
    renter_id INT NOT NULL REFERENCES users(user_id),
    rental_id INT NOT NULL REFERENCES rental_products(rental_id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Food Vendors Table
CREATE TABLE food_vendors (
    vendor_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    shop_name VARCHAR(150) NOT NULL,
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

-- Food Items Table
CREATE TABLE food_items (
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
CREATE TABLE food_item_images (
    image_id SERIAL PRIMARY KEY,
    food_item_id INT NOT NULL REFERENCES food_items(food_item_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL
);

-- Food Orders Table
CREATE TABLE food_orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    vendor_id INT NOT NULL REFERENCES food_vendors(vendor_id),
    order_date DATE NOT NULL CHECK (order_date <= NOW() + INTERVAL '7 days'),
    order_placed_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
);

-- Food Order Items Table
CREATE TABLE food_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES food_orders(order_id) ON DELETE CASCADE,
    food_item_id INT NOT NULL REFERENCES food_items(food_item_id),
    quantity INT NOT NULL CHECK (quantity > 0)
);

-- Payments Table (used for business marketplace payments)
CREATE TABLE payments (
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
CREATE TABLE wallets (
    wallet_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(user_id),
    balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions Table (wallet movements)
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL REFERENCES wallets(wallet_id),
    amount DECIMAL(14,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- e.g., 'payment_in', 'payment_out', 'withdrawal', 'refund'
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Lost & Found Items Table
CREATE TABLE lost_found_items (
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
CREATE TABLE notices (
    notice_id SERIAL PRIMARY KEY,
    posted_by INT NOT NULL REFERENCES users(user_id),
    title VARCHAR(150),
    content TEXT,
    category VARCHAR(100),
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Accommodation Properties Table (like TheTolet)
CREATE TABLE accommodation_properties (
    property_id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(user_id),
    property_type VARCHAR(50) NOT NULL, -- 'room', 'apartment', 'house', 'hostel'
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    area VARCHAR(100), -- e.g., 'Dhanmondi', 'Gulshan'
    rent_amount DECIMAL(12,2) NOT NULL CHECK (rent_amount >= 0),
    deposit_amount DECIMAL(12,2) DEFAULT 0,
    property_size VARCHAR(50), -- e.g., '2 bed, 1 bath'
    amenities TEXT[], -- Array of amenities
    available_from DATE,
    is_available BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(150),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Accommodation Property Images Table
CREATE TABLE accommodation_images (
    image_id SERIAL PRIMARY KEY,
    property_id INT NOT NULL REFERENCES accommodation_properties(property_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE
);

-- Accommodation Inquiries Table
CREATE TABLE accommodation_inquiries (
    inquiry_id SERIAL PRIMARY KEY,
    property_id INT NOT NULL REFERENCES accommodation_properties(property_id),
    inquirer_id INT NOT NULL REFERENCES users(user_id),
    message TEXT,
    contact_phone VARCHAR(20),
    preferred_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'contacted', 'closed'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Free Marketplace Items Table
CREATE TABLE free_marketplace_items (
    item_id SERIAL PRIMARY KEY,
    giver_id INT NOT NULL REFERENCES users(user_id),
    category_id INT REFERENCES categories(category_id),
    item_name VARCHAR(150) NOT NULL,
    description TEXT,
    condition_note TEXT,
    pickup_location VARCHAR(255),
    contact_info VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    posted_at TIMESTAMP DEFAULT NOW()
);

-- Free Marketplace Requests Table
CREATE TABLE free_marketplace_requests (
    request_id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES free_marketplace_items(item_id),
    requester_id INT NOT NULL REFERENCES users(user_id),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin Logs Table (for tracking admin actions)
CREATE TABLE admin_logs (
    log_id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'business', 'food_vendor', 'user', 'property'
    target_id INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Statistics Table (for analytics)
CREATE TABLE user_statistics (
    stat_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    login_count INT DEFAULT 0,
    last_login TIMESTAMP,
    total_purchases DECIMAL(12,2) DEFAULT 0,
    total_sales DECIMAL(12,2) DEFAULT 0,
    items_posted INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial roles
INSERT INTO roles (role_name) VALUES 
('admin'),
('moderator'),
('business_owner'),
('food_vendor'),
('student'),
('user');

-- Insert initial categories
INSERT INTO categories (category_name) VALUES 
('Electronics'),
('Books'),
('Furniture'),
('Clothing'),
('Sports'),
('Electronics Accessories'),
('Home Appliances'),
('Vehicles'),
('Musical Instruments'),
('Study Materials'),
('Stationery'),
('Others');

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_business_products_business ON business_products(business_id);
CREATE INDEX idx_business_orders_user ON business_orders(user_id);
CREATE INDEX idx_secondhand_items_seller ON secondhand_items(seller_id);
CREATE INDEX idx_rental_products_owner ON rental_products(owner_id);
CREATE INDEX idx_food_orders_user ON food_orders(user_id);
CREATE INDEX idx_accommodation_location ON accommodation_properties(location);
CREATE INDEX idx_free_marketplace_giver ON free_marketplace_items(giver_id);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_payments_buyer ON payments(buyer_id);
CREATE INDEX idx_payments_seller ON payments(seller_id);

-- Views for admin statistics
CREATE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE role_id IN (SELECT role_id FROM roles WHERE role_name IN ('student', 'user'))) as total_users,
    (SELECT COUNT(*) FROM businesses WHERE is_verified = true) as verified_businesses,
    (SELECT COUNT(*) FROM business_applications WHERE status = 'pending') as pending_business_applications,
    (SELECT COUNT(*) FROM food_vendors WHERE is_verified = true) as verified_food_vendors,
    (SELECT COUNT(*) FROM food_vendors WHERE is_verified = false) as pending_food_vendors,
    (SELECT COUNT(*) FROM secondhand_items WHERE is_active = true) as active_secondhand_items,
    (SELECT COUNT(*) FROM rental_products WHERE is_active = true) as active_rental_products,
    (SELECT COUNT(*) FROM accommodation_properties WHERE is_available = true) as available_accommodations,
    (SELECT COUNT(*) FROM free_marketplace_items WHERE is_available = true) as available_free_items,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'success' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as monthly_transaction_volume,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_this_week;

-- Insert Demo Users
INSERT INTO users (full_name, email, password_hash, phone, role_id, institution, location)
VALUES
('Alice Admin', 'alice.admin@example.com', 'hashed_pw1', '01711111111', 1, 'UIU', 'Dhaka'),
('Bob Moderator', 'bob.mod@example.com', 'hashed_pw2', '01722222222', 2, 'UIU', 'Dhaka'),
('Charlie BizOwner', 'charlie.biz@example.com', 'hashed_pw3', '01733333333', 3, 'UIU', 'Chittagong'),
('Diana Foodie', 'diana.vendor@example.com', 'hashed_pw4', '01744444444', 4, 'UIU', 'Dhaka'),
('Evan Student', 'evan.stu@example.com', 'hashed_pw5', '01755555555', 5, 'NSU', 'Sylhet'),
('Fiona User', 'fiona.user@example.com', 'hashed_pw6', '01766666666', 6, 'BRACU', 'Rajshahi');

-- Demo Business Applications
INSERT INTO business_applications (user_id, business_name, business_type, license_info, status, review_comments)
VALUES
(3, 'Charlie Electronics', 'Electronics', 'Trade License #1234', 'approved', 'All documents valid'),
(5, 'Evan Bookstore', 'Books', 'Trade License #5678', 'pending', NULL);

-- Demo Businesses
INSERT INTO businesses (owner_id, business_name, business_type, description, is_verified)
VALUES
(3, 'Charlie Electronics', 'Electronics', 'Selling gadgets and accessories', TRUE),
(5, 'Evan Bookstore', 'Books', 'Affordable second-hand and new books', FALSE);

-- Demo Products
INSERT INTO business_products (business_id, product_name, description, price, stock_quantity, terms_conditions)
VALUES
(1, 'Smartphone X', 'Latest model smartphone', 25000.00, 10, '1 year warranty'),
(1, 'Laptop Pro', 'High-performance laptop', 80000.00, 5, '6 months warranty'),
(2, 'C Programming Book', 'Beginner-friendly C book', 500.00, 20, 'No returns'),
(2, 'Data Structures Book', 'Advanced DS concepts', 700.00, 15, 'No returns');

-- Demo Business Orders
INSERT INTO business_orders (user_id, business_id, payment_method, status)
VALUES
(6, 1, 'demo_bkash', 'confirmed'),
(5, 2, 'cash_on_delivery', 'pending');

-- Demo Business Order Items
INSERT INTO business_order_items (order_id, product_id, quantity)
VALUES
(1, 1, 2),
(2, 3, 1);

-- Demo Second-hand Items
INSERT INTO secondhand_items (seller_id, category_id, item_name, description, price, condition, terms_conditions)
VALUES
(6, 1, 'Used Phone', 'Slightly used, good condition', 8000.00, 'Good', 'No warranty'),
(5, 2, 'Old Book', 'Classic novel', 200.00, 'Fair', 'Non-refundable');

-- Demo Second-hand Orders
INSERT INTO secondhand_orders (buyer_id, item_id, status)
VALUES
(3, 1, 'pending'),
(4, 2, 'completed');

-- Demo Rental Products
INSERT INTO rental_products (owner_id, category_id, product_name, description, rent_per_day, available_from, terms_conditions)
VALUES
(6, 3, 'Bike for Rent', 'Daily rental bike', 300.00, '2025-09-10', 'Damage charges apply'),
(5, 4, 'Camera for Rent', 'DSLR camera rental', 1000.00, '2025-09-12', 'Deposit required');

-- Demo Rental Orders
INSERT INTO rental_orders (renter_id, rental_id, start_date, end_date, status)
VALUES
(3, 1, '2025-09-12', '2025-09-14', 'confirmed'),
(4, 2, '2025-09-15', '2025-09-16', 'pending');

-- Demo Food Vendors
INSERT INTO food_vendors (user_id, shop_name, description, is_verified)
VALUES
(4, 'Diana Snacks', 'Homemade snacks and fast food', TRUE),
(5, 'Evan Food Stall', 'Student meals and drinks', FALSE);

-- Demo Food Items
INSERT INTO food_items (vendor_id, item_name, description, price)
VALUES
(1, 'Burger', 'Cheesy beef burger', 250.00),
(1, 'French Fries', 'Crispy fries', 100.00),
(2, 'Student Meal', 'Rice with curry', 80.00);

-- Demo Food Orders
INSERT INTO food_orders (user_id, vendor_id, order_date, status)
VALUES
(6, 1, '2025-09-09', 'pending'),
(5, 2, '2025-09-10', 'confirmed');

-- Demo Food Order Items
INSERT INTO food_order_items (order_id, food_item_id, quantity)
VALUES
(1, 1, 2),
(2, 3, 1);

-- Demo Wallets
INSERT INTO wallets (user_id, balance)
VALUES
(3, 1000.00),
(6, 500.00);

-- Demo Transactions
INSERT INTO transactions (wallet_id, amount, transaction_type, description)
VALUES
(1, 500.00, 'payment_in', 'Wallet recharge'),
(2, -200.00, 'payment_out', 'Food order payment');

-- Demo Payments
INSERT INTO payments (buyer_id, seller_id, product_id, amount, payment_method, platform_fee, transaction_reference)
VALUES
(6, 3, 1, 25000.00, 'demo_bkash', 100.00, 'TXN12345'),
(5, 3, 2, 80000.00, 'wallet', 200.00, 'TXN12346');

-- Demo Accommodation Property
INSERT INTO accommodation_properties (owner_id, property_type, title, description, location, area, rent_amount, deposit_amount, property_size, amenities, contact_phone, contact_email)
VALUES
(3, 'apartment', '2 BHK Apartment', 'Spacious flat near campus', 'Dhaka', 'Dhanmondi', 15000.00, 5000.00, '2 bed, 1 bath', ARRAY['WiFi','Water','Electricity'], '01777777777', 'owner@example.com');

-- Demo Accommodation Inquiry
INSERT INTO accommodation_inquiries (property_id, inquirer_id, message, contact_phone, preferred_date)
VALUES
(1, 6, 'Interested in visiting this weekend', '01766666666', '2025-09-11');

-- Demo Free Marketplace Item
INSERT INTO free_marketplace_items (giver_id, category_id, item_name, description, pickup_location, contact_info)
VALUES
(6, 2, 'Old Textbooks', 'Free for juniors', 'UIU Campus', '01766666666');

-- Demo Free Marketplace Request
INSERT INTO free_marketplace_requests (item_id, requester_id, message)
VALUES
(1, 5, 'Can I pick these up tomorrow?');

-- Demo Lost & Found
INSERT INTO lost_found_items (user_id, item_type, title, description, location, contact_info)
VALUES
(5, 'lost', 'Lost Wallet', 'Black leather wallet', 'Campus Gate', '01755555555'),
(6, 'found', 'Found Umbrella', 'Blue umbrella near canteen', 'UIU Canteen', '01766666666');

-- Demo Notices
INSERT INTO notices (posted_by, title, content, category, is_pinned)
VALUES
(1, 'System Maintenance', 'Platform will be down tonight.', 'Technical', TRUE),
(2, 'Event Announcement', 'Cultural fest next week!', 'Events', FALSE);

-- Demo Admin Logs
INSERT INTO admin_logs (admin_id, action, target_type, target_id, description)
VALUES
(1, 'Verified Business', 'business', 1, 'Business verified by admin'),
(2, 'Approved Food Vendor', 'food_vendor', 1, 'Vendor approved after review');

-- Demo User Statistics
INSERT INTO user_statistics (user_id, login_count, last_login, total_purchases, total_sales, items_posted)
VALUES
(3, 20, NOW(), 5000.00, 15000.00, 10),
(6, 15, NOW(), 2000.00, 3000.00, 5);
