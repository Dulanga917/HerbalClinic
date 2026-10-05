const fs = require('fs');
const t = fs.readFileSync('D:/carser/HerbalClinic/HerbalClinic/p2-uidump.xml', 'utf8');
const texts = [...t.matchAll(/text="([^"]+)"/g)].map(m => m[1]).filter(Boolean);
const descs = [...t.matchAll(/content-desc="([^"]+)"/g)].map(m => m[1]).filter(Boolean);
console.log('TEXTS');
texts.forEach(x => console.log('- ' + x));
console.log('DESCS');
descs.forEach(x => console.log('- ' + x));
