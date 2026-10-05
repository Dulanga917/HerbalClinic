const fs = require('fs');
const t = fs.readFileSync('D:/carser/HerbalClinic/HerbalClinic/p2-uidump.xml', 'utf8');
const nodes = [...t.matchAll(/<node [^>]*>/g)].map(m => m[0]);
for (const node of nodes) {
  const desc = (node.match(/content-desc="([^"]*)"/) || [])[1] || '';
  const text = (node.match(/text="([^"]*)"/) || [])[1] || '';
  const bounds = (node.match(/bounds="([^"]*)"/) || [])[1] || '';
  const enabled = (node.match(/enabled="([^"]*)"/) || [])[1] || '';
  if (desc || (text && !text.startsWith('&#'))) {
    console.log(`${bounds} enabled=${enabled} desc=${desc} text=${text}`);
  }
}
