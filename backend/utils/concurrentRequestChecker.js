class ConcurrentRequestChecker {
    constructor(options = {}) {
        // Configuration settings
        this.config = {
            // Per-user concurrent request limits
            maxConcurrentPerUser: options.maxConcurrentPerUser || 5,
            maxConcurrentPerIP: options.maxConcurrentPerIP || 10,
            maxConcurrentPerSession: options.maxConcurrentPerSession || 3,
            
            // Rate limiting
            requestsPerMinute: options.requestsPerMinute || 60,
            burstLimit: options.burstLimit || 10, // Allow brief bursts
            
            // Priority levels
            priorityLevels: {
                critical: 1,    // Login, payment, emergency
                high: 2,        // User interactions, posting
                normal: 3,      // Browsing, search
                low: 4,         // Background tasks, analytics
                bulk: 5         // Scraping, bulk operations
            },
            
            // Request timeouts
            requestTimeout: options.requestTimeout || 30000, // 30 seconds
            queueTimeout: options.queueTimeout || 10000,     // 10 seconds in queue
            
            // Load balancing
            serverCapacity: options.serverCapacity || 100,   // Max concurrent requests
            warningThreshold: options.warningThreshold || 80, // 80% capacity warning
        };
        
        // Active tracking
        this.activeRequests = new Map(); // userId -> Set of request IDs
        this.ipRequests = new Map();     // IP -> Set of request IDs
        this.sessionRequests = new Map(); // sessionId -> Set of request IDs
        this.requestQueue = [];          // Queued requests
        this.totalActiveRequests = 0;
        
        // Rate limiting tracking
        this.userRateLimits = new Map();  // userId -> { count, resetTime, burst }
        this.ipRateLimits = new Map();    // IP -> { count, resetTime, burst }
        
        // Request metadata
        this.requestMetadata = new Map(); // requestId -> metadata
        
        // Cleanup interval
        this.startCleanupInterval();
    }

    //Check if request should be allowed
    checkRequest(userId, ip, sessionId, requestType = 'normal', userAgent = '') {
        const requestId = this.generateRequestId();
        const timestamp = Date.now();
        const priority = this.config.priorityLevels[requestType] || this.config.priorityLevels.normal;
        
        // Create request metadata
        const requestInfo = {
            id: requestId,
            userId,
            ip,
            sessionId,
            type: requestType,
            priority,
            userAgent,
            timestamp,
            status: 'pending'
        };
        
        // Check rate limits first
        const rateLimitResult = this.checkRateLimits(userId, ip);
        if (!rateLimitResult.allowed) {
            return {
                allowed: false,
                reason: 'rate_limit_exceeded',
                retryAfter: rateLimitResult.retryAfter,
                requestId: null
            };
        }
        
        // Check concurrent limits
        const concurrentResult = this.checkConcurrentLimits(userId, ip, sessionId);
        if (!concurrentResult.allowed) {
            // Try to queue the request if it's high priority
            if (priority <= this.config.priorityLevels.high) {
                return this.queueRequest(requestInfo);
            }
            
            return {
                allowed: false,
                reason: concurrentResult.reason,
                requestId: null,
                currentLoad: this.getCurrentLoad()
            };
        }
        
        // Check server capacity
        if (this.totalActiveRequests >= this.config.serverCapacity) {
            // Queue high priority requests
            if (priority <= this.config.priorityLevels.high) {
                return this.queueRequest(requestInfo);
            }
            
            return {
                allowed: false,
                reason: 'server_capacity_exceeded',
                requestId: null,
                currentLoad: this.getCurrentLoad()
            };
        }
        
        // Allow the request
        this.addActiveRequest(requestInfo);
        
        return {
            allowed: true,
            requestId,
            priority,
            currentLoad: this.getCurrentLoad()
        };
    }

    //Check rate limits for user and IP
    checkRateLimits(userId, ip) {
        const now = Date.now();
        const oneMinute = 60 * 1000;
        
        // Check user rate limit
        if (userId) {
            const userLimit = this.userRateLimits.get(userId) || { count: 0, resetTime: now + oneMinute, burst: 0 };
            
            if (now > userLimit.resetTime) {
                // Reset counter
                userLimit.count = 0;
                userLimit.resetTime = now + oneMinute;
                userLimit.burst = 0;
            }
            
            if (userLimit.count >= this.config.requestsPerMinute) {
                return {
                    allowed: false,
                    retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
                };
            }
            
            // Check burst limit
            if (userLimit.burst >= this.config.burstLimit) {
                const timeSinceLastReset = now - (userLimit.resetTime - oneMinute);
                if (timeSinceLastReset < 10000) { // 10 seconds
                    return {
                        allowed: false,
                        retryAfter: Math.ceil((10000 - timeSinceLastReset) / 1000)
                    };
                }
            }
            
            userLimit.count++;
            userLimit.burst++;
            this.userRateLimits.set(userId, userLimit);
        }
        
        // Check IP rate limit
        const ipLimit = this.ipRateLimits.get(ip) || { count: 0, resetTime: now + oneMinute, burst: 0 };
        
        if (now > ipLimit.resetTime) {
            ipLimit.count = 0;
            ipLimit.resetTime = now + oneMinute;
            ipLimit.burst = 0;
        }
        
        if (ipLimit.count >= this.config.requestsPerMinute * 2) { // IP gets 2x user limit
            return {
                allowed: false,
                retryAfter: Math.ceil((ipLimit.resetTime - now) / 1000)
            };
        }
        
        ipLimit.count++;
        ipLimit.burst++;
        this.ipRateLimits.set(ip, ipLimit);
        
        return { allowed: true };
    }

    //Check concurrent request limits
    checkConcurrentLimits(userId, ip, sessionId) {
        // Check user concurrent limit
        if (userId) {
            const userRequests = this.activeRequests.get(userId);
            if (userRequests && userRequests.size >= this.config.maxConcurrentPerUser) {
                return {
                    allowed: false,
                    reason: 'user_concurrent_limit_exceeded',
                    current: userRequests.size,
                    limit: this.config.maxConcurrentPerUser
                };
            }
        }
        
        // Check IP concurrent limit
        const ipRequests = this.ipRequests.get(ip);
        if (ipRequests && ipRequests.size >= this.config.maxConcurrentPerIP) {
            return {
                allowed: false,
                reason: 'ip_concurrent_limit_exceeded',
                current: ipRequests.size,
                limit: this.config.maxConcurrentPerIP
            };
        }
        
        // Check session concurrent limit
        if (sessionId) {
            const sessionRequests = this.sessionRequests.get(sessionId);
            if (sessionRequests && sessionRequests.size >= this.config.maxConcurrentPerSession) {
                return {
                    allowed: false,
                    reason: 'session_concurrent_limit_exceeded',
                    current: sessionRequests.size,
                    limit: this.config.maxConcurrentPerSession
                };
            }
        }
        
        return { allowed: true };
    }

    //Add request to active tracking
    addActiveRequest(requestInfo) {
        const { id, userId, ip, sessionId } = requestInfo;
        
        // Store metadata
        this.requestMetadata.set(id, requestInfo);
        
        // Track by user
        if (userId) {
            if (!this.activeRequests.has(userId)) {
                this.activeRequests.set(userId, new Set());
            }
            this.activeRequests.get(userId).add(id);
        }
        
        // Track by IP
        if (!this.ipRequests.has(ip)) {
            this.ipRequests.set(ip, new Set());
        }
        this.ipRequests.get(ip).add(id);
        
        // Track by session
        if (sessionId) {
            if (!this.sessionRequests.has(sessionId)) {
                this.sessionRequests.set(sessionId, new Set());
            }
            this.sessionRequests.get(sessionId).add(id);
        }
        
        this.totalActiveRequests++;
        
        // Set timeout for request
        setTimeout(() => {
            this.timeoutRequest(id);
        }, this.config.requestTimeout);
    }

    //Queue a request when limits are reached
    queueRequest(requestInfo) {
        requestInfo.status = 'queued';
        requestInfo.queuedAt = Date.now();
        
        // Insert into queue based on priority
        let insertIndex = this.requestQueue.length;
        for (let i = 0; i < this.requestQueue.length; i++) {
            if (this.requestQueue[i].priority > requestInfo.priority) {
                insertIndex = i;
                break;
            }
        }
        
        this.requestQueue.splice(insertIndex, 0, requestInfo);
        
        // Set queue timeout
        setTimeout(() => {
            this.removeFromQueue(requestInfo.id);
        }, this.config.queueTimeout);
        
        return {
            allowed: false,
            reason: 'queued',
            requestId: requestInfo.id,
            queuePosition: insertIndex + 1,
            estimatedWait: this.estimateWaitTime()
        };
    }

    //Complete a request and check queue
    completeRequest(requestId) {
        const requestInfo = this.requestMetadata.get(requestId);
        if (!requestInfo) {
            return false;
        }
        
        const { userId, ip, sessionId } = requestInfo;
        
        // Remove from active tracking
        if (userId && this.activeRequests.has(userId)) {
            this.activeRequests.get(userId).delete(requestId);
            if (this.activeRequests.get(userId).size === 0) {
                this.activeRequests.delete(userId);
            }
        }
        
        if (this.ipRequests.has(ip)) {
            this.ipRequests.get(ip).delete(requestId);
            if (this.ipRequests.get(ip).size === 0) {
                this.ipRequests.delete(ip);
            }
        }
        
        if (sessionId && this.sessionRequests.has(sessionId)) {
            this.sessionRequests.get(sessionId).delete(requestId);
            if (this.sessionRequests.get(sessionId).size === 0) {
                this.sessionRequests.delete(sessionId);
            }
        }
        
        this.requestMetadata.delete(requestId);
        this.totalActiveRequests--;
        
        // Process queue
        this.processQueue();
        
        return true;
    }

    //Process queued requests

    processQueue() {
        while (this.requestQueue.length > 0) {
            const queuedRequest = this.requestQueue[0];
            
            // Check if request is still valid (not timed out)
            if (Date.now() - queuedRequest.queuedAt > this.config.queueTimeout) {
                this.requestQueue.shift();
                continue;
            }
            
            // Check if request can now be processed
            const canProcess = this.checkConcurrentLimits(
                queuedRequest.userId,
                queuedRequest.ip,
                queuedRequest.sessionId
            );
            
            if (canProcess.allowed && this.totalActiveRequests < this.config.serverCapacity) {
                // Remove from queue and add to active
                this.requestQueue.shift();
                queuedRequest.status = 'active';
                this.addActiveRequest(queuedRequest);
                
                // Notify that request can proceed (in real implementation, you'd use events/callbacks)
                console.log(`Request ${queuedRequest.id} moved from queue to active`);
            } else {
                break; // Can't process this request yet, stop checking queue
            }
        }
    }

    //Timeout a request
    timeoutRequest(requestId) {
        const requestInfo = this.requestMetadata.get(requestId);
        if (requestInfo && requestInfo.status === 'active') {
            console.warn(`Request ${requestId} timed out after ${this.config.requestTimeout}ms`);
            this.completeRequest(requestId);
        }
    }

    //Remove request from queue
    removeFromQueue(requestId) {
        const index = this.requestQueue.findIndex(req => req.id === requestId);
        if (index !== -1) {
            this.requestQueue.splice(index, 1);
        }
    }

    //Get current server load information
    getCurrentLoad() {
        const loadPercentage = (this.totalActiveRequests / this.config.serverCapacity) * 100;
        
        return {
            activeRequests: this.totalActiveRequests,
            capacity: this.config.serverCapacity,
            loadPercentage: Math.round(loadPercentage),
            queueLength: this.requestQueue.length,
            status: loadPercentage > this.config.warningThreshold ? 'high' : 'normal'
        };
    }

    //Estimate wait time for queued requests
    estimateWaitTime() {
        if (this.requestQueue.length === 0) return 0;
        
        // Simple estimation: average request duration * queue position
        const avgRequestDuration = 2000; // 2 seconds average
        return this.requestQueue.length * avgRequestDuration;
    }

    //Get user statistics
    getUserStats(userId) {
        const activeCount = this.activeRequests.get(userId)?.size || 0;
        const rateLimit = this.userRateLimits.get(userId);
        
        return {
            activeRequests: activeCount,
            requestsThisMinute: rateLimit?.count || 0,
            rateLimitResetIn: rateLimit ? Math.max(0, rateLimit.resetTime - Date.now()) : 0,
            isLimited: activeCount >= this.config.maxConcurrentPerUser
        };
    }

    //Get IP statistics
    getIPStats(ip) {
        const activeCount = this.ipRequests.get(ip)?.size || 0;
        const rateLimit = this.ipRateLimits.get(ip);
        
        return {
            activeRequests: activeCount,
            requestsThisMinute: rateLimit?.count || 0,
            rateLimitResetIn: rateLimit ? Math.max(0, rateLimit.resetTime - Date.now()) : 0,
            isLimited: activeCount >= this.config.maxConcurrentPerIP
        };
    }

    //Check if user/IP shows suspicious patterns
    isSuspicious(userId, ip, userAgent) {
        const userStats = this.getUserStats(userId);
        const ipStats = this.getIPStats(ip);
        
        // High concurrent requests
        if (userStats.activeRequests >= this.config.maxConcurrentPerUser * 0.8) {
            return { suspicious: true, reason: 'high_concurrent_requests' };
        }
        
        // High rate of requests
        if (userStats.requestsThisMinute >= this.config.requestsPerMinute * 0.9) {
            return { suspicious: true, reason: 'high_request_rate' };
        }
        
        // Suspicious user agent
        if (this.isSuspiciousUserAgent(userAgent)) {
            return { suspicious: true, reason: 'suspicious_user_agent' };
        }
        
        // IP making too many requests
        if (ipStats.requestsThisMinute >= this.config.requestsPerMinute * 1.5) {
            return { suspicious: true, reason: 'ip_high_request_rate' };
        }
        
        return { suspicious: false };
    }

    //Check for suspicious user agents
    isSuspiciousUserAgent(userAgent) {
        if (!userAgent) return true;
        
        const suspiciousPatterns = [
            /bot/i, /crawler/i, /spider/i, /scraper/i,
            /python/i, /curl/i, /wget/i, /httpclient/i
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(userAgent));
    }

    //Generate unique request ID
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    //Start cleanup interval to remove old data
    startCleanupInterval() {
        setInterval(() => {
            this.cleanup();
        }, 60000); // Clean up every minute
    }

    //Clean up old data
    cleanup() {
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        // Clean up old rate limit entries
        for (const [key, limit] of this.userRateLimits.entries()) {
            if (limit.resetTime < now) {
                this.userRateLimits.delete(key);
            }
        }
        
        for (const [key, limit] of this.ipRateLimits.entries()) {
            if (limit.resetTime < now) {
                this.ipRateLimits.delete(key);
            }
        }
        
        // Clean up old request metadata
        for (const [requestId, metadata] of this.requestMetadata.entries()) {
            if (metadata.timestamp < fiveMinutesAgo) {
                this.completeRequest(requestId);
            }
        }
        
        // Clean up expired queue items
        this.requestQueue = this.requestQueue.filter(req => 
            now - req.queuedAt < this.config.queueTimeout
        );
    }

    //Get system status report
    getSystemStatus() {
        const load = this.getCurrentLoad();
        
        return {
            timestamp: new Date().toISOString(),
            load,
            activeUsers: this.activeRequests.size,
            activeIPs: this.ipRequests.size,
            activeSessions: this.sessionRequests.size,
            queueLength: this.requestQueue.length,
            rateLimitedUsers: Array.from(this.userRateLimits.keys()).length,
            rateLimitedIPs: Array.from(this.ipRateLimits.keys()).length
        };
    }
}

module.exports = ConcurrentRequestChecker;