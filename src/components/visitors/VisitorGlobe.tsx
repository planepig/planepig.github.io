'use client';

import createGlobe from 'cobe';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

export interface VisitorLocation {
  code: string;
  name: string;
  count: number;
  coordinates: number[] | null;
  localName?: string | null;
  regions?: VisitorLocation[];
}

export default function VisitorGlobe({ locations }: { locations: VisitorLocation[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const zoom = useRef(1);
  const points = useMemo(() => locations.flatMap(country => {
    if (country.code !== 'CN' || !country.regions?.length) return [country];
    return country.regions.map(region => ({ ...region, coordinates: region.coordinates ?? country.coordinates }));
  }), [locations]);
  const firstLocation = points.find(location => location.coordinates)?.coordinates;
  const initialRotation = firstLocation
    ? { phi: Math.PI * 1.5 - firstLocation[1] * Math.PI / 180, theta: firstLocation[0] * Math.PI / 180 }
    : { phi: -0.2, theta: 0.25 };
  const rotation = useRef({ ...initialRotation });
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const playing = useRef(true);
  const [paused, setPaused] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => setDark(root.classList.contains('dark'));
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setPaused(reduced.matches);
    updateMotion();
    reduced.addEventListener('change', updateMotion);
    return () => { observer.disconnect(); reduced.removeEventListener('change', updateMotion); };
  }, []);

  useEffect(() => { playing.current = !paused; }, [paused]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let size = element.clientWidth;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    let visible = true;
    let previous = performance.now();
    const resize = new ResizeObserver(() => { size = element.clientWidth; });
    resize.observe(element);
    const visibility = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; });
    visibility.observe(element);
    const largest = Math.max(1, ...points.map(location => location.count));
    let globe: ReturnType<typeof createGlobe> | undefined;
    try {
      globe = createGlobe(element, {
        devicePixelRatio: ratio, width: size * ratio, height: size * ratio,
        phi: rotation.current.phi, theta: rotation.current.theta,
        dark: dark ? 1 : 0, diffuse: 1.7, mapSamples: 24000,
        mapBrightness: dark ? 5 : 1.8, mapBaseBrightness: 0,
        baseColor: dark ? [0.22, 0.27, 0.34] : [0.8, 0.83, 0.85],
        markerColor: [0.83, 0.58, 0.28],
        glowColor: dark ? [0.055, 0.075, 0.11] : [0.98, 0.98, 0.97],
        markers: points.filter(location => location.coordinates).map(location => ({
          location: location.coordinates as [number, number],
          size: 0.02 + 0.05 * Math.sqrt(location.count / largest),
        })),
        onRender(state) {
          const now = performance.now();
          if (playing.current && !dragging.current && visible && !document.hidden) {
            rotation.current.phi += Math.min(now - previous, 50) * 0.0001;
          }
          previous = now;
          state.phi = rotation.current.phi;
          state.theta = rotation.current.theta;
          state.scale = zoom.current;
          state.width = size * ratio;
          state.height = size * ratio;
        },
      });
      setUnavailable(false);
    } catch { setUnavailable(true); }
    return () => { resize.disconnect(); visibility.disconnect(); globe?.destroy(); };
  }, [points, dark]);

  const focusLocation = (location: VisitorLocation) => {
    setSelected(location.code);
    setPaused(true);
    zoom.current = location.code.startsWith('CN-') && location.coordinates ? 1.45 : 1;
    if (location.coordinates) {
      const [latitude, longitude] = location.coordinates;
      rotation.current = { phi: Math.PI * 1.5 - longitude * Math.PI / 180, theta: latitude * Math.PI / 180 };
    }
  };

  return <section className="grid overflow-hidden rounded-2xl border border-neutral-200/70 bg-neutral-50/40 lg:grid-cols-[1.65fr_1fr]" aria-label="Visitor locations">
    <div className="relative flex min-w-0 flex-col items-center justify-center px-3 py-6 sm:px-8">
      <div className="relative w-full max-w-[580px]">
        <canvas
          ref={canvas}
          className="aspect-square w-full touch-none cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-accent"
          role="img"
          aria-label="Interactive globe of cumulative visitor locations. Drag or use arrow keys to rotate. The same counts are listed alongside."
          tabIndex={0}
          onPointerDown={event => {
            dragging.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
            setPaused(true);
            setSelected(null);
          }}
          onPointerMove={event => {
            if (!dragging.current) return;
            rotation.current.phi += (event.clientX - dragging.current.x) / 180;
            rotation.current.theta = Math.max(-1.2, Math.min(1.2,
              rotation.current.theta + (event.clientY - dragging.current.y) / 180));
            dragging.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={() => { dragging.current = null; }}
          onPointerCancel={() => { dragging.current = null; }}
          onLostPointerCapture={() => { dragging.current = null; }}
          onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault(); setPaused(true); setSelected(null);
            rotation.current.phi += event.key === 'ArrowLeft' ? -0.15 : event.key === 'ArrowRight' ? 0.15 : 0;
            rotation.current.theta = Math.max(-1.2, Math.min(1.2, rotation.current.theta +
              (event.key === 'ArrowUp' ? -0.1 : event.key === 'ArrowDown' ? 0.1 : 0)));
          }}
        />
        {unavailable && <p role="status" className="absolute inset-0 flex items-center justify-center px-10 text-center text-sm text-neutral-500">The 3D globe is unavailable in this browser. All visitor locations are listed alongside.</p>}
      </div>
      <div className="flex items-center gap-4 text-xs text-neutral-500">
        <span>Drag to explore</span><span aria-hidden="true">·</span>
        <button className="flex items-center gap-1.5 hover:text-accent" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume globe rotation' : 'Pause globe rotation'}>
          {paused ? <Play size={12} /> : <Pause size={12} />}{paused ? 'Rotate' : 'Pause'}
        </button>
        <button className="px-1 hover:text-accent" aria-label="Zoom out" onClick={() => { zoom.current = Math.max(0.8, zoom.current - 0.2); }}>−</button>
        <button className="px-1 hover:text-accent" aria-label="Zoom in" onClick={() => { zoom.current = Math.min(2.4, zoom.current + 0.2); }}>+</button>
        <button className="hover:text-accent" aria-label="Reset globe orientation" onClick={() => { rotation.current = { ...initialRotation }; zoom.current = 1; setSelected(null); }}><RotateCcw size={13} /></button>
      </div>
    </div>
    <div className="border-t border-neutral-200/60 p-6 sm:p-8 lg:border-l lg:border-t-0">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-primary">Across the globe</h2>
        <span className="text-xs text-neutral-500">Visits</span>
      </div>
      {locations.length ? <ol className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
        {locations.map(location => <li key={location.code}>
          <button onClick={() => focusLocation(location)} aria-pressed={selected === location.code}
            className={`relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-neutral-100 ${selected === location.code ? 'bg-neutral-100 text-accent' : 'text-primary'}`}>
            <span className="absolute bottom-0 left-3 h-px bg-accent/40" style={{ width: `${(location.count / locations[0].count) * 85}%` }} />
            <span>{location.name}</span><span className="tabular-nums text-neutral-500">{location.count.toLocaleString('en-US')}</span>
          </button>
          {!!location.regions?.length && <ul className="ml-3 border-l border-neutral-200 pl-3 py-1">
            {location.regions.map(region => <li key={region.code}>
              {region.coordinates ? <button onClick={() => focusLocation(region)} aria-pressed={selected === region.code}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-xs hover:bg-neutral-100 ${selected === region.code ? 'text-accent bg-neutral-100' : 'text-neutral-600'}`}>
                <span>{region.name}{region.localName && <span className="ml-1.5 text-neutral-500">{region.localName}</span>}</span>
                <span className="tabular-nums">{region.count.toLocaleString('en-US')}</span>
              </button> : <div className="flex items-center justify-between gap-3 px-2 py-2 text-xs text-neutral-500">
                <span>{region.name}</span><span className="tabular-nums">{region.count.toLocaleString('en-US')}</span>
              </div>}
            </li>)}
          </ul>}
        </li>)}
      </ol> : <div className="py-12 text-sm leading-7 text-neutral-500">
        A new journey starts here.<br />Visitor locations will appear after the first statistics update.
      </div>}
      <p className="mt-6 text-xs leading-5 text-neutral-500">China is shown by province where known; other locations use country or region markers. Use + / − to zoom. Province and state counts appear below each country.</p>
    </div>
  </section>;
}
