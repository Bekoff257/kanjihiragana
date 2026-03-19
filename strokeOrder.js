import axios from 'axios';
import GIFEncoder from 'gif-encoder-2';
import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';

const KANJIVG_BASE = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji';
const SIZE = 320;

export async function getStrokeOrderGif(kanji) {
  const char = kanji[0];
  const codepoint = char.codePointAt(0).toString(16).padStart(5, '0');
  const url = `${KANJIVG_BASE}/${codepoint}.svg`;

  let svgSource;
  try {
    const res = await axios.get(url, { timeout: 8000 });
    svgSource = res.data;
  } catch {
    return null;
  }

  const strokes = extractStrokes(svgSource);
  if (!strokes.length) return null;

  return buildAnimatedGif(strokes);
}

function extractStrokes(svgData) {
  const strokes = [];
  const re = /<path[^>]*\bid="kvg:[^"]*-s\d+"[^>]*>/g;
  const dRe = /\bd="([^"]+)"/;
  let m;
  while ((m = re.exec(svgData)) !== null) {
    const d = dRe.exec(m[0]);
    if (d) strokes.push(d[1]);
  }
  if (!strokes.length) {
    const grp = svgData.match(/<g[^>]*id="kvg:StrokePaths[^"]*"[^>]*>([\s\S]*?)<\/g>/);
    if (grp) {
      const pr = /\bd="([^"]+)"/g;
      let p;
      while ((p = pr.exec(grp[1])) !== null) strokes.push(p[1]);
    }
  }
  return strokes;
}

async function buildAnimatedGif(strokes) {
  const encoder = new GIFEncoder(SIZE, SIZE);
  encoder.setRepeat(0);
  encoder.setQuality(6);
  encoder.start();

  for (let i = 0; i < strokes.length; i++) {
    const svg = buildFrameSvg(strokes, i);
    const pixels = await svgToPixels(svg);
    encoder.setDelay(i === strokes.length - 1 ? 2200 : 680);
    encoder.addFrame(pixels);
  }

  encoder.finish();
  return encoder.out.getData();
}

function buildFrameSvg(strokes, currentIndex) {
  const scale = (SIZE - 72) / 109;
  const offset = 36;

  const doneStrokes = strokes
    .slice(0, currentIndex)
    .map(d => `<path d="${d}" fill="none" stroke="#A89880" stroke-width="${3.5 / scale}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('\n');

  const activeStroke = `<path d="${strokes[currentIndex]}" fill="none" stroke="#C0392B" stroke-width="${5.5 / scale}" stroke-linecap="round" stroke-linejoin="round"/>`;

  const label = `${currentIndex + 1}/${strokes.length}`;
  const doneTag = currentIndex === strokes.length - 1
    ? `<rect x="${SIZE - 78}" y="${SIZE - 26}" width="72" height="20" rx="4" fill="#1D6B45"/>
       <text x="${SIZE - 42}" y="${SIZE - 12}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#fff" font-weight="bold">tugadi</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="#FDFAF4"/>
  <line x1="${SIZE/2}" y1="${offset-4}" x2="${SIZE/2}" y2="${SIZE-offset+4}" stroke="#DDD5C8" stroke-width="0.8" stroke-dasharray="4,4"/>
  <line x1="${offset-4}" y1="${SIZE/2}" x2="${SIZE-offset+4}" y2="${SIZE/2}" stroke="#DDD5C8" stroke-width="0.8" stroke-dasharray="4,4"/>
  <rect x="${offset-2}" y="${offset-2}" width="${SIZE-(offset-2)*2}" height="${SIZE-(offset-2)*2}" fill="none" stroke="#C8BFB0" stroke-width="1"/>
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    ${doneStrokes}
    ${activeStroke}
  </g>
  <rect x="7" y="${SIZE-26}" width="${label.length*8+14}" height="20" rx="4" fill="#2C2C2A"/>
  <text x="14" y="${SIZE-12}" font-family="sans-serif" font-size="12" fill="#FDFAF4" font-weight="bold">${label}</text>
  ${doneTag}
</svg>`;
}

async function svgToPixels(svgString) {
  const resvg = new Resvg(svgString, { fitTo: { mode: 'width', value: SIZE } });
  const pngData = resvg.render().asPng();

  return new Promise((resolve, reject) => {
    const png = new PNG();
    png.parse(pngData, (err, data) => {
      if (err) return reject(err);
      resolve(data.data);
    });
  });
}