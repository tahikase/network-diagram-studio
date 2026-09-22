(function () {
  'use strict';

  const FEEDBACK = 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=v4j5cvGGr0GRqy180BHbR2VJmW1D0XZAg4tjAfjgezRUNE45SUdSRFFJS0VRWjQyWjk5RzAxMFBDRy4u';

  // [label, title] — the bundle's own wording for both strings, so the button
  // reads exactly as the Settings entry it replaces.
  const COPY = {
    en: ['Feedback', 'Share your feedback'],
    ja: ['\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af', '\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u3092\u9001\u308b'],
    de: ['Feedback', 'Teilen Sie uns Ihr Feedback mit'],
    es: ['Comentarios', 'Comparte tus comentarios'],
    fr: ['Commentaires', 'Partagez vos commentaires'],
    pt: ['Coment\u00e1rios', 'Envie os seus coment\u00e1rios'],
    ko: ['\ud53c\ub4dc\ubc31', '\ud53c\ub4dc\ubc31 \ubcf4\ub0b4\uae30'],
    zh: ['\u53cd\u9988', '\u5206\u4eab\u4f60\u7684\u53cd\u9988']
  };

  let button = null;
  let headerWatch = null;
  let header = null;

  const copy = () => COPY[document.documentElement.lang] || COPY.en;

  function paint() {
    if (!button) return;
    const [label, title] = copy();
    button.querySelector('.nds-feedback-label').textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
  }

  function build() {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'nds-feedback-button';
    button.setAttribute('data-nds-feedback-header', '1');

    const icon = document.createElement('span');
    icon.className = 'nds-feedback-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true" focusable="false">
        <path d="M20 4H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3v4l5-4h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/>
        <circle cx="7" cy="11" r="1" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="11" r="1" fill="currentColor" stroke="none"/>
        <circle cx="17" cy="11" r="1" fill="currentColor" stroke="none"/>
      </svg>`;

    const label = document.createElement('span');
    label.className = 'nds-feedback-label';

    button.append(icon, label);
    button.addEventListener('click', () => {
      window.open(FEEDBACK, '_blank', 'noopener,noreferrer');
    });
    paint();
  }

  // The shortcut stays the same in every language. Mount before its top-level
  // header group, and restore the position only if a React render changes it.
  function mount() {
    const found = document.querySelector('header');
    const undo = found && found.querySelector('button[title*="Ctrl+Z"]');
    if (!undo) return false;
    let anchor = undo;
    while (anchor.parentElement !== found) anchor = anchor.parentElement;
    if (!button) build();
    if (found !== header) {
      header = found;
      if (headerWatch) headerWatch.disconnect();
      headerWatch = new MutationObserver(mount);
      headerWatch.observe(header, { childList: true, subtree: true });
    }
    if (button.parentElement !== header || button.nextElementSibling !== anchor) {
      header.insertBefore(button, anchor);
    }
    return true;
  }

  function start() {
    new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    if (mount()) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (mount() || tries > 600) window.clearInterval(timer);
    }, 60);
  }

  window.ndsFeedback = {
    url: FEEDBACK,
    open: () => window.open(FEEDBACK, '_blank', 'noopener,noreferrer'),
    button: () => button
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}());
