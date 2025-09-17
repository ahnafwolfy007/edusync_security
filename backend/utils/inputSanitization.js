/**
 * Custom Input Sanitization Utilities
 * Provides comprehensive input validation and sanitization without external libraries
 */

class InputSanitizer {
    /**
     * Remove HTML tags and encode special characters to prevent XSS
     */
    static sanitizeHTML(input) {
        if (typeof input !== 'string') return '';
        
        return input
            // Remove script tags and their content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            // Remove all HTML tags
            .replace(/<[^>]*>/g, '')
            // Encode special characters
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/`/g, '&#x60;')
            .trim();
    }

    /**
     * Sanitize SQL injection attempts
     */
    static sanitizeSQL(input) {
        if (typeof input !== 'string') return '';
        
        const sqlKeywords = [
            'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
            'EXEC', 'EXECUTE', 'UNION', 'SCRIPT', 'DECLARE', 'CAST', 'CONVERT',
            'TRUNCATE', 'MERGE', 'GRANT', 'REVOKE', 'BACKUP', 'RESTORE'
        ];
        
        let sanitized = input
            // Remove dangerous characters
            .replace(/[';\\]/g, '')
            // Remove SQL comments
            .replace(/--.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');
        
        // Remove SQL keywords (case insensitive)
        sqlKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            sanitized = sanitized.replace(regex, '');
        });
        
        return sanitized.trim();
    }

    /**
     * Validate and sanitize email addresses
     */
    static validateEmail(email) {
        if (typeof email !== 'string') return false;
        
        const emailRegex = /^[a-zA-Z0-9]+@bscse\.uiu\.ac\.bd$/;
        const sanitizedEmail = email.toLowerCase().trim();
        
        // Check for suspicious patterns
        if (sanitizedEmail.includes('javascript:') || 
            sanitizedEmail.includes('<script') ||
            sanitizedEmail.length > 254) {
            return false;
        }
        
        return emailRegex.test(sanitizedEmail) ? sanitizedEmail : false;
    }

    /**
     * Validate password strength
     */
    static validatePassword(password) {
        if (typeof password !== 'string') return { valid: false, errors: ['Invalid password format'] };
        
        const errors = [];
        
        if (password.length < 6) errors.push('Password must be at least 6 characters long');
        if (password.length > 128) errors.push('Password must be less than 128 characters long');
        if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
        if (!/\d/.test(password)) errors.push('Password must contain at least one number');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain at least one special character');
        
        // Check for common weak passwords
        const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too common');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Sanitize general text input
     */
    static sanitizeText(input, maxLength = 1000) {
        if (typeof input !== 'string') return '';
        
        return input
            // Remove dangerous HTML tags and attributes
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
            .replace(/<object[^>]*>.*?<\/object>/gi, '')
            .replace(/<embed[^>]*>.*?<\/embed>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/data:/gi, '')
            // Remove event handlers
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/on\w+\s*=\s*[^"'\s>]+/gi, '')
            // Limit length and trim
            .slice(0, maxLength)
            .trim();
    }

    /**
     * Validate numeric input with range checking
     */
    static validateNumber(input, min = null, max = null) {
        const num = Number(input);
        
        if (isNaN(num) || !isFinite(num)) {
            return { valid: false, value: null, error: 'Invalid number format' };
        }
        
        if (min !== null && num < min) {
            return { valid: false, value: null, error: `Number must be at least ${min}` };
        }
        
        if (max !== null && num > max) {
            return { valid: false, value: null, error: `Number must be at most ${max}` };
        }
        
        return { valid: true, value: num, error: null };
    }

    /**
     * Validate MongoDB ObjectId format
     */
    static validateObjectId(id) {
        if (typeof id !== 'string') return false;
        return /^[0-9a-fA-F]{24}$/.test(id);
    }

    /**
     * Sanitize filename for file uploads
     */
    static sanitizeFilename(filename) {
        if (typeof filename !== 'string') return '';
        
        return filename
            // Remove path traversal attempts
            .replace(/\.\./g, '')
            .replace(/[\/\\]/g, '')
            // Keep only safe characters
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            // Remove multiple consecutive dots
            .replace(/\.{2,}/g, '.')
            // Ensure it doesn't start with a dot
            .replace(/^\./, '')
            // Limit length
            .slice(0, 255)
            .trim();
    }

    /**
     * Validate file type against allowed extensions
     */
    static validateFileType(filename, allowedTypes = []) {
        if (!filename || typeof filename !== 'string') return false;
        
        const extension = filename.toLowerCase().split('.').pop();
        return allowedTypes.map(type => type.toLowerCase()).includes(extension);
    }

    /**
     * Sanitize and validate URL
     */
    static sanitizeURL(url) {
        if (typeof url !== 'string') return '';
        
        try {
            const urlObj = new URL(url);
            const allowedProtocols = ['http:', 'https:'];
            
            if (!allowedProtocols.includes(urlObj.protocol)) {
                return '';
            }
            
            // Check for suspicious patterns
            if (urlObj.href.includes('javascript:') || 
                urlObj.href.includes('data:') ||
                urlObj.href.includes('vbscript:')) {
                return '';
            }
            
            return urlObj.href;
        } catch {
            return '';
        }
    }

    /**
     * Validate phone number format
     */
    static validatePhone(phone) {
        if (typeof phone !== 'string') return false;
        
        // Remove all non-digit characters for validation
        const digitsOnly = phone.replace(/\D/g, '');
        
        // Check if it's a valid length (10-15 digits)
        if (digitsOnly.length < 10 || digitsOnly.length > 15) {
            return false;
        }
        
        // Return formatted phone number
        return digitsOnly;
    }

    /**
     * Create a rate limiter function
     */
    static createRateLimiter(windowMs = 900000, maxRequests = 100) {
        const requests = new Map();
        
        return (identifier) => {
            const now = Date.now();
            const windowStart = now - windowMs;
            
            // Clean old entries
            for (const [key, timestamps] of requests.entries()) {
                const validTimestamps = timestamps.filter(time => time > windowStart);
                if (validTimestamps.length === 0) {
                    requests.delete(key);
                } else {
                    requests.set(key, validTimestamps);
                }
            }
            
            if (!requests.has(identifier)) {
                requests.set(identifier, []);
            }
            
            const userRequests = requests.get(identifier);
            const validRequests = userRequests.filter(time => time > windowStart);
            
            if (validRequests.length >= maxRequests) {
                return false;
            }
            
            validRequests.push(now);
            requests.set(identifier, validRequests);
            return true;
        };
    }

    /**
     * Sanitize search query to prevent injection attacks
     */
    static sanitizeSearchQuery(query) {
        if (typeof query !== 'string') return '';
        
        return query
            .replace(/[{}()\[\]]/g, '') // Remove regex special chars
            .replace(/\$\w+/g, '') // Remove MongoDB operators
            .replace(/[<>]/g, '') // Remove comparison operators
            .trim()
            .slice(0, 100); // Limit search query length
    }

    /**
     * Validate date input
     */
    static validateDate(dateInput) {
        if (!dateInput) return { valid: false, value: null, error: 'Date is required' };
        
        const date = new Date(dateInput);
        
        if (isNaN(date.getTime())) {
            return { valid: false, value: null, error: 'Invalid date format' };
        }
        
        const now = new Date();
        const minDate = new Date('1900-01-01');
        const maxDate = new Date(now.getFullYear() + 10, 11, 31); // 10 years in future
        
        if (date < minDate || date > maxDate) {
            return { valid: false, value: null, error: 'Date out of valid range' };
        }
        
        return { valid: true, value: date, error: null };
    }

    /**
     * Comprehensive request sanitization middleware (non-destructive)
     */
    static sanitizeRequest(req, res, next) {
        try {
            // Skip sanitization for login and critical auth endpoints
            if (req.path.includes('/login') || req.path.includes('/auth')) {
                return next();
            }

            // Create a backup of original values for debugging
            req._originalBody = req.body ? JSON.parse(JSON.stringify(req.body)) : {};
            req._originalQuery = req.query ? JSON.parse(JSON.stringify(req.query)) : {};

            // Very light sanitization - only remove obvious threats
            if (req.body && typeof req.body === 'object') {
                for (const key in req.body) {
                    if (typeof req.body[key] === 'string' && req.body[key].length > 0) {
                        // Only remove obvious script injections
                        const original = req.body[key];
                        req.body[key] = original
                            .replace(/<script[^>]*>.*?<\/script>/gi, '')
                            .replace(/javascript:/gi, '')
                            .replace(/vbscript:/gi, '')
                            .replace(/data:text\/html/gi, '');
                        
                        // If sanitization removed too much, revert to original
                        if (req.body[key].length < original.length * 0.8) {
                            req.body[key] = original;
                        }
                    }
                }
            }

            // Light sanitization for query parameters (search terms, etc.)
            if (req.query && typeof req.query === 'object') {
                for (const key in req.query) {
                    if (typeof req.query[key] === 'string' && req.query[key].length > 0) {
                        req.query[key] = req.query[key]
                            .replace(/<script[^>]*>.*?<\/script>/gi, '')
                            .replace(/javascript:/gi, '');
                    }
                }
            }

            next();
        } catch (error) {
            // If sanitization fails, continue without sanitization
            console.warn('Input sanitization warning:', error.message);
            next();
        }
    }

    /**
     * Validate and sanitize price/currency input
     */
    static validatePrice(price) {
        const numValidation = InputSanitizer.validateNumber(price, 0, 1000000);
        
        if (!numValidation.valid) {
            return numValidation;
        }
        
        // Round to 2 decimal places
        const roundedPrice = Math.round(numValidation.value * 100) / 100;
        
        return { valid: true, value: roundedPrice, error: null };
    }

    /**
     * Sanitize JSON input
     */
    static sanitizeJSON(jsonString) {
        if (typeof jsonString !== 'string') return null;
        
        try {
            // Remove any potential script injections
            const sanitized = jsonString
                .replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
            
            const parsed = JSON.parse(sanitized);
            return parsed;
        } catch {
            return null;
        }
    }
}

module.exports = InputSanitizer;
