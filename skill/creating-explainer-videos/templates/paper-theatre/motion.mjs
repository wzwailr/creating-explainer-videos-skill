export function createMotionController({ root = document, duration = 1, gsap = globalThis.gsap } = {}) {
  const nodes = [...root.querySelectorAll("[data-motion='paper']")];
  if (gsap?.timeline) {
    const timeline = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    timeline.from(nodes, { y: 120, rotation: (index) => index % 2 ? 7 : -7, opacity: 0, duration: .75, stagger: .09 }, 0);
    return timeline;
  }
  return {
    duration: () => duration,
    paused: () => true,
    seek(seconds) {
      const progress = Math.max(0, Math.min(1, Number(seconds) / duration));
      nodes.forEach((node, index) => {
        const local = Math.max(0, Math.min(1, progress * 1.5 - index * .08));
        node.style.opacity = String(local);
        node.style.transform = `translateY(${(1 - local) * 120}px) rotate(${(1 - local) * (index % 2 ? 7 : -7)}deg)`;
      });
    },
  };
}
