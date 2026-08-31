import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { readJson } from "./json.mjs";
import { compileVisualProgram, loadVisualProgram } from "./visual-dsl.mjs";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function jsonForScript(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function resolvedCues(project, cueDocument) {
  if (Array.isArray(cueDocument.cues) && cueDocument.cues.length) return cueDocument.cues;
  return [{
    id: "C01",
    sceneId: "S01",
    start: 0,
    duration: 8,
    caption: project.topic,
    tts: project.topic,
    focus: "input-change-output",
    visualEvent: "establish-mechanism",
  }];
}

function resolvedScenes(project, sceneDocument, cues) {
  const source = Array.isArray(sceneDocument.scenes) && sceneDocument.scenes.length
    ? sceneDocument.scenes
    : [{ id: "S01", title: project.title, purpose: project.topic, cueIds: cues.map((cue) => cue.id) }];
  return source.map((scene, index) => {
    const sceneCues = cues.filter((cue) => scene.cueIds?.includes(cue.id) || cue.sceneId === scene.id);
    const attached = sceneCues.length ? sceneCues : index === 0 ? cues : [];
    const start = attached.length ? Math.min(...attached.map((cue) => cue.start)) : 0;
    const end = attached.length ? Math.max(...attached.map((cue) => cue.start + cue.duration)) : start + 1;
    return { ...scene, cueIds: attached.map((cue) => cue.id), start, duration: Math.max(.1, end - start) };
  });
}

function paperScene(scene, project) {
  return `<div class="paper-stage"><div class="paper-kicker">PAPER THEATRE · ${escapeHtml(scene.id)}</div><h1 class="paper-title" data-motion="paper">${escapeHtml(scene.title || project.title)}</h1><p class="paper-copy" data-motion="paper">${escapeHtml(scene.purpose || project.topic)}</p><div class="paper-mechanism"><span class="paper-node" data-motion="paper">输入</span><i class="paper-link"></i><span class="paper-node" data-motion="paper">内部变化</span><i class="paper-link"></i><span class="paper-node" data-motion="paper">输出</span></div></div>`;
}

function spatialScene(scene, project) {
  return `<div class="spatial-grid"></div><div class="chamber-stage"><div class="chamber-kicker">SPATIAL CHAMBER · ${escapeHtml(scene.id)}</div><h1 class="chamber-title" data-motion="depth">${escapeHtml(scene.title || project.title)}</h1><p class="chamber-copy" data-motion="depth">${escapeHtml(scene.purpose || project.topic)}</p><div class="signal-lane"><span class="depth-card" data-motion="depth">INPUT</span><svg width="240" height="100" viewBox="0 0 240 100"><path data-signal-path d="M20 74 C78 5 160 96 220 28" fill="none" stroke="#3af2ff" stroke-width="5"/><circle data-signal-dot cx="12" cy="12" r="12" fill="#c6ff3d"/></svg><span class="depth-card" data-motion="depth">CHANGE</span><span class="depth-card" data-motion="depth">OUTPUT</span></div></div>`;
}

function inkScene(scene, project) {
  return `<div class="ink-stage"><div class="ink-kicker">INK EXPLAINER · ${escapeHtml(scene.id)}</div><h1 class="ink-title" data-motion="note">${escapeHtml(scene.title || project.title)}</h1><p class="ink-copy" data-motion="note">${escapeHtml(scene.purpose || project.topic)}</p><div class="derivation-board"><span class="derivation-node" data-motion="note">输入</span><svg width="190" height="70" viewBox="0 0 190 70"><path class="rough-line" data-motion="draw" d="M5 42 C55 8 115 68 180 26"/></svg><span class="derivation-node" data-motion="note">机制</span><svg width="190" height="70" viewBox="0 0 190 70"><path class="rough-line" data-motion="draw" d="M5 35 C64 70 128 5 182 38"/></svg><span class="derivation-node" data-motion="note">输出</span></div></div>`;
}

function sceneMarkup(scene, project, visualCompilation) {
  const body = visualCompilation?.markupByScene?.[scene.id] ?? (project.template === "paper-theatre"
    ? paperScene(scene, project)
    : project.template === "spatial-chamber"
      ? spatialScene(scene, project)
      : inkScene(scene, project));
  return `<section id="scene-${escapeHtml(scene.id)}" class="clip scene" data-scene-id="${escapeHtml(scene.id)}" data-start="${scene.start.toFixed(3)}" data-duration="${scene.duration.toFixed(3)}">${body}</section>`;
}

function captionMarkup(cue) {
  return `<div id="caption-${escapeHtml(cue.id)}" class="clip caption" data-cue-id="${escapeHtml(cue.id)}" data-start="${Number(cue.start).toFixed(3)}" data-duration="${Number(cue.duration).toFixed(3)}"><div class="caption-inner">${escapeHtml(cue.caption)}</div></div>`;
}

export async function buildRenderer(projectRoot) {
  const root = path.resolve(projectRoot);
  const rendererRoot = path.join(root, "renderer");
  const project = await readJson(path.join(root, "project.json"));
  const cueDocument = await readJson(path.join(root, "script", "cues.json"));
  const sceneDocument = await readJson(path.join(root, "scene-spec.json"));
  const visualProgram = await loadVisualProgram(root);
  const visualCompilation = visualProgram?.complete === true ? await compileVisualProgram(root) : null;
  const cues = resolvedCues(project, cueDocument);
  const scenes = resolvedScenes(project, sceneDocument, cues);
  const duration = Math.max(...cues.map((cue) => Number(cue.start) + Number(cue.duration)));
  const width = Number(project.frame?.width || 1920);
  const height = Number(project.frame?.height || 1080);
  const fps = Number(project.frame?.fps || 30);
  const hasGsap = await exists(path.join(rendererRoot, "assets", "gsap.min.js"));
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(project.title)}</title><link rel="stylesheet" href="./template/scene.css"><style>@font-face{font-family:"Noto Sans SC";src:local("Noto Sans SC"),local("NotoSansSC-VF");font-display:block}@font-face{font-family:"Microsoft YaHei";src:local("Microsoft YaHei");font-display:block}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{background:#000}.composition{position:relative;width:${width}px;height:${height}px;overflow:hidden}.clip{position:absolute;inset:0}.scene{z-index:2;visibility:hidden}.visual-program{position:absolute;inset:0;overflow:hidden}.visual-element{position:absolute;transform-origin:center;will-change:transform,opacity,filter}.visual-node,.visual-text,.visual-annotation,.visual-group{display:flex;align-items:center;justify-content:center;padding:18px 24px;text-align:center}.visual-node{border:2px solid currentColor;border-radius:22px;font:750 36px/1.2 "Noto Sans SC","Microsoft YaHei",sans-serif}.visual-text{font:800 40px/1.2 "Noto Sans SC","Microsoft YaHei",sans-serif}.visual-annotation{border-left:5px solid currentColor;font:650 28px/1.3 "Noto Sans SC","Microsoft YaHei",sans-serif}.visual-group{border:2px solid currentColor;border-radius:30px}.visual-shape{border:3px solid currentColor}.shape-circle{border-radius:50%}.shape-diamond{transform:rotate(45deg)}.visual-connector{inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}.visual-connector path{fill:none;stroke:currentColor;stroke-width:5;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}.spatial-chamber .visual-node{color:#d8fbff;background:#092632d9;box-shadow:0 0 28px #3af2ff42}.spatial-chamber .visual-connector,.spatial-chamber .visual-annotation{color:#3af2ff}.paper-theatre .visual-node{color:#171510;background:#fff9df;box-shadow:9px 11px 0 #12110e}.paper-theatre .visual-connector,.paper-theatre .visual-annotation{color:#ed4d31}.ink-explainer .visual-node{color:#1c211e;background:#f8f2df;border-style:dashed}.ink-explainer .visual-connector,.ink-explainer .visual-annotation{color:#c43d2d}.caption{z-index:20;display:flex;align-items:flex-end;justify-content:center;padding:0 72px 28px;visibility:hidden;pointer-events:none}.caption-inner{width:min(1650px,calc(100% - 144px));padding:18px 34px;background:#05070ce8;color:#fff;border-top:2px solid #68e7ff;font:760 34px/1.3 "Noto Sans SC","Microsoft YaHei",sans-serif;text-align:center}</style>${hasGsap ? '<script src="./assets/gsap.min.js"></script>' : ""}</head>
<body class="${escapeHtml(project.template)}"><main id="composition" class="composition" data-composition-id="main" data-width="${width}" data-height="${height}" data-fps="${fps}" data-duration="${duration.toFixed(3)}" data-template="${escapeHtml(project.template)}">${scenes.map((scene) => sceneMarkup(scene, project, visualCompilation)).join("")}${cues.map(captionMarkup).join("")}</main>
<script type="module">import {createMotionController} from './template/motion.mjs';const duration=${duration.toFixed(3)};const visualActions=${jsonForScript(visualCompilation?.actionsByScene ?? {})};const sceneData=${jsonForScript(scenes.map(({ id, start, duration: sceneDuration }) => ({ id, start, duration: sceneDuration })))};const clamp=value=>Math.max(0,Math.min(1,value));function applyVisualActions(localTime,actions,root){const elements=[...root.querySelectorAll('[data-visual-element-id]')];for(const element of elements){element.style.opacity='1';element.style.filter='none';element.style.transform=element.classList.contains('shape-diamond')?'rotate(45deg)':'none';const path=element.querySelector('[data-visual-path]');if(path){path.style.strokeDasharray='none';path.style.strokeDashoffset='0';}}for(const action of actions){const target=root.querySelector('[data-visual-element-id="'+action.target+'"]');if(!target)continue;const progress=clamp((localTime-action.start)/Math.max(.001,action.duration));const base=target.classList.contains('shape-diamond')?'rotate(45deg) ':'';if(action.kind==='appear'){target.style.opacity=String(progress);target.style.transform=base+'scale('+(0.88+0.12*progress)+')';}else if(action.kind==='exit'){target.style.opacity=String(1-progress);target.style.transform=base+'scale('+(1-0.08*progress)+')';}else if(action.kind==='move'){target.style.transform=base+'translate('+(action.x*100*progress)+'%,'+(action.y*100*progress)+'%)';}else if(action.kind==='focus'){target.style.filter='brightness('+(1+0.45*progress)+') saturate('+(1+0.35*progress)+')';target.style.transform=base+'scale('+(1+0.08*progress)+')';}else if(action.kind==='draw'){const pathElement=target.querySelector('[data-visual-path]');if(pathElement){pathElement.style.strokeDasharray='1';pathElement.style.strokeDashoffset=String(1-progress);}}else if(action.kind==='pulse'){const pulse=Math.sin(Math.PI*progress);target.style.transform=base+'scale('+(1+0.09*pulse)+')';}else if(action.kind==='replace'){const replacement=root.querySelector('[data-visual-element-id="'+action.with+'"]');target.style.opacity=String(1-progress);if(replacement)replacement.style.opacity=String(progress);}}}const scenes=sceneData.map(meta=>{const element=document.querySelector('[data-scene-id="'+meta.id+'"]');return {...meta,element,controller:createMotionController({root:element,duration:meta.duration,gsap:globalThis.gsap})};});const captions=[...document.querySelectorAll('.caption')];function seek(seconds){const time=Math.max(0,Math.min(duration,Number(seconds)||0));for(const scene of scenes){const active=time>=scene.start&&time<scene.start+scene.duration+.001;scene.element.style.visibility=active?'visible':'hidden';if(active){const localTime=Math.max(0,time-scene.start);scene.controller.seek(localTime);applyVisualActions(localTime,visualActions[scene.id]||[],scene.element);}}for(const caption of captions){const start=Number(caption.dataset.start),end=start+Number(caption.dataset.duration);caption.style.visibility=time>=start&&time<end?'visible':'hidden';}}const timeline={duration:()=>duration,seek,paused:()=>true};window.__timelines=window.__timelines||{};window.__timelines["main"]=timeline;window.__explainer={duration,template:${jsonForScript(project.template)},visualProgram:${visualCompilation ? "true" : "false"},seek};seek(0);</script></body></html>
`;
  const target = path.join(rendererRoot, "index.html");
  await writeFile(target, html, "utf8");
  return { path: target, html, duration, scenes, cues, template: project.template, visualProgram: Boolean(visualCompilation) };
}

export async function buildCover(projectRoot) {
  const root = path.resolve(projectRoot);
  const project = await readJson(path.join(root, "project.json"));
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(project.title)} 封面</title><link rel="stylesheet" href="./template/cover.css"><style>*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden}body{font-family:"Noto Sans SC","Microsoft YaHei",sans-serif}.series-cluster{font-size:27px}.cover-question{font-weight:750}.cover-visual{display:grid;place-items:center}.cover-flow{display:grid;gap:34px;font-size:38px;text-align:center}.cover-flow i{height:5px;background:currentColor}</style></head><body><main class="cover ${escapeHtml(project.template)}"><div class="series-cluster"><span>EXPLAINER VIDEO</span><span>MECHANISM / PROCESS</span></div><h1 class="cover-title">${escapeHtml(project.title)}</h1><p class="cover-question">${escapeHtml(project.topic)}</p><section class="cover-visual" aria-label="输入经过内部机制产生输出"><div class="cover-flow"><b>输入</b><i></i><b>内部变化</b><i></i><b>输出</b></div></section></main></body></html>\n`;
  const target = path.join(root, "renderer", "cover.html");
  await writeFile(target, html, "utf8");
  return { path: target, html, template: project.template };
}
