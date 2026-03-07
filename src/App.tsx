import { lazy, Suspense, useState, useCallback } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import Preloader from './components/Preloader';
import Navbar from './components/Navbar';
import Map from './components/Map';
import './App.css';

// ── Lazy-loaded page overlays (only fetched when user navigates to them) ──
const About = lazy(() => import('./components/About'));
const Team = lazy(() => import('./components/Team'));
const Events = lazy(() => import('./components/Events'));
const MajorEvents = lazy(() => import('./components/MajorEvents'));
const MinorEvents = lazy(() => import('./components/MinorEvents'));
const Artist = lazy(() => import('./components/Artist'));
const Sponsors = lazy(() => import('./components/Sponsors'));
const Contact = lazy(() => import('./components/Contact'));
const Gallery = lazy(() => import('./components/Gallery'));
const Schedule = lazy(() => import('./components/Schedule'));

const pageComponents: Record<string, React.ReactNode> = {
  about: <About />,
  team: <Team />,
  events: <Events />,
  'major-events': <MajorEvents />,
  'minor-events': <MinorEvents />,
  artist: <Artist />,
  gallery: <Gallery />,
  schedule: <Schedule />,
  sponsors: <Sponsors />,
  contact: <Contact />,
};

/**
 * Rendering order (z-index stack):
 *
 *   z-index 999  →  Preloader (video, fullscreen, unmounts after completion)
 *   z-index  50  →  Navbar (fixed, liquid glass, always above canvas)
 *   z-index  40  →  HUD / joystick / state badge (in index.html)
 *   z-index   2  →  Three.js canvas (Map.tsx, fixed, full viewport)
 */
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  // Strip the leading slash to match pageComponents keys (e.g. "/about" -> "about")
  const activePage = location.pathname.slice(1) || null;

  const handleNavigate = (page: string | null) => {
    if (page) {
      navigate(`/${page}`);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      {/* ── MAIN EXPERIENCE ───────────────────────────────────────────────── */}
      {/* Mounted immediately — WebGL initializes while preloader plays */}
      <Map
        onNavigate={handleNavigate}
        onClose={() => handleNavigate(null)}
        activePage={activePage}
      />

      {/* Page overlay — shown when a nav link is clicked */}
      {activePage && pageComponents[activePage] && (
        <Suspense fallback={null}>
          <div className="page-overlay">
            <button
              onClick={() => handleNavigate(null)}
              className="page-overlay-close"
              aria-label="Close"
            >
              ✕
            </button>
            {activePage !== 'contact' && (
              <>
                {/* Desktop: static hint */}
                <span
                  style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 28,
                    zIndex: 1001,
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 13,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: '0.3px',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    display: 'var(--back-desktop-display, block)' as never,
                  }}
                  className="back-hint-desktop"
                >
                  Press <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.12)', fontWeight: 600, color: '#fff' }}>E</kbd> to go back
                </span>

                {/* Mobile: tappable button */}
                <button
                  onClick={() => handleNavigate(null)}
                  className="back-hint-mobile"
                  style={{
                    position: 'fixed',
                    bottom: 36,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1001,
                    padding: '12px 28px',
                    borderRadius: 50,
                    background: 'rgba(0,0,0,0.72)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 14,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: '0.3px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'none',
                    alignItems: 'center',
                    gap: 8,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Tap here to go back
                </button>
              </>
            )}
            {pageComponents[activePage]}
          </div>
        </Suspense>
      )}

      {/* Navbar — fixed at top, z-index 50 (above canvas and HUD).
          We also load this immediately to fetch its imagery.
      */}
      <Navbar onNavigate={(page) => handleNavigate(page || null)} />
    </>
  );
}

export default function App() {
  const [preloaderDone, setPreloaderDone] = useState(false);

  return (
    <BrowserRouter>
      <div className="app-root">
        {/* ── PRELOADER (video + progress bar) ─────────────────────────────── */}
        {!preloaderDone && (
          <Preloader onComplete={() => setPreloaderDone(true)} />
        )}

        <AppContent />
      </div>
    </BrowserRouter>
  );
}
