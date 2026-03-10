/**
 * โมเดลบันทึกการตรวจสอบ — ตัวช่วยคิวรีบนตาราง Supabase 'audit_logs'
 */
const { getSupabase } = require('../config/db');

const TABLE = 'audit_logs';
const sb = () => getSupabase();

const toObj = (r) => ({
  id:        r.id,
  userId:    r.user_id,
  action:    r.action,
  details:   r.details,
  ipAddress: r.ip_address,
  createdAt: r.created_at,
});

const AuditLog = {
  async create({ userId, action, details, ipAddress }) {
    const row = {
      user_id:    userId ?? null,
      action,
      details:    details ?? '',
      ip_address: ipAddress ?? '',
    };
    const { data, error } = await sb()
      .from(TABLE)
      .insert(row)
      .select();
    if (error) throw error;
    return toObj(data[0]);
  },

  async find({ skip = 0, limit = 50 } = {}) {
    const { data, error } = await sb()
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);
    if (error) throw error;
    return (data || []).map(toObj);
  },

  async count() {
    const { count, error } = await sb()
      .from(TABLE)
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  },
};

module.exports = AuditLog;
