export function createMotionController({ root = document, duration = 1, gsap = globalThis.gsap } = {}) {
  const strokes = [...root.querySelectorAll("[data-motion='draw']")];
  const notes = [...root.querySelectorAll("[data-motion='note']")];
  if (gsap?.timeline) {
    const timeline = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
    strokes.forEach((stroke, index) => {
      const length = stroke.getTotalLength?.() ?? 1000;
      gsap.set(stroke, { strokeDasharray: length, strokeDashoffset: length });
      timeline.to(stroke, { strokeDashoffset: 0, duration: .55 }, index * .16);
    });
    timeline.from(notes, { scale: .65, rotation: -5, opacity: 0, duration: .35, stagger: .12 }, .2);
    return timeline;
  }
  return {
    duration: () => duration,
    paused: () => true,
    seek(seconds) {
      const progress = Math.max(0, Math.min(1, Number(seconds) / duration));
      strokes.forEach((stroke, index) => {
        const local = Math.max(0, Math.min(1, progress * 1.45 - index * .09));
        const length = stroke.getTotalLength?.() ?? 1000;
        stroke.style.strokeDasharray = String(length);
        stroke.style.strokeDashoffset = String(length * (1 - local));
      });
      notes.forEach((note, index) => {
        const local = Math.max(0, Math.min(1, progress * 1.55 - index * .11));
        note.style.opacity = String(local);
        note.style.transform = `scale(${.65 + .35 * local}) rotate(${(1 - local) * -5}deg)`;
      });
    },
  };
}
