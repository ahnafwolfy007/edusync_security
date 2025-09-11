const dbConfig = require('../config/db');
const { customInputValidator } = require('../security');

function canPost(role) { return ['admin','moderator'].includes(role); }

const getAllNotices = async (req, res) => {
  try {
    const { category, pinned } = req.query;
    const params=[]; const where=[];
    if (category) { params.push(category); where.push(`category = $${params.length}`); }
    if (pinned !== undefined) { params.push(pinned === 'true'); where.push(`is_pinned = $${params.length}`); }
    let q='SELECT n.*, u.full_name AS posted_by_name FROM notices n JOIN users u ON n.posted_by = u.user_id';
    if (where.length) q += ' WHERE '+where.join(' AND ');
    q += ' ORDER BY is_pinned DESC, created_at DESC LIMIT 200';
    const db = dbConfig.getDB();
    const { rows } = await db.query(q, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success:false, message:'Server error' }); }
};

const getNoticeById = async (req, res) => {
  try { const db=dbConfig.getDB(); const { id }=req.params; const { rows }=await db.query('SELECT * FROM notices WHERE notice_id=$1',[id]); if(!rows[0]) return res.status(404).json({success:false,message:'Not found'}); res.json({success:true,data:rows[0]}); } catch(e){ res.status(500).json({success:false,message:'Server error'}); }
};

const createNotice = async (req, res) => {
  try {
    const role=req.user?.role_name; const userId=req.user?.user_id; if(!canPost(role)) return res.status(403).json({success:false,message:'Forbidden'});
    const { title, content, category, is_pinned } = req.body;
    const validation = customInputValidator({ title, content });
    if (!validation.valid) return res.status(400).json({ success:false, message:'Invalid input', issues: validation.issues });
    const db=dbConfig.getDB();
    const { rows } = await db.query('INSERT INTO notices (posted_by, title, content, category, is_pinned) VALUES ($1,$2,$3,$4,COALESCE($5,false)) RETURNING *',[userId,title,content,category,is_pinned]);
    res.status(201).json({ success:true, data: rows[0] });
  } catch(e){ res.status(500).json({success:false,message:'Server error'}); }
};

const updateNotice = async (req, res) => {
  try { const role=req.user?.role_name; if(!canPost(role)) return res.status(403).json({success:false,message:'Forbidden'}); const { id }=req.params; const fields=['title','content','category','is_pinned']; const updates=[]; const params=[]; fields.forEach(f=>{ if(req.body[f]!==undefined){ params.push(req.body[f]); updates.push(`${f}=$${params.length}`);} }); if(!updates.length) return res.status(400).json({success:false,message:'No fields to update'}); params.push(id); const db=dbConfig.getDB(); const { rows }=await db.query(`UPDATE notices SET ${updates.join(', ')}, created_at = created_at WHERE notice_id=$${params.length} RETURNING *`, params); if(!rows[0]) return res.status(404).json({success:false,message:'Not found'}); res.json({success:true,data:rows[0]}); } catch(e){ res.status(500).json({success:false,message:'Server error'}); }
};

const deleteNotice = async (req, res) => {
  try { const role=req.user?.role_name; if(!canPost(role)) return res.status(403).json({success:false,message:'Forbidden'}); const { id }=req.params; const db=dbConfig.getDB(); const { rowCount }=await db.query('DELETE FROM notices WHERE notice_id=$1',[id]); if(!rowCount) return res.status(404).json({success:false,message:'Not found'}); res.json({success:true,message:'Deleted'}); } catch(e){ res.status(500).json({success:false,message:'Server error'}); }
};

const getUserNotices = async (req, res) => {
  try { const userId=req.user?.user_id; if(!userId) return res.status(401).json({success:false,message:'Unauthorized'}); const db=dbConfig.getDB(); const { rows }=await db.query('SELECT * FROM notices WHERE posted_by=$1 ORDER BY created_at DESC',[userId]); res.json({success:true,data:rows}); } catch(e){ res.status(500).json({success:false,message:'Server error'}); }
};

const markNoticeAsRead = async (req, res) => {
  // Placeholder for future per-user notification linkage
  res.json({ success:true, message:'Read status tracking not implemented' });
};

module.exports = { getAllNotices, getNoticeById, createNotice, updateNotice, deleteNotice, getUserNotices, markNoticeAsRead };
