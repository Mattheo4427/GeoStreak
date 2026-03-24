/* global scoreMapGame */

let shouldResetMapScoreOnStart = false;

async function mapGame() {
  try {
    if (shouldResetMapScoreOnStart) {
      scoreMapGame = 0;
      shouldResetMapScoreOnStart = false;
    }

    const isValidLabel = (value) => {
      const text = String(value ?? '').trim().toLowerCase();
      return text !== '' && text !== 'null' && text !== 'undefined';
    };

    const zone = getZoneData(getZoneKey('zoneMap'));
    const svg = document.querySelector('#svg-container svg');
    const paths = svg.querySelectorAll('path');

    document.querySelectorAll('.title-tooltip').forEach(el => el.remove());

    const questionMain = document.getElementById('countryName2');
    if (questionMain) {
      questionMain.style.marginTop = '8.5vh';
      questionMain.style.display = 'none';
    }

    setControlVisibility('playButton2', false, 'flex');

    setControlVisibility('borders', false, 'block');
    setControlVisibility('modeMapGame', false, 'block');
    setControlVisibility('zoneMapGame', false, 'block');
    setSectionControlLabelsVisible('mapGame', false);

    const mapContainer = document.getElementById('svg-container');
    mapContainer.style.display = 'block';
    if (mapContainer._resetZoom) mapContainer._resetZoom();
    initMapZoomPan();

    const questionBar = document.getElementById('map-question-bar');
    const questionText = document.getElementById('mapQuestionText');
    const scoreText = document.getElementById('mapScoreText');
    const scoreMain = document.getElementById('scoreMapGame');
    questionBar.style.display = 'flex';
    if (scoreMain) scoreMain.style.display = 'none';

    const isEasy = document.getElementById('borders').classList.contains('easy');
    paths.forEach(path => {
      path.style.fill = 'rgba(100,130,165, .35)';
      path.style.strokeWidth = isEasy ? '0.25px' : '0';
      if (isEasy) path.style.stroke = 'black';
      if (!isEasy) path.style.stroke = 'transparent';
      path.style.cursor = 'crosshair';
      path.classList.remove('pulsing-stroke');

      if (isEasy) {
        path.onmouseenter = () => {
          if (!path.classList.contains('pulsing-stroke')) {
            path.style.fill = 'rgba(120,155,195, .55)';
          }
        };
        path.onmouseleave = () => {
          if (!path.classList.contains('pulsing-stroke')) {
            path.style.fill = 'rgba(100,130,165, .35)';
          }
        };
      } else {
        path.onmouseenter = null;
        path.onmouseleave = null;
      }
    });

    scoreText.textContent = (texts.score || 'Score') + ' : ' + scoreMapGame;
    if (scoreMain) scoreMain.textContent = (texts.score || 'Score') + ' : ' + scoreMapGame;
    let randomInfos = getRandomInfos(zone, exclure);

    const isCountryMode = document.getElementById('modeMapGame').classList.contains('countries');

    if (isCountryMode) {
      const msg = (texts.mapGame?.clickOn || 'Cliquez sur : ') + '<strong>' + randomInfos[0] + '</strong>';
      document.getElementById('countryName2').innerHTML = msg;
      questionText.innerHTML = msg;
    } else {
      while (!isValidLabel(randomInfos?.[2])) {
        randomInfos = getRandomInfos(zone, exclure);
      }
      const msg = (texts.mapGame?.clickOnCapital || 'Cliquez sur le pays ayant pour capitale : ') + '<strong>' + randomInfos[2] + '</strong>';
      document.getElementById('countryName2').innerHTML = msg;
      questionText.innerHTML = msg;
    }

    const correctCode = randomInfos[1];

    function handleClick(event) {
      paths.forEach(p => p.removeEventListener('click', handleClick));
      paths.forEach(p => p.removeEventListener('touchend', handleClick));
      paths.forEach(p => {
        p.onmouseenter = null;
        p.onmouseleave = null;
      });

      if (event.type === 'touchend') {
        event.preventDefault();
      }

      let element = event.target;
      let id;

      if (event.target.tagName.toLowerCase() === 'div') {
        const pathId = event.target.dataset.pathId;
        paths.forEach(p => {
          if (pathId.toLowerCase() === p.getAttribute('id').toLowerCase()) {
            element = p;
          }
        });
        id = element.getAttribute('id');
      } else {
        id = this.getAttribute('id');
      }

      const overlay = document.querySelector('div[data-path-id="' + correctCode.toUpperCase() + '"]');
      if (overlay) overlay.remove();

      if (correctCode === id.toLowerCase()) {
        if (typeof playSuccessSound === 'function') playSuccessSound();
        element.style.fill = 'green';
        element.style.strokeWidth = '1px';
        element.style.stroke = 'rgb(5, 94, 27)';
        setTimeout(() => {
          scoreMapGame++;
          mapGame();
        }, 1250);
      } else {
        endMapGame(id, correctCode);
      }
    }

    paths.forEach(path => {
      path.addEventListener('click', handleClick);
      path.addEventListener('touchend', handleClick, { passive: false });

      if (path.getAttribute('id').toLowerCase() === correctCode) {
        const overlay = document.createElement('div');
        const rect = path.getBoundingClientRect();
        const svgRect = path.ownerSVGElement.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        overlay.style.position = 'absolute';
        overlay.style.top = (rect.top - svgRect.top + 1.49 * vh) + 'px';
        overlay.style.left = (rect.left - svgRect.left + vw / 20.5) + 'px';
        overlay.style.width = (rect.width + 0.5) + 'px';
        overlay.style.height = (rect.height + 0.5) + 'px';
        overlay.style.backgroundColor = 'transparent';
        overlay.style.zIndex = '10';
        overlay.style.cursor = 'crosshair';
        overlay.dataset.pathId = path.getAttribute('id');
        overlay.addEventListener('click', handleClick);
        overlay.addEventListener('touchend', handleClick, { passive: false });

        path.ownerSVGElement.parentNode.appendChild(overlay);
      }
    });
  } catch (error) {
    console.error('mapGame error:', error);
  }
}

/** Handle end of map game round (wrong answer) */
function endMapGame(bad, answer) {
  if (typeof playErrorSound === 'function') playErrorSound();

  const svg = document.querySelector('#svg-container svg');
  const paths = svg.querySelectorAll('path');
  const badCode = String(bad || '').toLowerCase();
  const answerCode = String(answer || '').toLowerCase();
  const sanitizeLabel = (value) => {
    const text = String(value ?? '').trim();
    const lowered = text.toLowerCase();
    if (!text || lowered === 'null' || lowered === 'undefined') return '';
    return text;
  };
  const fallbackCapital = currentLang === 'en' ? 'No official capital' : 'Pas de capitale officielle';

  paths.forEach(path => {
    if (path.getAttribute('id')?.toLowerCase() === badCode) {
      path.style.fill = 'red';
    }

    if (path.getAttribute('id').toLowerCase() === answerCode) {
      path.style.fill = 'green';
      path.classList.add('pulsing-stroke');
    }
  });

  const badInfo = getCountryByCode(badCode);
  const answerInfo = getCountryByCode(answerCode);
  const badName = sanitizeLabel(badInfo?.nom) || getCountryNameByCode(badCode) || bad;
  const answerName = sanitizeLabel(answerInfo?.nom) || getCountryNameByCode(answerCode) || answer;
  const badCapital = sanitizeLabel(badInfo?.capitale) || fallbackCapital;
  const answerCapital = sanitizeLabel(answerInfo?.capitale) || fallbackCapital;
  const isCountryMode = document.getElementById('modeMapGame')?.classList.contains('countries');
  const isEnglish = currentLang === 'en';
  const wrongLabel = isEnglish ? 'Your choice' : 'Votre choix';
  const correctLabel = isEnglish ? 'Correct answer' : 'Bonne reponse';
  const feedbackHtml = isCountryMode
    ? (`<span style="color:#fca5a5; font-weight:700;">${wrongLabel}: ${badName}</span><br>` +
      `<span style="color:#86efac; font-weight:700;">${correctLabel}: ${answerName}</span>`)
    : (`<span style="color:#fca5a5; font-weight:700;">${wrongLabel}: ${badName} (${badCapital})</span><br>` +
      `<span style="color:#86efac; font-weight:700;">${correctLabel}: ${answerName} (${answerCapital})</span>`);

  const questionMain = document.getElementById('countryName2');
  const questionBar = document.getElementById('mapQuestionText');
  if (questionMain) {
    questionMain.style.display = 'block';
    questionMain.innerHTML = feedbackHtml;
  }
  if (questionBar) questionBar.innerHTML = feedbackHtml;

  const playButton = document.getElementById('playButton2');
  setControlVisibility('playButton2', true, 'flex');
  playButton.textContent = texts.buttons?.replay || 'Rejouer';

  setControlVisibility('borders', true, 'block');
  setControlVisibility('modeMapGame', true, 'block');
  setControlVisibility('zoneMapGame', true, 'block');
  setSectionControlLabelsVisible('mapGame', true);
  document.getElementById('countryName2').style.marginTop = '1vh';
  document.getElementById('map-question-bar').style.display = 'none';

  const scoreMain = document.getElementById('scoreMapGame');
  if (scoreMain) {
    scoreMain.style.display = 'block';
    scoreMain.textContent = (texts.score || 'Score') + ' : ' + scoreMapGame;
  }

  const container = document.getElementById('svg-container');
  if (container._resetZoom) container._resetZoom();

  shouldResetMapScoreOnStart = true;
}
