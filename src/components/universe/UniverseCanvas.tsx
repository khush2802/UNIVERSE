'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useWebGLSupport } from '@/hooks/useWebGLSupport';
import { DOMAINS, type DomainId } from '@/lib/domains';
import { profile } from '@/data/profile';
import { projectCounts } from '@/lib/universe';
import type { Project } from '@/types/project';
import { DomainPanel } from './DomainPanel';
import { DomainButtons, OrbitFallback } from './OrbitFallback';
import type { ScreenPoint } from './Scene';

const Scene = dynamic(
  () => import('./Scene').then((m) => ({ default: m.Scene })),
  { ssr: false },
);

/**
 * Host for the universe.
 *
 * This component owns all interaction state. The 3D scene, the 2D
 * fallback and the HTML buttons are three views of the same state, so
 * selecting a domain behaves identically however you got there — and a
 * device without WebGL loses the visuals, not the functionality (§51).
 */
export function UniverseCanvas({ projects = [] }: { projects?: Project[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Map<DomainId | '__star__', HTMLDivElement>>(new Map());

  const [nearViewport, setNearViewport] = useState(false);
  const [visible, setVisible] = useState(false);
  const [compact, setCompact] = useState(false);
  const [hoveredId, setHoveredId] = useState<DomainId | null>(null);
  const [selectedId, setSelectedId] = useState<DomainId | null>(null);
  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  /**
   * Zoom, as a multiplier on the camera's home distance.
   *
   * 0.42 puts the camera close enough to fill the frame with the star;
   * 2.4 pulls back far enough to hold every orbit including Academics.
   * Held in a ref so a wheel gesture never triggers a React render.
   */
  const zoomRef = useRef(1);

  const counts = projectCounts(projects);

  const reduced = useReducedMotion();
  const webgl = useWebGLSupport();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Mount early enough that the scene is ready when scrolled to...
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          preload.disconnect();
        }
      },
      { rootMargin: '600px' },
    );

    // ...but only run the frame loop while it's actually on screen.
    const onScreen = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );

    preload.observe(el);
    onScreen.observe(el);

    return () => {
      preload.disconnect();
      onScreen.disconnect();
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)');
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  /**
   * Wheel zoom, with a deliberate escape hatch.
   *
   * Capturing the wheel inside a section is how a page becomes impossible
   * to scroll past. So the wheel is only intercepted while there is zoom
   * left to give: once the multiplier is clamped at either end, the
   * handler returns without calling preventDefault and the browser scrolls
   * the page as usual. Reaching the limit is the gesture to continue past
   * the section, which is what a visitor will try anyway.
   *
   * Attached manually because React's synthetic wheel listener is passive,
   * and a passive listener cannot preventDefault.
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const MIN_ZOOM = 0.42;
    const MAX_ZOOM = 2.4;

    const onWheel = (event: WheelEvent) => {
      const current = zoomRef.current;
      // deltaMode 1 is lines rather than pixels (Firefox); scale it up.
      const step = event.deltaY * (event.deltaMode === 1 ? 0.02 : 0.0013);
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * (1 + step)));

      // No change means we're clamped — hand the gesture back to the page.
      if (Math.abs(next - current) < 0.0001) return;

      event.preventDefault();
      zoomRef.current = next;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleSelect = useCallback((id: DomainId | null) => {
    setSelectedProject(null);
    setSelectedId((current) => (current === id ? null : id));
  }, []);

  // Selecting a project also focuses its domain, so the camera moves to
  // the right neighbourhood and the moon isn't inspected in isolation.
  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  /**
   * Positions the HTML labels.
   *
   * Writes transforms straight to the DOM rather than going through React
   * state. Sixty state updates a second, each re-rendering six labels,
   * would cost far more than the CSS transform it produces.
   */
  const handleProject = useCallback((points: ScreenPoint[]) => {
    for (const point of points) {
      const el = labelRefs.current.get(point.id);
      if (!el) continue;

      el.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
      el.style.opacity = point.hidden ? '0' : '1';
    }
  }, []);

  const showCanvas = webgl === 'available' && nearViewport && !compact;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="relative h-[70svh] min-h-[420px] w-full overflow-hidden"
      >
        {showCanvas && (
          <>
            <Canvas
              dpr={[1, 2]}
              camera={{ position: [0, 10, 24], fov: 46 }}
              frameloop={reduced ? 'demand' : visible ? 'always' : 'never'}
              gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
              style={{ background: 'transparent' }}
            >
              <Scene
                reduced={reduced}
                starCount={700}
                hoveredId={hoveredId}
                selectedId={selectedId}
                onHover={setHoveredId}
                onSelect={handleSelect}
                onProject={handleProject}
                projects={projects}
                hoveredProjectId={hoveredProject?.id ?? null}
                selectedProjectId={selectedProject?.id ?? null}
                onHoverProject={setHoveredProject}
                onSelectProject={handleSelectProject}
                zoomRef={zoomRef}
              />
            </Canvas>

            {/* Labels live in the DOM, above the canvas. Real text: it
                stays crisp at any zoom and a screen reader can read it,
                neither of which is true of text drawn into a canvas. */}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {/* Centre. Rendered as HTML rather than as a texture on the
                  sphere: a letter painted onto a rotating ball would turn
                  away from the viewer, and text on a canvas can't be
                  selected or read by a screen reader. */}
              <div
                ref={(el) => {
                  if (el) labelRefs.current.set('__star__', el);
                  else labelRefs.current.delete('__star__');
                }}
                className="absolute left-0 top-0 text-center transition-opacity duration-200"
                style={{ opacity: 0 }}
              >
                <span className="block font-[family-name:var(--font-display)] text-3xl font-bold text-[#3a2a12] mix-blend-multiply">
                  K
                </span>
              </div>

              {Object.values(DOMAINS).map((domain) => (
                <div
                  key={domain.id}
                  ref={(el) => {
                    if (el) labelRefs.current.set(domain.id, el);
                    else labelRefs.current.delete(domain.id);
                  }}
                  className="absolute left-0 top-0 whitespace-nowrap transition-opacity duration-200"
                  style={{ opacity: 0 }}
                >
                  <span
                    className="label-technical block translate-y-8 rounded-full px-2 py-0.5 text-[length:var(--text-2xs)]"
                    style={{
                      color:
                        hoveredId === domain.id || selectedId === domain.id
                          ? `var(${domain.accentVar})`
                          : 'var(--color-ink-faint)',
                    }}
                  >
                    {domain.label}
                    {counts[domain.id] > 0 && (
                      <span className="ml-1.5 opacity-60">
                        {counts[domain.id]}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Below 768px, and wherever WebGL is missing, the flat map is the
            universe. §53: mobile is not the desktop scene made smaller. */}
        {(compact || webgl === 'unavailable') && nearViewport && (
          <div className="absolute inset-0 p-6">
            <OrbitFallback selectedId={selectedId} onSelect={handleSelect} />
          </div>
        )}

        {/* The centre is Khush. Stated in the DOM, not only in the scene
            — §61 again: the 3D view is reinforcement, never the only
            place information lives. */}
        {showCanvas && !selectedId && !selectedProject && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center">
            <span className="label-technical text-[length:var(--text-xs)]">
              {profile.name.toUpperCase()}
            </span>
          </div>
        )}

        {hoveredProject && (
          <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2">
            <span className="glass rounded-full px-3 py-1 text-sm">
              {hoveredProject.name}
            </span>
          </div>
        )}

        {showCanvas && (
          <ul className="pointer-events-none absolute right-6 top-6 space-y-1 text-right">
            {['Hover to explore', 'Click to focus', 'Scroll to zoom'].map((hint) => (
              <li
                key={hint}
                className="label-technical text-[length:var(--text-2xs)]"
              >
                {hint}
              </li>
            ))}
          </ul>
        )}

        {webgl === 'checking' && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="label-technical">Preparing the universe</span>
          </div>
        )}

        <DomainPanel
          domainId={selectedId}
          projects={projects}
          selectedProject={selectedProject}
          onClose={() => {
            setSelectedId(null);
            setSelectedProject(null);
          }}
        />
      </div>

      {/* Always present, on every device. §61 forbids putting critical
          information only inside the 3D scene, and this is also the
          keyboard path into the universe. */}
      <div className="mt-10">
        <DomainButtons
          selectedId={selectedId}
          hoveredId={hoveredId}
          counts={counts}
          onSelect={handleSelect}
          onHover={setHoveredId}
        />
      </div>

      {webgl === 'unavailable' && (
        <p className="mx-auto mt-6 max-w-6xl px-6 text-sm text-[var(--color-ink-faint)]">
          The 3D view isn&rsquo;t available on this device, so the map above is
          shown flat. Everything on this site works without it.
        </p>
      )}
    </div>
  );
}
