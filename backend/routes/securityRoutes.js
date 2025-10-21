/**
 * Security Routes
 * Admin endpoints for security monitoring and management
 */

const express = require('express');
const router = express.Router();

// Initialize security middleware - will be injected by server.js
let securityMiddleware = null;

// Middleware to inject security instance
router.use((req, res, next) => {
    if (req.securityInstance) {
        securityMiddleware = req.securityInstance;
    }
    next();
});

/**
 * GET /api/security/dashboard
 * Get comprehensive security dashboard data
 */
router.get('/dashboard', (req, res) => {
    try {
        if (!securityMiddleware) {
            return res.status(503).json({
                success: false,
                message: 'Security system not initialized'
            });
        }

        const dashboard = securityMiddleware.getSecurityDashboard();
        res.json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error('Security dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get security dashboard',
            error: error.message
        });
    }
});

/**
 * GET /api/security/status/:userId
 * Get security status for specific user
 */
router.get('/status/:userId', (req, res) => {
    try {
        if (!securityMiddleware) {
            return res.status(503).json({
                success: false,
                message: 'Security system not initialized'
            });
        }

        const userId = req.params.userId;
        const status = securityMiddleware.getUserSecurityStatus(userId);
        
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('User security status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user security status',
            error: error.message
        });
    }
});

/**
 * POST /api/security/block/:userId
 * Emergency block user
 */
router.post('/block/:userId', (req, res) => {
    try {
        if (!securityMiddleware) {
            return res.status(503).json({
                success: false,
                message: 'Security system not initialized'
            });
        }

        const userId = req.params.userId;
        const duration = req.body.duration || 300000; // 5 minutes default
        
        const result = securityMiddleware.emergencyBlock(userId, duration);
        
        res.json({
            success: true,
            message: `User ${userId} blocked temporarily`,
            ...result
        });
    } catch (error) {
        console.error('Emergency block error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to block user',
            error: error.message
        });
    }
});

/**
 * POST /api/security/unblock/:userId
 * Manually unblock user
 */
router.post('/unblock/:userId', (req, res) => {
    try {
        if (!securityMiddleware) {
            return res.status(503).json({
                success: false,
                message: 'Security system not initialized'
            });
        }

        const userId = req.params.userId;
        securityMiddleware.concurrentChecker.unblockUser(userId);
        
        res.json({
            success: true,
            message: `User ${userId} unblocked`
        });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unblock user',
            error: error.message
        });
    }
});

/**
 * POST /api/security/reset
 * Emergency reset of security systems
 */
router.post('/reset', (req, res) => {
    try {
        if (!securityMiddleware) {
            return res.status(503).json({
                success: false,
                message: 'Security system not initialized'
            });
        }

        const result = securityMiddleware.emergencyReset();
        
        res.json({
            success: true,
            message: 'Security systems reset successfully',
            ...result
        });
    } catch (error) {
        console.error('Security reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset security systems',
            error: error.message
        });
    }
});

/**
 * GET /api/security/analytics
 * Get security analytics data
 */
router.get('/analytics', (req, res) => {
    try {
        if (!securityMiddleware) {
            return res.status(503).json({
                success: false,
                message: 'Security system not initialized'
            });
        }

        const timeframe = req.query.timeframe ? parseInt(req.query.timeframe) : 3600000; // 1 hour default
        const analytics = securityMiddleware.concurrentChecker.getAnalytics(timeframe);
        
        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Security analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get security analytics',
            error: error.message
        });
    }
});

/**
 * GET /api/security/suspicious-activities
 * Get recent suspicious activities
 */
router.get('/suspicious-activities', (req, res) => {
    try {
        if (!securityMiddleware) {
            return res.status(503).json({
                success: false,
                message: 'Security system not initialized'
            });
        }

        const filters = {
            userId: req.query.userId,
            type: req.query.type,
            severity: req.query.severity,
            since: req.query.since ? parseInt(req.query.since) : Date.now() - 86400000 // 24 hours default
        };

        const activities = securityMiddleware.activityMonitor.getSuspiciousActivities(filters);
        
        res.json({
            success: true,
            data: {
                activities,
                count: activities.length,
                filters
            }
        });
    } catch (error) {
        console.error('Suspicious activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get suspicious activities',
            error: error.message
        });
    }
});

module.exports = router;