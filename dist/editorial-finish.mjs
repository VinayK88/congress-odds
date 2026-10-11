// Presentation-only enhancements. No changes to the probability, model or map logic.
const progress = document.getElementById('reading-progress');
const returnButton = document.getElementById('back-to-top');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function syncReadingPosition() {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const pct = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
  if (progress) progress.style.width = pct.toFixed(2) + '%';
  if (returnButton) returnButton.hidden = window.scrollY < 650;
}
let pending = false;
window.addEventListener('scroll', () => {
  if (pending) return;
  pending = true;
  window.requestAnimationFrame(() => {
    syncReadingPosition();
    pending = false;
  });
}, { passive: true });
window.addEventListener('resize', syncReadingPosition);
window.addEventListener('load', syncReadingPosition);
if (returnButton) {
  returnButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
  });
}
syncReadingPosition();
