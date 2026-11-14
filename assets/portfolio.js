const motionAllowed = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
const tiltProperties = ['--rx', '--ry', '--light-x', '--light-y'];

for (const panel of document.querySelectorAll('[data-tilt]')) {
  const reset = () => tiltProperties.forEach((property) => panel.style.removeProperty(property));
  panel.addEventListener('pointermove', (event) => {
    if (!motionAllowed.matches || event.pointerType !== 'mouse') return;
    const { left, top, width, height } = panel.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - left) / width));
    const y = Math.max(0, Math.min(1, (event.clientY - top) / height));
    panel.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
    panel.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
    panel.style.setProperty('--light-x', `${x * 100}%`);
    panel.style.setProperty('--light-y', `${y * 100}%`);
  });
  panel.addEventListener('pointerleave', reset);
  panel.addEventListener('pointercancel', reset);
  motionAllowed.addEventListener('change', reset);
}
