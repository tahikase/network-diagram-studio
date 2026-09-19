(() => {
  'use strict';

  const scriptUrl = new URL(document.currentScript.src);
  const assetRoot = new URL('.', scriptUrl);
  /* BEGIN WALKTHROUGH DATA */
  const duration = 178.04;
  const script = [[0.189, 4.818, "Explore Favorites, Resources, All icons, and Shapes."], [4.818, 9.132, "Expand each section, then search to find what you need."], [13.695, 17.124, "Name your diagram with a case number and title."], [17.711, 22.875, "Search for Resource Group, drag it onto the canvas, and name it."], [23.716, 27.205, "Nest a Virtual Network, then a Subnet."], [27.205, 30.924, "Resize the containers to make the hierarchy clear."], [31.988, 37.712, "Add a Virtual Machine, rename it VM1, and enter its private IP."], [38.162, 41.341, "Copy the entire group with Control C and V."], [41.341, 45.665, "Move the copy right, and rename its VM to VM2."], [49.176, 51.955, "Connect the VNets and label it peering."], [51.955, 55.564, "Change Arrow to Line, then Bent to Straight."], [58.185, 62.429, "In Settings, enter your name so comments show their author."], [63.198, 65.522, "Open and resize Notes."], [65.522, 70.197, "Add context, select text, and leave a comment for review."], [71.139, 74.733, "Choose Screenshot and drag around the area you need."], [75.185, 77.709, "Use Text to label the picture."], [79.194, 82.583, "Draw a Callout to explain an important detail."], [83.209, 86.638, "Add step numbers in the order readers should follow."], [87.216, 90.69, "Blur private IPs before sharing the picture."], [90.69, 94.019, "This does not redact the editable diagram."], [94.48, 97.849, "Add a caption, then Save PNG."], [97.849, 101.289, "Add to Notes keeps the picture beside your review."], [101.745, 107.568, "Save JSON keeps the editable diagram, Notes, comments, and images together."], [108.036, 112.655, "Smith sets his name, then uses Load JSON in another tab."], [113.111, 117.0, "He replies in the same thread and saves the reviewed file."], [119.489, 123.163, "Save first; loading replaces this tab."], [123.163, 126.373, "Share files, not live edits."], [126.829, 131.408, "In Azure Portal, open Resource groups and select your group."], [131.408, 137.162, "Under Automation, choose Export template, then ARM template and Download."], [138.836, 142.585, "Extract the download, then import the template."], [142.585, 144.825, "Supply missing scope."], [145.846, 149.62, "Import reads the template locally and shows progress."], [150.086, 152.835, "The topology opens in a new tab."], [152.835, 154.995, "Notes starts blank."], [155.447, 159.981, "Select a group or VNet to see the full resource IDs inside it."], [159.981, 162.155, "Copy all when needed."], [162.615, 166.169, "Export PNG or SVG for a picture."], [166.169, 168.649, "Keep JSON to keep editing."], [169.125, 172.609, "Share suggestions with the orange Feedback button."], [173.139, 176.013, "C selects; V pans."], [176.013, 177.688, "Replay here."]];
  const chapters = [[0, "Explore the palette"], [13.575, "Build a network"], [38.042, "Copy and peer"], [58.065, "Notes and named comments"], [71.019, "Screenshot editing"], [101.625, "Collaborate with JSON"], [126.709, "Export and import ARM"], [162.495, "Share and get help"]];
  const transcriptLines = [[0.069, 13.573, "Explore Favorites, Resources, All icons, and Shapes. Expand each section, then search to find what you need."], [13.575, 17.59, "Name your diagram with a case number and title."], [17.591, 23.595, "Search for Resource Group, drag it onto the canvas, and name it."], [23.596, 31.868, "Nest a Virtual Network, then a Subnet. Resize the containers to make the hierarchy clear."], [31.868, 38.041, "Add a Virtual Machine, rename it VM1, and enter its private IP."], [38.042, 49.055, "Copy the entire group with Control C and V. Move the copy right, and rename its VM to VM2."], [49.056, 58.064, "Connect the VNets and label it peering. Change Arrow to Line, then Bent to Straight."], [58.065, 63.077, "In Settings, enter your name so comments show their author."], [63.078, 71.018, "Open and resize Notes. Add context, select text, and leave a comment for review."], [71.019, 75.065, "Choose Screenshot and drag around the area you need."], [75.065, 79.073, "Use Text to label the picture."], [79.074, 83.089, "Draw a Callout to explain an important detail."], [83.089, 87.095, "Add step numbers in the order readers should follow."], [87.096, 94.359, "Blur private IPs before sharing the picture. This does not redact the editable diagram."], [94.36, 101.624, "Add a caption, then Save PNG. Add to Notes keeps the picture beside your review."], [101.625, 107.914, "Save JSON keeps the editable diagram, Notes, comments, and images together."], [107.916, 112.989, "Smith sets his name, then uses Load JSON in another tab."], [112.991, 119.367, "He replies in the same thread and saves the reviewed file."], [119.369, 126.707, "Save first; loading replaces this tab. Share files, not live edits."], [126.709, 138.714, "In Azure Portal, open Resource groups and select your group. Under Automation, choose Export template, then ARM template and Download."], [138.716, 145.725, "Extract the download, then import the template. Supply missing scope."], [145.726, 149.964, "Import reads the template locally and shows progress."], [149.966, 155.325, "The topology opens in a new tab. Notes starts blank."], [155.327, 162.493, "Select a group or VNet to see the full resource IDs inside it. Copy all when needed."], [162.495, 169.003, "Export PNG or SVG for a picture. Keep JSON to keep editing."], [169.005, 173.017, "Share suggestions with the orange Feedback button."], [173.019, 178.027, "C selects; V pans. Replay here."]];
  /* END WALKTHROUGH DATA */
  const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`;
  // Only the chrome is localized; the recording explicitly identifies its English audio.
  const copy = {
    en: ['Watch demo', 'Would you like to see a demo?', 'Build grouped networks, add comments, and collaborate with JSON.', 'Quick start', 'Build and collaborate ({duration})', 'Automated walkthrough | English audio and captions', 'Close demo', 'Dismiss invitation', 'Start creating', 'Read transcript (English)', 'Replay demo', 'Press Play to start the video.', 'The video could not be loaded. Read the transcript below or choose Replay demo to retry.'],
    ja: ['\u30c7\u30e2\u3092\u898b\u308b', '\u30c7\u30e2\u3092\u3054\u89a7\u306b\u306a\u308a\u307e\u3059\u304b\uff1f', '\u6700\u521d\u306e\u56f3\u3092\u4f5c\u308b\u624b\u9806\u3092\u97f3\u58f0\u4ed8\u304d\u3067\u7d39\u4ecb\u3057\u307e\u3059\u3002', '\u30af\u30a4\u30c3\u30af\u30b9\u30bf\u30fc\u30c8', '\u56f3\u306e\u4f5c\u6210\u3068\u5171\u540c\u4f5c\u696d ({duration})', '\u81ea\u52d5\u64cd\u4f5c\u30c7\u30e2 | \u82f1\u8a9e\u97f3\u58f0\u30fb\u5b57\u5e55', '\u30c7\u30e2\u3092\u9589\u3058\u308b', '\u6848\u5185\u3092\u9589\u3058\u308b', '\u4f5c\u6210\u3092\u59cb\u3081\u308b', '\u6587\u5b57\u8d77\u3053\u3057\uff08\u82f1\u8a9e\uff09', '\u3082\u3046\u4e00\u5ea6\u518d\u751f', '\u518d\u751f\u30dc\u30bf\u30f3\u3092\u62bc\u3057\u3066\u304f\u3060\u3055\u3044\u3002', '\u52d5\u753b\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u6587\u5b57\u8d77\u3053\u3057\u3092\u8aad\u3080\u304b\u3001\u300c\u3082\u3046\u4e00\u5ea6\u518d\u751f\u300d\u3067\u518d\u8a66\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002'],
    es: ['Ver demo', '\u00bfQuieres ver una demo?', 'Una breve gu\u00eda narrada para tu primer diagrama.', 'Inicio r\u00e1pido', 'Crea y colabora ({duration})', 'Demostraci\u00f3n automatizada | Audio y subt\u00edtulos en ingl\u00e9s', 'Cerrar demo', 'Cerrar invitaci\u00f3n', 'Empezar a crear', 'Leer transcripci\u00f3n (ingl\u00e9s)', 'Repetir demo', 'Pulsa Reproducir para iniciar el video.', 'No se pudo cargar el video. Lee la transcripci\u00f3n o elige Repetir demo para reintentar.'],
    fr: ['Voir la d\u00e9mo', 'Souhaitez-vous voir une d\u00e9mo ?', 'Un guide rapide et comment\u00e9 pour votre premier diagramme.', 'Prise en main', 'Cr\u00e9ez et collaborez ({duration})', 'D\u00e9monstration automatis\u00e9e | Audio et sous-titres en anglais', 'Fermer la d\u00e9mo', 'Fermer l\u2019invitation', 'Commencer', 'Lire la transcription (anglais)', 'Revoir la d\u00e9mo', 'Appuyez sur Lecture pour lancer la vid\u00e9o.', 'Impossible de charger la vid\u00e9o. Lisez la transcription ou choisissez Revoir la d\u00e9mo pour r\u00e9essayer.'],
    de: ['Demo ansehen', 'M\u00f6chten Sie eine Demo sehen?', 'Eine kurze Anleitung mit Sprachausgabe f\u00fcr Ihr erstes Diagramm.', 'Schnellstart', 'Erstellen und zusammenarbeiten ({duration})', 'Automatisierte Vorf\u00fchrung | Englischer Ton und Untertitel', 'Demo schlie\u00dfen', 'Hinweis schlie\u00dfen', 'Jetzt erstellen', 'Transkript lesen (Englisch)', 'Demo wiederholen', 'Dr\u00fccken Sie Wiedergabe, um das Video zu starten.', 'Das Video konnte nicht geladen werden. Lesen Sie das Transkript oder versuchen Sie es mit Demo wiederholen erneut.'],
    pt: ['Ver demo', 'Gostaria de ver uma demo?', 'Um guia r\u00e1pido com narra\u00e7\u00e3o para seu primeiro diagrama.', 'In\u00edcio r\u00e1pido', 'Crie e colabore ({duration})', 'Demonstra\u00e7\u00e3o automatizada | \u00c1udio e legendas em ingl\u00eas', 'Fechar demo', 'Fechar convite', 'Come\u00e7ar a criar', 'Ler transcri\u00e7\u00e3o (ingl\u00eas)', 'Repetir demo', 'Pressione Reproduzir para iniciar o v\u00eddeo.', 'N\u00e3o foi poss\u00edvel carregar o v\u00eddeo. Leia a transcri\u00e7\u00e3o ou escolha Repetir demo para tentar novamente.'],
    zh: ['\u89c2\u770b\u6f14\u793a', '\u60a8\u60f3\u770b\u4e00\u4e2a\u6f14\u793a\u5417\uff1f', '\u901a\u8fc7\u7b80\u77ed\u7684\u8bed\u97f3\u6307\u5357\u521b\u5efa\u7b2c\u4e00\u4e2a\u56fe\u3002', '\u5feb\u901f\u5165\u95e8', '\u521b\u5efa\u4e0e\u534f\u4f5c ({duration})', '\u81ea\u52a8\u64cd\u4f5c\u6f14\u793a | \u82f1\u8bed\u97f3\u9891\u548c\u5b57\u5e55', '\u5173\u95ed\u6f14\u793a', '\u5173\u95ed\u63d0\u793a', '\u5f00\u59cb\u521b\u5efa', '\u9605\u8bfb\u6587\u5b57\u7a3f\uff08\u82f1\u8bed\uff09', '\u91cd\u64ad\u6f14\u793a', '\u6309\u64ad\u653e\u6309\u94ae\u5f00\u59cb\u89c6\u9891\u3002', '\u65e0\u6cd5\u52a0\u8f7d\u89c6\u9891\u3002\u8bf7\u9605\u8bfb\u6587\u5b57\u7a3f\u6216\u9009\u62e9\u91cd\u64ad\u6f14\u793a\u91cd\u8bd5\u3002'],
    ko: ['\ub370\ubaa8 \ubcf4\uae30', '\ub370\ubaa8\ub97c \ubcf4\uc2dc\uaca0\uc2b5\ub2c8\uae4c?', '\uccab \ub2e4\uc774\uc5b4\uadf8\ub7a8\uc744 \ub9cc\ub4dc\ub294 \uc9e7\uc740 \uc74c\uc131 \uc548\ub0b4\uc785\ub2c8\ub2e4.', '\ube60\ub978 \uc2dc\uc791', '\ub2e4\uc774\uc5b4\uadf8\ub7a8 \ub9cc\ub4e4\uae30\uc640 \ud611\uc5c5 ({duration})', '\uc790\ub3d9 \uc870\uc791 \ub370\ubaa8 | \uc601\uc5b4 \uc74c\uc131 \ubc0f \uc790\ub9c9', '\ub370\ubaa8 \ub2eb\uae30', '\uc548\ub0b4 \ub2eb\uae30', '\ub9cc\ub4e4\uae30 \uc2dc\uc791', '\ub300\ubcf8 \uc77d\uae30 (\uc601\uc5b4)', '\ub370\ubaa8 \ub2e4\uc2dc \ubcf4\uae30', '\uc7ac\uc0dd\uc744 \ub20c\ub7ec \uc601\uc0c1\uc744 \uc2dc\uc791\ud558\uc138\uc694.', '\uc601\uc0c1\uc744 \ubd88\ub7ec\uc62c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ub300\ubcf8\uc744 \uc77d\uac70\ub098 \ub370\ubaa8 \ub2e4\uc2dc \ubcf4\uae30\ub97c \uc120\ud0dd\ud558\uc138\uc694.'],
  };
  const guideCopy = {
    en: ['Demo video', 'Watch the narrated guide to building, editing, and sharing diagrams.', 'Chapters (English)', 'Playback speed'],
    ja: ['\u30c7\u30e2\u52d5\u753b', '\u56f3\u306e\u4f5c\u6210\u3001\u7de8\u96c6\u3001\u5171\u6709\u3092\u97f3\u58f0\u4ed8\u304d\u3067\u7d39\u4ecb\u3057\u307e\u3059\u3002', '\u30c1\u30e3\u30d7\u30bf\u30fc\uff08\u82f1\u8a9e\uff09', '\u518d\u751f\u901f\u5ea6'],
    es: ['Video de demostraci\u00f3n', 'Gu\u00eda narrada para crear, editar y compartir diagramas.', 'Cap\u00edtulos (ingl\u00e9s)', 'Velocidad de reproducci\u00f3n'],
    fr: ['Vid\u00e9o de d\u00e9monstration', 'Un guide comment\u00e9 pour cr\u00e9er, modifier et partager des diagrammes.', 'Chapitres (anglais)', 'Vitesse de lecture'],
    de: ['Demo-Video', 'Eine Anleitung mit Sprachausgabe zum Erstellen, Bearbeiten und Teilen von Diagrammen.', 'Kapitel (Englisch)', 'Wiedergabegeschwindigkeit'],
    pt: ['V\u00eddeo de demonstra\u00e7\u00e3o', 'Um guia narrado para criar, editar e compartilhar diagramas.', 'Cap\u00edtulos (ingl\u00eas)', 'Velocidade de reprodu\u00e7\u00e3o'],
    zh: ['\u6f14\u793a\u89c6\u9891', '\u901a\u8fc7\u8bed\u97f3\u6307\u5357\u5b66\u4e60\u521b\u5efa\u3001\u7f16\u8f91\u548c\u5171\u4eab\u56fe\u3002', '\u7ae0\u8282\uff08\u82f1\u8bed\uff09', '\u64ad\u653e\u901f\u5ea6'],
    ko: ['\ub370\ubaa8 \uc601\uc0c1', '\ub2e4\uc774\uc5b4\uadf8\ub7a8 \ub9cc\ub4e4\uae30, \ud3b8\uc9d1, \uacf5\uc720\ub97c \uc74c\uc131\uc73c\ub85c \uc548\ub0b4\ud569\ub2c8\ub2e4.', '\ucc55\ud130 (\uc601\uc5b4)', '\uc7ac\uc0dd \uc18d\ub3c4'],
  };
  for (const lang of Object.keys(copy)) {
    copy[lang].push(...guideCopy[lang]);
    copy[lang][2] = guideCopy[lang][1];
    copy[lang][3] = guideCopy[lang][0];
  }
  let dialog;
  let video;
  let statusIndex = null;
  const t = (index) => (copy[document.documentElement.lang] || copy.en)[index].replace('{duration}', formatTime(duration));
  const icon = '<svg class="nds-demo-play-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8.2" stroke="currentColor" stroke-width="1.5"/><path d="m8 6 6 4-6 4z" fill="currentColor"/></svg>';
  const closeIcon = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  // Register before the app bundle: its window-capture shortcuts must not edit
  // a diagram while the viewer is using the native video player's keyboard.
  window.addEventListener('keydown', (event) => {
    if (!dialog?.open) return;
    const nativeKeys = ['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'm', 'f'];
    if (!event.ctrlKey && !event.metaKey && !event.altKey && nativeKeys.includes(event.key)) return;
    event.stopImmediatePropagation();
    if (event.key === 'Escape' && document.fullscreenElement !== video) {
      event.preventDefault();
      dialog.close();
    }
  }, true);

  function mount(main) {
    let returnFocus = null;
    dialog = document.createElement('dialog');
    dialog.id = 'nds-demo-dialog';
    dialog.setAttribute('aria-labelledby', 'nds-demo-title');
    dialog.setAttribute('aria-describedby', 'nds-demo-description');
    dialog.innerHTML = `
        <div class="nds-demo-heading">
          <p class="nds-demo-eyebrow" data-demo-copy="3"></p>
          <h2 id="nds-demo-title" data-demo-copy="4"></h2>
          <p id="nds-demo-description" data-demo-copy="5"></p>
          <button id="nds-demo-close" class="nds-demo-dismiss" type="button" data-demo-label="6" autofocus>${closeIcon}</button>
        </div>
        <video id="nds-demo-video" controls playsinline preload="none" aria-label="Network Diagram Studio walkthrough (English)"></video>
        <div class="nds-demo-footer">
          <p id="nds-demo-status" role="status" hidden></p>
          <div class="nds-demo-actions">
            <button id="nds-demo-replay" class="nds-demo-secondary" type="button" data-demo-copy="10"></button>
            <label class="nds-demo-speed"><span data-demo-copy="16"></span>
              <select id="nds-demo-speed"><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option></select>
            </label>
            <button id="nds-demo-start" class="nds-demo-primary" type="button" data-demo-copy="8"></button>
          </div>
          <details id="nds-demo-chapters">
            <summary data-demo-copy="15"></summary>
            <nav data-demo-label="15"><ol lang="en"></ol></nav>
          </details>
          <details id="nds-demo-transcript"><summary data-demo-copy="9"></summary><div lang="en"></div></details>
        </div>`;
    video = dialog.querySelector('video');
    const transcript = dialog.querySelector('#nds-demo-transcript');
    const status = dialog.querySelector('#nds-demo-status');
    // The exporter clones the canvas, including hidden video elements.
    // Media must always remain outside that subtree.
    document.body.append(dialog);

    const localize = () => {
      for (const root of [dialog, document.getElementById('nds-demo-settings-entry')].filter(Boolean)) {
        root.querySelectorAll('[data-demo-copy]').forEach((element) => { element.textContent = t(Number(element.dataset.demoCopy)); });
        root.querySelectorAll('[data-demo-label]').forEach((element) => { element.setAttribute('aria-label', t(Number(element.dataset.demoLabel))); });
      }
      if (statusIndex !== null) status.textContent = t(statusIndex);
    };
    localize();
    new MutationObserver(localize).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    // In-memory cues also work when the app is opened from file://, unlike
    // fetching a sidecar VTT, which is blocked by local-file CORS rules.
    const captions = video.addTextTrack('captions', 'English', 'en');
    for (const [start, end, text] of script) {
      const cue = new VTTCue(start, end, text);
      cue.line = -3;
      captions.addCue(cue);
    }
    for (const [start, , text] of transcriptLines) {
      const paragraph = document.createElement('p');
      const timestamp = document.createElement('time');
      timestamp.textContent = formatTime(start);
      paragraph.append(timestamp, document.createTextNode(text));
      transcript.querySelector('div').append(paragraph);
    }
    captions.mode = 'disabled';
    const chapterButtons = chapters.map(([start, title]) => {
      const item = document.createElement('li');
      const chapter = document.createElement('button');
      chapter.type = 'button';
      chapter.dataset.ndsDemoChapter = String(start);
      const time = document.createElement('span');
      time.textContent = formatTime(start);
      chapter.append(time, document.createTextNode(title));
      chapter.addEventListener('click', () => {
        seek(start);
        video.focus({ preventScroll: true });
        video.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      });
      item.append(chapter);
      dialog.querySelector('#nds-demo-chapters ol').append(item);
      return chapter;
    });
    function highlightChapter() {
      const current = chapters.findLastIndex(([start]) => start <= video.currentTime + 0.05);
      chapterButtons.forEach((button, index) => {
        if (index === current) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
    }
    video.addEventListener('timeupdate', highlightChapter);
    highlightChapter();
    const speed = dialog.querySelector('#nds-demo-speed');
    speed.addEventListener('change', () => {
      video.defaultPlaybackRate = Number(speed.value);
      video.playbackRate = Number(speed.value);
    });
    video.addEventListener('ratechange', () => {
      const value = String(video.playbackRate);
      if (![...speed.options].some(option => option.value === value)) speed.add(new Option(`${value}x`, value));
      speed.value = value;
    });
    let pendingSeek = null;
    video.addEventListener('loadedmetadata', () => {
      if (pendingSeek !== null) {
        video.currentTime = pendingSeek;
        pendingSeek = null;
      }
      highlightChapter();
    });
    function seek(seconds) {
      pendingSeek = seconds;
      if (video.error) video.load();
      if (video.readyState >= 1) {
        video.currentTime = seconds;
        pendingSeek = null;
      }
      play();
    }
    function showStatus(index) {
      statusIndex = index;
      status.hidden = index === null;
      status.textContent = index === null ? '' : t(index);
    }
    function focusCanvas() {
      main.querySelector('button[data-nds-fullscreen]')?.focus({ preventScroll: true });
    }
    function play() {
      showStatus(null);
      const result = video.play();
      if (result) result.catch((error) => {
        if (error.name === 'AbortError') return; // Closing while loading cancels playback.
        if (error.name === 'NotAllowedError') showStatus(11);
        else {
          console.error('Demo playback failed.', error);
          showStatus(12);
          transcript.open = true;
        }
      });
    }
    function open(event) {
      returnFocus = event?.currentTarget;
      dialog.showModal();
      video.poster = new URL(`poster.jpg${scriptUrl.search}`, assetRoot).href;
      const needsLoad = !video.getAttribute('src') || video.error;
      if (needsLoad) {
        video.src = new URL(`walkthrough.mp4${scriptUrl.search}`, assetRoot).href;
        video.load();
      }
      seek(0);
    }
    function addSettingsEntry() {
      // The application remounts Settings. Anchor to its stable guide marker,
      // without changing React-owned children or depending on translated text.
      const guide = document.querySelector('[data-nds-guide="1"]');
      if (!guide || guide.parentElement.querySelector('#nds-demo-settings-entry')) return;
      const entry = document.createElement('section');
      entry.id = 'nds-demo-settings-entry';
      entry.innerHTML = `<button type="button" id="nds-demo-settings-open" aria-haspopup="dialog" aria-controls="nds-demo-dialog" aria-describedby="nds-demo-settings-description">
        ${icon}<span><strong data-demo-copy="13"></strong><span id="nds-demo-settings-description" data-demo-copy="14"></span></span></button>`;
      entry.querySelector('button').addEventListener('click', open);
      guide.parentElement.prepend(entry);
      localize();
    }
    const settingsObserver = new MutationObserver(addSettingsEntry);
    settingsObserver.observe(document.getElementById('root'), { childList: true, subtree: true });
    addSettingsEntry();
    dialog.querySelector('#nds-demo-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('#nds-demo-start').addEventListener('click', () => dialog.close());
    dialog.querySelector('#nds-demo-replay').addEventListener('click', () => seek(0));
    // Let native controls handle navigation/playback before stopping bubbling
    // shortcuts. Modified editing shortcuts are blocked by the early guard.
    dialog.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key !== 'Tab') return;
      const first = dialog.querySelector('#nds-demo-close');
      const last = transcript.querySelector('summary');
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    });
    dialog.addEventListener('close', () => {
      video.pause();
      if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus({ preventScroll: true });
      else focusCanvas();
    });
    // Keep the underlying Settings panel open while its modal viewer is used.
    for (const name of ['pointerdown', 'mousedown', 'click']) dialog.addEventListener(name, event => event.stopPropagation());
    dialog.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    video.addEventListener('error', () => { showStatus(12); transcript.open = true; });
    video.addEventListener('playing', () => {
      // A delayed play promise must not restart sound after the modal closes.
      if (!dialog.open) video.pause();
      else showStatus(null);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && dialog.open) video.pause();
    });
  }

  function ready() {
    const main = document.querySelector('main[data-nds-fullscreen-target]');
    if (!main) return false;
    mount(main);
    return true;
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (ready()) return;
    const observer = new MutationObserver(() => { if (ready()) observer.disconnect(); });
    observer.observe(document.getElementById('root'), { childList: true, subtree: true });
  }, { once: true });
})();
