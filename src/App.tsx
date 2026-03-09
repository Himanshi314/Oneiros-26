import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import Preloader from './components/Preloader';
import Navbar from './components/Navbar';
import TeleportBar from './components/TeleportBar';
import './App.css';

// ── Heavy 3D component (lazy-loaded to avoid blocking the initial preloader paint) ──
const Map = lazy(() => import('./components/Map'));

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

  // Safely extract the page key (e.g. "/about/" -> "about", "/Oneiros-26/about" if basename is somehow missing -> still matches first segment or we can just rely on react-router)
  const pathname = location.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  const activePage = pathname.split('/')[0] || null;
  const overlayRef = useRef<HTMLDivElement>(null);

  // 1. Force navigation to root on refresh/initial mount
  useEffect(() => {
    if (window.location.pathname !== '/' && window.location.pathname !== '/Oneiros-26/') {
      navigate('/', { replace: true });
    }
  }, []); // Once on mount

  // 2. Scroll overlay to top when page changes
  useEffect(() => {
    if (activePage && overlayRef.current) {
      overlayRef.current.scrollTop = 0;
    }
  }, [activePage]);

  const handleNavigate = (page: string | null) => {
    if (page) {
      // Navigate to the root level of the single page app (router respects basename)
      navigate(`/${page}`);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      {!activePage && (
        <h1 className="seo-homepage-heading">
          Oneiros 2026 – Manipal University Jaipur Cultural Fest
        </h1>
      )}

      {/* ── MAIN EXPERIENCE ───────────────────────────────────────────────── */}
      {/* Mounted immediately — WebGL initializes while preloader plays */}
      <Suspense fallback={null}>
        <Map
          onNavigate={handleNavigate}
          onClose={() => handleNavigate(null)}
          activePage={activePage}
        />
      </Suspense>

      {/* Page overlay — shown when a nav link is clicked */}
      {activePage && pageComponents[activePage] && (
        <Suspense fallback={null}>
          <div className="page-overlay" ref={overlayRef} role="dialog" aria-modal="true" aria-label={`${activePage} page`}>
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

                {/* Mobile: scroll hint + back button */}
                <div className="mobile-bottom-hud">
                  <div className="mobile-scroll-hint">
                    <div className="mobile-scroll-line" />
                    <span className="mobile-scroll-text">Scroll</span>
                  </div>
                  <button
                    onClick={() => handleNavigate(null)}
                    className="back-hint-mobile-btn"
                  >
                    Tap here to go back
                  </button>
                </div>
              </>
            )}
            {pageComponents[activePage]}
          </div>
        </Suspense>
      )}

      {/* Teleport bar — quick navigation to 3D markers (hidden when overlay is open) */}
      {!activePage && <TeleportBar />}

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
