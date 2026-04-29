import { DailyNewsReport } from '@/lib/types';

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getWordlessReportBannerDataUri(report: DailyNewsReport): string {
  const seedText = [
    report.title,
    report.generatedAt,
    ...(Array.isArray(report.themes) ? report.themes.slice(0, 6).map((theme) => theme.headline) : []),
  ].filter(Boolean).join('|');
  const seed = hashString(seedText);
  const palettes = [
    ['#e7f5ee', '#b9e6d1', '#2f8f6b', '#f2c94c', '#1f4f46'],
    ['#edf3f8', '#b7d1e8', '#356d92', '#f4a261', '#23395b'],
    ['#f5f1ea', '#d9c8a9', '#607d3b', '#d66f49', '#30362f'],
    ['#eef4ed', '#c7d9b7', '#4b8063', '#d8a548', '#263d42'],
  ];
  const palette = palettes[seed % palettes.length];
  const blobCount = 8;
  const blobs = Array.from({ length: blobCount }, (_, index) => {
    const local = hashString(`${seed}-${index}`);
    const cx = 80 + (local % 1120);
    const cy = 70 + ((local >>> 7) % 540);
    const rx = 70 + ((local >>> 13) % 190);
    const ry = 45 + ((local >>> 19) % 145);
    const rotate = (local >>> 5) % 180;
    const color = palette[2 + (index % 3)];
    const opacity = index % 2 === 0 ? 0.22 : 0.34;
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${opacity}" transform="rotate(${rotate} ${cx} ${cy})"/>`;
  }).join('');

  const columns = Array.from({ length: 11 }, (_, index) => {
    const local = hashString(`${seed}-bar-${index}`);
    const x = 88 + index * 104;
    const h = 110 + (local % 260);
    const y = 610 - h;
    const color = palette[index % palette.length];
    return `<rect x="${x}" y="${y}" width="56" height="${h}" rx="28" fill="${color}" opacity="0.32"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette[0]}"/><stop offset="0.55" stop-color="${palette[1]}"/><stop offset="1" stop-color="${palette[0]}"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="1090" cy="130" r="210" fill="${palette[3]}" opacity="0.18"/><circle cx="190" cy="600" r="260" fill="${palette[2]}" opacity="0.16"/>${blobs}${columns}<path d="M0 560 C220 500 350 630 560 560 C780 486 930 520 1280 450 L1280 720 L0 720 Z" fill="${palette[4]}" opacity="0.12"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}