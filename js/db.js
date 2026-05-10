// js/db.js
// Improved Physical File-based SQLite with Persistence Handle (v7.5)

let SQL;
let sqliteDb = null;
let dbFileHandle = null;
let saveTimeout = null;

const DB = {
    init: async () => {
        try {
            // Using ASM.js version for file:// and cross-browser compatibility
            if (typeof initSqlJs === 'undefined') {
                throw new Error("sql-asm.js not loaded");
            }
            SQL = await initSqlJs();
            
            // Try to restore handle from IndexedDB (to survive refreshes)
            await DB._restoreHandle();

            const overlay = document.getElementById('db-overlay');
            if (sqliteDb) {
                if (overlay) overlay.classList.add('hidden');
                console.log("DB automatically restored from saved handle.");
                window.dispatchEvent(new Event('db_connected'));
            } else if (overlay) {
                overlay.classList.remove('hidden');
                // If we have a handle but no permission, show a simpler "Reconnect" UI
                if (dbFileHandle) {
                    const btnOpen = document.getElementById('btn-db-open');
                    if (btnOpen) btnOpen.innerHTML = '<i data-lucide="refresh-cw" class="w-5 h-5"></i> 파일 권한 다시 허용하기';
                    const btnNew = document.getElementById('btn-db-new');
                    if (btnNew) btnNew.classList.add('hidden');
                }
            }
        } catch (e) {
            console.error("Failed to init SQLite engine", e);
        }
    },

    isConnected: () => !!sqliteDb,

    _restoreHandle: async () => {
        try {
            const handle = await DB._idbGet('db_handle');
            if (handle) {
                dbFileHandle = handle;
                const options = { mode: 'readwrite' };
                if (await handle.queryPermission(options) === 'granted') {
                    const file = await handle.getFile();
                    const buffer = await file.arrayBuffer();
                    sqliteDb = new SQL.Database(new Uint8Array(buffer));
                    DB._createTables();
                }
            }
        } catch (e) {
            console.warn("Could not restore handle:", e);
        }
    },

    connectFile: async () => {
        try {
            if (dbFileHandle) {
                const status = await dbFileHandle.requestPermission({ mode: 'readwrite' });
                if (status === 'granted') {
                    const file = await dbFileHandle.getFile();
                    const buffer = await file.arrayBuffer();
                    sqliteDb = new SQL.Database(new Uint8Array(buffer));
                    DB._createTables();
                    document.getElementById('db-overlay').classList.add('hidden');
                    window.dispatchEvent(new Event('db_connected'));
                    return;
                }
            }

            const handles = await window.showOpenFilePicker({
                types: [{
                    description: 'SQLite Database',
                    accept: { 'application/x-sqlite3': ['.db', '.sqlite'] }
                }],
                excludeAcceptAllOption: true,
                multiple: false
            });
            dbFileHandle = handles[0];
            await DB._idbSet('db_handle', dbFileHandle);

            const file = await dbFileHandle.getFile();
            const buffer = await file.arrayBuffer();
            sqliteDb = new SQL.Database(new Uint8Array(buffer));
            DB._createTables();
            
            document.getElementById('db-overlay').classList.add('hidden');
            window.dispatchEvent(new Event('db_connected'));
        } catch (e) {
            console.error("File selection failed", e);
        }
    },

    createNewFile: async () => {
        try {
            dbFileHandle = await window.showSaveFilePicker({
                suggestedName: 'ax_crew.db',
                types: [{
                    description: 'SQLite Database',
                    accept: { 'application/x-sqlite3': ['.db'] }
                }]
            });
            await DB._idbSet('db_handle', dbFileHandle);

            sqliteDb = new SQL.Database();
            DB._createTables();
            await DB._saveToFile(true); // Immediate save
            
            document.getElementById('db-overlay').classList.add('hidden');
            window.dispatchEvent(new Event('db_connected'));
        } catch (e) {
            console.error("File creation failed", e);
        }
    },

    _saveToFile: async (immediate = true) => {
        if (!sqliteDb || !dbFileHandle) return;
        
        const saveLogic = async () => {
            try {
                const data = sqliteDb.export();
                const writable = await dbFileHandle.createWritable();
                await writable.write(data);
                await writable.close();
                console.log("DB saved to physical file successfully.");
            } catch (e) {
                console.error("Failed to auto-save DB:", e);
            }
        };

        if (saveTimeout) clearTimeout(saveTimeout);
        if (immediate) {
            await saveLogic();
        } else {
            saveTimeout = setTimeout(saveLogic, 1000);
        }
    },

    _createTables: () => {
        sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, department TEXT, email TEXT, password TEXT, is_crew INTEGER, avatar TEXT, created TEXT, updated TEXT);
            CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, title TEXT, status TEXT, owner TEXT, due_date TEXT, progress INTEGER, content TEXT, file TEXT, created TEXT, updated TEXT);
            CREATE TABLE IF NOT EXISTS project_comments (id TEXT PRIMARY KEY, project TEXT, author TEXT, content TEXT, parent TEXT, file TEXT, created TEXT, updated TEXT);
            CREATE TABLE IF NOT EXISTS manuals (id TEXT PRIMARY KEY, title TEXT, content TEXT, author TEXT, file TEXT, created TEXT, updated TEXT);
            CREATE TABLE IF NOT EXISTS manual_comments (id TEXT PRIMARY KEY, manual TEXT, author TEXT, content TEXT, parent TEXT, file TEXT, created TEXT, updated TEXT);
            CREATE TABLE IF NOT EXISTS manual_likes (id TEXT PRIMARY KEY, manual TEXT, user TEXT);
            CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, Text TEXT, user TEXT, parent TEXT, file TEXT, created TEXT, updated TEXT);
            CREATE TABLE IF NOT EXISTS question_likes (id TEXT PRIMARY KEY, question TEXT, user TEXT);
        `);
        // Ensure columns exist for older versions of the DB file
        try { sqliteDb.run("ALTER TABLE projects ADD COLUMN content TEXT"); } catch(e) {}
        try { sqliteDb.run("ALTER TABLE projects ADD COLUMN file TEXT"); } catch(e) {}
    },

    _generateId: () => Math.random().toString(36).substring(2, 15),

    _fileToBase64: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    },

    _parseFormData: async (data) => {
        if (data instanceof FormData) {
            const obj = {};
            for (let [key, value] of data.entries()) {
                if (value instanceof File) {
                    if (!obj[key]) obj[key] = [];
                    if (value.size > 0) {
                        const base64 = await DB._fileToBase64(value);
                        obj[key].push({ name: value.name, type: value.type, data: base64 });
                    }
                } else {
                    obj[key] = value;
                }
            }
            return obj;
        }
        return data;
    },

    login: async (email, password) => {
        if (!sqliteDb) throw new Error('DB not connected');
        const stmt = sqliteDb.prepare("SELECT * FROM users WHERE email = :email AND password = :password");
        const row = stmt.getAsObject({ ':email': email, ':password': password });
        stmt.free();
        
        if (row && row.id) {
            localStorage.setItem('ax_current_user', JSON.stringify(row));
            return row;
        }
        throw new Error('Invalid credentials');
    },

    logout: () => {
        localStorage.removeItem('ax_current_user');
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('ax_current_user');
        return user ? JSON.parse(user) : null;
    },

    getAll: async (collection, options = {}) => {
        if (!sqliteDb) throw new Error('DB not connected');
        let query = `SELECT * FROM ${collection}`;
        if (options.filter) {
            if (options.filter.includes('!= null')) {
                const key = options.filter.split('!=')[0].trim();
                query += ` WHERE ${key} IS NOT NULL AND ${key} != 'null' AND ${key} != ''`;
            } else if (options.filter.includes('= null')) {
                const key = options.filter.split('=')[0].trim();
                query += ` WHERE (${key} IS NULL OR ${key} = 'null' OR ${key} = '')`;
            } else {
                const match = options.filter.match(/(\w+)\s*=\s*['"]?([^'"]+)['"]?/);
                if (match) query += ` WHERE ${match[1]} = '${match[2]}'`;
            }
        }
        if (options.sort) {
            const desc = options.sort.startsWith('-');
            const field = desc ? options.sort.substring(1) : options.sort;
            query += ` ORDER BY ${field} ${desc ? 'DESC' : 'ASC'}`;
        }

        const stmt = sqliteDb.prepare(query);
        const results = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            if (row.file && typeof row.file === 'string') try { row.file = JSON.parse(row.file); } catch(e){}
            if (row.avatar && typeof row.avatar === 'string') try { row.avatar = JSON.parse(row.avatar); } catch(e){}
            results.push(row);
        }
        stmt.free();

        if (options.expand) {
            const expandFields = options.expand.split(',').map(s => s.trim());
            for (let item of results) {
                item.expand = {};
                for (let field of expandFields) {
                    if ((field === 'author' || field === 'owner' || field === 'user') && item[field]) {
                        const uStmt = sqliteDb.prepare("SELECT * FROM users WHERE id = :id");
                        const userRow = uStmt.getAsObject({ ':id': item[field] });
                        uStmt.free();
                        if (userRow.avatar && typeof userRow.avatar === 'string') try { userRow.avatar = JSON.parse(userRow.avatar); } catch(e){}
                        item.expand[field] = userRow && userRow.id ? userRow : {};
                    }
                }
            }
        }
        return results;
    },

    getById: async (collection, id, options = {}) => {
        if (!sqliteDb) throw new Error('DB not connected');
        const stmt = sqliteDb.prepare(`SELECT * FROM ${collection} WHERE id = :id`);
        const row = stmt.getAsObject({ ':id': id });
        stmt.free();
        if (!row || !row.id) throw new Error('Not found');

        if (row.file && typeof row.file === 'string') try { row.file = JSON.parse(row.file); } catch(e){}
        if (row.avatar && typeof row.avatar === 'string') try { row.avatar = JSON.parse(row.avatar); } catch(e){}

        if (options.expand) {
            row.expand = {};
            const expandFields = options.expand.split(',').map(s => s.trim());
            for (let field of expandFields) {
                if ((field === 'author' || field === 'owner' || field === 'user') && row[field]) {
                    const uStmt = sqliteDb.prepare("SELECT * FROM users WHERE id = :id");
                    const userRow = uStmt.getAsObject({ ':id': row[field] });
                    uStmt.free();
                    if (userRow.avatar && typeof userRow.avatar === 'string') try { userRow.avatar = JSON.parse(userRow.avatar); } catch(e){}
                    row.expand[field] = userRow && userRow.id ? userRow : {};
                }
            }
        }
        return row;
    },

    create: async (collection, data) => {
        if (!sqliteDb) throw new Error('DB not connected');
        const parsedData = await DB._parseFormData(data);
        const newRecord = { id: DB._generateId(), created: new Date().toISOString(), updated: new Date().toISOString(), ...parsedData };

        const colStmt = sqliteDb.prepare(`PRAGMA table_info(${collection})`);
        const validCols = [];
        while (colStmt.step()) validCols.push(colStmt.getAsObject().name);
        colStmt.free();

        const keys = Object.keys(newRecord).filter(k => validCols.includes(k));
        const columns = keys.join(', ');
        const placeholders = keys.map(k => `:${k}`).join(', ');
        const params = {};
        for (let key of keys) {
            let val = newRecord[key];
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            params[`:${key}`] = val;
        }

        sqliteDb.run(`INSERT INTO ${collection} (${columns}) VALUES (${placeholders})`, params);
        DB._saveToFile();
        window.dispatchEvent(new CustomEvent('db_updated', { detail: { collection } }));
        return newRecord;
    },

    update: async (collection, id, data) => {
        if (!sqliteDb) throw new Error('DB not connected');
        const parsedData = await DB._parseFormData(data);
        parsedData.updated = new Date().toISOString();

        const colStmt = sqliteDb.prepare(`PRAGMA table_info(${collection})`);
        const validCols = [];
        while (colStmt.step()) validCols.push(colStmt.getAsObject().name);
        colStmt.free();

        const keys = Object.keys(parsedData).filter(k => validCols.includes(k));
        const setClause = keys.map(k => `${k} = :${k}`).join(', ');
        const params = { ':id': id };
        for (let key of keys) {
            let val = parsedData[key];
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            params[`:${key}`] = val;
        }

        sqliteDb.run(`UPDATE ${collection} SET ${setClause} WHERE id = :id`, params);
        DB._saveToFile();
        window.dispatchEvent(new CustomEvent('db_updated', { detail: { collection } }));
        return await DB.getById(collection, id);
    },

    delete: async (collection, id) => {
        if (!sqliteDb) throw new Error('DB not connected');
        sqliteDb.run(`DELETE FROM ${collection} WHERE id = :id`, { ':id': id });
        DB._saveToFile();
        window.dispatchEvent(new CustomEvent('db_updated', { detail: { collection } }));
        return true;
    },

    getFileUrl: (record, fileIdentifier) => {
        if (!record || !fileIdentifier) return null;
        let files = [];
        if (record.file && Array.isArray(record.file)) files = files.concat(record.file);
        if (record.avatar && Array.isArray(record.avatar)) files = files.concat(record.avatar);
        const fileName = typeof fileIdentifier === 'string' ? fileIdentifier : fileIdentifier.name;
        const fileObj = files.find(f => f.name === fileName);
        return (fileObj && fileObj.data) ? fileObj.data : (fileIdentifier.data || null);
    },

    subscribe: async (collection, callback) => {
        const handler = (e) => { if (e.detail.collection === collection || e.detail.collection === 'all') callback(); };
        window.addEventListener('db_updated', handler);
        return () => window.removeEventListener('db_updated', handler);
    },

    // Simple IndexedDB Helpers for Handle Storage
    _idbGet: (key) => {
        return new Promise((resolve) => {
            const request = indexedDB.open('ax_crew_meta', 1);
            request.onupgradeneeded = (e) => e.target.result.createObjectStore('meta');
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction('meta', 'readonly');
                const store = tx.objectStore('meta');
                const getReq = store.get(key);
                getReq.onsuccess = () => resolve(getReq.result);
                getReq.onerror = () => resolve(null);
            };
            request.onerror = () => resolve(null);
        });
    },
    _idbSet: (key, value) => {
        return new Promise((resolve) => {
            const request = indexedDB.open('ax_crew_meta', 1);
            request.onupgradeneeded = (e) => e.target.result.createObjectStore('meta');
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction('meta', 'readwrite');
                const store = tx.objectStore('meta');
                store.put(value, key);
                tx.oncomplete = () => resolve();
            };
        });
    }
};

window.handleDBDownload = () => alert('물리 파일 모드입니다. 폴더의 ax_crew.db 파일을 보관하세요.');
window.handleDBUpload = () => alert('새로고침 후 연결 오버레이를 사용하세요.');
