/** Product gallery: the thumbnail buttons show their view and hide the others. */
export function initProductGalleries(): void {
  for (const gallery of document.querySelectorAll<HTMLElement>('[data-js="product-gallery"]')) {
    const buttons = [...gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-show]')];
    const panels = [...gallery.querySelectorAll<HTMLElement>('[data-gallery-panel]')];
    for (const button of buttons) {
      button.addEventListener('click', () => {
        const view = button.dataset['galleryShow'];
        for (const panel of panels) panel.hidden = panel.dataset['galleryPanel'] !== view;
        for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      });
    }
  }
}
