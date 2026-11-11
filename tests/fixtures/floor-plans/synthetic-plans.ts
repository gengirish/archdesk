/**
 * Synthetic floor-plan PNGs for geometry tests. Generated in code (no binary
 * fixtures): black walls on white paper, encoded with a minimal PNG writer
 * that cycles through row filters so the decoder's unfiltering is exercised.
 */
import { deflateSync } from "node:zlib";

type Canvas = { width: number; height: number; px: Uint8Array };

export function blankCanvas(width: number, height: number): Canvas {
  return { width, height, px: new Uint8Array(width * height).fill(255) };
}

export function fillRect(c: Canvas, x0: number, y0: number, x1: number, y1: number, value = 0) {
  for (let y = Math.max(0, y0); y < Math.min(c.height, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(c.width, x1); x++) c.px[y * c.width + x] = value;
  }
}

/** Axis-aligned wall of thickness `t` from (x0,y0) to (x1,y1), measured on its outer face. */
export function wall(c: Canvas, x0: number, y0: number, x1: number, y1: number, t: number) {
  fillRect(c, Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1) + (x0 === x1 ? t : 0), Math.max(y0, y1) + (y0 === y1 ? t : 0));
}

/** Closed outline of axis-aligned polygon vertices, drawn as walls of thickness t. */
export function outline(c: Canvas, pts: [number, number][], t: number) {
  pts.forEach(([x0, y0], i) => {
    const [x1, y1] = pts[(i + 1) % pts.length];
    fillRect(c, Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1) + t, Math.max(y0, y1) + t);
  });
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "latin1");
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Encode as 8-bit RGB (colour type 2) with filters None/Sub/Up/Paeth cycling per row. */
export function encodePng(c: Canvas): Uint8Array {
  const bpp = 3;
  const stride = c.width * bpp;
  const rgb = new Uint8Array(stride * c.height);
  for (let i = 0; i < c.px.length; i++) rgb.fill(c.px[i], i * 3, i * 3 + 3);

  const raw = new Uint8Array((stride + 1) * c.height);
  const filters = [0, 1, 2, 4];
  for (let y = 0; y < c.height; y++) {
    const f = filters[y % filters.length];
    raw[y * (stride + 1)] = f;
    for (let i = 0; i < stride; i++) {
      const x = rgb[y * stride + i];
      const a = i >= bpp ? rgb[y * stride + i - bpp] : 0;
      const b = y > 0 ? rgb[(y - 1) * stride + i] : 0;
      const cc = y > 0 && i >= bpp ? rgb[(y - 1) * stride + i - bpp] : 0;
      let pred = 0;
      if (f === 1) pred = a;
      else if (f === 2) pred = b;
      else if (f === 4) {
        const p = a + b - cc;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - cc);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : cc;
      }
      raw[y * (stride + 1) + 1 + i] = (x - pred) & 0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.width, 0);
  ihdr.writeUInt32BE(c.height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(Buffer.from(raw))),
      chunk("IEND", new Uint8Array(0)),
    ])
  );
}

const T = 6; // wall thickness in px

/** (a) 360×260 rectangle with ONE internal vertical wall. */
export function rectangleWithOneWall(): Uint8Array {
  const c = blankCanvas(400, 300);
  outline(c, [[20, 20], [374, 20], [374, 274], [20, 274]], T);
  wall(c, 200, 20, 200, 274, T);
  return encodePng(c);
}

/** (b) L-shaped footprint, no internal walls. */
export function lShape(): Uint8Array {
  const c = blankCanvas(400, 300);
  outline(c, [[20, 20], [374, 20], [374, 144], [200, 144], [200, 274], [20, 274]], T);
  return encodePng(c);
}

/** (c) Two rooms: internal wall with a 40px door gap, plus a 30px gap in the outer wall. */
export function twoRoomsWithDoors(): Uint8Array {
  const c = blankCanvas(400, 300);
  outline(c, [[20, 20], [374, 20], [374, 274], [20, 274]], T);
  fillRect(c, 90, 274, 120, 274 + T, 255); // front door in the bottom wall
  wall(c, 200, 20, 200, 120, T);
  wall(c, 200, 160, 200, 274, T);
  // A room label (text-like noise) that must not become a wall.
  fillRect(c, 90, 140, 96, 148);
  fillRect(c, 100, 140, 104, 152);
  return encodePng(c);
}

/** (d) Walls drawn as double outlines (thin parallel lines): one internal wall, not two. */
export function outlinedWalls(): Uint8Array {
  const c = blankCanvas(400, 300);
  outline(c, [[20, 20], [374, 20], [374, 274], [20, 274]], 2);
  outline(c, [[28, 28], [366, 28], [366, 266], [28, 266]], 2);
  fillRect(c, 196, 28, 198, 268);
  fillRect(c, 204, 28, 206, 268);
  return encodePng(c);
}
