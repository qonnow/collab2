/**
 * โมเดลผู้ใช้ — ตัวช่วยคิวรีบนตาราง Supabase 'users'
 */
const { getSupabase } = require('../config/db');

const TABLE = 'users';
const sb = () => getSupabase();

const toObj = (r) => ({
  _id:       r.id,
  id:        r.id,
  username:  r.username,
  email:     r.email,
  password:  r.password,
  role:      r.role,
  isActive:  r.is_active,
  lastLogin: r.last_login,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const User = {
  async create({ username, email, password, role = 'user' }) {
    const { data, error } = await sb()
      .from(TABLE)
      .insert({ username: username.trim(), email: email.toLowerCase().trim(), password, role })
      .select();
    if (error) throw error;
    return toObj(data[0]);
  },

  async findOne(filter) {
    let q = sb().from(TABLE).select('*');
    // รองรับ { $or: [{ username }, { email }] }
    if (filter.$or) {
      const conds = filter.$or.map((c) => {
        return Object.entries(c).map(([k, v]) => `${k}.eq.${v}`).join(',');
      });
      q = q.or(conds.join(','));
    } else {
      for (const [k, v] of Object.entries(filter)) {
        const col = k === 'isActive' ? 'is_active' : k === 'lastLogin' ? 'last_login' : k;
        q = q.eq(col, v);
      }
    }
    const { data, error } = await q.limit(1).single();
    if (error) return null;
    return toObj(data);
  },

  async findById(id) {
    const { data, error } = await sb()
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return toObj(data);
  },

  async findByIdAndUpdate(id, update) {
    const row = {};
    if (update.lastLogin !== undefined) row.last_login = update.lastLogin;
    if (update.isActive !== undefined)  row.is_active  = update.isActive;
    if (update.password !== undefined)  row.password    = update.password;
    if (update.email !== undefined)     row.email       = update.email;
    if (update.role !== undefined)      row.role        = update.role;
    if (update.username !== undefined)  row.username     = update.username;

    const { data, error } = await sb()
      .from(TABLE)
      .update(row)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data && data[0] ? toObj(data[0]) : null;
  },
};

module.exports = User;
