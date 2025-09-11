// customSecurity.js
// Educational security scaffolding providing custom function placeholders.
// NOTE: These are NOT production-grade security controls. They are here so the team
// can plug in logic later as per course project requirements.

// Stage 1: Input Validation & Rate Limiting ----------------------------------
const sqlKeywords = ['SELECT','DROP','INSERT','UPDATE','DELETE','UNION'];
const scriptTags = ['<script','</script>','javascript:','onclick'];

function customInputValidator(input = '', inputType = 'generic') {
  if (typeof input !== 'string') return { isValid: false, error: 'Invalid input type' };
  const upper = input.toUpperCase();
  for (const k of sqlKeywords) if (upper.includes(k)) return { isValid: false, error: 'Potential SQL injection detected' };
  const lower = input.toLowerCase();
  for (const t of scriptTags) if (lower.includes(t)) return { isValid: false, error: 'Potential script injection detected' };
  return { isValid: true, cleanInput: input };
}

// Simple in-memory rate limiter store
const rateLimitData = {}; // { key: [timestamps] }
function customRateLimiter(userID, maxRequests = 5, timeWindow = 60000) {
  const now = Date.now();
  if (!rateLimitData[userID]) rateLimitData[userID] = [];
  rateLimitData[userID] = rateLimitData[userID].filter(ts => now - ts < timeWindow);
  if (rateLimitData[userID].length >= maxRequests) {
    return { allowed: false, remainingTime: timeWindow - (now - rateLimitData[userID][0]) };
  }
  rateLimitData[userID].push(now);
  return { allowed: true };
}

// Stage 2: Propagation Control -----------------------------------------------
const activeSessions = {}; // token -> session meta
function customSessionManager() {
  return {
    generateToken(userID, userRole) {
      const ts = Date.now();
      const rnd = Math.floor(Math.random() * 1_000_000);
      const token = `${userID}_${userRole}_${ts}_${rnd}`;
      activeSessions[token] = { userID, userRole, createdAt: ts, lastActivity: ts };
      return token;
    },
    validateToken(token) {
      const session = activeSessions[token];
      if (!session) return false;
      const timeout = 30 * 60 * 1000;
      if (Date.now() - session.lastActivity > timeout) { delete activeSessions[token]; return false; }
      session.lastActivity = Date.now();
      return session;
    }
  };
}

const userActivities = {}; // userId -> [{type,data,timestamp}]
function customActivityMonitor(userID, activityType, activityData) {
  const now = Date.now();
  if (!userActivities[userID]) userActivities[userID] = [];
  userActivities[userID].push({ type: activityType, data: activityData, timestamp: now });
  const oneHour = 60 * 60 * 1000;
  userActivities[userID] = userActivities[userID].filter(a => now - a.timestamp < oneHour);
  const recent = userActivities[userID];
  if (activityType === 'login' && recent.filter(a => a.type === 'login').length > 10) {
    return { isAnomalous: true, reason: 'Too many login attempts' };
  }
  if (activityType === 'marketplace_post' && recent.filter(a => a.type === 'marketplace_post').length > 20) {
    return { isAnomalous: true, reason: 'Spam posting detected' };
  }
  return { isAnomalous: false };
}

function customDataEncryption() {
  const secretKey = 'EDUSYNC2024SECURITY'; // placeholder
  return {
    encrypt(data) {
      const json = JSON.stringify(data);
      let out = '';
      for (let i = 0; i < json.length; i++) {
        out += String.fromCharCode(json.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length));
      }
      return Buffer.from(out, 'binary').toString('base64');
    },
    decrypt(enc) {
      try {
        const bin = Buffer.from(enc, 'base64').toString('binary');
        let dec = '';
        for (let i = 0; i < bin.length; i++) {
          dec += String.fromCharCode(bin.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length));
        }
        return JSON.parse(dec);
      } catch { return null; }
    }
  };
}

// Stage 3: Aggregation Prevention -------------------------------------------
const userPermissions = {
  student: ['read_marketplace','read_tutoring','read_jobs','write_own_posts'],
  faculty: ['read_all','write_jobs','moderate_content'],
  business_owner: ['read_marketplace','write_products','read_orders'],
  food_vendor: ['read_marketplace','write_products','read_orders'],
  moderator: ['read_all','moderate_content','write_notices'],
  admin: ['read_all','write_all','delete_all','manage_users','write_notices']
};

function customAccessController(userRole, requestedAction, resourceType, resourceOwner, currentUser) {
  const rolePerms = userPermissions[userRole] || [];
  if (rolePerms.includes('read_all') || rolePerms.includes('write_all')) return { allowed: true };
  if (requestedAction === 'read' && rolePerms.includes(`read_${resourceType}`)) return { allowed: true };
  if (requestedAction === 'write' && rolePerms.includes(`write_${resourceType}`)) return { allowed: true };
  if (requestedAction === 'write' && rolePerms.includes('write_own_posts') && resourceOwner === currentUser) return { allowed: true };
  return { allowed: false, reason: 'Insufficient permissions' };
}

// Stage 4: Exfiltration Prevention ------------------------------------------
function customFileValidator(file, fileContent, userRole) {
  const allowedExtensions = {
    student: ['.jpg','.png','.pdf','.doc','.docx'],
    faculty: ['.jpg','.png','.pdf','.doc','.docx','.ppt','.pptx'],
    business_owner: ['.jpg','.png','.pdf'],
    food_vendor: ['.jpg','.png','.pdf'],
    admin: ['.jpg','.png','.pdf','.doc','.docx','.txt','.csv'],
    moderator: ['.jpg','.png','.pdf','.doc','.docx']
  };
  const maxFileSizes = {
    student: 5*1024*1024,
    faculty: 10*1024*1024,
    business_owner: 5*1024*1024,
    food_vendor: 5*1024*1024,
    admin: 20*1024*1024,
    moderator: 10*1024*1024
  };
  const ext = file?.name?.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions[userRole] || !allowedExtensions[userRole].includes(ext)) return { isValid:false, reason:'File type not allowed' };
  if (file.size > (maxFileSizes[userRole] || 0)) return { isValid:false, reason:'File size exceeds limit' };
  const suspicious = ['eval(','script>','iframe','onclick=','onerror=','document.cookie','localStorage','sessionStorage'];
  const contentStr = (fileContent||'').toString().toLowerCase();
  for (const p of suspicious) if (contentStr.includes(p)) return { isValid:false, reason:'Suspicious content detected' };
  return { isValid:true, sanitizedName: file.name.replace(/[^a-zA-Z0-9.-]/g,'_') };
}

const auditLogs = [];
const maxLogSize = 10000;
function customAuditLogger(userID, action, dataType, dataSize, recipient, metadata={}) {
  const entry = {
    id: auditLogs.length + 1,
    timestamp: new Date().toISOString(),
    userID, action, dataType, dataSize, recipient,
    ipAddress: metadata.ipAddress || 'unknown',
    userAgent: metadata.userAgent || 'unknown',
    suspicious: false
  };
  auditLogs.push(entry);
  if (auditLogs.length > maxLogSize) auditLogs.shift();
  const recent = auditLogs.filter(l => l.userID === userID && Date.now() - new Date(l.timestamp).getTime() < 60_000);
  const total = recent.reduce((s,l)=>s + (l.dataSize||0),0);
  if (total > 50*1024*1024) { entry.suspicious = true; console.warn(`[Audit] Suspicious data transfer for user ${userID}`); }
  return { logID: entry.id, timestamp: entry.timestamp, suspicious: entry.suspicious };
}
function getAuditLogs(filters={}) {
  return auditLogs.filter(l => {
    if (filters.userID && l.userID !== filters.userID) return false;
    if (filters.suspicious && !l.suspicious) return false;
    if (filters.dateFrom && new Date(l.timestamp) < new Date(filters.dateFrom)) return false;
    return true;
  });
}

module.exports = {
  // Stage 1
  customInputValidator, customRateLimiter,
  // Stage 2
  customSessionManager, customActivityMonitor, customDataEncryption,
  // Stage 3
  customAccessController,
  // Stage 4
  customFileValidator, customAuditLogger, getAuditLogs,
  // Raw stores (for testing / extension)
  _stores: { rateLimitData, activeSessions, userActivities, auditLogs }
};
