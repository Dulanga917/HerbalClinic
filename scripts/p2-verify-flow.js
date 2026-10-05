const fs = require('fs');
const { execSync } = require('child_process');

const DUMP = 'D:/carser/HerbalClinic/HerbalClinic/p2-uidump.xml';
const MONKEY = 'D:/carser/HerbalClinic/HerbalClinic/scripts/monkey-tap.txt';
const LOG = [];

const sh = cmd => execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();

const parseBounds = bounds => {
  const m = (bounds || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
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
  execSync('adb shell uiautomator dump /sdcard/uidump.xml', { stdio: 'ignore' });
  execSync(`adb pull /sdcard/uidump.xml "${DUMP}"`, { stdio: 'ignore' });
};

const nodes = () => {
  const xml = fs.readFileSync(DUMP, 'utf8');
  return [...xml.matchAll(/<node [^>]*>/g)].map(m => {
    const node = m[0];
    return {
      desc: (node.match(/content-desc="([^"]*)"/) || [])[1] || '',
      text: (node.match(/text="([^"]*)"/) || [])[1] || '',
      enabled: (node.match(/enabled="([^"]*)"/) || [])[1] || '',
      bounds: parseBounds((node.match(/bounds="([^"]*)"/) || [])[1] || ''),
    };
  });
};

const visible = () =>
  nodes()
    .filter(item => item.desc || (item.text && !item.text.startsWith('&#')))
    .map(item => `${item.enabled === 'false' ? 'OFF ' : ''}${item.desc || item.text}`);

const find = needle => {
  const all = nodes();
  return (
    all.find(item => item.desc === needle || item.text === needle) ||
    all.find(item => item.desc.includes(needle) || item.text.includes(needle))
  );
};

const sleep = ms => execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`);

const tapCoords = (cx, cy, label) => {
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
  execSync(`adb push "${MONKEY}" /sdcard/hc-monkey.txt`, { stdio: 'ignore' });
  sh('adb shell monkey -f /sdcard/hc-monkey.txt 1');
  LOG.push(`TAP ${label} @${cx},${cy}`);
};

const swipeUp = () => {
  fs.writeFileSync(
    MONKEY,
    [
      'type= raw events',
      'count= 1',
      'speed= 1.0',
      'start data >>',
      'DispatchPointer(0,0,0,540,1700,1,1,0,1,1,0,0)',
      'DispatchPointer(0,100,2,540,1500,1,1,0,1,1,0,0)',
      'DispatchPointer(0,200,2,540,1300,1,1,0,1,1,0,0)',
      'DispatchPointer(0,300,2,540,1100,1,1,0,1,1,0,0)',
      'DispatchPointer(0,400,2,540,900,1,1,0,1,1,0,0)',
      'DispatchPointer(0,500,2,540,700,1,1,0,1,1,0,0)',
      'DispatchPointer(0,600,1,540,700,1,1,0,1,1,0,0)',
      '',
    ].join('\n'),
  );
  execSync(`adb push "${MONKEY}" /sdcard/hc-monkey.txt`, { stdio: 'ignore' });
  sh('adb shell monkey -f /sdcard/hc-monkey.txt 1');
  LOG.push('SWIPE_UP');
};

const tap = needle => {
  dumpUi();
  const item = find(needle);
  if (!item || !item.bounds) {
    throw new Error(`Missing ${needle}. Visible:\n${visible().join('\n')}`);
  }
  const back = find('Back') || find('ආපසු');
  const skipOverlap = ['Back', 'ආපසු', 'Previous', 'පෙර'].includes(needle);
  if (back && back.bounds && !skipOverlap) {
    const overlap =
      item.bounds.x1 < back.bounds.x2 &&
      item.bounds.x2 > back.bounds.x1 &&
      item.bounds.y1 < back.bounds.y2 &&
      item.bounds.y2 > back.bounds.y1;
    if (overlap) {
      throw new Error(`Refusing ${needle}: overlaps Back`);
    }
  }
  tapCoords(item.bounds.cx, item.bounds.cy, needle);
  sleep(800);
};

const assertHas = (label, needles) => {
  dumpUi();
  const blob = visible().join(' | ');
  const missing = needles.filter(item => !blob.includes(item));
  if (missing.length) {
    throw new Error(`${label} missing ${missing.join(', ')}. Visible:\n${visible().join('\n')}`);
  }
  LOG.push(`OK ${label}: ${needles.join(' | ')}`);
};

const assertEnabled = (needle, expected) => {
  dumpUi();
  const item = find(needle);
  if (!item) {
    throw new Error(`Missing ${needle} while checking enabled`);
  }
  const actual = item.enabled !== 'false';
  if (actual !== expected) {
    throw new Error(`${needle} enabled=${item.enabled}, expected ${expected}`);
  }
  LOG.push(`OK ${needle} enabled=${expected}`);
};

const openTreatment = () => {
  execSync('adb shell cmd statusbar collapse', { stdio: 'ignore' });
  sleep(500);
  for (let i = 0; i < 7; i += 1) {
    dumpUi();
    const back = find('Back') || find('ආපසු');
    if (!back || !find('Switch to Sinhala')) {
      break;
    }
    tap(back.desc);
    sleep(800);
  }
  dumpUi();
  if (!find('Open Ayurvedic Treatment')) {
    sleep(1500);
    dumpUi();
    if (!find('Open Skin Type Assessment') && !find('Open Ayurvedic Treatment') && find('Home')) {
      try {
        tap('Home');
      } catch (error) {
        LOG.push(`Home tap skipped: ${error.message.split('\n')[0]}`);
      }
      sleep(1500);
    }
    for (let i = 0; i < 4; i += 1) {
      dumpUi();
      if (find('Open Ayurvedic Treatment')) {
        break;
      }
      swipeUp();
      sleep(2000);
    }
    dumpUi();
    LOG.push(`After scroll visible: ${visible().filter(item => item.startsWith('Open ')).join(', ')}`);
  }
  tap('Open Ayurvedic Treatment');
};

const step = (name, fn) => {
  fn();
  LOG.push(`PASS ${name}`);
};

try {
  step('open', () => {
    openTreatment();
    assertHas('EN open', [
      'Ayurvedic Treatment',
      'Skin',
      'Body',
      'Hair',
      "Women's Health",
      'Mental Well-being',
      'Question 1 of 5',
      'not a medical diagnosis',
    ]);
    assertEnabled('Next', false);
  });

  step('sinhala toggle', () => {
    tap('Switch to Sinhala');
    assertHas('SI labels', [
      'ආයුර්වේද ප්‍රතිකාර',
      'සම',
      'ශරීරය',
      'කෙස්',
      'කාන්තා සෞඛ්‍යය',
      'මානසික යහපැවැත්ම',
      'ප්‍රශ්නය 1 / 5',
    ]);
    if (find('Welcome,')) {
      throw new Error('Left Ayurvedic Treatment after Sinhala tap');
    }
  });

  step('select and preserve', () => {
    tap('වියළි හෝ තදව ඇත');
    assertEnabled('ඊළඟ', true);
    tap('Switch to English');
    assertHas('EN after answer', ['Ayurvedic Treatment', 'Dry or tight', 'Question 1 of 5']);
    assertEnabled('Next', true);
    tap('Switch to Sinhala');
    assertHas('SI after preserve', ['ආයුර්වේද ප්‍රතිකාර', 'වියළි හෝ තදව ඇත', 'ප්‍රශ්නය 1 / 5']);
    assertEnabled('ඊළඟ', true);
    tap('Switch to English');
    assertEnabled('Next', true);
  });

  step('next previous', () => {
    tap('Next');
    assertHas('Q2', ['Question 2 of 5']);
    tap('Previous');
    assertHas('back Q1', ['Question 1 of 5', 'Dry or tight']);
    tap('Next');
    assertHas('Q2 again', ['Question 2 of 5']);
    assertEnabled('Next', false);
  });

  step('clear majority flow', () => {
    tap('Light, cool, or easily unsettled');
    tap('Next');
    tap('Dry or frizzy');
    tap('Next');
    assertHas('womens', ["Women's Health", 'Not applicable / skip', 'Optional']);
    tap('Not applicable / skip');
    tap('Next');
    tap('Restless or worried');
    tap('See guidance');
    assertHas('clear result', [
      'Questionnaire self-care guidance',
      'questionnaire-based',
      'no model confidence score',
      'Vata-type self-care',
      'not a medical diagnosis',
    ]);
    const blob = visible().join(' | ');
    if (blob.includes('%') && /confidence/i.test(blob)) {
      throw new Error('Result appears to show a confidence percentage');
    }
  });

  step('mixed answers', () => {
    tap('Start again');
    tap('Dry or tight');
    tap('Next');
    tap('Warm, hungry, or easily overheated');
    tap('Next');
    tap('Thick or oily');
    tap('Next');
    tap('Not applicable / skip');
    tap('Next');
    tap('Restless or worried');
    tap('See guidance');
    assertHas('mixed result', [
      'Questionnaire self-care guidance',
      'do not point to one clear pattern',
      'not a medical diagnosis',
    ]);
    dumpUi();
    const blob = visible().join(' | ');
    if (
      blob.includes('Vata-type self-care') ||
      blob.includes('Pitta-type self-care') ||
      blob.includes('Kapha-type self-care')
    ) {
      throw new Error('Mixed answers invented a Dosha tendency');
    }
  });

  console.log(LOG.join('\n'));
  console.log('FLOW_OK');
} catch (error) {
  console.log(LOG.join('\n'));
  console.error(error.message);
  process.exit(1);
}
