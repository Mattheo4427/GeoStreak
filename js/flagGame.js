async function flagGame() {
  try {
    const contentEl = document.getElementById('content');
    const choicesEl = document.getElementById('choicesFlag');
    const requestedChoices = Number.parseInt(choicesEl ? (choicesEl.dataset.choices || '4') : '4', 10);
    const numChoices = Number.isFinite(requestedChoices)
      ? Math.max(2, Math.min(requestedChoices, 8))
      : 4;

    const zone = getZoneData(getZoneKey('zoneFlag'));
    const isValidLabel = (value) => {
      const text = String(value ?? '').trim().toLowerCase();
      return text !== '' && text !== 'null' && text !== 'undefined';
    };

    if (!Array.isArray(zone) || zone.length < numChoices) {
      console.error('flagGame: not enough countries in selected zone for choices =', numChoices);
      return;
    }

    let result = getRandomCountryDetails(zone, numChoices);
    let { codes, correct: originalIndex } = result;

    const modeBtn = document.getElementById('modeFlagGame');
    const isCountryMode = modeBtn.classList.contains('countries');
    let names = isCountryMode ? result.names : result.capitals;

    // Prevent null/undefined prompts in both countries and capitals modes.
    while (!Array.isArray(names) || names.length !== numChoices || names.some(name => !isValidLabel(name))) {
      result = getRandomCountryDetails(zone, numChoices);
      codes = result.codes;
      originalIndex = result.correct;
      names = isCountryMode ? result.names : result.capitals;
    }

    document.getElementById('countryName').style.marginTop = '8.5vh';

    setControlVisibility('playButton', false, 'flex');

    setControlVisibility('modeFlagGame', false, 'block');
    setControlVisibility('choicesFlagGame', false, 'block');
    setControlVisibility('zoneFlagGame', false, 'block');
    setSectionControlLabelsVisible('flagGame', false);

    for (let i = 1; i <= 8; i++) {
      const divEl = document.getElementById('div' + i);
      const imageEl = document.getElementById('image' + i);
      const nameEl = document.getElementById('name' + i);
      if (!divEl || !imageEl || !nameEl) continue;

      const active = i <= numChoices;
      divEl.style.display = active ? '' : 'none';
      divEl.style.pointerEvents = active ? 'auto' : 'none';
      imageEl.style.outline = 'none';
      imageEl.src = active ? imageEl.src : '';
      imageEl.onclick = null;
      nameEl.textContent = '';
      nameEl.style.fontWeight = '';
    }

    document.getElementById('scoreFlagGame').textContent = (texts.score || 'Score') + ' : ' + scoreFlagGame;

    const countryText = document.getElementById('countryName');
    if (isCountryMode) {
      countryText.innerHTML = (texts.flagGame?.findFlag || 'Trouvez le drapeau de : ') + '<strong>' + names[originalIndex - 1] + '</strong>';
    } else {
      countryText.innerHTML = (texts.flagGame?.findFlagCapital || 'Trouvez le drapeau dont la capitale est : ') + '<strong>' + names[originalIndex - 1] + '</strong>';
    }

    const preload = src => new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

    try {
      const flagsBasePath = globalThis.location.pathname.includes('/pages/') ? '../flags/' : 'flags/';
      const images = await Promise.all(codes.map(code => preload(flagsBasePath + code + '.png')));
      images.forEach((img, i) => {
        document.getElementById('image' + (i + 1)).src = img.src;
      });
    } catch (err) {
      console.error('Erreur lors du préchargement des images', err);
    }

    let hasClicked = false;

    for (let i = 1; i <= numChoices; i++) {
      document.getElementById('image' + i).onclick = () => {
        if (hasClicked) return;
        hasClicked = true;

        if (originalIndex === i) {
          if (typeof playSuccessSound === 'function') playSuccessSound();
          scoreFlagGame++;
          document.getElementById('image' + i).style.outline = 'solid green 10px';
          setTimeout(flagGame, 1000);
        } else {
          endFlagGame(i, originalIndex, names, numChoices);
        }
      };
    }

    if (contentEl) {
      contentEl.style.display = 'flex';
    }
  } catch (error) {
    console.error('flagGame error:', error);
  }
}

/** Handle end of flag game round (wrong answer) */
function endFlagGame(bad, answer, names, numChoices) {
  if (typeof playErrorSound === 'function') playErrorSound();

  document.getElementById('image' + answer).style.outline = 'solid green 10px';
  document.getElementById('image' + bad).style.outline = 'solid red 10px';

  for (let i = 1; i <= numChoices; i++) {
    document.getElementById('div' + i).style.pointerEvents = 'none';
    const nameEl = document.getElementById('name' + i);
    const label = String(names[i - 1] ?? '').trim();
    nameEl.textContent = (label && label.toLowerCase() !== 'null' && label.toLowerCase() !== 'undefined')
      ? label
      : '-';
    nameEl.style.fontWeight = 'bold';
    nameEl.style.color = '#d8e6f2';
  }

  const answerNameEl = document.getElementById('name' + answer);
  if (answerNameEl) {
    answerNameEl.style.color = '#86efac';
    answerNameEl.textContent = '✓ ' + answerNameEl.textContent;
  }

  const badNameEl = document.getElementById('name' + bad);
  if (badNameEl) {
    badNameEl.style.color = '#fca5a5';
    badNameEl.textContent = '✗ ' + badNameEl.textContent;
  }

  const playButton = document.getElementById('playButton');
  setControlVisibility('playButton', true, 'flex');
  playButton.textContent = texts.buttons?.replay || 'Rejouer';

  setControlVisibility('modeFlagGame', true, 'block');
  setControlVisibility('choicesFlagGame', true, 'block');
  setControlVisibility('zoneFlagGame', true, 'block');
  setSectionControlLabelsVisible('flagGame', true);
  document.getElementById('countryName').style.marginTop = '1vh';

  scoreFlagGame = 0;
}
