# EduSync Secure

A comprehensive educational platform with integrated wallet system and marketplace functionality.

## Features

### 🎓 Educational Platform
- User registration and authentication
- Institution-based user management
- Secure JWT-based authentication system

### 💰 Digital Wallet System
- **Demo Payment Methods**: bKash, Nagad, Rocket, Credit Card
- **Fee Structure**: 
  - bKash: 1.8%
  - Nagad: 1.5%
  - Rocket: 2.0%
  - Credit Card: 2.5%
- **Wallet Operations**: Add money, withdraw, transfer between users
- **Transaction History**: Complete transaction tracking
- **Real-time Balance Updates**

### 🛒 Marketplace
- **Post Items**: Users can list items for sale
- **Category Filtering**: Electronics, Books, Furniture, Clothing, Sports, etc.
- **Search Functionality**: Find items by title or description
- **Wallet Integration**: Purchase items using wallet balance
- **Transaction Management**: Automatic buyer/seller transaction processing
- **Marketplace Fee**: 2% platform fee on sales

### 🏢 Business Features
- Business marketplace for B2B transactions
- Rental system for equipment/spaces
- Job posting and management
- Notice board system
- Lost and found functionality

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database with comprehensive schema
- **JWT Authentication** for secure access
- **Bcrypt** for password hashing
- **Multer** for file uploads

### Frontend
- **React.js** with Vite build tool
- **Tailwind CSS** for responsive design
- **Context API** for state management
- **Axios** for API communication

### Database Schema
- 22+ tables including users, wallets, transactions, marketplace items
- Complete foreign key relationships
- Optimized for performance and scalability

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/edusync_secure.git
   cd edusync_secure
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Setup Database**
   - Create a PostgreSQL database named `edusync`
   - Run the SQL schema from `scripts/create-database.sql`
   - Update database connection in `backend/config/db.js`

4. **Environment Configuration**
   Create `.env` file in backend directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/edusync
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=24h
   PORT=5000
   ```

5. **Setup Frontend**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. **Start Backend Server**
   ```bash
   cd backend
   npm start
   ```
   Server runs on http://localhost:5000

2. **Start Frontend Development Server**
   ```bash
   cd client
   npm run dev
   ```
   Client runs on http://localhost:5173

## Demo Features

### Wallet Demo Payments
The application includes demo payment methods that simulate real payment gateways:

- **bKash Demo**: Simulates mobile banking with 1.8% fee
- **Nagad Demo**: Mobile financial service with 1.5% fee  
- **Rocket Demo**: Digital payment platform with 2.0% fee
- **Credit Card Demo**: Card payment simulation with 2.5% fee

### Marketplace Demo Flow
1. Register/Login to the platform
2. Add money to wallet using demo payment methods
3. Browse marketplace items or post new items
4. Purchase items using wallet balance
5. View transaction history and wallet updates

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Wallet
- `GET /api/wallet` - Get wallet balance
- `POST /api/wallet/add-money` - Add money to wallet
- `POST /api/wallet/withdraw` - Withdraw from wallet
- `POST /api/wallet/transfer` - Transfer to another user
- `GET /api/wallet/transactions` - Get transaction history

### Marketplace
- `GET /api/marketplace/items` - Get all items
- `POST /api/marketplace/items` - Post new item
- `GET /api/marketplace/my-items` - Get user's items
- `POST /api/marketplace/items/:id/purchase` - Purchase item
- `PUT /api/marketplace/items/:id` - Update item
- `DELETE /api/marketplace/items/:id` - Delete item

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- SQL injection prevention with parameterized queries
- CORS configuration for cross-origin requests
- Input validation and sanitization
- Secure file upload handling

## Development Notes

- All payment methods are demo/simulation only
- No real money transactions occur
- Perfect for testing and development
- Comprehensive error handling and logging
- Responsive design for mobile and desktop

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository.

---

**Note**: This is a demonstration application with simulated payment methods. Do not use in production without implementing real payment gateway integrations and additional security measures.
