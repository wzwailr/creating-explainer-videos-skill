function pointAlongPath(path, progress) {
  if (!path?.getTotalLength || !path?.getPointAtLength) return { x: progress * 600, y: 0 };
  const point = path.getPointAtLength(path.getTotalLength() * progress);
  return { x: point.x, y: point.y };
}

export function createMotionController({ root = document, duration = 1, gsap = globalThis.gsap } = {}) {
  const path = root.querySelector("[data-signal-path]");
  const dot = root.querySelector("[data-signal-dot]");
  const depthNodes = [...root.querySelectorAll("[data-motion='depth']")];
  if (gsap?.timeline) {
    const timeline = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    timeline.from(depthNodes, { z: -420, rotationY: -14, opacity: 0, duration: .8, stagger: .1 }, 0);
    if (dot && path && globalThis.MotionPathPlugin) timeline.to(dot, { motionPath: { path, align: path, alignOrigin: [.5, .5] }, duration: .9 }, .1);
    else if (dot) timeline.to(dot, { x: 600, duration: .9 }, .1);
    return timeline;
  }
  return {
    duration: () => duration,
    paused: () => true,
    seek(seconds) {
      const progress = Math.max(0, Math.min(1, Number(seconds) / duration));
      depthNodes.forEach((node, index) => {
        const local = Math.max(0, Math.min(1, progress * 1.4 - index * .09));
        node.style.opacity = String(local);
        node.style.transform = `translateZ(${(1 - local) * -420}px) rotateY(${(1 - local) * -14}deg)`;
      });
      if (dot) {
        const point = pointAlongPath(path, progress);
        dot.style.transform = `translate(${point.x}px,${point.y}px)`;
      }
      if (path) {
        const length = path.getTotalLength?.() ?? 1000;
        path.style.strokeDasharray = String(length);
        path.style.strokeDashoffset = String(length * (1 - progress));
      }
    },
  };
}
