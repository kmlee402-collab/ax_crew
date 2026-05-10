const fs = require('fs');
const initSqlJs = require('./lib/sql-wasm.js');

async function runTest() {
    const SQL = await initSqlJs({ locateFile: file => `./lib/${file}` });
    const db = new SQL.Database();
    
    db.run(`CREATE TABLE questions (id TEXT PRIMARY KEY, Text TEXT, user TEXT, parent TEXT, file TEXT, created TEXT, updated TEXT);`);
    
    const colStmt = db.prepare(`PRAGMA table_info(questions)`);
    const validCols = [];
    while (colStmt.step()) {
        validCols.push(colStmt.getAsObject().name);
    }
    colStmt.free();
    
    console.log("Valid cols:", validCols);
    
    const keys = ['id', 'Text', 'user', 'created', 'updated'];
    const filteredKeys = keys.filter(k => validCols.includes(k));
    console.log("Filtered keys:", filteredKeys);
    
    const columns = filteredKeys.join(', ');
    const placeholders = filteredKeys.map(k => `:${k}`).join(', ');
    
    const params = {
        ':id': '123',
        ':Text': '질문',
        ':user': 'user1',
        ':created': 'now',
        ':updated': 'now'
    };
    
    try {
        db.run(`INSERT INTO questions (${columns}) VALUES (${placeholders})`, params);
        console.log("Insert successful!");
        const res = db.exec("SELECT * FROM questions");
        console.log("Results:", res[0].values);
    } catch (e) {
        console.error("Insert failed:", e);
    }
}

runTest();
