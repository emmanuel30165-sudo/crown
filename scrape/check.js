const fs = require('fs');

const data = JSON.parse(fs.readFileSync('crown_colours.json', 'utf8'));

const seen = new Set();
const duplicates = [];
const unique = [];

for (const c of data) {
  const key = `${c.hex}|${c.code}|${c.name}`;
  if (seen.has(key)) {
    duplicates.push(c);
  } else {
    seen.add(key);
    unique.push(c);
  }
}

const cats = {};
unique.forEach((x) => {
  cats[x.category] = (cats[x.category] || 0) + 1;
});

const expected = {
  Accent: 114,
  'Clean & Bright': 288,
  'Neutral & Natural': 390,
  Pastels: 48,
  'Soft & Muted': 282,
  Whites: 84,
};

console.log(`Total entries in file: ${data.length}`);
console.log(`Unique entries: ${unique.length}`);
console.log(`Duplicate entries: ${duplicates.length}\n`);

if (duplicates.length > 0) {
  console.log('Duplicate breakdown:');
  const dupCats = {};
  duplicates.forEach((x) => {
    dupCats[x.category] = (dupCats[x.category] || 0) + 1;
  });
  Object.entries(dupCats).forEach(([k, v]) => console.log(`  ${k}: ${v} duplicates`));
  console.log('');
}

console.log('Category | Found | Expected | Missing');
console.log('---------|-------|----------|--------');
let totalMissing = 0;
Object.entries(expected).forEach(([k, v]) => {
  const found = cats[k] || 0;
  const missing = Math.max(0, v - found);
  totalMissing += missing;
  console.log(`${k.padEnd(22)} | ${found.toString().padStart(5)} | ${v.toString().padEnd(8)} | ${missing}`);
});
console.log('');
console.log(`Total unique colours: ${unique.length}`);
console.log(`Total expected: ${Object.values(expected).reduce((a, b) => a + b, 0)}`);
console.log(`Total missing: ${totalMissing}`);
