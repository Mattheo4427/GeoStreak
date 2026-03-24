document.addEventListener('DOMContentLoaded', async () => {
  if (
    typeof loadData !== 'function' ||
    typeof loadTexts !== 'function' ||
    typeof loadDepartements !== 'function' ||
    typeof loadRegions !== 'function' ||
    typeof applyTexts !== 'function'
  ) {
    return;
  }

  try {
    await Promise.all([loadData(currentLang), loadTexts(currentLang), loadDepartements(), loadRegions()]);
    applyTexts();
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
    if (typeof updateModeButtonTexts === 'function') {
      updateModeButtonTexts();
    }
  } catch (error) {
    console.warn('GeoStreak i18n initialization failed:', error);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const playButton = document.getElementById('playButton');
  const playButton2 = document.getElementById('playButton2');
  const playButtonDept = document.getElementById('playButtonDept');
  const playButtonDeptMap = document.getElementById('playButtonDeptMap');
  const playButtonRegion = document.getElementById('playButtonRegion');

  if (playButton) playButton.addEventListener('click', flagGame);
  if (playButton2) playButton2.addEventListener('click', mapGame);
  if (playButtonDept) playButtonDept.addEventListener('click', deptGame);
  if (playButtonDeptMap) playButtonDeptMap.addEventListener('click', deptMapGame);
  if (playButtonRegion) playButtonRegion.addEventListener('click', regionGame);

  const bordersBtn = document.getElementById('borders');
  if (bordersBtn) {
    bordersBtn.classList.add('easy');
    bordersBtn.addEventListener('click', changeDifficulty);
  }

  const bordersDeptMapBtn = document.getElementById('bordersDeptMap');
  if (bordersDeptMapBtn) {
    bordersDeptMapBtn.classList.add('easy');
    bordersDeptMapBtn.addEventListener('click', () => changeDifficultyFor('bordersDeptMap'));
  }

  const modeFlagGame = document.getElementById('modeFlagGame');
  const modeMapGame = document.getElementById('modeMapGame');
  if (modeFlagGame) {
    modeFlagGame.classList.add('countries');
    modeFlagGame.addEventListener('click', () => changeMode(modeFlagGame));
  }
  if (modeMapGame) {
    modeMapGame.classList.add('countries');
    modeMapGame.addEventListener('click', () => changeMode(modeMapGame));
  }

  const modeDeptGameBtn = document.getElementById('modeDeptGame');
  if (modeDeptGameBtn) {
    modeDeptGameBtn.classList.add('deptName');
    modeDeptGameBtn.addEventListener('click', () => changeModeDept(modeDeptGameBtn));
  }

  const modeDeptMapGameBtn = document.getElementById('modeDeptMapGame');
  if (modeDeptMapGameBtn) {
    modeDeptMapGameBtn.classList.add('deptName');
    modeDeptMapGameBtn.addEventListener('click', () => changeModeDept(modeDeptMapGameBtn));
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const dropdowns = [
    { optionClass: '.mapOptionFlagGame', titleId: 'zoneFlag', detailsId: 'zoneFlagGame' },
    { optionClass: '.mapOptionMapGame', titleId: 'zoneMap', detailsId: 'zoneMapGame' }
  ];

  dropdowns.forEach(({ optionClass, titleId, detailsId }) => {
    const options = document.querySelectorAll(optionClass);
    const title = document.getElementById(titleId);
    const details = document.getElementById(detailsId);
    if (!title || !details) return;

    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        title.textContent = option.textContent;
        title.setAttribute('data-zone-key', option.getAttribute('data-zone-key'));
        details.removeAttribute('open');
      });
    });
  });

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => switchLang(btn.dataset.lang));
  });

  const deptRegionOptions = document.querySelectorAll('.deptRegionOption');
  const zoneDeptTitle = document.getElementById('zoneDept');
  const zoneDeptDetails = document.getElementById('zoneDeptGame');
  if (zoneDeptTitle && zoneDeptDetails) {
    deptRegionOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        zoneDeptTitle.textContent = option.textContent;
        zoneDeptTitle.setAttribute('data-region', option.getAttribute('data-region'));
        zoneDeptDetails.removeAttribute('open');
      });
    });
  }

  const deptMapRegionOptions = document.querySelectorAll('.deptMapRegionOption');
  const zoneDeptMapTitle = document.getElementById('zoneDeptMap');
  const zoneDeptMapDetails = document.getElementById('zoneDeptMapGame');
  if (zoneDeptMapTitle && zoneDeptMapDetails) {
    deptMapRegionOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        zoneDeptMapTitle.textContent = option.textContent;
        zoneDeptMapTitle.setAttribute('data-region', option.getAttribute('data-region'));
        zoneDeptMapDetails.removeAttribute('open');
      });
    });
  }

  const deptChoicesOptions = document.querySelectorAll('.deptChoicesOption');
  const choicesDeptTitle = document.getElementById('choicesDept');
  const choicesDeptDetails = document.getElementById('choicesDeptGame');
  if (choicesDeptTitle && choicesDeptDetails) {
    deptChoicesOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        choicesDeptTitle.innerHTML = option.innerHTML;
        choicesDeptTitle.setAttribute('data-choices', option.getAttribute('data-choices'));
        choicesDeptDetails.removeAttribute('open');
      });
    });
  }

  const flagChoicesOptions = document.querySelectorAll('.flagChoicesOption');
  const choicesFlagTitle = document.getElementById('choicesFlag');
  const choicesFlagDetails = document.getElementById('choicesFlagGame');
  if (choicesFlagTitle && choicesFlagDetails) {
    flagChoicesOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        choicesFlagTitle.innerHTML = option.innerHTML;
        choicesFlagTitle.dataset.choices = option.dataset.choices || '4';
        choicesFlagDetails.removeAttribute('open');
      });
    });
  }

  const regionChoicesOptions = document.querySelectorAll('.regionChoicesOption');
  const choicesRegionTitle = document.getElementById('choicesRegion');
  const choicesRegionDetails = document.getElementById('choicesRegionGame');
  if (choicesRegionTitle && choicesRegionDetails) {
    regionChoicesOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        choicesRegionTitle.innerHTML = option.innerHTML;
        choicesRegionTitle.setAttribute('data-choices', option.getAttribute('data-choices'));
        choicesRegionDetails.removeAttribute('open');
      });
    });
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  if (!globalThis.location.pathname.includes('apprendre')) return;

  await Promise.all([loadData(currentLang), loadTexts(currentLang), loadDepartements(), loadRegions()]);
  applyTexts();
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });

  const searchBox = document.getElementById('search');
  const countryList = document.getElementById('country-list');
  const flag = document.getElementById('flagSugg');

  if (flag) {
    flag.style.display = 'none';
    flag.alt = '';
    flag.onerror = () => {
      flag.src = '';
      flag.alt = '';
      flag.style.display = 'none';
    };
  }

  searchBox.addEventListener('input', function () {
    const input = removeAccents(this.value.toLowerCase());
    countryList.innerHTML = '';
    flag.src = '';
    flag.style.display = 'none';
    flag.alt = '';

    if (!input) return;

    const countryNames = countries.map(c => c.nom);
    countryNames
      .filter(name => removeAccents(name.toLowerCase()).startsWith(input))
      .forEach(name => {
        const li = document.createElement('li');
        li.id = 'suggestion';
        li.textContent = name;
        li.addEventListener('click', () => {
          searchBox.value = name;
          countryList.innerHTML = '';
          const selected = countries.find(c => c.nom === name);
          if (selected?.code) {
            flag.src = `../flags/${selected.code}.png`;
            flag.alt = selected.nom;
            flag.style.display = 'block';
          } else {
            flag.src = '';
            flag.alt = '';
            flag.style.display = 'none';
          }
        });
        countryList.appendChild(li);
      });
  });
});

