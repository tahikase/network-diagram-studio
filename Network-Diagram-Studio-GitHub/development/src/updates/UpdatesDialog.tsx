import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n/useT';
import { useI18nStore } from '../i18n/i18n-store';
import releases from './release-history.json';
import { useUpdatesStore } from './updates-store';
import './updates.css';

const images = import.meta.glob<string>('./release-images/*.png', { eager: true, query: '?inline', import: 'default' });
type Release = typeof releases[number];
type Phase = 'before' | 'after';

function ReleaseImage({ release, phase }: { release: Release; phase: Phase }) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const image = release[phase];
  const src = images[`./release-images/${image.file}`];
  useEffect(() => {
    if (!src) console.error(`Network Diagram Studio release image is missing: ${image.file}`);
  }, [src, image.file]);
  return src && !failed
    ? <img src={src} alt={t(image.caption)} draggable={false}
        onError={() => {
          console.error(`Network Diagram Studio could not decode release image: ${image.file}`);
          setFailed(true);
        }} />
    : <p className="nds-updates-error" role="alert">{t('The release image is unavailable. Check the application package.')}</p>;
}

function HistoryDialog() {
  const t = useT();
  const lang = useI18nStore(state => state.lang);
  const hide = useUpdatesStore(state => state.hide);
  const returnTo = useUpdatesStore(state => state.returnTo);
  const storageError = useUpdatesStore(state => state.storageError);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const articleRefs = useRef(new Map<string, HTMLElement>());
  const imageOpener = useRef<HTMLButtonElement>(null);
  const imageScrollTop = useRef(0);
  const titleId = useId();
  const subtitleId = useId();
  const [active, setActive] = useState(releases[0].version);
  const [preview, setPreview] = useState<{ release: Release; phase: Phase } | null>(null);
  const dateFormat = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : lang === 'pt' ? 'pt-BR' : lang,
    { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const position = releases.findIndex(release => release.version === active) + 1;

  useEffect(() => {
    const element = dialog.current!;
    const background = [document.documentElement, document.body].map(node => ({ node, overflow: node.style.overflow }));
    const position = { left: window.scrollX, top: window.scrollY };
    for (const item of background) item.node.style.overflow = 'hidden';
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      for (const item of background) item.node.style.overflow = item.overflow;
      window.scrollTo({ ...position, behavior: 'instant' });
      if (returnTo?.isConnected && returnTo.getClientRects().length) returnTo.focus({ preventScroll: true });
      else document.querySelector<HTMLButtonElement>('[data-nds-settings-button]')?.focus({ preventScroll: true });
    };
  }, [returnTo]);

  const readPosition = () => {
    const body = scroll.current;
    if (!body || body.hidden) return;
    const max = body.scrollHeight - body.clientHeight;
    let nearest = releases[0].version, distance = Infinity;
    for (const release of releases) {
      const element = articleRefs.current.get(release.version);
      if (!element) continue;
      const target = Math.min(Math.max(0, element.offsetTop - 22), max);
      const delta = Math.abs(body.scrollTop - target);
      if (delta < distance) { distance = delta; nearest = release.version; }
    }
    setActive(nearest);
  };
  const jump = (version: string) => {
    const element = articleRefs.current.get(version);
    if (!element || !scroll.current) return;
    scroll.current.scrollTo({ top: element.offsetTop - 22,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    setActive(version);
  };
  const closeImage = () => {
    setPreview(null);
    requestAnimationFrame(() => {
      scroll.current?.scrollTo({ top: imageScrollTop.current, behavior: 'instant' });
      imageOpener.current?.focus({ preventScroll: true });
    });
  };

  return createPortal(
    <dialog ref={dialog} id="nds-update-history" className="nds-modal nds-updates-dialog"
      role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitleId}
      data-nds-updates-dialog="1"
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select:not([disabled]), [tabindex="0"]',
        )).filter(element => element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus({ preventScroll: true });
        }
      }}
      onCancel={event => { event.preventDefault(); if (preview) closeImage(); else hide(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
          if (preview) closeImage(); else hide();
        }
      }}>
      <header className="nds-updates-heading">
        <div className="nds-updates-heading-row">
          <div>
            <div className="nds-updates-brand">NETWORK DIAGRAM STUDIO</div>
            <h1 id={titleId}>{t("What's new")}</h1>
            <p id={subtitleId}>{t('Latest v{version} | {count} releases')
              .replace('{version}', releases[0].version).replace('{count}', String(releases.length))}</p>
          </div>
          <button ref={closeButton} type="button" className="nds-updates-close" data-nds-updates-close
            title={t('Close update history')} aria-label={t('Close update history')} onClick={hide}>
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        </div>
        {!preview ? <label className="nds-updates-jump">
          <span>{t('Jump to version')}</span>
          <select value={active} onChange={event => jump(event.target.value)} data-nds-updates-jump>
            {releases.map(release => <option key={release.version} value={release.version}>
              v{release.version} - {dateFormat.format(new Date(release.date + 'T00:00:00Z'))}
            </option>)}
          </select>
          <span className="nds-updates-order">{t('Newest first')}</span>
        </label> : <div className="nds-updates-image-tools">
          <button type="button" onClick={closeImage} data-nds-updates-back>{t('Back to release history')}</button>
          <span>v{preview.release.version}</span>
          {(['before', 'after'] as const).map(phase => <button type="button" key={phase}
            aria-pressed={preview.phase === phase} data-nds-updates-phase={phase}
            onClick={() => setPreview({ ...preview, phase })}>
            {t(phase === 'before' ? 'Before this update' : 'After this update')}
          </button>)}
        </div>}
      </header>
      {storageError && <p role="status" className="nds-updates-warning">{t(storageError)}</p>}
      <div ref={scroll} className="nds-updates-scroll nds-scroll" hidden={!!preview}
        tabIndex={0} aria-label={t('Scrollable release history')} onScroll={readPosition} data-nds-updates-scroll>
        {releases.map((release, index) => <article key={release.version} className="nds-updates-release"
          data-nds-release-version={release.version}
          ref={element => { if (element) articleRefs.current.set(release.version, element); else articleRefs.current.delete(release.version); }}>
          <div className="nds-updates-meta">
            <span className="nds-updates-version">v{release.version}</span>
            <span>{t(release.category)}</span>
            {index === 0 && <span className="nds-updates-latest">{t('Latest')}</span>}
            <time dateTime={release.date}>{dateFormat.format(new Date(release.date + 'T00:00:00Z'))}</time>
          </div>
          <h2>{t(release.title)}</h2>
          <p className="nds-updates-description">{t(release.description)}</p>
          <div className="nds-updates-comparison">
            {(['before', 'after'] as const).map(phase => <figure key={phase} data-nds-release-image={phase}>
              <div className="nds-updates-image-heading" data-phase={phase}>
                <strong>{t(phase === 'before' ? 'Before this update' : 'After this update')}</strong>
                <span>v{release[phase].version}</span>
              </div>
              <button type="button" className="nds-updates-image-button"
                aria-label={`${t('View larger image')}: v${release.version}, ${t(release[phase].caption)}`}
                onClick={event => {
                  imageOpener.current = event.currentTarget;
                  imageScrollTop.current = scroll.current?.scrollTop ?? 0;
                  setPreview({ release, phase });
                  requestAnimationFrame(() => dialog.current?.querySelector<HTMLButtonElement>('[data-nds-updates-back]')?.focus());
                }}>
                <ReleaseImage release={release} phase={phase} />
                <span className="nds-updates-enlarge">{t('View larger image')}</span>
              </button>
              <figcaption>{t(release[phase].caption)}</figcaption>
            </figure>)}
          </div>
          <p className="nds-updates-note">{t(release.note)}</p>
        </article>)}
      </div>
      {preview && <div className="nds-updates-image-preview nds-scroll" data-nds-updates-image-preview
        tabIndex={0} aria-label={t('Image preview')}>
        <h2>{t(preview.release[preview.phase].caption)}</h2>
        <ReleaseImage key={preview.release.version + preview.phase} release={preview.release} phase={preview.phase} />
      </div>}
      <footer className="nds-updates-footer">
        <span aria-live="polite">{preview ? t('Image preview') : t('Release {position} of {count}')
          .replace('{position}', String(position)).replace('{count}', String(releases.length))}</span>
        <span className="nds-updates-start">{t('History from v{version}').replace('{version}', releases[releases.length - 1].version)}</span>
        <button type="button" onClick={preview ? closeImage : hide} data-nds-updates-done>
          {t(preview ? 'Back to release history' : 'Back to diagram')} <kbd>Esc</kbd>
        </button>
      </footer>
    </dialog>, document.body,
  );
}

export function UpdatesDialog() {
  return useUpdatesStore(state => state.open) ? <HistoryDialog /> : null;
}
