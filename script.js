// ===== Mode opening: dibaca dari <body data-opening=...> di index.html =====
const OPENING = ((document.body.dataset.opening || 'frames').trim().toLowerCase()).replace('vidio', 'video');
const videoMode = OPENING.startsWith('video');   // frames = scroll frame (lama); video-klik / video-auto = pakai video
let videoEnded = false;
if (videoMode) document.body.classList.add('opening-video');

const scene = document.querySelector('.scene');
const fullscreenToggle = document.querySelector('.fullscreen-toggle');
const aanwijzingSection = document.querySelector('.aanwijzing-section');
const documentsSection = document.querySelector('.documents-section');
const aanwijzingVideo = aanwijzingSection ? aanwijzingSection.querySelector('video') : null;
const documentSlide = document.querySelector('.document-slide');
const pdfPreview = document.querySelector('.pdf-preview');
const documentPreview = document.querySelector('.pdf-viewer-stack');
const documentIndex = document.querySelector('.document-index');
const documentName = document.querySelector('.document-meta h3');
const previousDocument = document.querySelector('.document-nav--prev');
const nextDocument = document.querySelector('.document-nav--next');
const feedbackContent = document.querySelector('.feedback-content');
const feedbackSizeDecrease = document.querySelector('.feedback-size-button--decrease');
const feedbackSizeIncrease = document.querySelector('.feedback-size-button--increase');
const feedbackSizeValue = document.querySelector('.feedback-size-value');
const searchTool = document.querySelector('.document-tool--search');
const searchInput = document.querySelector('.document-search');
const themeSwitch = document.querySelector('.theme-switch');
const themeChoiceButtons = document.querySelectorAll('.theme-switch button');
const qrToggle = document.querySelector('.qr-toggle');
const qrPopover = document.querySelector('.qr-popover');
const documentFrames = new Map();
let activeDocument = 0;
let visibleDocuments = [];
let documentSlideAnimation = null;
let documentTransitionAnimation = null;
let feedbackSizeIndex = 4; // mulai dari ukuran terbesar (94%)
const feedbackSizeLabels = [64, 72, 80, 88, 94];

const documents = [
  { name: 'Kerangka Acuan Kerja (KAK)', file: 'kak.pdf' },
  { name: 'Instruksi Kepada Peserta (IKP)', file: 'ikp.pdf' },
  { name: 'Bill Of Quantity (BOQ)', file: 'boq.pdf' },
  { name: 'Surat Undangan Aanwijzing', file: 'surat_undangan_aanwijzing.pdf' },
  { name: 'Surat Pernyataan Kesanggupan Pekerjaan', file: 'surat_pernyataan_kesanggupan_pekerjaan.pdf' },
  { name: 'Draft HOA', file: 'draft_hoa.pdf' },
  { name: 'Draft SSUK', file: 'draft_ssuk.pdf' },
  { name: 'Template Pakta Integritas', file: 'template_pakta_integritas.pdf' },
  { name: 'Template Keterangan Tidak Pailit', file: 'template_keterangan_tidak_pailit.pdf' },
  { name: 'Template Pernyataan Capaian TKDN', file: 'template_pernyataan_capaian_tkdn.pdf' },
  { name: 'Template Pernyataan Anti Penyuapan', file: 'template_pernyataan_anti_penyuapan.pdf' },
  { name: 'Template Surat Penawaran Harga', file: 'template_surat_penawaran_harga.pdf' }
];

function renderDocument(sourceButton = null) {
  const sourceRect = sourceButton ? sourceButton.getBoundingClientRect() : null;
  const previewRect = sourceButton && pdfPreview ? pdfPreview.getBoundingClientRect() : null;
  const documentItem = visibleDocuments[activeDocument];
  if (!documentItem) {
    documentFrames.forEach((frame) => setDocumentFrameActive(frame, false));
    if (documentIndex) documentIndex.textContent = '00 / 00';
    if (documentName) documentName.textContent = 'Dokumen tidak ditemukan';
    updateDocumentPeek(previousDocument, -1);
    updateDocumentPeek(nextDocument, 1);
    return;
  }
  if (documentPreview) {
    let frame = documentFrames.get(documentItem.file);
    if (!frame) {
      frame = document.createElement('iframe');
      frame.className = 'pdf-page-frame';
      frame.title = `Preview ${documentItem.name}`;
      frame.loading = 'lazy';
      frame.src = `${encodeURI(documentItem.file)}#page=1&view=FitH`;
      documentPreview.appendChild(frame);
      documentFrames.set(documentItem.file, frame);
    }
    documentFrames.forEach((cachedFrame) => setDocumentFrameActive(cachedFrame, cachedFrame === frame));
  }
  if (documentIndex) documentIndex.textContent = `${String(activeDocument + 1).padStart(2, '0')} / ${String(visibleDocuments.length).padStart(2, '0')}`;
  if (documentName) documentName.textContent = documentItem.name;
  updateDocumentPeek(previousDocument, -1);
  updateDocumentPeek(nextDocument, 1);
  if (sourceRect && previewRect && previewRect.width && previewRect.height) {
    if (documentTransitionAnimation) documentTransitionAnimation.cancel();
    const scaleX = sourceRect.width / previewRect.width;
    const scaleY = sourceRect.height / previewRect.height;
    const animation = pdfPreview.animate([
      {
        transformOrigin: 'top left',
        transform: `translate(${sourceRect.left - previewRect.left}px, ${sourceRect.top - previewRect.top}px) scale(${scaleX}, ${scaleY})`,
        borderRadius: '4px'
      },
      { transformOrigin: 'top left', transform: 'translate(0, 0) scale(1, 1)', borderRadius: '12px' }
    ], {
      duration: 900,
      easing: 'cubic-bezier(.2,.72,.18,1)'
    });
    documentTransitionAnimation = animation;
    animation.onfinish = () => {
      if (documentTransitionAnimation === animation) documentTransitionAnimation = null;
    };
  } else if (documentSlide) {
    if (documentSlideAnimation) documentSlideAnimation.cancel();
    const animation = documentSlide.animate([
      {
        opacity: 0,
        transform: 'translateY(12px) scale(.98)'
      },
      { opacity: 1, transform: 'translate(0, 0) scale(1)' }
    ], {
      duration: 350,
      easing: 'cubic-bezier(.2,.72,.18,1)'
    });
    documentSlideAnimation = animation;
    animation.onfinish = () => {
      if (documentSlideAnimation === animation) documentSlideAnimation = null;
    };
  }
}

function updateDocumentPeek(button, offset) {
  if (!button) return;
  const indexLabel = button.querySelector('.document-peek-index');
  const nameLabel = button.querySelector('.document-peek-name');
  if (!visibleDocuments.length) {
    button.disabled = true;
    if (indexLabel) indexLabel.textContent = '--';
    if (nameLabel) nameLabel.textContent = 'Tidak ada dokumen';
    button.setAttribute('aria-label', 'Tidak ada dokumen lain');
    return;
  }
  const neighborIndex = (activeDocument + offset + visibleDocuments.length) % visibleDocuments.length;
  const neighbor = visibleDocuments[neighborIndex];
  button.disabled = visibleDocuments.length < 2;
  if (indexLabel) indexLabel.textContent = String(neighborIndex + 1).padStart(2, '0');
  if (nameLabel) nameLabel.textContent = neighbor.name;
  button.setAttribute('aria-label', `Buka dokumen: ${neighbor.name}`);
  button.title = neighbor.name;
}

function setDocumentFrameActive(frame, isActive) {
  frame.classList.toggle('is-active', isActive);
  frame.inert = !isActive;
  frame.tabIndex = isActive ? 0 : -1;
  frame.setAttribute('aria-hidden', String(!isActive));
}

function updateDocumentList() {
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  visibleDocuments = documents.filter((documentItem) => documentItem.name.toLowerCase().includes(query));
  activeDocument = 0;
  renderDocument();
}

if (searchTool && documentsSection && searchInput) {
  searchTool.addEventListener('click', () => {
    documentsSection.classList.toggle('search-open');
    if (documentsSection.classList.contains('search-open')) searchInput.focus();
  });
  searchInput.addEventListener('input', updateDocumentList);
}

if (previousDocument && nextDocument) {
  previousDocument.addEventListener('click', () => { if (visibleDocuments.length) { activeDocument = (activeDocument - 1 + visibleDocuments.length) % visibleDocuments.length; renderDocument(previousDocument); } });
  nextDocument.addEventListener('click', () => { if (visibleDocuments.length) { activeDocument = (activeDocument + 1) % visibleDocuments.length; renderDocument(nextDocument); } });
}

function setQrOpen(open) {
  if (!qrToggle || !qrPopover) return;
  qrPopover.classList.toggle('is-open', open);
  qrToggle.setAttribute('aria-expanded', String(open));
}

if (qrToggle && qrPopover) {
  qrToggle.addEventListener('click', () => setQrOpen(!qrPopover.classList.contains('is-open')));
  document.addEventListener('click', (event) => {
    if (!qrPopover.contains(event.target) && !qrToggle.contains(event.target)) setQrOpen(false);
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setQrOpen(false); });
}

function updateFeedbackSize(nextIndex) {
  if (!feedbackContent) return;
  feedbackSizeIndex = Math.max(0, Math.min(feedbackSizeLabels.length - 1, nextIndex));
  feedbackContent.dataset.size = String(feedbackSizeIndex);
  if (feedbackSizeValue) feedbackSizeValue.textContent = `${feedbackSizeLabels[feedbackSizeIndex]}%`;
  if (feedbackSizeDecrease) feedbackSizeDecrease.disabled = feedbackSizeIndex === 0;
  if (feedbackSizeIncrease) feedbackSizeIncrease.disabled = feedbackSizeIndex === feedbackSizeLabels.length - 1;
}

if (feedbackSizeDecrease && feedbackSizeIncrease) {
  feedbackSizeDecrease.addEventListener('click', () => updateFeedbackSize(feedbackSizeIndex - 1));
  feedbackSizeIncrease.addEventListener('click', () => updateFeedbackSize(feedbackSizeIndex + 1));
  updateFeedbackSize(feedbackSizeIndex);
}

let isDarkTheme = false;

function setDark(isDark) {
  isDarkTheme = isDark;
  if (aanwijzingSection) aanwijzingSection.classList.toggle('theme-dark', isDark);
  if (documentsSection) documentsSection.classList.toggle('theme-dark', isDark);
  document.body.classList.toggle('dark', isDark);
  if (themeSwitch) themeSwitch.dataset.active = isDark ? 'dark' : 'light';
  themeChoiceButtons.forEach((button, index) => button.setAttribute('aria-pressed', String((index === 1) === isDark)));
  updateDusk();
}

themeChoiceButtons.forEach((button, index) => button.addEventListener('click', () => setDark(index === 1)));

// ===== Opening: urutan frame WebP yang dikendalikan scroll =====
const FRAME_COUNT = 211;
const FRAME_END = 0.86; // bagian scroll untuk frame; sisanya jeda di layar putih (pilihan tampilan)
const FRAME_DIR = ''; // isi mis. 'frames/' jika file frame ada di dalam folder
// Nama file dari 11zon: _NNNN_ = nomor frame, angka di tengah = urutan di dalam "batch" yang mengulang dari 1.
// Frame pertama tiap batch (dari nama file yang ada): 1, 49, 97, 114, 146, 177, 201. Kalau ada batch lain yang
// belum diketahui, kodenya mencari sendiri dan mengingatnya.
const frameStarts = [1, 49, 97, 114, 146, 177, 201];
const frameUrl = (n, m) => encodeURI(`${FRAME_DIR}vid zoomout-${String(n).padStart(4, '0')}_${m}_11zon.webp`);
function frameCandidates(n) {
  const lower = Math.max(...frameStarts.filter((s) => s <= n));
  const guess = n - lower + 1;
  const list = [guess];
  for (let m = 1; m <= guess && list.length < 120; m++) if (m !== guess) list.push(m);
  return list;
}

const heroSection = document.querySelector('.hero');
const heroContent = document.querySelector('.hero__content');
const frameCanvas = document.querySelector('.frame-canvas');
const frameLoader = document.querySelector('.frame-loader');
const frameLoaderBar = frameLoader ? frameLoader.querySelector('span') : null;
const frameCtx = frameCanvas ? frameCanvas.getContext('2d') : null;
const frames = new Array(FRAME_COUNT);
let loadedFrames = 0;
let currentFrame = 0;
let targetFrame = 0;
let drawnFrame = -1;
let frameRaf = 0;

function resizeFrameCanvas() {
  if (!frameCanvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  frameCanvas.width = Math.round(frameCanvas.clientWidth * dpr);
  frameCanvas.height = Math.round(frameCanvas.clientHeight * dpr);
  drawnFrame = -1;
  drawFrame(Math.round(currentFrame));
}

function drawFrame(index) {
  if (!frameCtx || !frameCanvas.width) return;
  let img = null;
  for (let k = index; k >= 0 && !img; k--) img = frames[k];
  for (let k = index + 1; k < FRAME_COUNT && !img; k++) img = frames[k];
  if (!img) return;
  const scale = Math.max(frameCanvas.width / img.naturalWidth, frameCanvas.height / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  frameCtx.drawImage(img, (frameCanvas.width - w) / 2, (frameCanvas.height - h) / 2, w, h);
  drawnFrame = index;
}

function scrollProgress() {
  const total = heroSection.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, -heroSection.getBoundingClientRect().top / total));
}

function frameTick() {
  frameRaf = 0;
  const diff = targetFrame - currentFrame;
  currentFrame = Math.abs(diff) < 0.05 ? targetFrame : currentFrame + diff * 0.16;
  const index = Math.round(currentFrame);
  if (index !== drawnFrame) drawFrame(index);
  if (currentFrame !== targetFrame) frameRaf = requestAnimationFrame(frameTick);
}

let duskTimer = 0;
function updateDusk() {
  if (!scene || !heroSection) return;
  const on = isDarkTheme && (videoMode ? videoEnded : scrollProgress() >= FRAME_END - 0.03);
  if (scene.classList.contains('is-dusk') === on) return;
  scene.classList.toggle('is-dusk', on);
  window.clearTimeout(duskTimer);
  if (on) duskTimer = window.setTimeout(() => scene.classList.add('is-dusk-settled'), 4200);
  else scene.classList.remove('is-dusk-settled');
}

function onHeroScroll() {
  const progress = scrollProgress();
  const framePart = Math.min(1, progress / FRAME_END);
  targetFrame = framePart * (FRAME_COUNT - 1);
  if (heroContent) heroContent.style.opacity = String(Math.max(0, 1 - framePart * 8));
  // Foto "selamat datang" adalah tampilan paling awal; baru berganti ke frame begitu scroll dimulai.
  if (scene && progress > 0.001) scene.classList.add('is-ready');
  if (scene) scene.classList.toggle('is-end', progress >= FRAME_END - 0.03);
  updateDusk();
  if (!frameRaf) frameRaf = requestAnimationFrame(frameTick);
}

function loadFrame(i) {
  const n = i + 1;
  const candidates = frameCandidates(n);
  const attempt = (k) => new Promise((resolve) => {
    if (k >= candidates.length) {
      console.error('Frame tidak ditemukan:', frameUrl(n, candidates[0]));
      resolve();
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const start = n - candidates[k] + 1;
      if (!frameStarts.includes(start)) frameStarts.push(start);
      frames[i] = img;
      loadedFrames += 1;
      if (frameLoaderBar) frameLoaderBar.style.transform = `scaleX(${loadedFrames / FRAME_COUNT})`;
      if (Math.abs(i - currentFrame) < 8) { drawnFrame = -1; drawFrame(Math.round(currentFrame)); }
      resolve();
    };
    img.onerror = () => attempt(k + 1).then(resolve);
    img.src = frameUrl(n, candidates[k]);
  });
  return attempt(0);
}

async function preloadFrames() {
  const order = [];
  for (let i = 0; i < FRAME_COUNT; i += 6) order.push(i);
  for (let i = 0; i < FRAME_COUNT; i++) if (i % 6) order.push(i);
  let next = 0;
  const worker = async () => { while (next < order.length) await loadFrame(order[next++]); };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (frameLoader) frameLoader.classList.add('is-done');
  console.info(`Frame termuat: ${loadedFrames}/${FRAME_COUNT}. Awal batch: ${[...frameStarts].sort((x, y) => x - y).join(', ')}`);
}

if (heroSection && scene && 'IntersectionObserver' in window) {
  const heroVisibility = new IntersectionObserver(([entry]) => {
    scene.classList.toggle('is-offscreen', !entry.isIntersecting);
  }, { rootMargin: '50% 0px 50% 0px' });
  heroVisibility.observe(heroSection);
}

if (heroSection && frameCanvas && !videoMode) {
  resizeFrameCanvas();
  targetFrame = Math.min(1, scrollProgress() / FRAME_END) * (FRAME_COUNT - 1);
  currentFrame = targetFrame;
  onHeroScroll();
  window.addEventListener('scroll', onHeroScroll, { passive: true });
  window.addEventListener('resize', () => { resizeFrameCanvas(); onHeroScroll(); });
  preloadFrames();
}

// ===== Suara ambient (angin + drone) khusus bagian frame =====
// Dibuat langsung di browser (Web Audio), jadi tidak butuh file audio. Browser mewajibkan ada
// klik/tombol pertama sebelum suara boleh bunyi, jadi suara menyala pada interaksi pertama
// (atau lewat tombol speaker), lalu volumenya mengikuti posisi scroll.
const soundToggle = document.querySelector('.sound-toggle');
const audioState = { ctx: null, master: null, tone: null, droneTone: null, windGain: null, droneGain: null,
  on: false, userMuted: false, sleeping: false, sleepTimer: 0, speed: 0, lastProgress: 0, lastTime: 0 };

function makeNoiseBuffer(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    let peak = 0.0001;
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last;
      if (Math.abs(last) > peak) peak = Math.abs(last);
    }
    const norm = 0.9 / peak; // dinormalkan ke dalam rentang aman, tidak ada lagi sinyal yang terpotong/pecah
    for (let i = 0; i < length; i++) data[i] *= norm;
    const fade = 4096; // sambung ujung ke awal supaya loop tidak "klik"
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      data[length - fade + i] = data[length - fade + i] * (1 - k) + data[i] * k;
    }
  }
  return buffer;
}

function makeImpulse(ctx, seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}

function addLfo(ctx, rate, depth, param) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = rate;
  gain.gain.value = depth;
  osc.connect(gain);
  gain.connect(param);
  osc.start();
}

function ensureAudio() {
  if (audioState.ctx) return audioState.ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  const ctx = new AudioCtx();

  const master = ctx.createGain();
  master.gain.value = 0;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -18;
  limiter.knee.value = 6;
  limiter.ratio.value = 16;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  master.connect(limiter);
  limiter.connect(ctx.destination);
  const dry = ctx.createGain();
  dry.gain.value = 0.75;
  dry.connect(master);
  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx, 3.6, 2.6);
  const wet = ctx.createGain();
  wet.gain.value = 0.6;
  reverb.connect(wet);
  wet.connect(master);
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 5000;
  tone.Q.value = 0.4;
  tone.connect(dry);
  tone.connect(reverb);

  // Angin: noise dua pita, digerakkan LFO lambat supaya terasa seperti hembusan
  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx, 3);
  noise.loop = true;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.0225;
  windGain.connect(tone);
  const low = ctx.createBiquadFilter();
  low.type = 'bandpass';
  low.frequency.value = 420;
  low.Q.value = 0.7;
  const air = ctx.createBiquadFilter();
  air.type = 'bandpass';
  air.frequency.value = 1700;
  air.Q.value = 0.45;
  const airGain = ctx.createGain();
  airGain.gain.value = 0.35;
  noise.connect(low);
  low.connect(windGain);
  noise.connect(air);
  air.connect(airGain);
  airGain.connect(windGain);
  addLfo(ctx, 0.06, 220, low.frequency);
  addLfo(ctx, 0.09, 600, air.frequency);
  addLfo(ctx, 0.045, 0.05, windGain.gain);
  noise.start();

  // Drone: akor terbuka D (D - A - D - A - D - E) yang bergerak sangat pelan
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.0175;
  const droneTone = ctx.createBiquadFilter();
  droneTone.type = 'lowpass';
  droneTone.frequency.value = 900;
  droneTone.Q.value = 0.3;
  droneGain.connect(droneTone);
  droneTone.connect(tone);
  [[73.42, 'sine', 0.9, 0], [110, 'triangle', 0.5, -5], [110, 'triangle', 0.5, 6], [146.83, 'sine', 0.55, 0],
   [220, 'sine', 0.3, 3], [293.66, 'sine', 0.14, -4], [329.63, 'sine', 0.07, 0]].forEach(([freq, type, volume, detune], i) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.5;
    osc.connect(gain);
    gain.connect(droneGain);
    addLfo(ctx, 0.03 + i * 0.011, volume * 0.35, gain.gain);
    osc.start();
  });

  Object.assign(audioState, { ctx, master, tone, droneTone, windGain, droneGain });
  return ctx;
}

function updateAudio() {
  const a = audioState;
  if (!a.ctx || !heroSection) return;
  const rect = heroSection.getBoundingClientRect();
  const viewport = window.innerHeight;
  const total = heroSection.offsetHeight - viewport;
  const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
  const leave = Math.min(1, Math.max(0, (viewport - rect.bottom) / viewport)); // 0 = hero penuh, 1 = Aanwijzing penuh

  if (a.sleeping) {
    if (leave > 0.98) return;
    a.sleeping = false;
    window.clearTimeout(a.sleepTimer);
    if (a.on) a.ctx.resume();
  }
  if (a.ctx.state === 'suspended' && !a.on) return;

  const now = a.ctx.currentTime;
  const dt = Math.max(0.016, (performance.now() - a.lastTime) / 1000);
  a.speed += (Math.min(1, (Math.abs(progress - a.lastProgress) / dt) * 6) - a.speed) * 0.35;
  a.lastProgress = progress;
  a.lastTime = performance.now();

  const dusk = scene && scene.classList.contains('is-dusk');
  const framePart = Math.min(1, progress / FRAME_END);
  const intro = 0.5 + 0.5 * Math.min(1, framePart * 5);
  const tail = Math.min(1, Math.max(0, (progress - (FRAME_END - 0.06)) / 0.14));
  const outro = 1 - 0.6 * tail;
  const level = a.on ? 0.16 * intro * outro * Math.pow(1 - leave, 1.5) : 0;

  a.master.gain.setTargetAtTime(level, now, 0.45);
  a.windGain.gain.setTargetAtTime(0.0225 + a.speed * 0.045 + (dusk ? 0.01 : 0), now, 0.5);
  a.droneGain.gain.setTargetAtTime(dusk ? 0.0225 : 0.0175, now, 0.8);
  a.tone.frequency.setTargetAtTime(380 + 4700 * Math.pow(1 - leave, 2) * (dusk ? 0.7 : 1), now, 0.6);

  if (leave > 0.98 && a.on && !a.sleeping) {
    a.sleeping = true;
    a.sleepTimer = window.setTimeout(() => a.ctx.suspend(), 2500);
  }
}

async function setSound(on) {
  const a = audioState;
  a.on = on;
  if (soundToggle) {
    soundToggle.classList.remove('is-hint');
    soundToggle.setAttribute('aria-pressed', String(on));
    soundToggle.setAttribute('aria-label', on ? 'Matikan suara' : 'Nyalakan suara');
    soundToggle.title = on ? 'Matikan suara' : 'Nyalakan suara';
  }
  window.clearTimeout(a.sleepTimer);
  a.sleeping = false;
  if (on) {
    const ctx = ensureAudio();
    if (!ctx) return;
    try { await ctx.resume(); } catch (error) { /* menunggu interaksi berikutnya */ }
    updateAudio();
  } else if (a.ctx) {
    updateAudio();
    a.sleepTimer = window.setTimeout(() => { if (!a.on && a.ctx.state === 'running') a.ctx.suspend(); }, 1800);
  }
}

const soundPrimeEvents = ['click', 'keydown', 'touchend'];
function removeSoundPrime() { soundPrimeEvents.forEach((name) => document.removeEventListener(name, primeSound)); }
function primeSound(event) {
  if (event.target instanceof Element && event.target.closest('.sound-toggle')) return;
  removeSoundPrime();
  if (!audioState.userMuted && !audioState.on) setSound(true);
}

if (soundToggle && heroSection && !videoMode) {
  soundToggle.addEventListener('click', () => {
    const next = !audioState.on;
    audioState.userMuted = !next;
    removeSoundPrime();
    setSound(next);
  });
  soundPrimeEvents.forEach((name) => document.addEventListener(name, primeSound));
  let audioLoopId = 0;
  const audioLoop = () => { if (!scene || !scene.classList.contains('is-offscreen')) updateAudio(); audioLoopId = window.setTimeout(audioLoop, 100); };
  audioLoop();
  document.addEventListener('visibilitychange', () => {
    if (!audioState.ctx) return;
    if (document.hidden) audioState.ctx.suspend();
    else if (audioState.on && !audioState.sleeping) audioState.ctx.resume();
  });
}

updateDocumentList();

function updateFullscreenButton() {
  if (!fullscreenToggle) return;
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenToggle.textContent = isFullscreen ? '⛶' : '⛶';
  fullscreenToggle.setAttribute('aria-label', isFullscreen ? 'Keluar dari layar penuh' : 'Aktifkan layar penuh');
  fullscreenToggle.title = isFullscreen ? 'Keluar dari layar penuh' : 'Layar penuh';
}

if (aanwijzingVideo) {
  const videoCard = aanwijzingVideo.closest('.aanwijzing-video-card') || aanwijzingVideo;
  const pickFsMethod = (el) => el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  const isCardFullscreen = () => [document.fullscreenElement, document.webkitFullscreenElement, document.mozFullScreenElement, document.msFullscreenElement].includes(videoCard);
  const goFullscreen = () => {
    if (isCardFullscreen()) return;
    const method = pickFsMethod(videoCard);
    if (method) {
      const result = method.call(videoCard);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } else if (aanwijzingVideo.webkitEnterFullscreen) {
      // Safari/iOS: hanya video (bukan pembungkusnya) yang bisa fullscreen, dan tidak mengembalikan Promise.
      try { aanwijzingVideo.webkitEnterFullscreen(); } catch (error) { /* diabaikan: browser menolak di luar gesture pengguna */ }
    }
  };
  const exitFullscreen = () => {
    const exitMethod = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (isCardFullscreen() && exitMethod) {
      const result = exitMethod.call(document);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } else if (aanwijzingVideo.webkitDisplayingFullscreen && aanwijzingVideo.webkitExitFullscreen) {
      aanwijzingVideo.webkitExitFullscreen();
    }
  };
  // Klik langsung pada kontrol play bawaan browser paling bisa diandalkan membawa izin gesture untuk
  // fullscreen; event 'play' dipasang juga sebagai cadangan (mis. video dimulai lewat keyboard).
  aanwijzingVideo.addEventListener('click', () => { if (aanwijzingVideo.paused) goFullscreen(); });
  aanwijzingVideo.addEventListener('play', goFullscreen);
  aanwijzingVideo.addEventListener('ended', exitFullscreen);
  aanwijzingVideo.addEventListener('pause', () => { if (!aanwijzingVideo.ended) exitFullscreen(); });
  aanwijzingVideo.addEventListener('webkitendfullscreen', () => { if (!aanwijzingVideo.ended) aanwijzingVideo.pause(); });
}

if (fullscreenToggle) {
  fullscreenToggle.addEventListener('click', async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
    updateFullscreenButton();
  });
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  updateFullscreenButton();
}





// ===== Bacaan per sub bab (klik nama dokumen -> pilih sub bab -> dibacakan suara perempuan) =====
(() => {
  const DATA = window.SPEECH_DATA || {};
  const synth = window.speechSynthesis;
  const topline = documentName ? documentName.closest('.document-topline') : null;
  if (!synth || !topline || !window.SpeechSynthesisUtterance) return;

  const RATES = [0.75, 1, 1.25];
  let rate = 1;
  let token = 0;                  // penanda sesi bicara; sesi lama diabaikan
  let cur = { file: null, sec: -1, idx: 0, paused: false, speaking: false };
  let voice = null;
  const TITLES = {
    'kak.pdf': 'Rencana Kerja dan Syarat-Syarat Teknis (RKST). Pengadaan Jasa Penyediaan Peralatan Fasilitas Keamanan Penerbangan di Lingkungan PT Integrasi Aviasi Solusi.',
    'ikp.pdf': 'Instruksi Kepada Peserta (IKP). Pengadaan Barang dan atau Jasa di PT Integrasi Aviasi Solusi.'
  };
  const lastPage = {};            // halaman PDF terakhir yang dibuka, supaya tidak memuat ulang percuma

  // ---- pengucapan: singkatan & istilah supaya terdengar wajar dalam bahasa Indonesia ----
  const PRON = [
    [/Rp\s?16\.463\.520\.000/g, 'enam belas miliar empat ratus enam puluh tiga juta lima ratus dua puluh ribu rupiah'],
    [/https:\/\/vendor\.ias\.id/g, 'vendor titik iyas titik i di'],
    [/IAS\.0125-A\/PER\.DIR\.17\.01\/2024/g, 'iyas nol satu dua lima A, per dir, tujuh belas nol satu, tahun 2024'],
    [/\bIAS\b/g, 'iyas'],
    [/aanwijzing/gi, 'anwaizing'],
    [/\bsinar-X\b/gi, 'sinar eks'],
    [/\bX-?Ray\b/gi, 'eks rei'],
    [/\b(\d+)\s?x\s?(\d+)\b/g, '$1 kali $2'],
    [/(\d{1,2}):00/g, '$1'],
    [/(\d+)\s?%/g, '$1 persen'],
    [/\bRp\b/g, 'rupiah'],
    [/\bOpex\b/g, 'opeks'],
    [/&/g, ' dan '],
    [/\b([A-Z]{1,2})-(\d)\b/g, '$1 $2'],
    [/\b(?=[A-Z0-9]*[A-Z])[A-Z][A-Z0-9]{1,5}\b/g, (m) => ({ KAK: 'kak', TOR: 'tor', WIB: 'wib', UPS: 'u pe es' }[m] || m.split('').join(' '))],
    [/\s*\/\s*/g, ' atau ']
  ];
  const pronounce = (t) => PRON.reduce((s, [re, to]) => s.replace(re, to), t);

  // ---- judul sub bab dibacakan lengkap dengan nomornya, mis. "Bab satu. Pendahuluan." ----
  const NUM = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas'];
  const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15 };
  function spokenTitle(t) {
    const m = t.match(/^([A-Z]+)(?:\.(\d)([a-f])?)?\.?\s+(.*)$/);
    if (!m) return t + '.';
    const [, code, sub, letter, name] = m;
    let lead = ROMAN[code] ? 'Bab ' + NUM[ROMAN[code]] : 'Bagian ' + code.toLowerCase();
    if (sub) lead += ', butir ' + NUM[Number(sub)] + (letter ? ' ' + letter : '');
    return lead + '. ' + name + '.';
  }
  function partsFor(secIdx) {
    const s = DATA[cur.file][secIdx];
    const parts = [spokenTitle(s.t), ...s.c.slice(1)];          // potongan pertama di data = judul tanpa nomor
    if (secIdx === 0 && TITLES[cur.file]) parts.unshift(TITLES[cur.file]); // judul di sampul dokumen dibaca dulu
    return parts;
  }
  // sub bab pertama dimulai dari sampul (halaman 1) supaya judul dokumen terlihat, lalu pindah ke halaman isinya
  const entryPage = (file, i) => (i === 0 ? 1 : DATA[file][i].p);

  // ---- suara: perempuan Indonesia yang natural (Edge: Gadis Natural, Chrome: Google Bahasa Indonesia) ----
  function pickVoice() {
    const id = synth.getVoices().filter((v) => /^id([-_]|$)/i.test(v.lang));
    const notMale = (v) => !/ardi|andika|rizki/i.test(v.name);
    voice = id.find((v) => /gadis/i.test(v.name)) || id.find((v) => /natural/i.test(v.name) && notMale(v)) ||
      id.find((v) => /google/i.test(v.name)) || id.find(notMale) || id[0] || null;
  }
  pickVoice();
  synth.addEventListener('voiceschanged', pickVoice);

  // ---- pemutar: semua potongan sub bab diantrekan sekaligus -> tidak ada jeda tunggu antar kalimat ----
  function speakFrom(i) {
    token++; const tok = token;
    synth.cancel(); cur.idx = i; cur.paused = false; cur.speaking = true;
    const parts = partsFor(cur.sec);
    setTimeout(() => {
      if (tok !== token) return;
      const last = parts.length - 1;
      for (let k = i; k <= last; k++) {
        const u = new SpeechSynthesisUtterance(pronounce(parts[k]));
        u.lang = 'id-ID'; u.rate = rate; u.pitch = 1.05;
        if (voice) u.voice = voice;
        u.onstart = () => {
          if (tok !== token) return;
          cur.idx = k;
          if (cur.sec === 0 && TITLES[cur.file] && k === 1) jumpToPage(cur.file, DATA[cur.file][0].p);  // judul selesai -> ke halaman isi
        };
        if (k === last) {
          u.onend = () => { if (tok === token) nextSection(); };
          u.onerror = (e) => { if (tok === token && e.error !== 'canceled' && e.error !== 'interrupted') nextSection(); };
        }
        synth.speak(u);
      }
    }, 60);
    render();
  }
  function nextSection() {
    const total = DATA[cur.file].length;
    if (cur.sec + 1 >= total) { cur.speaking = false; cur.paused = false; render(); return; }  // dokumen selesai
    cur.sec++; jumpToPage(cur.file, entryPage(cur.file, cur.sec)); speakFrom(0); scrollActive();
  }
  function stopSpeech() {
    token++; synth.cancel();
    cur = { file: cur.file, sec: -1, idx: 0, paused: false, speaking: false }; render();
  }
  function pauseSpeech() { token++; synth.cancel(); cur.paused = true; cur.speaking = false; render(); }
  function resumeSpeech() { speakFrom(cur.idx); }

  function jumpToPage(file, page) {
    const frame = documentFrames.get(file);
    if (!frame || (lastPage[file] || 1) === page) return;     // halaman sama: tidak perlu memuat ulang PDF
    lastPage[file] = page;
    frame.src = `${encodeURI(file)}#page=${page}&view=FitH`;
  }
  function choose(i) {
    const file = cur.file;
    if (cur.sec === i && (cur.speaking || cur.paused)) { cur.paused ? resumeSpeech() : pauseSpeech(); return; }
    cur.sec = i; speakFrom(0); jumpToPage(file, entryPage(file, i));
  }

  // ---- tampilan: nama dokumen jadi tombol, kotak tipis transparan berisi daftar sub bab ----
  const pop = document.createElement('div');
  pop.className = 'speech-pop'; pop.hidden = true;
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Dengarkan per sub bab');
  pop.innerHTML = '<div class="speech-pop__head"><span>Dengarkan per sub bab</span><span class="speech-pop__ctrl"><button type="button" data-act="toggle" aria-label="Jeda atau lanjut">&#10074;&#10074;</button><button type="button" data-act="stop" aria-label="Hentikan">&#9632;</button></span></div><ul class="speech-list"></ul><div class="speech-pop__foot"><span>Kecepatan</span><span class="speech-rates"></span></div>';
  topline.appendChild(pop);
  const list = pop.querySelector('.speech-list'), ratesBox = pop.querySelector('.speech-rates');
  const toggleBtn = pop.querySelector('[data-act="toggle"]'), stopBtn = pop.querySelector('[data-act="stop"]');
  RATES.forEach((r) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.rate = r; b.textContent = `${r}×`; ratesBox.appendChild(b);
  });

  function render() {
    const busy = cur.speaking || cur.paused;
    list.querySelectorAll('button').forEach((b, i) => {
      const on = cur.sec === i && busy;
      b.classList.toggle('is-active', on);
      b.querySelector('.speech-state').textContent = on ? (cur.paused ? '▶' : '♪') : '';
    });
    ratesBox.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.rate) === rate));
    toggleBtn.innerHTML = cur.paused ? '&#9654;' : '&#10074;&#10074;';
    toggleBtn.disabled = stopBtn.disabled = !busy;
  }
  function scrollActive() {
    const a = list.querySelector('.is-active');
    if (a && !pop.hidden) a.scrollIntoView({ block: 'nearest' });
  }

  function buildList() {
    list.innerHTML = '';
    (DATA[cur.file] || []).forEach((s, i) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.dataset.i = i;
      b.innerHTML = '<span class="speech-page">h.' + s.p + '</span><span class="speech-title"></span><span class="speech-state"></span>';
      b.querySelector('.speech-title').textContent = s.t;
      li.appendChild(b); list.appendChild(li);
    });
    render();
  }

  function setOpen(open) {
    pop.hidden = !open; documentName.setAttribute('aria-expanded', String(open));
    if (open) scrollActive();
  }

  function syncDocument() {
    const item = visibleDocuments[activeDocument];
    const has = !!(item && DATA[item.file]);
    if (cur.speaking || cur.paused) stopSpeech();
    cur.file = has ? item.file : null;
    documentName.classList.toggle('speech-trigger', has);
    if (has) {
      documentName.setAttribute('role', 'button'); documentName.tabIndex = 0;
      documentName.setAttribute('aria-expanded', 'false'); documentName.title = 'Klik untuk memilih sub bab yang dibacakan';
      buildList();
    } else {
      documentName.removeAttribute('role'); documentName.removeAttribute('tabindex'); documentName.removeAttribute('aria-expanded'); documentName.removeAttribute('title');
    }
    setOpen(false);
  }

  documentName.addEventListener('click', () => { if (cur.file) setOpen(pop.hidden); });
  documentName.addEventListener('keydown', (e) => { if (cur.file && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(pop.hidden); } });
  list.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) choose(Number(b.dataset.i)); });
  pop.addEventListener('click', (e) => {
    const r = e.target.closest('button[data-rate]'), a = e.target.closest('button[data-act]');
    if (r) { rate = Number(r.dataset.rate); if (cur.speaking) speakFrom(cur.idx); else render(); }
    if (a && a.dataset.act === 'stop') stopSpeech();
    if (a && a.dataset.act === 'toggle') { cur.paused ? resumeSpeech() : (cur.speaking && pauseSpeech()); }
  });
  document.addEventListener('click', (e) => { if (!pop.hidden && !pop.contains(e.target) && !documentName.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  window.addEventListener('pagehide', () => synth.cancel());
  if (aanwijzingVideo) aanwijzingVideo.addEventListener('play', () => { if (cur.speaking || cur.paused) stopSpeech(); });

  // ganti dokumen di carousel -> hentikan bacaan & perbarui daftar sub bab
  const baseRender = renderDocument;
  renderDocument = function (...args) { const r = baseRender.apply(this, args); syncDocument(); return r; };
  syncDocument();
})();

// ===== Kinerja: awan di bagian yang sedang tidak terlihat dihentikan animasinya =====
(() => {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting)), { rootMargin: '80px' });
  document.querySelectorAll('.aanwijzing-section, .documents-section, .feedback-stage').forEach((el) => io.observe(el));
})();

// ===== Opening berbasis video (video-klik / video-auto) =====
(() => {
  if (!videoMode || !scene || !heroSection) return;
  const auto = OPENING.includes('auto');
  const file = (document.body.dataset.video || 'opening.mp4').trim();
  const make = (tag, cls, text) => { const el = document.createElement(tag); el.className = cls; if (text) el.textContent = text; return el; };

  const video = make('video', 'hero-video');
  video.src = encodeURI(file);
  video.poster = encodeURI('selamat datang.png');
  video.playsInline = true; video.preload = 'auto';
  video.setAttribute('aria-label', 'Video pembuka');
  scene.insertBefore(video, scene.querySelector('.frame-canvas'));

  // tombol suara kecil hanya ada di mode video-auto (video mulai tanpa suara); di video-klik tidak ada tombol apa pun
  let muteBtn = null;
  if (auto) {
    muteBtn = make('button', 'video-unmute', '🔊'); muteBtn.type = 'button'; muteBtn.hidden = true;
    muteBtn.setAttribute('aria-label', 'Nyalakan suara video'); muteBtn.title = 'Nyalakan suara video';
    muteBtn.addEventListener('click', () => { video.muted = false; muteBtn.hidden = true; });
    scene.append(muteBtn);
  }

  // selama video belum selesai, halaman dikunci supaya tidak ter-scroll melewati opening
  const lock = (on) => { document.documentElement.classList.toggle('opening-lock', on); document.body.classList.toggle('opening-lock', on); };
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0); lock(true);

  let started = false, finished = false;
  function finish() {
    if (finished) return;
    finished = true; videoEnded = true; lock(false);
    if (muteBtn) muteBtn.hidden = true;
    if (heroContent) heroContent.style.opacity = '0';
    scene.classList.add('is-end');                 // awan penutup + pilihan tampilan muncul
    updateDusk();
  }
  video.addEventListener('ended', finish);
  video.addEventListener('error', () => { console.warn(`Video opening "${file}" tidak ditemukan / tidak bisa diputar`); finish(); });
  video.addEventListener('playing', () => {
    if (heroContent) { heroContent.style.transition = 'opacity .8s ease'; heroContent.style.opacity = '0'; }
    if (muteBtn) muteBtn.hidden = !video.muted;
  });
  video.addEventListener('volumechange', () => { if (muteBtn) muteBtn.hidden = finished || video.paused || !video.muted; });

  // video-klik: menunggu klik/ketuk/Enter pertama. Klik tombol layar penuh dan tombol F11/Esc TIDAK memulai video.
  const events = ['click', 'touchend', 'keydown'], KEYS = ['Enter', ' ', 'ArrowDown', 'PageDown'];
  function arm() { started = false; events.forEach((n) => document.addEventListener(n, go, { passive: true })); }
  function go(e) {
    if (started) return;
    if (e.target instanceof Element && e.target.closest('.fullscreen-toggle')) return;
    if (e.type === 'keydown' && !KEYS.includes(e.key)) return;
    started = true; events.forEach((n) => document.removeEventListener(n, go));
    play(true);
  }
  function play(withSound) {
    video.muted = !withSound;
    const p = video.play();
    if (p && p.catch) p.catch(() => {
      if (withSound) { video.muted = true; video.play().catch(arm); } else arm();   // diblokir: tunggu klik berikutnya
    });
  }
  if (auto) play(false); else arm();
})();

// ===== Video Aanwijzing: kalau file tidak ketemu, tampilkan pesan (bukan layar hitam kosong) =====
(() => {
  if (!aanwijzingVideo) return;
  const src = aanwijzingVideo.querySelector('source'), card = aanwijzingVideo.closest('.aanwijzing-video-card');
  if (!src || !card) return;
  src.addEventListener('error', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (card.querySelector('.video-missing')) return;
    const m = document.createElement('div'); m.className = 'video-missing';
    m.textContent = `Video tidak ditemukan: ${src.getAttribute('src')}. Pastikan file ada di folder yang sama dengan index.html dan namanya sama persis, termasuk huruf besar/kecil.`;
    card.appendChild(m);
  });
})();
