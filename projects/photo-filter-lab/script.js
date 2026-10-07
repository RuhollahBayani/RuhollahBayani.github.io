// Photo Filter Lab
// ----------------
// How it works:
// 1. Draw the photo onto a <canvas>.
// 2. Save a copy of its original pixels.
// 3. Whenever a slider moves, start again from the original pixels,
//    run brightness, contrast and saturation over every pixel, and draw the result.
//
// A pixel is stored as 4 numbers in a row: red, green, blue, alpha (transparency),
// each from 0 to 255. So a 1000×1000 photo is 4,000,000 numbers.

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const stage = document.getElementById('stage');
const badge = document.getElementById('badge');
const info = document.getElementById('info');

const sliders = {
  brightness: document.getElementById('brightness'),
  contrast: document.getElementById('contrast'),
  saturation: document.getElementById('saturation'),
};

// Big photos are slow to process, so they are scaled down to this size.
const MAX_SIZE = 1600;

let originalPixels = null; // the untouched photo, kept so we can always start fresh
let fileName = 'photo';
let isSample = false;     // true while the sample photo is showing; it can't be downloaded

const downloadButton = document.getElementById('download');

// ---------- Loading a photo ----------

function loadImage(src, name, sample = false) {
  const img = new Image();
  img.onload = () => {
    // Work out a size that fits inside MAX_SIZE but keeps the shape of the photo.
    const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    try {
      originalPixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (err) {
      // Browsers block reading pixels from files opened directly from your disk
      // (file://) for security. Uploaded photos always work, and so does the
      // sample once the site is online.
      originalPixels = null;
      info.textContent = 'Upload a photo to start editing.';
      return;
    }
    fileName = name.replace(/\.[^.]+$/, ''); // remove the extension, e.g. "beach.jpg" → "beach"

    // The sample is my own photo, so only photos the visitor uploads can be downloaded.
    isSample = sample;
    downloadButton.disabled = sample;
    downloadButton.title = sample ? 'Upload your own photo to download it' : '';

    info.textContent = sample
      ? 'Sample photo · upload your own to download it'
      : `${name} · ${canvas.width}×${canvas.height}px`;
    applyFilters();
  };
  img.onerror = () => { info.textContent = 'That file could not be opened. Try a JPG or PNG.'; };
  img.src = src;
}

function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    info.textContent = 'Please choose an image file (JPG, PNG, WebP).';
    return;
  }
  loadImage(URL.createObjectURL(file), file.name);
}

// ---------- The filters ----------

function applyFilters() {
  if (!originalPixels) return;

  const brightness = Number(sliders.brightness.value); // -100 to 100
  const contrast = Number(sliders.contrast.value);     // -100 to 100
  const saturation = Number(sliders.saturation.value); // -100 to 100

  // Turn the slider values into the numbers the maths needs.
  const brightnessShift = brightness * 2.55;           // up to ±255
  const c = contrast * 2.55;
  const contrastFactor = (259 * (c + 255)) / (255 * (259 - c)); // standard contrast formula
  const saturationFactor = 1 + saturation / 100;       // 0 = greyscale, 1 = normal, 2 = double

  // Copy the original pixels so we never edit the original itself.
  const output = new ImageData(
    new Uint8ClampedArray(originalPixels.data),
    originalPixels.width,
    originalPixels.height
  );
  const px = output.data;

  // Step through the pixels 4 numbers at a time (r, g, b, a).
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i];
    let g = px[i + 1];
    let b = px[i + 2];

    // Brightness: add the same amount to every channel.
    r += brightnessShift;
    g += brightnessShift;
    b += brightnessShift;

    // Contrast: push each channel away from (or towards) the middle grey, 128.
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // Saturation: find the grey version of this pixel, then move away from or towards it.
    // The weights match how bright each colour looks to the human eye.
    const grey = 0.299 * r + 0.587 * g + 0.114 * b;
    r = grey + (r - grey) * saturationFactor;
    g = grey + (g - grey) * saturationFactor;
    b = grey + (b - grey) * saturationFactor;

    // Uint8ClampedArray automatically keeps values between 0 and 255.
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
  }

  ctx.putImageData(output, 0, 0);
}

// Moving a slider fires many events per second. requestAnimationFrame makes sure
// we process at most once per screen refresh, so the page stays smooth.
let pending = false;
function scheduleUpdate() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    applyFilters();
  });
}

for (const [name, slider] of Object.entries(sliders)) {
  const label = document.getElementById(`${name}-val`);
  slider.addEventListener('input', () => {
    label.textContent = slider.value > 0 ? `+${slider.value}` : slider.value;
    scheduleUpdate();
  });
}

// ---------- Buttons ----------

document.getElementById('reset').addEventListener('click', () => {
  for (const [name, slider] of Object.entries(sliders)) {
    slider.value = 0;
    document.getElementById(`${name}-val`).textContent = '0';
  }
  applyFilters();
});

// Hold the button to show the original photo; let go to see the edit again.
const compare = document.getElementById('compare');
function showBefore() {
  if (!originalPixels) return;
  ctx.putImageData(originalPixels, 0, 0);
  badge.hidden = false;
}
function showAfter() {
  badge.hidden = true;
  applyFilters();
}
compare.addEventListener('pointerdown', showBefore);
compare.addEventListener('pointerup', showAfter);
compare.addEventListener('pointerleave', showAfter);
compare.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); showBefore(); } });
compare.addEventListener('keyup', showAfter);

downloadButton.addEventListener('click', () => {
  if (isSample) return;
  canvas.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}-edited.jpg`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, 'image/jpeg', 0.92);
});

// ---------- Uploading: file picker and drag-and-drop ----------

document.getElementById('file').addEventListener('change', (e) => loadFile(e.target.files[0]));

stage.addEventListener('dragover', (e) => { e.preventDefault(); stage.classList.add('dragging'); });
stage.addEventListener('dragleave', () => stage.classList.remove('dragging'));
stage.addEventListener('drop', (e) => {
  e.preventDefault();
  stage.classList.remove('dragging');
  loadFile(e.dataTransfer.files[0]);
});

// Start with one of my photos so the page isn't empty.
loadImage('../../Image/sofia-web.jpg', 'sofia.jpg', true);

// Block the right-click "Save image" menu on the sample.
canvas.addEventListener('contextmenu', (e) => { if (isSample) e.preventDefault(); });
