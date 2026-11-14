const motionAllowed = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');

for (const card of document.querySelectorAll('.project[data-tilt]')) {
  card.addEventListener('pointermove', (event) => {
    if (!motionAllowed.matches || event.pointerType !== 'mouse') return;
    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    card.style.setProperty('--rx', `${y * -7}deg`);
    card.style.setProperty('--ry', `${x * 7}deg`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.removeProperty('--rx');
    card.style.removeProperty('--ry');
  });
}
