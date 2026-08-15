import fs from 'fs';
const JOBS = {
  'js/regions/eastasia/ships.js': [['사선','ming'],['복선','ming'],['세키부네','japan'],
    ['아타케부네','japan'],['주인선','japan'],['판옥선','joseon']],
  'js/regions/atlantic/ships.js': [['코그','hanse'],['홀크','hanse'],['대형 크라벨','hanse']],
  'js/regions/indian/ships.js': [['야트라 도니','kotte'],['파타마르','zamorin'],['갈베트','gujarat'],
    ['발람','bengal'],['코티아','gujarat'],['간자','gujarat']],
  'js/regions/seasia/ships.js': [['프라우','majapahit'],['종','majapahit'],['란차랑','malacca']],
  'js/regions/mideast/ships.js': [['당기','zamorin']],
  'js/regions/africa/ships.js': [['바갈라','oman'],['대형 카누','benin']],
};
for (const [p, list] of Object.entries(JOBS)) {
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  for (const [name, flag] of list) {
    let n = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes(`name: '${name}'`)) continue;
      const before = lines[i];
      lines[i] = lines[i].replace(/originFlag: (null|'[a-z]+')/, `originFlag: '${flag}'`);
      if (lines[i] !== before) n++;
    }
    if (n !== 1) { console.error(`!! ${p} ${name}: ${n}건`); process.exit(1); }
  }
  fs.writeFileSync(p, lines.join('\n'));
  console.log(`${p}: ${list.length}척`);
}
