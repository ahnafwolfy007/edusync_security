const { createHash } = require('crypto');

class ActivityMonitor {
    constructor() {
        // In-memory storage for activity tracking
        this.userActivities = new Map();
        this.suspiciousActivities = [];
        this.blockedIPs = new Set();
        this.rateLimits = new Map();
        
        // Configuration thresholds
        this.config = {
            // Login monitoring
            maxFailedLogins: 5,
            loginTimeWindow: 900000, // 15 minutes
            suspiciousLoginLocations: 3, // Different locations within timeframe
            
            // Posting/Content monitoring
            maxPostsPerMinute: 10,
            maxPostsPerHour: 100,
            spamKeywordThreshold: 3, // Number of spam keywords to trigger alert
            
            // General activity
            maxActionsPerMinute: 50,
            suspiciousActionTypes: ['delete', 'bulk_update', 'admin_access'],
            
            // Account monitoring
            newAccountSuspiciousActions: ['immediate_posting', 'bulk_friend_requests'],
            accountAgeThreshold: 86400000 // 24 hours for new account monitoring
        };
        
        // Spam keywords (expandable)
        this.spamKeywords = [
            'click here', 'free money', 'limited time', 'act now', 'guaranteed',
            'make money fast', 'work from home', 'no experience needed',
            'earn $$$', 'buy now', 'discount', 'sale ends'
        ];
    }

    //Monitor user login attempts
    monitorLogin(userId, ip, userAgent, location = null, success = true) {
        const timestamp = Date.now();
        const activityKey = `login_${userId}`;
        
        if (!this.userActivities.has(activityKey)) {
            this.userActivities.set(activityKey, {
                failedAttempts: 0,
                successfulLogins: [],
                locations: new Set(),
                ips: new Set(),
                lastActivity: timestamp
            });
        }
        
        const activity = this.userActivities.get(activityKey);
        
        if (!success) {
            activity.failedAttempts++;
            activity.lastFailedAttempt = timestamp;
            
            // Check for suspicious failed login patterns
            if (activity.failedAttempts >= this.config.maxFailedLogins) {
                this.flagSuspiciousActivity({
                    type: 'excessive_failed_logins',
                    userId,
                    ip,
                    details: {
                        failedAttempts: activity.failedAttempts,
                        timeWindow: this.config.loginTimeWindow
                    },
                    severity: 'high',
                    timestamp
                });
                
                // Temporarily block IP
                this.blockedIPs.add(ip);
                setTimeout(() => this.blockedIPs.delete(ip), this.config.loginTimeWindow);
            }
        } else {
            // Successful login
            activity.successfulLogins.push({ timestamp, ip, userAgent, location });
            activity.ips.add(ip);
            if (location) activity.locations.add(location);
            activity.failedAttempts = 0; // Reset failed attempts on successful login
            
            // Check for unusual location patterns
            if (location && activity.locations.size >= this.config.suspiciousLoginLocations) {
                const recentLogins = activity.successfulLogins.filter(
                    login => timestamp - login.timestamp < this.config.loginTimeWindow
                );
                
                if (recentLogins.length >= this.config.suspiciousLoginLocations) {
                    this.flagSuspiciousActivity({
                        type: 'multiple_location_logins',
                        userId,
                        ip,
                        details: {
                            locations: Array.from(activity.locations),
                            recentLogins: recentLogins.length
                        },
                        severity: 'medium',
                        timestamp
                    });
                }
            }
        }
        
        activity.lastActivity = timestamp;
        return this.isBlocked(ip);
    }

    //Monitor content posting for spam detection
    monitorContentPost(userId, content, postType = 'general') {
        const timestamp = Date.now();
        const activityKey = `posts_${userId}`;
        
        if (!this.userActivities.has(activityKey)) {
            this.userActivities.set(activityKey, {
                posts: [],
                postsLastMinute: 0,
                postsLastHour: 0,
                lastPostTime: 0
            });
        }
        
        const activity = this.userActivities.get(activityKey);
        
        // Add current post
        activity.posts.push({
            content: this.hashContent(content),
            type: postType,
            timestamp
        });
        
        // Clean old posts and count recent ones
        const oneMinuteAgo = timestamp - 60000;
        const oneHourAgo = timestamp - 3600000;
        
        activity.posts = activity.posts.filter(post => post.timestamp > oneHourAgo);
        activity.postsLastMinute = activity.posts.filter(post => post.timestamp > oneMinuteAgo).length;
        activity.postsLastHour = activity.posts.length;
        
        // Check for spam patterns
        const spamScore = this.calculateSpamScore(content);
        const isRapidPosting = activity.postsLastMinute > this.config.maxPostsPerMinute;
        const isExcessivePosting = activity.postsLastHour > this.config.maxPostsPerHour;
        
        if (spamScore >= this.config.spamKeywordThreshold || isRapidPosting || isExcessivePosting) {
            this.flagSuspiciousActivity({
                type: 'spam_posting',
                userId,
                details: {
                    spamScore,
                    postsLastMinute: activity.postsLastMinute,
                    postsLastHour: activity.postsLastHour,
                    contentLength: content.length,
                    postType
                },
                severity: spamScore >= this.config.spamKeywordThreshold ? 'high' : 'medium',
                timestamp
            });
        }
        
        activity.lastPostTime = timestamp;
        return {
            allowed: spamScore < this.config.spamKeywordThreshold && !isRapidPosting,
            spamScore,
            rateLimited: isRapidPosting
        };
    }

    //Monitor general user actions
    monitorAction(userId, actionType, details = {}) {
        const timestamp = Date.now();
        const activityKey = `actions_${userId}`;
        
        if (!this.userActivities.has(activityKey)) {
            this.userActivities.set(activityKey, {
                actions: [],
                actionsLastMinute: 0
            });
        }
        
        const activity = this.userActivities.get(activityKey);
        
        // Add current action
        activity.actions.push({
            type: actionType,
            details: this.sanitizeDetails(details),
            timestamp
        });
        
        // Clean old actions and count recent ones
        const oneMinuteAgo = timestamp - 60000;
        activity.actions = activity.actions.filter(action => action.timestamp > oneMinuteAgo);
        activity.actionsLastMinute = activity.actions.length;
        
        // Check for suspicious patterns
        const isSuspiciousAction = this.config.suspiciousActionTypes.includes(actionType);
        const isRapidActions = activity.actionsLastMinute > this.config.maxActionsPerMinute;
        
        if (isSuspiciousAction || isRapidActions) {
            this.flagSuspiciousActivity({
                type: isSuspiciousAction ? 'suspicious_action' : 'rapid_actions',
                userId,
                details: {
                    actionType,
                    actionsLastMinute: activity.actionsLastMinute,
                    actionDetails: details
                },
                severity: isSuspiciousAction ? 'high' : 'medium',
                timestamp
            });
        }
        
        return {
            allowed: !isRapidActions,
            rateLimited: isRapidActions
        };
    }

    //Calculate spam score based on content analysis
    calculateSpamScore(content) {
        let score = 0;
        const lowerContent = content.toLowerCase();
        
        // Check for spam keywords
        this.spamKeywords.forEach(keyword => {
            if (lowerContent.includes(keyword)) {
                score++;
            }
        });
        
        // Check for excessive capitalization
        const caps = content.match(/[A-Z]/g);
        if (caps && caps.length > content.length * 0.5) {
            score += 2;
        }
        
        // Check for excessive punctuation
        const exclamations = content.match(/!/g);
        if (exclamations && exclamations.length > 3) {
            score++;
        }
        
        // Check for repeated characters
        if (/(.)\1{3,}/.test(content)) {
            score++;
        }
        
        // Check for URL patterns
        if (/https?:\/\//.test(content)) {
            score++;
        }
        
        return score;
    }

    //Flag suspicious activity
    flagSuspiciousActivity(activity) {
        this.suspiciousActivities.push({
            ...activity,
            id: this.generateActivityId(),
            flaggedAt: Date.now()
        });
        
        // Keep only last 1000 suspicious activities
        if (this.suspiciousActivities.length > 1000) {
            this.suspiciousActivities = this.suspiciousActivities.slice(-1000);
        }
        
        // Log to console for immediate attention
        console.warn(`[SECURITY ALERT] ${activity.type}:`, activity);
        
        return activity;
    }

    //Check if IP is blocked
    isBlocked(ip) {
        return this.blockedIPs.has(ip);
    }

    //Get suspicious activities
    getSuspiciousActivities(filters = {}) {
        let activities = [...this.suspiciousActivities];
        
        if (filters.userId) {
            activities = activities.filter(a => a.userId === filters.userId);
        }
        
        if (filters.type) {
            activities = activities.filter(a => a.type === filters.type);
        }
        
        if (filters.severity) {
            activities = activities.filter(a => a.severity === filters.severity);
        }
        
        if (filters.since) {
            activities = activities.filter(a => a.timestamp >= filters.since);
        }
        
        return activities.sort((a, b) => b.timestamp - a.timestamp);
    }

    //Generate activity summary report
    generateActivityReport(timeframe = 86400000) { // Default: 24 hours
        const since = Date.now() - timeframe;
        const recentActivities = this.getSuspiciousActivities({ since });
        
        const report = {
            timeframe: timeframe / 3600000, // Convert to hours
            totalSuspiciousActivities: recentActivities.length,
            byType: {},
            bySeverity: { high: 0, medium: 0, low: 0 },
            topUsers: {},
            blockedIPs: Array.from(this.blockedIPs),
            generatedAt: Date.now()
        };
        
        recentActivities.forEach(activity => {
            // Count by type
            report.byType[activity.type] = (report.byType[activity.type] || 0) + 1;
            
            // Count by severity
            report.bySeverity[activity.severity]++;
            
            // Count by user
            if (activity.userId) {
                report.topUsers[activity.userId] = (report.topUsers[activity.userId] || 0) + 1;
            }
        });
        
        return report;
    }

    //Utility functions
    hashContent(content) {
        return createHash('sha256').update(content).digest('hex').substring(0, 16);
    }

    sanitizeDetails(details) {
        // Remove sensitive information from details
        const sanitized = { ...details };
        delete sanitized.password;
        delete sanitized.token;
        delete sanitized.secret;
        return sanitized;
    }

    generateActivityId() {
        return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    //clear old activity data (cleanup function)
    cleanup() {
        const oneDayAgo = Date.now() - 86400000;
        
        // Clean user activities older than 24 hours
        for (const [key, activity] of this.userActivities.entries()) {
            if (activity.lastActivity < oneDayAgo) {
                this.userActivities.delete(key);
            }
        }
        
        // Clean old suspicious activities (keep only last 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 86400000);
        this.suspiciousActivities = this.suspiciousActivities.filter(
            activity => activity.timestamp > thirtyDaysAgo
        );
    }
}

module.exports = ActivityMonitor;