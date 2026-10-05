const fs = require('fs');
const { execSync } = require('child_process');

const DUMP = 'D:/carser/HerbalClinic/HerbalClinic/p2-uidump.xml';
const MONKEY = 'D:/carser/HerbalClinic/HerbalClinic/scripts/monkey-tap.txt';

const parseBounds = bounds => {
  const m = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!m) {
    return null;
  }
  const x1 = Number(m[1]);
  const y1 = Number(m[2]);
  const x2 = Number(m[3]);
  const y2 = Number(m[4]);
  return { x1, y1, x2, y2, cx: Math.round((x1 + x2) / 2), cy: Math.round((y1 + y2) / 2) };
};

const dumpUi = () => {
  execSync('adb shell uiautomator dump /sdcard/uidump.xml', { stdio: 'inherit' });
  execSync(`adb pull /sdcard/uidump.xml "${DUMP}"`, { stdio: 'inherit' });
};

const nodes = () => {
  const xml = fs.readFileSync(DUMP, 'utf8');
  return [...xml.matchAll(/<node [^>]*>/g)].map(m => {
    const node = m[0];
    const desc = (node.match(/content-desc="([^"]*)"/) || [])[1] || '';
    const text = (node.match(/text="([^"]*)"/) || [])[1] || '';
    const bounds = parseBounds((node.match(/bounds="([^"]*)"/) || [])[1] || '');
    const enabled = (node.match(/enabled="([^"]*)"/) || [])[1] || '';
    return { desc, text, bounds, enabled };
  });
};

const find = needle => {
  const all = nodes();
  return (
    all.find(item => item.desc === needle || item.text === needle) ||
    all.find(item => item.desc.includes(needle) || item.text.includes(needle))
  );
};

const printVisible = () => {
  for (const item of nodes()) {
    if (item.desc || (item.text && !item.text.startsWith('&#'))) {
      const b = item.bounds;
      console.log(
        `${b ? `[${b.x1},${b.y1}][${b.x2},${b.y2}]` : '[?]'} enabled=${item.enabled} desc=${item.desc} text=${item.text}`,
      );
    }
  }
};

const tapNode = item => {
  if (!item || !item.bounds) {
    throw new Error('Target not found or has no bounds');
  }
  const back = find('Back');
  if (back && back.bounds && item.desc !== 'Back' && item.text !== 'Back') {
    const overlap =
      item.bounds.x1 < back.bounds.x2 &&
      item.bounds.x2 > back.bounds.x1 &&
      item.bounds.y1 < back.bounds.y2 &&
      item.bounds.y2 > back.bounds.y1;
    if (overlap) {
      throw new Error(`Refusing tap on ${item.desc || item.text}: overlaps Back ${JSON.stringify(back.bounds)}`);
    }
  }
  const { cx, cy } = item.bounds;
  console.log(`TAP ${item.desc || item.text} center=${cx},${cy} bounds=[${item.bounds.x1},${item.bounds.y1}][${item.bounds.x2},${item.bounds.y2}]`);
  fs.writeFileSync(
    MONKEY,
    [
      'type= raw events',
      'count= 1',
      'speed= 1.0',
      'start data >>',
      `DispatchPointer(0,0,0,${cx},${cy},1,1,0,1,1,0,0)`,
      `DispatchPointer(0,180,1,${cx},${cy},1,1,0,1,1,0,0)`,
      '',
    ].join('\n'),
  );
  execSync(`adb push "${MONKEY}" /sdcard/hc-monkey.txt`, { stdio: 'inherit' });
  execSync('adb shell monkey -f /sdcard/hc-monkey.txt 1', { stdio: 'inherit' });
};

const command = process.argv[2];
const target = process.argv.slice(3).join(' ');

if (command === 'dump') {
  dumpUi();
  printVisible();
} else if (command === 'tap') {
  dumpUi();
  const item = find(target);
  if (!item) {
    printVisible();
    throw new Error(`No node for: ${target}`);
  }
  tapNode(item);
} else if (command === 'has') {
  dumpUi();
  const item = find(target);
  console.log(item ? `FOUND ${target} enabled=${item.enabled}` : `MISSING ${target}`);
  process.exit(item ? 0 : 2);
} else {
  throw new Error('Usage: p2-device-tap.js dump|tap|has <label>');
}
