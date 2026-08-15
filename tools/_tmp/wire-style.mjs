import fs from 'fs';
const MAP = {
  atlantic: {
    hanseatic: ['brugge','antwerpen','amsterdam','hamburg','lubeck','kobenhavn','danzig','riga','reval'],
    nordic:    ['bergen','stockholm','novgorod','bristol','london'],
  },
  africa: {
    colonial: ['arguin','santiago','axim','elmina','saotome','luanda','mocambique','sofala'],
    swahili:  ['kilwa','zanzibar','mombasa','malindi','lamu','mogadishu'],
    guinea:   ['gwato','benguela','cabo'],
  },
  mideast: { swahili: ['suakin','massawa','jeddah'] },
  indian: {
    colonial:  ['diu','goa','cochin','colombo'],
    malabar:   ['chaul','dabhol','bhatkal','cannanore','calicut','quilon','galle'],
    dravidian: ['jaffna','nagapattinam','pulicat','masulipatnam'],
    swahili:   ['maldives'],
  },
  seasia: {
    malay:    ['pegu','ayutthaya','patani','aceh','pasai','perak','melaka','johor','banten',
               'sundakelapa','tuban','gresik','brunei','makassar','ternate','tidore','banda'],
    colonial: ['ambon'],
  },
  eastasia: {
    sinic:    ['guangzhou','yuegang','quanzhou','fuzhou','naha'],
    jiangnan: ['ningbo','shuangyu','mapo','busanpo','hakata','hirado','nagasaki','bonotsu','sakai'],
    colonial: ['macau','manila','cebu'],
    malay:    ['keelung'],
  },
};
let total = 0;
for (const [region, groups] of Object.entries(MAP)) {
  const p = `js/regions/${region}/geo.js`;
  const want = new Map();
  for (const [style, ids] of Object.entries(groups)) for (const id of ids) want.set(id, style);
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  const hit = new Set();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\bid:\s*'([a-z0-9_]+)'/);
    if (!m || !/style:\s*'/.test(lines[i])) continue;
    const ns = want.get(m[1]);
    if (!ns) continue;
    lines[i] = lines[i].replace(/style:\s*'[a-z]+',/, `style: '${ns}',`);
    hit.add(m[1]);
  }
  const missing = [...want.keys()].filter((k) => !hit.has(k));
  if (missing.length) { console.error(`!! ${region} 못 찾음: ${missing.join(', ')}`); process.exit(1); }
  // 열 정렬 복구
  let max = 0;
  for (const l of lines) { const m = l.match(/style:\s*'([a-z]+)',/); if (m) max = Math.max(max, m[1].length); }
  for (let i = 0; i < lines.length; i++) {
    lines[i] = lines[i].replace(/style:\s*'([a-z]+)', */, (s, v) => `style: '${v}',` + ' '.repeat(max - v.length + 1));
  }
  fs.writeFileSync(p, lines.join('\n'));
  console.log(`${region}: ${hit.size}곳 배선 (열 폭 ${max})`);
  total += hit.size;
}
console.log('합계 ' + total);
