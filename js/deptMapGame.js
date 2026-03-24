/* global scoreDeptMapGame */

const deptMapState = {
  paths: [],
  clickHandler: null,
  pendingTimer: null,
  svgLoaded: false,
  shouldResetScoreOnStart: false
};

function normalizeDeptId(id) {
  return String(id || '').trim().toUpperCase();
}

function getDeptMapPool() {
  const zoneDeptEl = document.getElementById('zoneDeptMap');
  const selectedRegion = zoneDeptEl ? (zoneDeptEl.dataset.region || 'all') : 'all';
  return selectedRegion === 'all'
    ? departements
    : departements.filter(d => d.region === selectedRegion);
}

function clearDeptMapListeners() {
  if (deptMapState.paths.length > 0 && deptMapState.clickHandler) {
    deptMapState.paths.forEach(path => {
      path.removeEventListener('click', deptMapState.clickHandler);
      path.removeEventListener('touchend', deptMapState.clickHandler);
    });
  }
  deptMapState.paths = [];
  deptMapState.clickHandler = null;
}

function clearDeptMapTimer() {
  if (deptMapState.pendingTimer) {
    clearTimeout(deptMapState.pendingTimer);
    deptMapState.pendingTimer = null;
  }
}

async function ensureDeptMapSvgLoaded() {
  const mapHost = document.getElementById('dept-map-host');
  const mapObject = document.getElementById('dept-map-object');
  if (!mapHost) throw new Error('Department map host not found');
  if (!mapObject) throw new Error('Department map object not found');

  const expectedPath = globalThis.location.pathname.includes('/pages/')
    ? '../img/map_FR_dep.svg'
    : 'img/map_FR_dep.svg';
  if (mapObject.getAttribute('data') !== expectedPath) {
    mapObject.setAttribute('data', expectedPath);
    deptMapState.svgLoaded = false;
    mapHost.innerHTML = '';
  }

  if (!deptMapState.svgLoaded) {
    let loadedSvg = null;

    const tryLoadBundledSvg = () => {
      const bundled = globalThis.__geoSvgMapFrDep;
      if (typeof bundled !== 'string' || !bundled.trim()) {
        return null;
      }
      const parsed = new DOMParser().parseFromString(bundled, 'image/svg+xml');
      const parsedSvg = parsed.querySelector('svg');
      return parsedSvg || null;
    };

    const tryLoadSvgWithXhr = () => new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', expectedPath, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        const ok = xhr.status === 200 || xhr.status === 0;
        if (!ok || !xhr.responseText) {
          reject(new Error('XHR could not load department SVG'));
          return;
        }
        const parsed = new DOMParser().parseFromString(xhr.responseText, 'image/svg+xml');
        const parsedSvg = parsed.querySelector('svg');
        if (!parsedSvg) {
          reject(new Error('XHR loaded SVG text but parsing failed'));
          return;
        }
        resolve(parsedSvg);
      };
      xhr.onerror = () => reject(new Error('XHR error while loading department SVG'));
      xhr.send();
    });

    // 0) Fastest offline fallback: use bundled SVG string when available.
    loadedSvg = tryLoadBundledSvg();
    if (loadedSvg) {
      mapHost.innerHTML = '';
      mapHost.appendChild(loadedSvg);
    }

    // 1) Preferred runtime path: fetch SVG and parse in XML mode.
    try {
      if (!loadedSvg) {
        const response = await fetch(expectedPath, { cache: 'no-store' });
        if (response.ok) {
          const svgText = await response.text();
          const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
          const parsedSvg = parsed.querySelector('svg');
          if (parsedSvg) {
            loadedSvg = parsedSvg;
            mapHost.innerHTML = '';
            mapHost.appendChild(loadedSvg);
          }
        }
      }
    } catch (error) {
      console.warn('deptMapGame fetch loader failed, falling back to object loader:', error);
    }

    // 1.5) Fallback for local environments where fetch is blocked but XHR still works.
    if (!loadedSvg) {
      try {
        loadedSvg = await tryLoadSvgWithXhr();
        mapHost.innerHTML = '';
        mapHost.appendChild(loadedSvg);
      } catch (error) {
        console.warn('deptMapGame XHR loader failed, falling back to object loader:', error);
      }
    }

    // 2) Fallback for restrictive environments: use <object> contentDocument.
    if (!loadedSvg) {
      const getSvgFromObject = () => {
        try {
          return mapObject.contentDocument ? mapObject.contentDocument.querySelector('svg') : null;
        } catch {
          return null;
        }
      };
      const waitForObjectSvg = (timeoutMs = 8000, intervalMs = 120) => new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
          const found = getSvgFromObject();
          if (found) {
            resolve(found);
            return;
          }
          if (Date.now() - start >= timeoutMs) {
            reject(new Error('Timed out while waiting for department SVG object content'));
            return;
          }
          setTimeout(tick, intervalMs);
        };
        tick();
      });
      let sourceSvg = getSvgFromObject();

      if (!sourceSvg) {
        sourceSvg = await new Promise((resolve, reject) => {
          const onLoad = () => {
            mapObject.removeEventListener('load', onLoad);
            waitForObjectSvg(2500, 80).then(resolve).catch(() => {
              reject(new Error('Department SVG did not load from object'));
            });
          };

          mapObject.addEventListener('load', onLoad, { once: true });

          // Force a reload in case the object had previously failed silently.
          const currentData = mapObject.getAttribute('data');
          if (currentData) {
            mapObject.setAttribute('data', '');
            setTimeout(() => {
              mapObject.setAttribute('data', currentData);
            }, 0);
          }

          setTimeout(() => {
            mapObject.removeEventListener('load', onLoad);
            reject(new Error('Timed out while loading department SVG'));
          }, 8000);
        });
      }

      if (!sourceSvg) {
        sourceSvg = await waitForObjectSvg(3000, 100);
      }

      loadedSvg = sourceSvg.cloneNode(true);
      mapHost.innerHTML = '';
      mapHost.appendChild(loadedSvg);
    }

    // Final guard: bundled data may be loaded late; retry once before failing.
    if (!loadedSvg) {
      loadedSvg = tryLoadBundledSvg();
      if (loadedSvg) {
        mapHost.innerHTML = '';
        mapHost.appendChild(loadedSvg);
      }
    }

    if (!loadedSvg) throw new Error('Unable to obtain department SVG from any source');

    deptMapState.svgLoaded = true;

    const svg = mapHost.querySelector('svg');
    if (!svg) throw new Error('Department SVG clone is invalid');

    svg.setAttribute('width', '90%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }

  const svg = mapHost.querySelector('svg');
  if (!svg) throw new Error('Department SVG not found');
  return svg;
}

function setDeptMapControlsVisible(visible) {
  setControlVisibility('bordersDeptMap', visible, 'block');
  setControlVisibility('modeDeptMapGame', visible, 'block');
  setControlVisibility('zoneDeptMapGame', visible, 'block');
}

function resetDeptMapUiForRetry() {
  const playButton = document.getElementById('playButtonDeptMap');
  if (playButton) {
    setControlVisibility('playButtonDeptMap', true, 'flex');
    playButton.textContent = texts.buttons?.play || 'Jouer';
  }

  setDeptMapControlsVisible(true);
  setSectionControlLabelsVisible('deptMapGame', true);
  const questionInline = document.getElementById('deptMapQuestion');
  const scoreInline = document.getElementById('scoreDeptMapGame');
  if (questionInline) questionInline.style.display = 'block';
  if (scoreInline) {
    scoreInline.style.display = 'block';
    scoreInline.textContent = (texts.score || 'Score') + ' : 0';
  }
  const questionBar = document.getElementById('dept-map-question-bar');
  const mapContainer = document.getElementById('dept-svg-container');
  if (questionBar) questionBar.style.display = 'none';
  if (mapContainer) mapContainer.style.display = 'none';
}

function applyDefaultDeptMapStyle(paths) {
  const isEasy = document.getElementById('bordersDeptMap')?.classList.contains('easy') ?? true;
  paths.forEach(path => {
    path.style.fill = 'rgba(100,130,165, .35)';
    path.style.stroke = isEasy ? '#000000' : 'transparent';
    path.style.strokeWidth = isEasy ? '0.6px' : '0';
    path.style.cursor = 'crosshair';
    path.style.transition = '.2s ease';

    if (isEasy) {
      path.onmouseenter = () => {
        path.style.fill = 'rgba(120,155,195, .55)';
      };
      path.onmouseleave = () => {
        path.style.fill = 'rgba(100,130,165, .35)';
      };
    } else {
      path.onmouseenter = null;
      path.onmouseleave = null;
    }
  });
}

function getDeptMapClickableElements(svg) {
  const directShapes = Array.from(svg.querySelectorAll('path[id], polygon[id], polyline[id], rect[id], circle[id], ellipse[id]'));
  if (directShapes.length > 0) return directShapes;

  // Fallback for uncommon SVG exports where departments are not represented as paths.
  return Array.from(svg.querySelectorAll('[id]')).filter(el => typeof el.getBBox === 'function');
}

function getDeptNameSafe(id) {
  const normalizedId = normalizeDeptId(id);
  const entry = departements.find(dep => normalizeDeptId(dep.id) === normalizedId);
  const name = entry ? entry.nom : normalizedId;
  return sanitizeSvgTitle(name) || normalizedId;
}

function sanitizeSvgTitle(value) {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return '';
  return text;
}

function endDeptMapGame(clickedPath, correctPath) {
  if (typeof playErrorSound === 'function') playErrorSound();

  if (clickedPath) {
    clickedPath.style.fill = '#dc2626';
    clickedPath.style.stroke = '#7f1d1d';
    clickedPath.style.strokeWidth = '0.8px';
  }

  if (correctPath) {
    correctPath.style.fill = '#16a34a';
    correctPath.style.stroke = '#14532d';
    correctPath.style.strokeWidth = '1.2px';
  }

  const clickedId = normalizeDeptId(clickedPath?.getAttribute('id'));
  const correctId = normalizeDeptId(correctPath?.getAttribute('id'));
  const clickedName = getDeptNameSafe(clickedId);
  const correctName = getDeptNameSafe(correctId);

  const formatDeptLabel = (id, name) => {
    const safeId = sanitizeSvgTitle(id) || '?';
    const safeName = sanitizeSvgTitle(name);
    return safeName ? `${safeId} - ${safeName}` : safeId;
  };

  const isEnglish = currentLang === 'en';
  const wrongLabel = isEnglish ? 'Your choice' : 'Votre choix';
  const correctLabel = isEnglish ? 'Correct answer' : 'Bonne reponse';
  const feedbackHtml =
    `<span style="color:#fca5a5; font-weight:700;">${wrongLabel}: ${formatDeptLabel(clickedId, clickedName)}</span><br>` +
    `<span style="color:#86efac; font-weight:700;">${correctLabel}: ${formatDeptLabel(correctId, correctName)}</span>`;

  const questionText = document.getElementById('deptMapQuestionText');
  const questionInline = document.getElementById('deptMapQuestion');
  if (questionText) questionText.innerHTML = feedbackHtml;
  if (questionInline) {
    questionInline.style.display = 'block';
    questionInline.innerHTML = feedbackHtml;
  }

  clearDeptMapTimer();

  const playButton = document.getElementById('playButtonDeptMap');
  setControlVisibility('playButtonDeptMap', true, 'flex');
  playButton.textContent = texts.buttons?.replay || 'Rejouer';

  setDeptMapControlsVisible(true);
  setSectionControlLabelsVisible('deptMapGame', true);
  document.getElementById('dept-map-question-bar').style.display = 'none';

  const scoreInline = document.getElementById('scoreDeptMapGame');
  if (scoreInline) {
    scoreInline.style.display = 'block';
    scoreInline.textContent = (texts.score || 'Score') + ' : ' + scoreDeptMapGame;
  }

  const mapContainer = document.getElementById('dept-svg-container');
  mapContainer?._resetZoom?.();

  deptMapState.shouldResetScoreOnStart = true;
}

async function deptMapGame() {
  try {
    if (deptMapState.shouldResetScoreOnStart) {
      scoreDeptMapGame = 0;
      deptMapState.shouldResetScoreOnStart = false;
    }

    if (departements.length === 0) await loadDepartements();

    clearDeptMapTimer();
    clearDeptMapListeners();
    document.querySelectorAll('.title-tooltip').forEach(el => el.remove());

    const mapContainer = document.getElementById('dept-svg-container');
    if (!mapContainer) throw new Error('Department map container not found');
    mapContainer.style.display = 'block';

    const svg = await ensureDeptMapSvgLoaded();
    const paths = getDeptMapClickableElements(svg);
    if (paths.length === 0) throw new Error('No clickable department elements found in SVG');

    initMapZoomPan('dept-svg-container');
    if (mapContainer._resetZoom) mapContainer._resetZoom();

    applyDefaultDeptMapStyle(paths);

    const pathById = new Map(paths.map(path => [normalizeDeptId(path.getAttribute('id')), path]));
    let pool = getDeptMapPool().filter(dep => pathById.has(normalizeDeptId(dep.id)));
    if (pool.length === 0) {
      // If region filter leads to no match, gracefully fall back to all departments.
      pool = departements.filter(dep => pathById.has(normalizeDeptId(dep.id)));
    }
    if (pool.length === 0) throw new Error('No playable departments found in dataset/SVG intersection');

    const correctDept = pool[Math.floor(Math.random() * pool.length)];
    const correctId = normalizeDeptId(correctDept.id);
    const correctPath = pathById.get(correctId);

    const isNameMode = document.getElementById('modeDeptMapGame').classList.contains('deptName');
    const question = isNameMode
      ? (texts.deptMapGame?.clickOnDeptName || 'Cliquez sur : ') + '<strong>' + correctDept.nom + '</strong>'
      : (texts.deptMapGame?.clickOnDeptNumber || 'Cliquez sur le departement ') + '<strong>' + correctDept.id + '</strong>';

    const playButton = document.getElementById('playButtonDeptMap');
    if (playButton) {
      setControlVisibility('playButtonDeptMap', false, 'flex');
    }

    setDeptMapControlsVisible(false);
    setSectionControlLabelsVisible('deptMapGame', false);

    const questionBar = document.getElementById('dept-map-question-bar');
    const questionText = document.getElementById('deptMapQuestionText');
    const scoreText = document.getElementById('deptMapScoreText');
    if (!questionBar || !questionText || !scoreText) {
      throw new Error('Department map question bar elements missing');
    }
    questionBar.style.display = 'flex';

    questionText.innerHTML = question;
    scoreText.textContent = (texts.score || 'Score') + ' : ' + scoreDeptMapGame;
    const questionInline = document.getElementById('deptMapQuestion');
    const scoreInline = document.getElementById('scoreDeptMapGame');
    if (questionInline) {
      questionInline.innerHTML = question;
      questionInline.style.display = 'none';
    }
    if (scoreInline) {
      scoreInline.textContent = (texts.score || 'Score') + ' : ' + scoreDeptMapGame;
      scoreInline.style.display = 'none';
    }

    const onClick = (event) => {
      if (event.type === 'touchend') {
        event.preventDefault();
      }

      clearDeptMapListeners();
      paths.forEach(path => {
        path.onmouseenter = null;
        path.onmouseleave = null;
      });

      const clickedPath = event.currentTarget;
      const clickedId = normalizeDeptId(clickedPath.getAttribute('id'));

      if (clickedId === correctId) {
        if (typeof playSuccessSound === 'function') playSuccessSound();
        clickedPath.style.fill = '#16a34a';
        clickedPath.style.stroke = '#14532d';
        clickedPath.style.strokeWidth = '1px';

        deptMapState.pendingTimer = setTimeout(() => {
          scoreDeptMapGame++;
          deptMapGame();
        }, 800);
      } else {
        endDeptMapGame(clickedPath, correctPath);
      }
    };

    deptMapState.paths = paths;
    deptMapState.clickHandler = onClick;
    paths.forEach(path => {
      path.addEventListener('click', onClick);
      path.addEventListener('touchend', onClick, { passive: false });
    });
  } catch (error) {
    console.error('deptMapGame error:', error);
    const fallbackText = currentLang === 'en'
      ? 'Could not load the department map. Please refresh the page.'
      : 'Impossible de charger la carte des departements. Rechargez la page.';
    const detail = error?.message ? ' (' + error.message + ')' : '';
    const question = document.getElementById('deptMapQuestion');
    if (question) question.textContent = fallbackText + detail;
    resetDeptMapUiForRetry();
  }
}
