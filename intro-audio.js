(() => {
  const documentName = document.querySelector('.document-meta h3');
  const button = document.querySelector('.document-intro-audio__toggle');
  const player = document.querySelector('.document-intro-audio__player');
  const status = document.querySelector('.document-intro-audio__status');
  if (!documentName || !button || !player || !status) return;

  const introductions = {
    'Kerangka Acuan Kerja (KAK)': {
      file: 'Pengantar_KAK_Natural.mp3',
      name: 'KAK'
    },
    'Instruksi Kepada Peserta (IKP)': {
      file: 'Pengantar_IKP_Natural.mp3',
      name: 'IKP'
    }
  };
  let activeIntroduction = null;

  function updateButton() {
    const playing = !!activeIntroduction && !player.paused && !player.ended;
    button.textContent = playing ? '❚❚' : '▶';
    button.setAttribute('aria-label', `${playing ? 'Jeda' : 'Putar'} audio pengantar${activeIntroduction ? ` ${activeIntroduction.name}` : ''}`);
    button.title = button.getAttribute('aria-label');
  }

  function updateButtonVisibility() {
    button.hidden = !activeIntroduction;
    updateButton();
  }

  function syncIntroduction() {
    const introduction = introductions[documentName.textContent.trim()] || null;
    if (activeIntroduction?.file !== introduction?.file) {
      player.pause();
      status.textContent = '';
      activeIntroduction = introduction;
      if (introduction) player.src = introduction.file;
      else player.removeAttribute('src');
      player.load();
    }
    updateButtonVisibility();
  }

  button.addEventListener('click', async () => {
    if (!activeIntroduction) return;
    status.textContent = '';
    if (!player.paused && !player.ended) {
      player.pause();
      return;
    }
    if (player.ended) player.currentTime = 0;
    try {
      await player.play();
    } catch {
      status.textContent = `Audio pengantar ${activeIntroduction.name} tidak dapat diputar. Periksa koneksi, lalu coba lagi.`;
      updateButton();
    }
  });
  player.addEventListener('play', updateButton);
  player.addEventListener('pause', updateButton);
  player.addEventListener('ended', updateButton);
  player.addEventListener('error', () => {
    if (!activeIntroduction) return;
    status.textContent = `Audio pengantar ${activeIntroduction.name} gagal dimuat. Periksa koneksi, lalu coba lagi.`;
  });

  new MutationObserver(syncIntroduction).observe(documentName, {
    childList: true,
    characterData: true,
    subtree: true
  });
  syncIntroduction();
})();
