(function initGeoStreakAudio() {
  const basePath = globalThis.location.pathname.includes('/pages/') ? '../sounds/' : 'sounds/';
  const SFX_MUTE_STORAGE_KEY = 'geostreak-muted';
  const MUSIC_MUTE_STORAGE_KEY = 'geostreak-music-muted';
  const MUSIC_TIME_STORAGE_KEY = 'geostreak-music-time';
  const audioFiles = {
    success: basePath + 'success.m4a',
    error: basePath + 'error.mp3',
    click: basePath + 'click.mp3',
    music: basePath + 'music.mp3'
  };

  const cache = new Map();
  let isSfxMuted = localStorage.getItem(SFX_MUTE_STORAGE_KEY) === '1';
  let isMusicMuted = localStorage.getItem(MUSIC_MUTE_STORAGE_KEY) === '1';
  let backgroundMusic = null;
  let musicRetryArmed = false;
  let lastUiSoundAt = 0;
  let hasRestoredMusicTime = false;
  let lastPointerSoundAt = 0;

  function getSavedMusicTime() {
    const raw = sessionStorage.getItem(MUSIC_TIME_STORAGE_KEY);
    const parsed = Number.parseFloat(raw || '0');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function saveMusicTime() {
    if (!backgroundMusic) return;
    if (!Number.isFinite(backgroundMusic.currentTime)) return;
    sessionStorage.setItem(MUSIC_TIME_STORAGE_KEY, String(backgroundMusic.currentTime));
  }

  function restoreMusicTimeIfNeeded() {
    if (hasRestoredMusicTime) return;
    const music = getBackgroundMusic();
    const savedTime = getSavedMusicTime();
    hasRestoredMusicTime = true;
    if (!savedTime) return;

    const applySavedTime = () => {
      try {
        if (!Number.isFinite(savedTime) || savedTime <= 0) return;
        if (Number.isFinite(music.duration) && music.duration > 0) {
          music.currentTime = Math.min(savedTime, Math.max(music.duration - 0.1, 0));
        } else {
          music.currentTime = savedTime;
        }
      } catch (error) {
        console.warn('Could not restore music time, resetting position:', error);
        sessionStorage.removeItem(MUSIC_TIME_STORAGE_KEY);
      }
    };

    if (music.readyState >= 1) {
      applySavedTime();
      return;
    }

    music.addEventListener('loadedmetadata', applySavedTime, { once: true });
  }

  function updateSoundToggleButtons() {
    const buttons = document.querySelectorAll('.sound-toggle-btn');
    buttons.forEach((btn) => {
      btn.textContent = isSfxMuted ? '🔇' : '🔊';
      const label = isSfxMuted ? 'Unmute sound' : 'Mute sound';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.classList.toggle('active', !isSfxMuted);
      btn.classList.toggle('muted', isSfxMuted);
    });
  }

  function updateMusicToggleButtons() {
    const buttons = document.querySelectorAll('.music-toggle-btn');
    buttons.forEach((btn) => {
      btn.textContent = isMusicMuted ? '⏸' : '🎵';
      const label = isMusicMuted ? 'Unmute music' : 'Mute music';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.classList.toggle('active', !isMusicMuted);
      btn.classList.toggle('muted', isMusicMuted);
    });
  }

  function setSfxMuted(value) {
    isSfxMuted = Boolean(value);
    localStorage.setItem(SFX_MUTE_STORAGE_KEY, isSfxMuted ? '1' : '0');
    updateSoundToggleButtons();
  }

  function toggleSfxMuted() {
    setSfxMuted(!isSfxMuted);
  }

  function getBackgroundMusic() {
    if (backgroundMusic) return backgroundMusic;
    backgroundMusic = new Audio(audioFiles.music);
    backgroundMusic.preload = 'auto';
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.2;
    backgroundMusic.addEventListener('timeupdate', saveMusicTime);
    return backgroundMusic;
  }

  function armMusicRetryOnInteraction() {
    if (musicRetryArmed) return;
    musicRetryArmed = true;

    const retry = () => {
      musicRetryArmed = false;
      startBackgroundMusic();
    };

    ['pointerdown', 'click', 'touchstart', 'keydown'].forEach((eventName) => {
      document.addEventListener(eventName, retry, { once: true, passive: true });
    });
  }

  function startBackgroundMusic() {
    if (isMusicMuted) return;
    const music = getBackgroundMusic();
    if (!hasRestoredMusicTime) {
      restoreMusicTimeIfNeeded();
    }
    if (!music.paused && !music.ended) return;
    music.muted = false;
    music.play().catch(() => {
      // Some browsers allow muted autoplay when normal autoplay is blocked.
      music.muted = true;
      music.play().then(() => {
        music.muted = false;
      }).catch(() => {
        armMusicRetryOnInteraction();
      });
    });
  }

  function stopBackgroundMusic() {
    const music = getBackgroundMusic();
    music.pause();
  }

  function setMusicMuted(value) {
    isMusicMuted = Boolean(value);
    localStorage.setItem(MUSIC_MUTE_STORAGE_KEY, isMusicMuted ? '1' : '0');
    updateMusicToggleButtons();

    if (isMusicMuted) {
      stopBackgroundMusic();
    } else {
      startBackgroundMusic();
    }
  }

  function toggleMusicMuted() {
    setMusicMuted(!isMusicMuted);
  }

  function getCachedAudio(key) {
    if (cache.has(key)) return cache.get(key);
    const src = audioFiles[key];
    if (!src) return null;

    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = 0.55;
    cache.set(key, audio);
    return audio;
  }

  function playNamedAudio(key) {
    if (isSfxMuted) return;

    const base = getCachedAudio(key);
    if (!base) return;

    const instance = base.cloneNode(true);
    instance.volume = key === 'error' ? 0.5 : 0.55;
    instance.play().catch(() => {
      // Ignore autoplay or missing-file errors silently.
    });
  }

  function playUiClickSound() {
    if (isSfxMuted) return;

    const base = getCachedAudio('click');
    if (!base) return;

    const instance = base.cloneNode(true);
    instance.volume = 0.28;
    instance.play().catch(() => {
      // Ignore autoplay or missing-file errors silently.
    });
  }

  function attachUiClickHandlers() {
    const maybeUnlockMusic = () => {
      if (!isMusicMuted && (!backgroundMusic || backgroundMusic.paused)) {
        startBackgroundMusic();
      }
    };

    const handleInteraction = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      maybeUnlockMusic();

      const internalLink = target.closest('a[href]');
      const href = internalLink?.getAttribute('href');
      if (href && !href.startsWith('http')) {
        saveMusicTime();
      }

      const clickable = target.closest('button, summary, .game-tab, .mode-card, .quiz-answer-btn, .titre_header, .lang-btn, .logo-text, .navbar a');
      if (!clickable) return;

      const now = Date.now();
      if (now - lastUiSoundAt < 110) return;
      lastUiSoundAt = now;
      playUiClickSound();
    };

    const handleClick = (event) => {
      // Pointer clicks already handled by pointerdown; keep click for keyboard activation only.
      if (event.detail > 0) return;
      handleInteraction(event);
    };

    const handlePointerDown = (event) => {
      const now = Date.now();
      if (now - lastPointerSoundAt < 85) return;
      lastPointerSoundAt = now;
      handleInteraction(event);
    };

    // Use pointerdown so navbar link sounds can be heard before navigation unloads the page.
    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('click', handleClick);
  }

  function attachSoundToggleHandlers() {
    document.querySelectorAll('.sound-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        toggleSfxMuted();
      });
    });
    updateSoundToggleButtons();
  }

  function attachMusicToggleHandlers() {
    document.querySelectorAll('.music-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        toggleMusicMuted();
      });
    });
    updateMusicToggleButtons();
  }

  globalThis.playSuccessSound = () => playNamedAudio('success');
  globalThis.playErrorSound = () => playNamedAudio('error');
  globalThis.playUiClickSound = playUiClickSound;
  globalThis.toggleAudioMute = toggleSfxMuted;
  globalThis.isAudioMuted = () => isSfxMuted;
  globalThis.toggleMusicMute = toggleMusicMuted;
  globalThis.isMusicMuted = () => isMusicMuted;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveMusicTime();
    }
  });

  globalThis.addEventListener('pagehide', saveMusicTime);
  globalThis.addEventListener('beforeunload', saveMusicTime);
  globalThis.addEventListener('pageshow', startBackgroundMusic);
  globalThis.addEventListener('focus', startBackgroundMusic);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachUiClickHandlers, { once: true });
    document.addEventListener('DOMContentLoaded', attachSoundToggleHandlers, { once: true });
    document.addEventListener('DOMContentLoaded', attachMusicToggleHandlers, { once: true });
    document.addEventListener('DOMContentLoaded', restoreMusicTimeIfNeeded, { once: true });
    document.addEventListener('DOMContentLoaded', startBackgroundMusic, { once: true });
  } else {
    attachUiClickHandlers();
    attachSoundToggleHandlers();
    attachMusicToggleHandlers();
    restoreMusicTimeIfNeeded();
    startBackgroundMusic();
  }
})();
