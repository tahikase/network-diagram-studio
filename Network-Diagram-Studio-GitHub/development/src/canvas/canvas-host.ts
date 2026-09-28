/** Resources, shapes and pencil strokes are siblings inside the canvas host. */
export function getCanvasHost(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-nds-fullscreen-target]') ??
    document.querySelector<HTMLElement>('.react-flow');
}
