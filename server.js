const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = "admin"; 
// Removed legacy file paths
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PGHOST || 'db',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'hometv',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 默认接口配置 (保持你的 30+ 个接口不变)
// (All sites are now managed via Postgres)

// --- User management helpers (Postgres) ---
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function generateInviteCode() {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function createJwtForUser(user) {
    return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Missing authorization header' });
    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid authorization format' });
    try {
        const payload = jwt.verify(parts[1], JWT_SECRET);
        req.user = payload;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

async function initDbAndSeed() {
    // create tables
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            invite_code TEXT,
            referrer TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS invites (
            code TEXT PRIMARY KEY,
            created_at TIMESTAMPTZ DEFAULT now()
        );
    `);
    
    // Seed generic invite if table is empty and no invites exist
    const r = await pool.query('SELECT count(*)::int as c FROM invites');
    if (r.rows[0].c === 0) {
         // Optionally seed one initial code
         const initCode = 'INITCODE-0001';
         await pool.query('INSERT INTO invites(code) VALUES($1) ON CONFLICT DO NOTHING', [initCode]);
         console.log('Seeded initial invite code: ' + initCode);
                }
}

// Removed legacy file checks and getDB/saveDB functions

// === Category/Video APIs ===

// Helper: Fetch list from a specific site with filters
async function fetchFromSite(siteKey, typeId, page = 1) {
    const r = await pool.query('SELECT * FROM sites WHERE key=$1 AND active=true', [siteKey]);
    if (r.rows.length === 0) return null;
    const site = r.rows[0];
    try {
        const url = `${site.api}?ac=list&t=${typeId}&pg=${page}&out=json`;
        const res = await axios.get(url, { timeout: 4000 });
        const list = res.data.list || res.data.data;
        if (!Array.isArray(list)) return [];
        return list.map(i => ({ ...i, site_key: site.key, site_name: site.name }));
    } catch (e) {
        return [];
    }
}

// Get videos by category (aggregates from first few active sites)
app.get('/api/category', authMiddleware, async (req, res) => {
    const { type, page = 1 } = req.query; 
    // Type mapping: 1=Movie, 2=TV, 3=Variety, 4=Anime (Generic Maccms defaults, might vary per site)
    // Better strategy: Search 'all' active sites for this type? Or just pick a few reliable ones.
    // For performance, we'll pick top 3 active sites.
    
    try {
        const sitesRes = await pool.query('SELECT * FROM sites WHERE active=true LIMIT 3');
        const sites = sitesRes.rows;
        
        // Parallel fetch
        const promises = sites.map(site => fetchFromSite(site.key, type, page));
        const results = await Promise.all(promises);
        
        // Flatten and simple dedup (by name)
        const all = results.flat().filter(i => i);
        const seen = new Set();
        const unique = [];
        for (const item of all) {
            if (!seen.has(item.vod_name)) {
                seen.add(item.vod_name);
                unique.push(item);
            }
        }
        res.json({ list: unique.slice(0, 20) }); // Limit response
    } catch (e) {
        res.status(500).json({ list: [] });
    }
});

// Update Hot API to use Postgres sites
app.get('/api/hot', authMiddleware, async (req, res) => {
    // Pick specific sites for hot list or all active
    try {
        const r = await pool.query("SELECT * FROM sites WHERE active=true AND key IN ('ffzy', 'bfzy', 'lzi')");
        const sites = r.rows;
    for (const site of sites) {
        try {
            const response = await axios.get(`${site.api}?ac=list&pg=1&h=24&out=json`, { timeout: 3000 });
            const list = response.data.list || response.data.data;
            if(list && list.length > 0) return res.json({ list: list.slice(0, 12) });
        } catch (e) { continue; }
    }
    res.json({ list: [] });
    } catch(e) { res.json({ list: [] }); }
});

// Update Search API to use Postgres sites
app.get('/api/search', authMiddleware, async (req, res) => {
    const { wd } = req.query;
    if (!wd) return res.json({ list: [] });
    
    try {
        const r = await pool.query('SELECT * FROM sites WHERE active=true');
        const sites = r.rows;
    
    const promises = sites.map(async (site) => {
        try {
            const response = await axios.get(`${site.api}?ac=list&wd=${encodeURIComponent(wd)}&out=json`, { timeout: 6000 });
            const data = response.data;
            const list = data.list || data.data;
            if (list && Array.isArray(list)) {
                return list.map(item => ({
                    ...item, 
                    site_key: site.key, 
                    site_name: site.name,
                    latency: 0 
                }));
            }
        } catch (e) {}
        return [];
    });
    
    const results = await Promise.all(promises);
    res.json({ list: results.flat() });
    } catch(e) { res.status(500).json({ list: [] }); }
});

// Update Detail API to use Postgres sites
app.get('/api/detail', authMiddleware, async (req, res) => {
    const { site_key, id } = req.query;
    try {
        const r = await pool.query('SELECT * FROM sites WHERE key=$1', [site_key]);
        if (r.rows.length === 0) return res.status(404).json({ error: "Site not found" });
        const targetSite = r.rows[0];
        
        const response = await axios.get(`${targetSite.api}?ac=detail&ids=${id}&out=json`, { timeout: 6000 });
        res.json(response.data);
    } catch (e) { res.status(500).json({ error: "Source Error" }); }
});

// Update Check API to use Postgres sites
app.get('/api/check', authMiddleware, async (req, res) => {
    const { key } = req.query;
    try {
        const r = await pool.query('SELECT * FROM sites WHERE key=$1', [key]);
        if (r.rows.length === 0) return res.json({ latency: 9999 });
        const site = r.rows[0];
    
        const start = Date.now();
        await axios.get(`${site.api}?ac=list&pg=1`, { timeout: 3000 });
        const latency = Date.now() - start;
        res.json({ latency: latency });
    } catch (e) {
        res.json({ latency: 9999 });
    }
});

// Admin Sites API (Postgres)
app.get('/api/admin/sites', authMiddleware, async (req, res) => {
    // Check admin role
    const r = await pool.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
    if (r.rows.length === 0 || r.rows[0].role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    
    const sites = await pool.query('SELECT * FROM sites ORDER BY created_at');
    res.json(sites.rows);
});

app.post('/api/admin/sites', authMiddleware, async (req, res) => {
    // Check admin role
    const r = await pool.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
    if (r.rows.length === 0 || r.rows[0].role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    
    const { sites } = req.body; // Expects full list or single op? Keeping full list replace logic for now is tricky with DB.
    // Let's implement upsert/delete based on key. But for simplicity, let's assume body is { action: 'add'|'update'|'delete', site: {...} } or just refactor frontend later.
    // To match existing frontend: it sends { sites: [...] }. We should rewrite table?
    // Dangerous but simplest for migration:
    try {
        await pool.query('BEGIN');
        await pool.query('DELETE FROM sites'); // Clear all
        for (const s of sites) {
            await pool.query('INSERT INTO sites(key, name, api, active) VALUES($1, $2, $3, $4)', [s.key, s.name, s.api, s.active]);
        }
        await pool.query('COMMIT');
        res.json({ success: true });
    } catch(e) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: 'Update failed' });
    }
});

// === 用户管理接口 ===
app.post('/api/user/register', async (req, res) => {
    const { username, password, inviteCode } = req.body || {};
    if (!username || !password || !inviteCode) return res.status(400).json({ error: 'username, password and inviteCode required' });
    try {
        // check username exists
        const existing = await pool.query('SELECT id, username FROM users WHERE username=$1', [username]);
        if (existing.rows.length > 0) return res.status(409).json({ error: 'Username already exists' });

        // check invite: either in invites table or matches an existing user's invite_code
        const inv = await pool.query('SELECT code FROM invites WHERE code=$1', [inviteCode]);
        let inviteOwner = null;
        const ownerRes = await pool.query('SELECT username FROM users WHERE invite_code=$1', [inviteCode]);
        if (ownerRes.rows.length > 0) inviteOwner = ownerRes.rows[0];
        const inviteAvailable = inv.rows.length > 0 || !!inviteOwner;
        if (!inviteAvailable) return res.status(403).json({ error: 'Invalid invite code' });

        const passwordHash = bcrypt.hashSync(password, 10);
        const id = Date.now().toString(36);
        const userInvite = generateInviteCode();
        const referrer = inviteOwner ? inviteOwner.username : 'seed';
        await pool.query('INSERT INTO users(id, username, password_hash, invite_code, referrer) VALUES($1,$2,$3,$4,$5)', [id, username, passwordHash, userInvite, referrer]);

        // if invite was in invites table, remove it (one-time use)
        if (inv.rows.length > 0) {
            await pool.query('DELETE FROM invites WHERE code=$1', [inviteCode]);
        }

        const token = createJwtForUser({ id, username });
        res.json({ success: true, token, user: { id, username, inviteCode: userInvite } });
    } catch (e) {
        console.error('Register error', e);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/user/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    try {
        const r = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
        if (r.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = r.rows[0];
        if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
        const token = createJwtForUser(user);
        res.json({ success: true, token, user: { id: user.id, username: user.username, inviteCode: user.invite_code } });
    } catch (e) {
        console.error('Login error', e);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/user/me', authMiddleware, async (req, res) => {
    try {
        const r = await pool.query('SELECT id, username, invite_code, referrer, created_at FROM users WHERE id=$1', [req.user.id]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const u = r.rows[0];
        res.json({ id: u.id, username: u.username, inviteCode: u.invite_code, referrer: u.referrer, createdAt: u.created_at });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: list users (requires admin password via query ?pwd= or header x-admin-password)
app.get('/api/admin/users', async (req, res) => {
    const provided = req.query.pwd || req.headers['x-admin-password'];
    if (provided !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Forbidden' });
    try {
        const r = await pool.query('SELECT id, username, invite_code, referrer, created_at FROM users');
        res.json(r.rows.map(u => ({ id: u.id, username: u.username, inviteCode: u.invite_code, referrer: u.referrer, createdAt: u.created_at })));
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

// start after DB init
initDbAndSeed().then(() => {
app.listen(PORT, () => { console.log(`服务已启动: http://localhost:${PORT}`); });
}).catch(err => {
    console.error('DB init failed', err);
    process.exit(1);
});
