import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { NotificationProvider } from './context/NotificationContext';
import { CartProvider } from './context/CartContext';
import { ChatProvider } from './context/ChatContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Import layout components
import Navigation from './components/layout/Navigation';
import ThemedShell from './components/layout/ThemedShell';

// Import page components
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LostFound from './pages/LostFound';
import NoticesBoard from './pages/NoticesBoard';
import NoticeDetails from './pages/NoticeDetails';
import JobsBoard from './pages/JobsBoard';
import Tutoring from './pages/Tutoring';
import Chat from './pages/Chat';
import BusinessMarketplace from './pages/BusinessMarketplace';
import BusinessShopDetails from './pages/BusinessShopDetails';
import SecondhandMarket from './pages/SecondhandMarket';
import Marketplace from './pages/Marketplace';
import AccommodationMarket from './pages/AccommodationMarket';
import FreeMarketplace from './pages/FreeMarketplace';
// Detail pages (to be created if not existing yet)
import SecondhandItemDetails from './pages/SecondhandItemDetails';
import FreeItemDetails from './pages/FreeItemDetails';
import AuthToggle from './pages/AuthToggle';
import FoodOrdering from './pages/FoodOrdering';
import OrderHistory from './pages/OrderHistory';
import Notifications from './pages/Notifications';
import AdminPanel from './pages/AdminPanel';
import Cart from './pages/Cart';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import BusinessProducts from './pages/BusinessProducts';
import BusinessOrders from './pages/BusinessOrders';
import VendorMenu from './pages/VendorMenu';
import VendorOrders from './pages/VendorOrders';
import BusinessApply from './pages/BusinessApply';
import FoodVendorApply from './pages/FoodVendorApply';
import ForgotPassword from './components/ForgotPassword';
// import ResetPassword from './pages/ResetPassword'; // Removed - using OTP flow instead

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <>
      <Navigation />
      <ThemedShell leftBanner={false}>
        {children}
      </ThemedShell>
    </>
  );
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = (user.role_name || user.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'moderator') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <>
      <Navigation />
      <ThemedShell leftBanner={false}>
        {children}
      </ThemedShell>
    </>
  );
};

// Public Route Component (for login/register)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Unified dashboard wrapper (all roles see the same base dashboard now)
const DashboardRoute = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Dashboard />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WalletProvider>
          <NotificationProvider>
            <CartProvider>
              <ChatProvider>
                <Router>
                  <div className="min-h-screen bg-gray-50">
                  <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={
                    <PublicRoute>
                      <AuthToggle />
                    </PublicRoute>
                  } />
                  
                  <Route path="/register" element={
                    <PublicRoute>
                      <AuthToggle />
                    </PublicRoute>
                  } />
                  
                  <Route path="/forgot-password" element={
                    <PublicRoute>
                      <ForgotPassword onBack={() => window.location.href = '/login'} />
                    </PublicRoute>
                  } />
                  
                  {/* OTP-based password reset - no longer using URL tokens
                  <Route path="/reset-password/:token" element={
                    <PublicRoute>
                      <ResetPassword />
                    </PublicRoute>
                  } />
                  */}
                  
                  {/* Protected Routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <DashboardRoute />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/business-marketplace" element={
                    <ProtectedRoute>
                      <BusinessMarketplace />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/business-marketplace/shops/:businessId" element={
                    <ProtectedRoute>
                      <BusinessShopDetails />
                    </ProtectedRoute>
                  } />
                  <Route path="/business/:businessId/products" element={
                    <ProtectedRoute>
                      <BusinessProducts />
                    </ProtectedRoute>
                  } />
                  <Route path="/business/:businessId/orders" element={
                    <ProtectedRoute>
                      <BusinessOrders />
                    </ProtectedRoute>
                  } />
                  <Route path="/business/apply" element={
                    <ProtectedRoute>
                      <BusinessApply />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/secondhand-market" element={
                    <ProtectedRoute>
                      <SecondhandMarket />
                    </ProtectedRoute>
                  } />
                  <Route path="/product/:itemId" element={
                    <ProtectedRoute>
                      <SecondhandItemDetails />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/marketplace" element={
                    <ProtectedRoute>
                      <Marketplace />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/accommodation-market" element={
                    <ProtectedRoute>
                      <AccommodationMarket />
                    </ProtectedRoute>
                  } />
                  <Route path="/lost-found" element={
                    <ProtectedRoute>
                      <LostFound />
                    </ProtectedRoute>
                  } />
                  <Route path="/notices" element={
                    <ProtectedRoute>
                      <NoticesBoard />
                    </ProtectedRoute>
                  } />
                  <Route path="/notices/:id" element={
                    <ProtectedRoute>
                      <NoticeDetails />
                    </ProtectedRoute>
                  } />
                  <Route path="/jobs" element={
                    <ProtectedRoute>
                      <JobsBoard />
                    </ProtectedRoute>
                  } />
                  <Route path="/tutoring" element={
                    <ProtectedRoute>
                      <Tutoring />
                    </ProtectedRoute>
                  } />
                  <Route path="/chat" element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/free-marketplace" element={
                    <ProtectedRoute>
                      <FreeMarketplace />
                    </ProtectedRoute>
                  } />
                  <Route path="/free-marketplace/:itemId" element={
                    <ProtectedRoute>
                      <FreeItemDetails />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/food-ordering" element={
                    <ProtectedRoute>
                      <FoodOrdering />
                    </ProtectedRoute>
                  } />
                  <Route path="/food-vendor/:vendorId/menu" element={
                    <ProtectedRoute>
                      <VendorMenu />
                    </ProtectedRoute>
                  } />
                  <Route path="/food-vendor/:vendorId/orders" element={
                    <ProtectedRoute>
                      <VendorOrders />
                    </ProtectedRoute>
                  } />
                  <Route path="/food-vendor/apply" element={
                    <ProtectedRoute>
                      <FoodVendorApply />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/orders" element={
                    <ProtectedRoute>
                      <OrderHistory />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/notifications" element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/cart" element={
                    <ProtectedRoute>
                      <Cart />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/wallet" element={
                    <ProtectedRoute>
                      <Wallet />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin Routes */}
                  <Route path="/admin" element={
                    <AdminRoute>
                      <AdminPanel />
                    </AdminRoute>
                  } />
                  
                  {/* Default redirect */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </div>
              </Router>
            </ChatProvider>
          </CartProvider>
        </NotificationProvider>
      </WalletProvider>
    </AuthProvider>
  </ErrorBoundary>
  );
}

export default App;
