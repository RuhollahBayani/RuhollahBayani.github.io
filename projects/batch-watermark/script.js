// Batch Watermarker, browser version
// ----------------------------------
// Does the same job as watermark.py, using the same steps:
//   1. Shrink each photo to Instagram width (1080px), keeping its shape.
//   2. Scale the logo to a fraction of the photo's width.
//   3. Draw the logo in a corner, a little in from the edge, slightly see-through.
// Python uses the Pillow library for this; here the browser's <canvas> does the drawing.

const WIDTH = 1080;    // Instagram width, same default as the Python script
const MARGIN = 0.03;   // gap from the edge, as a fraction of the photo width

const grid = document.getElementById('grid');
const stage = document.getElementById('stage');
const info = document.getElementById('info');
const controls = {
  position: document.getElementById('position'),
  logoSize: document.getElementById('logo-size'),
  opacity: document.getElementById('opacity'),
};

let photos = [];   // each item: { name, img, sample, canvas }
let logo = null;   // the logo image

// ---------- Loading images ----------

// Turns a URL into a loaded <img>, so we can wait for it with "await".
function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Couldn't open ${src}`));
    img.src = src;
  });
}

async function addPhotos(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  if (!images.length) {
    info.textContent = 'Please choose image files (JPG, PNG, WebP).';
    return;
  }
  info.textContent = `Processing ${images.length} photo(s)…`;

  // Uploading replaces the sample, but adds to photos uploaded earlier.
  photos = photos.filter((p) => !p.sample);
  for (const file of images) {
    try {
      const img = await loadImg(URL.createObjectURL(file));
      photos.push({ name: file.name, img, sample: false });
    } catch (err) {
      console.warn(err);
    }
  }
  renderAll();
}

// ---------- The watermarking ----------

function watermark(photo) {
  const { img } = photo;

  // 1. Resize to WIDTH, keeping the shape. Small photos stay their size.
  const width = Math.min(WIDTH, img.width);
  const height = Math.round(img.height * (width / img.width));

  const canvas = photo.canvas || document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  if (logo) {
    // 2. Scale the logo relative to the photo.
    const logoWidth = Math.round(width * Number(controls.logoSize.value) / 100);
    const logoHeight = Math.round(logo.height * (logoWidth / logo.width));

    // 3. Work out the corner position.
    const gap = Math.round(width * MARGIN);
    const [vertical, horizontal] = controls.position.value.split('-'); // e.g. "bottom", "right"
    const x = horizontal === 'left' ? gap : width - logoWidth - gap;
    const y = vertical === 'top' ? gap : height - logoHeight - gap;

    // globalAlpha makes everything drawn next see-through (1 = solid).
    ctx.globalAlpha = Number(controls.opacity.value) / 100;
    ctx.drawImage(logo, x, y, logoWidth, logoHeight);
    ctx.globalAlpha = 1;
  }

  photo.canvas = canvas;
  return canvas;
}

// ---------- Showing the results ----------

function renderAll() {
  grid.innerHTML = '';
  for (const photo of photos) {
    const card = document.createElement('div');
    card.className = 'result';
    card.appendChild(watermark(photo));

    const row = document.createElement('div');
    row.className = 'row';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = `${photo.name} · ${photo.canvas.width}×${photo.canvas.height}`;
    row.appendChild(name);

    if (!photo.sample) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Download';
      button.addEventListener('click', () => download(photo));
      row.appendChild(button);
    }
    card.appendChild(row);
    grid.appendChild(card);
  }

  const uploaded = photos.filter((p) => !p.sample).length;
  downloadAll.disabled = uploaded === 0;
  info.textContent = uploaded
    ? `${uploaded} photo(s) ready`
    : 'Sample photo · upload your own to download them';
}

// Moving a slider only redraws the existing canvases; no need to rebuild the page.
function redraw() {
  photos.forEach(watermark);
}

// ---------- Downloading ----------

function download(photo) {
  photo.canvas.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = photo.name.replace(/\.[^.]+$/, '') + '-watermarked.jpg';
    link.click();
    URL.revokeObjectURL(link.href);
  }, 'image/jpeg', 0.9);
}

const downloadAll = document.getElementById('download-all');
downloadAll.addEventListener('click', () => {
  // Browsers can block many downloads at the same moment, so space them out a little.
  photos.filter((p) => !p.sample).forEach((photo, i) => setTimeout(() => download(photo), i * 300));
});

// ---------- Controls ----------

controls.logoSize.addEventListener('input', () => {
  document.getElementById('logo-size-val').textContent = controls.logoSize.value + '%';
  redraw();
});
controls.opacity.addEventListener('input', () => {
  document.getElementById('opacity-val').textContent = controls.opacity.value + '%';
  redraw();
});
controls.position.addEventListener('change', redraw);

document.getElementById('photos').addEventListener('change', (e) => addPhotos(e.target.files));
document.getElementById('logo-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  logo = await loadImg(URL.createObjectURL(file));
  redraw();
});

stage.addEventListener('dragover', (e) => { e.preventDefault(); stage.classList.add('dragging'); });
stage.addEventListener('dragleave', () => stage.classList.remove('dragging'));
stage.addEventListener('drop', (e) => {
  e.preventDefault();
  stage.classList.remove('dragging');
  addPhotos(e.dataTransfer.files);
});

// Block the right-click "Save image" menu on the sample.
grid.addEventListener('contextmenu', (e) => {
  if (photos.length && photos.every((p) => p.sample)) e.preventDefault();
});

// ---------- Start with my logo and a few sample photos ----------

const SAMPLES = ['sofia-web.jpg', 'gallery-1.jpg', 'gallery-2.jpg'];

(async () => {
  try {
    logo = await loadImg('logo.png');
    const images = await Promise.all(SAMPLES.map((file) => loadImg('../../Image/' + file)));
    photos = images.map((img, i) => ({ name: `sample-${i + 1}.jpg`, img, sample: true }));
    renderAll();
  } catch (err) {
    info.textContent = 'Upload photos to start.';
  }
})();
