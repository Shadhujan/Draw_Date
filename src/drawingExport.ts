export type KeepsakeOptions = {
  names: string;
  date: string;
  theme: 'rose' | 'sage';
};

/** Frame the frozen pigment snapshot without cropping or rescaling the art. */
export function makeKeepsake(artwork: HTMLCanvasElement, options: KeepsakeOptions) {
  const width = artwork.width;
  const margin = Math.round(width * 0.055);
  const footer = Math.round(width * 0.17);
  const out = document.createElement('canvas');
  out.width = width + margin * 2;
  out.height = artwork.height + margin * 2 + footer;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Drawing export is unavailable.');

  const accent = options.theme === 'sage' ? '#607c65' : '#a55c79';
  ctx.fillStyle = '#fbf5e9';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.strokeStyle = options.theme === 'sage' ? '#d5decf' : '#e9d5d6';
  ctx.lineWidth = Math.max(1, width * 0.001);
  ctx.strokeRect(margin * 0.4, margin * 0.4, out.width - margin * 0.8, out.height - margin * 0.8);
  ctx.drawImage(artwork, margin, margin);

  // A tiny stitched heart belongs to the frame, outside the drawing itself.
  ctx.save();
  ctx.translate(out.width / 2, margin + artwork.height + width * 0.027);
  ctx.scale(width * 0.0011, width * 0.0011);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-22, -8, -10, -22, 0, -11);
  ctx.bezierCurveTo(10, -22, 22, -8, 0, 5);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic ${width * 0.033}px Georgia, serif`;
  ctx.fillText('a little moment, made together', out.width / 2, margin + artwork.height + width * 0.071);

  const names = options.names.trim().replace(/\s+/g, ' ');
  const caption = [names, options.date].filter(Boolean).join('  ·  ');
  let fontSize = width * 0.022;
  ctx.font = `${fontSize}px "Trebuchet MS", system-ui, sans-serif`;
  while (ctx.measureText(caption).width > width * 0.9 && fontSize > width * 0.012) {
    fontSize -= width * 0.001;
    ctx.font = `${fontSize}px "Trebuchet MS", system-ui, sans-serif`;
  }
  ctx.fillStyle = '#73635d';
  ctx.fillText(caption, out.width / 2, margin + artwork.height + width * 0.118, width * 0.9);
  return out;
}

export function localDateStamp(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function downloadDrawing(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not prepare the PNG.')), 'image/png');
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Give browsers time to begin the download before releasing its temporary URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
