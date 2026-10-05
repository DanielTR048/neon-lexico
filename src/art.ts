export function icon(name: string, size = 20): string {
  const paths: Record<string, string> = {
    home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    layers: '<path d="m3 7 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5"/>',
    trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm4 11v7m-5 0h10M8 5H3v3a4 4 0 0 0 5 4m8-7h5v3a4 4 0 0 1-5 4"/>',
    settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-8z"/>',
    shuffle: '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4"/>',
    check: '<path d="m5 12 4 4L20 5"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 5m0 3v.01"/>',
    sound: '<path d="m11 3-6 5H2v8h3l6 5V3Zm4 5c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
    mute: '<path d="m11 3-6 5H2v8h3l6 5V3Zm5 6 6 6m0-6-6 6"/>',
    star: '<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    bulb: '<path d="M9 18h6m-5 3h4M8 15c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7H8Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
    brain: '<path d="M12 4C9 0 5 3 5 6c-5 1-4 8 0 8-2 5 4 8 7 5V4Zm0 0c3-4 7-1 7 2 5 1 4 8 0 8 2 5-4 8-7 5M5 6l3 2m11-2-3 2M5 14l3-2m11 2-3-2"/>',
    atom: '<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1"/>',
    shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
    chip: '<rect x="5" y="5" width="14" height="14" rx="1"/><path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4"/><rect x="9" y="9" width="6" height="6"/>',
    book: '<path d="M12 5c-4-3-7-3-10-2v16c4-1 7-1 10 2 3-3 6-3 10-2V3c-3-1-6-1-10 2v16"/>',
    heart: '<path d="M12 21S1 14 1 7c0-6 8-7 11-1 3-6 11-5 11 1 0 7-11 14-11 14Z"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.atom}</svg>`;
}

export const logo = `<svg viewBox="0 0 42 42" fill="none" aria-hidden="true"><path d="M2 2h26l12 12v26H14L2 28V2Z" stroke="currentColor" stroke-width="2"/><path d="M10 29V11h5l12 18V11h5v18h-5L15 11v18h-5Z" fill="currentColor"/><path d="M2 31h10M31 2v10" stroke="currentColor" stroke-width="2"/></svg>`;

export function modeArt(cascade = false): string {
  const layouts = cascade ? ['NEON', '▧E▧▧', '▧▧O▧▧', '▧▧▧N▧▧'] : ['  C    ', '  O    ', 'NEON   ', '  E    ', '  X    ', '  A    ', '  O    '];
  return `<div class="mode-art ${cascade ? 'cascade-art' : ''}" aria-hidden="true">${layouts.map((row, r) => `<div class="art-row" style="--offset:${cascade ? r * 12 : 0}px">${[...row].map((letter, c) => `<span class="art-cell ${letter === ' ' ? 'empty' : ''} ${letter !== '▧' ? 'lit' : ''}" style="--delay:${r * 70 + c * 35}ms">${letter === '▧' || letter === ' ' ? '' : letter}</span>`).join('')}</div>`).join('')}${cascade ? '<div class="flow-arrow">↓ &nbsp; ↓ &nbsp; ↓</div>' : ''}</div>`;
}

export function magazineArt(): string {
  return `<div class="mode-art magazine-art" role="img" aria-label="Miniatura de cruzadas de revista com pistas nas casas e setas">${['Parte da ave ↓','Moradia →','C','A','S','A',' ','S',' ',' ','Ave →','A','S','A',' ',' '].map((value,index)=>`<span class="magazine-art-cell ${value.includes('→')||value.includes('↓')?'clue':''}">${value.trim()}</span>`).join('')}<small>CRUZADAS DE REVISTA</small></div>`;
}

export function cityArt(): string {
  let windows = '';
  const buildings = [{x:8,y:150,w:47,h:165},{x:61,y:104,w:45,h:211},{x:116,y:181,w:46,h:134},{x:170,y:63,w:54,h:252},{x:234,y:144,w:43,h:171},{x:288,y:85,w:44,h:230},{x:342,y:130,w:70,h:185}];
  for (const b of buildings) for(let row=0;row<Math.floor(b.h/15)-1;row++) for(let col=0;col<Math.floor(b.w/12)-1;col++) {if((row*7+col*3+b.x)%5<3) windows += `<rect x="${b.x+8+col*12}" y="${b.y+12+row*15}" width="3" height="5" fill="${(col+row)%4===0?'#e49bcb':'#bb97ce'}" opacity="${(row+col)%3===0?.6:.2}"/>`;}
  return `<svg class="city-art" viewBox="0 0 440 350" role="img" aria-label="Ilustração de uma cidade retrofuturista iluminada por um sol âmbar">
  <defs><linearGradient id="sun" x2="0" y2="1"><stop stop-color="#e5b277"/><stop offset="1" stop-color="#a35c79"/></linearGradient><pattern id="scan" width="4" height="5" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#17111f"/></pattern><linearGradient id="fade" x2="0" y2="1"><stop stop-color="#24182b" stop-opacity="0"/><stop offset="1" stop-color="#121018"/></linearGradient></defs>
  <circle cx="255" cy="123" r="88" fill="url(#sun)" opacity=".8"/><circle cx="255" cy="123" r="88" fill="url(#scan)" opacity=".7"/>
  <path d="M17 70h30m-15-15v30m-5-74h2m333 31h2M130 35h2m275 67h2M111 74h2" stroke="#ecd0b3" opacity=".5"/>
  ${buildings.map(b=>`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#18121e" stroke="#493049"/><path d="M${b.x+8} ${b.y}v-9h${b.w-16}v9" fill="#24192d" stroke="#493049"/>`).join('')}${windows}
  <path d="M196 63V28m-7 20h14M310 85V49" stroke="#926578"/><rect x="178" y="90" width="16" height="72" fill="#302038" stroke="#b98ac7"/><text x="186" y="106" fill="#f5bd70" text-anchor="middle" font-size="11" font-family="monospace"><tspan x="186">未</tspan><tspan x="186" dy="15">来</tspan><tspan x="186" dy="15">都</tspan><tspan x="186" dy="15">市</tspan></text>
  <rect x="339" y="188" width="79" height="25" fill="#231c25" stroke="#b1749c"/><text x="378" y="205" fill="#d997bc" text-anchor="middle" font-size="12" font-family="monospace" letter-spacing="3">LEXICO</text>
  <path d="M0 315h440M-100 349l280-34m-55 34 77-34m75 34-54-34m204 34-183-34M0 330h440M0 343h440" stroke="#72536f" opacity=".5"/><rect y="266" width="440" height="85" fill="url(#fade)"/>
  <g transform="translate(47 211) rotate(-7)"><rect width="113" height="75" rx="3" fill="#291c32" stroke="#9c7888"/><rect x="8" y="8" width="97" height="52" fill="#150f1c" stroke="#75485e"/><text x="56" y="34" fill="#f5bd70" text-anchor="middle" font-family="monospace" font-size="17" font-weight="bold">N E O N</text><text x="56" y="50" fill="#b28caa" text-anchor="middle" font-family="monospace" font-size="8">SIGNAL FOUND_</text><path d="M40 75v10h34V75" fill="#362237" stroke="#9c7888"/><circle cx="102" cy="67" r="2" fill="#f5bd70"/></g>
  <text x="435" y="330" text-anchor="end" fill="#a07e97" font-size="8" font-family="monospace" letter-spacing="2">NOVA AURORA / 2086</text></svg>`;
}
