// Renders the app icons from a 16x16 pixel drawing. Run once: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const COLORS = {
  '.': [0x1b, 0x1b, 0x22], // background
  g: [0x5a, 0xd1, 0xa4], // accent
  d: [0x2f, 0x8f, 0x6c], // accent shade
  w: [0xe8, 0xe8, 0xee], // light
  r: [0xff, 0x00, 0x4d],
  y: [0xff, 0xec, 0x27],
  b: [0x29, 0xad, 0xff],
};

// A pencil drawing a row of pixels.
const ART = [
  '................',
  '...........ww...',
  '..........wggw..',
  '.........wgggdw.',
  '........wgggdw..',
  '.......wgggdw...',
  '......wgggdw....',
  '.....wgggdw.....',
  '....wgggdw......',
  '....wwgdw.......',
  '....www.........',
  '................',
  '..rr..yy..bb....',
  '..rr..yy..bb....',
  '................',
  '................',
];

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** `inset` shrinks the drawing toward the centre, for maskable icons' safe zone. */
function png(size, inset) {
  const cell = Math.floor((size * (1 - inset * 2)) / 16);
  const offset = Math.floor((size - cell * 16) / 2);
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    for (let x = 0; x < size; x++) {
      const ax = Math.floor((x - offset) / cell);
      const ay = Math.floor((y - offset) / cell);
      const ch = ax >= 0 && ay >= 0 && ax < 16 && ay < 16 ? ART[ay][ax] : '.';
      raw.set(COLORS[ch], row + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/icons/icon-192.png', png(192, 0));
writeFileSync('public/icons/icon-512.png', png(512, 0));
writeFileSync('public/icons/maskable-512.png', png(512, 0.12));
console.log('icons written');
