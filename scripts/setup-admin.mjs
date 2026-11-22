// Small local-only setup. Never writes or prints the chosen password back.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
const dest=path.resolve(import.meta.dirname,'../.env');
if(fs.existsSync(dest)){
 console.log('Found an existing .env file. Nothing changed. Edit it manually if needed.');
 process.exit(0);
}
const cli=readline.createInterface({input:process.stdin,output:process.stdout});
const password=(await cli.question('Choose a private admin password (at least 12 characters): ')).trim();
cli.close();
if(password.length<12||password.includes('\n')||password.includes('\r')||password.includes('"')||password.includes("'")){
 console.error('Use at least 12 characters without quotes or line breaks. No file created.');process.exit(1);
}
const lines=[
 'PORT=3000',
 'GAME_TIMEZONE=Asia/Kolkata',
 'MIN_CROWD=5',
 'MIN_RANKED=50',
 'ADMIN_PASSWORD='+password,
 'COOKIE_SECRET='+crypto.randomBytes(48).toString('hex'),
 'DATA_DIR=./data'
];
fs.writeFileSync(dest,lines.join('\n')+'\n',{mode:0o600,flag:'wx'});
console.log('Local admin configured. Start game with npm start, then open http://localhost:3000/admin');
