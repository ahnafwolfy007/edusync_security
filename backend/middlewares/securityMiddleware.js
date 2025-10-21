/**
 * Security Middleware Integration
 * Combines Activity Monitor and Concurrent Request Checker
 */

const ActivityMonitor = require('../utils/activityMonitor');
const ConcurrentRequestChecker = require('../utils/concurrentRequestChecker');

class SecurityMiddleware {
    constructor(options = {}) {
        // Initialize security components
        this.activityMonitor = new ActivityMonitor(options.activityMonitor || {});
        this.concurrentChecker = new ConcurrentRequestChecker(options.concurrentChecker || {});
        
        // Bind middleware functions
        this.securityMiddleware = this.securityMiddleware.bind(this);
        this.loginMonitor = this.loginMonitor.bind(this);
        this.contentMonitor = this.contentMonitor.bind(this);
        this.actionMonitor = this.actionMonitor.bind(this);
    }

    /**
     * Main security middleware - applies concurrent request checking
     */
    securityMiddleware() {
        return this.concurrentChecker.middleware();
    }

    /**
     * Login monitoring middleware
     */
    loginMonitor() {
        return (req, res, next) => {
            const originalSend = res.send;
            
            res.send = function(data) {
                try {
                    // Check if this is a login attempt
                    if (req.path.includes('/login') || req.path.includes('/auth')) {
                        const success = res.statusCode === 200;
                        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                        const actualSuccess = success && parsedData.success !== false;
                        
                        // Monitor login attempt
                        const userId = actualSuccess ? (parsedData.user?.id || parsedData.userId) : null;
                        const userAgent = req.get('User-Agent');
                        const ip = req.ip || req.connection.remoteAddress;
                        
                        const isBlocked = this.activityMonitor.monitorLogin(
                            userId || ip,
                            ip,
                            userAgent,
                            null, // location not implemented
                            actualSuccess
                        );
                        
                        // If user is blocked, modify response
                        if (isBlocked && actualSuccess) {
                            return originalSend.call(this, JSON.stringify({
                                success: false,
                                message: 'Account temporarily locked due to suspicious activity'
                            }));
                        }
                    }
                } catch (error) {
                    console.error('Login monitor error:', error);
                }
                
                return originalSend.call(this, data);
            }.bind(this);
            
            next();
        };
    }

    /**
     * Content monitoring middleware for posts/submissions
     */
    contentMonitor() {
        return (req, res, next) => {
            try {
                // Only monitor POST requests with content
                if (req.method === 'POST' && req.body) {
                    const userId = req.user?.userId || req.ip;
                    const content = req.body.content || req.body.description || req.body.message || '';
                    
                    if (content && content.length > 0) {
                        const postType = this.determinePostType(req.path);
                        const result = this.activityMonitor.monitorContentPost(userId, content, postType);
                        
                        if (!result.allowed) {
                            return res.status(429).json({
                                success: false,
                                message: result.rateLimited 
                                    ? 'You are posting too frequently. Please slow down.'
                                    : 'Content flagged as potential spam. Please review and try again.',
                                spamScore: result.spamScore
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Content monitor error:', error);
            }
            
            next();
        };
    }

    /**
     * Action monitoring middleware for sensitive operations
     */
    actionMonitor() {
        return (req, res, next) => {
            try {
                const userId = req.user?.userId || req.ip;
                const actionType = this.determineActionType(req.method, req.path);
                
                if (actionType) {
                    const details = {
                        method: req.method,
                        path: req.path,
                        userAgent: req.get('User-Agent'),
                        ip: req.ip
                    };
                    
                    const result = this.activityMonitor.monitorAction(userId, actionType, details);
                    
                    if (!result.allowed) {
                        return res.status(429).json({
                            success: false,
                            message: 'You are performing actions too quickly. Please slow down.',
                            rateLimited: true
                        });
                    }
                }
            } catch (error) {
                console.error('Action monitor error:', error);
            }
            
            next();
        };
    }

    /**
     * Admin middleware for security dashboard
     */
    adminSecurityMiddleware() {
        return (req, res, next) => {
            // Add security info to req for admin routes
            req.securityInfo = {
                activityReport: this.activityMonitor.generateActivityReport(),
                systemStatus: this.concurrentChecker.getSystemStatus(),
                analytics: this.concurrentChecker.getAnalytics()
            };
            next();
        };
    }

    /**
     * Get security dashboard data
     */
    getSecurityDashboard() {
        return {
            activityMonitor: {
                suspiciousActivities: this.activityMonitor.getSuspiciousActivities({ since: Date.now() - 86400000 }),
                report: this.activityMonitor.generateActivityReport()
            },
            concurrentChecker: {
                systemStatus: this.concurrentChecker.getSystemStatus(),
                analytics: this.concurrentChecker.getAnalytics()
            },
            timestamp: Date.now()
        };
    }

    /**
     * Emergency security actions
     */
    emergencyBlock(userId) {
        this.concurrentChecker.blockUser(userId, 300000); // 5 minutes
        return { success: true, message: 'User blocked for 5 minutes' };
    }

    emergencyReset() {
        this.concurrentChecker.emergencyReset();
        this.activityMonitor.cleanup();
        return { success: true, message: 'Security systems reset' };
    }

    /**
     * Helper methods
     */
    determinePostType(path) {
        if (path.includes('marketplace')) return 'marketplace';
        if (path.includes('secondhand')) return 'secondhand';
        if (path.includes('job')) return 'job';
        if (path.includes('accommodation')) return 'accommodation';
        if (path.includes('chat')) return 'chat';
        if (path.includes('notice')) return 'notice';
        return 'general';
    }

    determineActionType(method, path) {
        // Map HTTP methods and paths to action types
        if (method === 'DELETE') return 'delete';
        if (method === 'PUT' || method === 'PATCH') return 'update';
        if (method === 'POST' && path.includes('admin')) return 'admin_access';
        if (method === 'POST' && path.includes('upload')) return 'upload';
        if (method === 'POST') return 'create';
        if (method === 'GET' && path.includes('admin')) return 'admin_access';
        
        return null; // Don't monitor regular GET requests
    }

    /**
     * Get user security status
     */
    getUserSecurityStatus(userId) {
        return {
            activityMonitor: {
                activities: this.activityMonitor.getSuspiciousActivities({ userId }),
                isBlocked: this.activityMonitor.isBlocked(userId)
            },
            concurrentChecker: this.concurrentChecker.getUserSession(userId)
        };
    }
}

module.exports = SecurityMiddleware;