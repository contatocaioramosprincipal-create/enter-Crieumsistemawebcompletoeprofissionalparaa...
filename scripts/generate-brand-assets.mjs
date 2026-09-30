import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const NAVY = [20, 36, 56];
const GOLD = [201, 169, 97];
const crcTable = (() => { const table = []; for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); table[n] = c >>> 0; } return table; })();
const crc32 = (buffer) => { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([length, body, crc]); };

const roundRect = (x, y, half, radius) => { const dx = Math.abs(x - 0.5) - (half - radius); const dy = Math.abs(y - 0.5) - (half - radius); return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius; };
const segment = (x, y, ax, ay, bx, by, thickness) => { const vx = bx - ax; const vy = by - ay; const wx = x - ax; const wy = y - ay; const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy))); return Math.hypot(wx - t * vx, wy - t * vy) < thickness / 2; };
const isGold = (x, y) => segment(x, y, 0.50, 0.255, 0.285, 0.735, 0.088) || segment(x, y, 0.50, 0.255, 0.715, 0.735, 0.088) || segment(x, y, 0.385, 0.565, 0.615, 0.565, 0.082) || Math.hypot(x - 0.765, y - 0.712) < 0.055;

const sample = (x, y) => ({ shape: roundRect(x, y, 0.5, 0.19) <= 0 ? 1 : 0, gold: isGold(x, y) ? 1 : 0 });
const render = (x, y, step) => { const steps = 4; let shape = 0; let gold = 0; for (let i = 0; i < steps; i += 1) for (let j = 0; j < steps; j += 1) { const point = sample(x + (((i + 0.5) / steps) - 0.5) * step, y + (((j + 0.5) / steps) - 0.5) * step); shape += point.shape; gold += point.gold; } shape /= steps * steps; gold /= steps * steps; const ratio = shape > 0 ? Math.min(1, gold / Math.max(shape, 0.0001)) : 0; return { shape, ratio }; };

const png = (size) => {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let row = 0; row < size; row += 1) {
    const offset = row * (size * 4 + 1);
    for (let col = 0; col < size; col += 1) {
      const { shape, ratio } = render((col + 0.5) / size, (row + 0.5) / size, 1 / size);
      const position = offset + 1 + col * 4;
      raw[position] = Math.round(NAVY[0] + (GOLD[0] - NAVY[0]) * ratio);
      raw[position + 1] = Math.round(NAVY[1] + (GOLD[1] - NAVY[1]) * ratio);
      raw[position + 2] = Math.round(NAVY[2] + (GOLD[2] - NAVY[2]) * ratio);
      raw[position + 3] = Math.round(255 * shape);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
};

const ico = (images) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  const directory = Buffer.alloc(16 * images.length);
  let offset = 6 + 16 * images.length;
  images.forEach((image, index) => {
    const at = index * 16;
    directory[at] = image.size >= 256 ? 0 : image.size;
    directory[at + 1] = image.size >= 256 ? 0 : image.size;
    directory.writeUInt16LE(1, at + 4); directory.writeUInt16LE(32, at + 6); directory.writeUInt32LE(image.buffer.length, at + 8); directory.writeUInt32LE(offset, at + 12);
    offset += image.buffer.length;
  });
  return Buffer.concat([header, directory, ...images.map(image => image.buffer)]);
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="AMCF">
  <rect width="64" height="64" rx="12" fill="#142438"/>
  <g fill="none" stroke="#c9a961" stroke-width="5.6" stroke-linecap="round">
    <path d="M32 16.3 L18.2 47"/>
    <path d="M32 16.3 L45.8 47"/>
    <path d="M24.6 36.2 H39.4"/>
  </g>
  <circle cx="49" cy="45.6" r="3.5" fill="#c9a961"/>
</svg>
`;

const sizes = [16, 32, 48];
writeFileSync('public/favicon.ico', ico(sizes.map(size => ({ size, buffer: png(size) }))));
writeFileSync('public/apple-touch-icon.png', png(180));
writeFileSync('public/icon-192.png', png(192));
writeFileSync('public/icon-512.png', png(512));
writeFileSync('public/favicon.svg', svg);
console.log('Ícones AMCF gerados:', ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'favicon.svg'].join(', '));
