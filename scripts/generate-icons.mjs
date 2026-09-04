#!/usr/bin/env node
/**
 * Generates the PWA icon set for an app as plain PNGs, with no image
 * dependencies — everything offline-only per AGENTS.md. The mark is the
 * engine's "node" suit glyph (a ring + a centre dot) on a solid accent
 * background, since a solid background is also what a maskable icon
 * requires (no transparency, content kept inside the safe zone).
 *
 * Usage: node scripts/generate-icons.mjs <outDir> <backgroundHex>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type: none
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const idat = deflateSync(raw);

  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawNodeMark({ size, backgroundHex, markHex = "#FAF6EC", safeRadiusRatio }) {
  const rgba = Buffer.alloc(size * size * 4);
  const [br, bg, bb] = hexToRgb(backgroundHex);
  const [mr, mg, mb] = hexToRgb(markHex);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * safeRadiusRatio;
  const ringOuter = outerR;
  const ringInner = outerR * 0.8;
  const dotR = outerR * 0.32;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      const onRing = dist <= ringOuter && dist >= ringInner;
      const onDot = dist <= dotR;

      if (onRing || onDot) {
        rgba[idx] = mr;
        rgba[idx + 1] = mg;
        rgba[idx + 2] = mb;
      } else {
        rgba[idx] = br;
        rgba[idx + 1] = bg;
        rgba[idx + 2] = bb;
      }
      rgba[idx + 3] = 255;
    }
  }

  return encodePNG(size, size, rgba);
}

function main() {
  const [, , outDirArg, backgroundHexArg] = process.argv;
  const outDir = outDirArg ?? "public/icons";
  const backgroundHex = backgroundHexArg ?? "#1F6F78";

  mkdirSync(outDir, { recursive: true });

  const targets = [
    { file: "icon-192.png", size: 192, safeRadiusRatio: 0.42 },
    { file: "icon-512.png", size: 512, safeRadiusRatio: 0.42 },
    { file: "icon-maskable-512.png", size: 512, safeRadiusRatio: 0.36 },
  ];

  for (const t of targets) {
    const png = drawNodeMark({ size: t.size, backgroundHex, safeRadiusRatio: t.safeRadiusRatio });
    writeFileSync(path.join(outDir, t.file), png);
    console.log(`wrote ${path.join(outDir, t.file)}`);
  }
}

main();
