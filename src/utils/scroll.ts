/**
 * Smooth scrolling helper with URL hash synchronization
 */
export function scrollToSection(sectionId: string): void {
  if (typeof window === 'undefined') return;
  const targetId = sectionId.replace('#', '');
  const el = document.getElementById(targetId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
    if (window.location.hash !== `#${targetId}`) {
      window.history.pushState(null, '', `#${targetId}`);
    }
  }
}

/**
 * Scroll to top helper
 */
export function scrollToTop(): void {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (window.location.hash !== '#hero') {
    window.history.pushState(null, '', '#hero');
  }
}
