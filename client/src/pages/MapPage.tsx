import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import chapters from "../data/chapters";
import type { Chapter, Movement } from "../../../../shared/schema";
import { ChevronLeft, ChevronRight, MapPin, Sun, Moon, List, X, Menu } from "lucide-react";
import { SiGithub } from "react-icons/si";

// Fix Leaflet default icon paths (Vite bundles them incorrectly)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Tile URL constants
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_DARK  = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function createNumberedIcon(num: number, isHighlighted: boolean, isDark: boolean) {
  const bg = isHighlighted
    ? (isDark ? "#7a9fd8" : "#2a4a7f")
    : (isDark ? "#d4a843" : "#b8891a");
  const border = isHighlighted
    ? (isDark ? "#aec8f0" : "#6a90cc")
    : (isDark ? "#9a7020" : "#7a5508");
  const textColor = isDark ? "#141210" : "#fff";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:26px;height:26px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${bg};
      border:2px solid ${border};
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.45);
      transition: all 0.15s ease;
    "><span style="
      transform:rotate(45deg);
      font-size:10px;font-weight:700;
      color:${textColor};line-height:1;
      font-family:system-ui,sans-serif;
    ">${num}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -28],
  });
}

function formatTitle(title: string): string {
  const stopWords = new Set(["a", "an", "the", "and", "but", "or", "for", "nor",
    "at", "by", "in", "of", "on", "to", "up", "as", "into", "near", "upon"]);
  return title
    .replace(/--/g, " · ")
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      if (w === "·") return w;
      const clean = w.replace(/[^a-z]/g, "");
      if (i === 0 || stopWords.has(clean) === false) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      return w;
    })
    .join(" ")
    .replace(/\bMo\b/g, "MO")
    .replace(/\bTn\b/g, "TN")
    .replace(/\bVa\b/g, "VA")
    .replace(/\bMs\b/g, "MS")
    .replace(/\bIl\b/g, "IL")
    .replace(/\bKy\b/g, "KY")
    .replace(/\bOh\b/g, "OH")
    .replace(/\bNy\b/g, "NY")
    .replace(/\bNc\b/g, "NC")
    .replace(/\bGa\b/g, "GA")
    .replace(/\bWv\b/g, "WV")
    .replace(/\bMd\b/g, "MD")
    .replace(/\bAl\b/g, "AL")
    .replace(/\bLa\b/g, "LA")
    .replace(/\bAr\b/g, "AR")
    .replace(/\bTx\b/g, "TX")
    .replace(/\bCa\b/g, "CA")
    .replace(/\bUss\b/, "USS")
    .replace(/\bUs\b/, "U.S.");
}

interface MapPageProps {
  chapterNum?: number;
}

export default function MapPage({ chapterNum }: MapPageProps) {
  const [, navigate] = useLocation();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Derive chapter index from URL param
  const currentChapterIdx = useMemo(() => {
    if (chapterNum == null) return 0;
    const idx = chapters.findIndex((c) => c.chapter === chapterNum);
    return idx >= 0 ? idx : 0;
  }, [chapterNum]);

  const setCurrentChapterIdx = useCallback(
    (idxOrFn: number | ((prev: number) => number)) => {
      const newIdx = typeof idxOrFn === "function" ? idxOrFn(currentChapterIdx) : idxOrFn;
      const ch = chapters[newIdx];
      if (ch) navigate(`/chapter/${ch.chapter}`);
    },
    [currentChapterIdx, navigate]
  );

  const [selectedMovementIdx, setSelectedMovementIdx] = useState<number | null>(null);
  // Always start with sidebar open (including mobile)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showChapterList, setShowChapterList] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  const isDark = theme === "dark";
  const currentChapter: Chapter | undefined = chapters[currentChapterIdx];

  // Sync theme attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Init map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [38, -90],
      zoom: 4,
      zoomControl: false, // We'll add it manually at topright
      attributionControl: true,
      tap: true, // Enable tap for mobile touch
      tapTolerance: 15,
    });

    // Add zoom control at top-right so it doesn't overlap the sidebar
    L.control.zoom({ position: "topright" }).addTo(map);

    const tile = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
      attribution: TILE_ATTR,
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tile;
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Swap tile layer when theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const tile = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
      attribution: TILE_ATTR,
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    tile.bringToBack();
    tileLayerRef.current = tile;
  }, [theme]);

  // Update markers when chapter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentChapter) return;

    // Remove old cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const validMovements = currentChapter.movements.filter(
      (m) => m.lat != null && m.lng != null
    );
    if (validMovements.length === 0) return;

    const points = validMovements.map((m) => [m.lat!, m.lng!] as [number, number]);

    // Draw route polyline (outside cluster group so it's always visible)
    if (points.length > 1) {
      polylineRef.current = L.polyline(points, {
        color: isDark ? "#d4a843" : "#b8891a",
        weight: 2.5,
        opacity: 0.55,
        dashArray: "7 5",
      }).addTo(map);
    }

    // Create marker cluster group with pill-style labels (same gold as pins)
    const pillBg = isDark ? "#d4a843" : "#b8891a";
    const pillBorder = isDark ? "#9a7020" : "#7a5508";
    const pillText = isDark ? "#141210" : "#fff";

    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 35,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyDistanceMultiplier: 1.8,
      iconCreateFunction: (c: any) => {
        // Collect stop numbers from child markers
        const nums: number[] = c.getAllChildMarkers()
          .map((m: any) => m.options._stopNum as number)
          .filter((n: number) => n != null)
          .sort((a: number, b: number) => a - b);
        const label = nums.join("\u00b7"); // middot
        const pillWidth = Math.max(36, label.length * 8 + 16);
        return L.divIcon({
          className: "",
          html: `<div style="
            height:24px;
            padding:0 8px;
            border-radius:12px;
            background:${pillBg};
            border:1.5px solid ${pillBorder};
            display:inline-flex;align-items:center;justify-content:center;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            cursor:pointer;
            white-space:nowrap;
          "><span style="
            font-size:11px;font-weight:600;
            color:${pillText};line-height:1;
            font-family:system-ui,sans-serif;
            letter-spacing:0.5px;
          ">${label}</span></div>`,
          iconSize: [pillWidth, 24],
          iconAnchor: [pillWidth / 2, 12],
        });
      },
    });

    // Add numbered markers to cluster group
    let markerNum = 0;
    currentChapter.movements.forEach((movement, idx) => {
      if (movement.lat == null || movement.lng == null) return;
      markerNum++;
      const num = markerNum;
      const marker = L.marker([movement.lat, movement.lng], {
        icon: createNumberedIcon(num, false, isDark),
        _stopNum: num, // Store stop number for cluster pill labels
      } as any);

      const dateStr = movement.date
        ? `<span class="popup-date">${movement.date}</span>`
        : "";
      marker.bindPopup(
        `<div class="popup-content">
          <div class="popup-num">Stop #${num} · Ch. ${currentChapter.chapter}</div>
          ${dateStr}
          <div class="popup-location">${movement.location}</div>
          <div class="popup-desc">${movement.description}</div>
        </div>`,
        { maxWidth: 290, className: "grant-popup" }
      );

      marker.on("click", () => setSelectedMovementIdx(idx));
      cluster.addLayer(marker);
      markersRef.current.push(marker);
    });

    map.addLayer(cluster);
    clusterGroupRef.current = cluster;

    // Fit bounds
    if (points.length === 1) {
      map.setView(points[0], 8, { animate: true });
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, animate: true });
    }
    setSelectedMovementIdx(null);
  }, [currentChapterIdx, theme]);

  // Highlight selected marker
  useEffect(() => {
    if (!currentChapter) return;
    let markerNum = 0;
    let markerIdx = 0;
    const map = mapRef.current;
    currentChapter.movements.forEach((movement, idx) => {
      if (movement.lat == null || movement.lng == null) return;
      markerNum++;
      const marker = markersRef.current[markerIdx];
      if (marker) {
        marker.setIcon(createNumberedIcon(markerNum, idx === selectedMovementIdx, isDark));
        if (idx === selectedMovementIdx && map) {
          marker.openPopup();
          map.panTo([movement.lat!, movement.lng!], { animate: true, duration: 0.4 });
        }
      }
      markerIdx++;
    });
  }, [selectedMovementIdx]);

  // Chapter navigation — NO auto-close of sidebar
  const goPrev = useCallback(() => {
    setCurrentChapterIdx((i) => Math.max(0, i - 1));
  }, [setCurrentChapterIdx]);

  const goNext = useCallback(() => {
    setCurrentChapterIdx((i) => Math.min(chapters.length - 1, i + 1));
  }, [setCurrentChapterIdx]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext]);

  // Group chapters by volume for the picker
  const vol1Chapters = chapters.filter((c) => c.volume === 1);
  const vol2Chapters = chapters.filter((c) => c.volume === 2);

  // Count mapped movements
  const mappedCount = currentChapter
    ? currentChapter.movements.filter((m) => m.lat != null).length
    : 0;

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <svg
            aria-label="Grant Map"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="app-logo"
          >
            <circle cx="20" cy="20" r="18" fill="currentColor" opacity="0.1" />
            <path
              d="M20 5 L23 15.5 L34 15.5 L25.5 22 L28.5 32.5 L20 26.5 L11.5 32.5 L14.5 22 L6 15.5 L17 15.5 Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.95"
            />
          </svg>
          <div className="header-title-group">
            <h1 className="header-title">Grant's Memoirs</h1>
            <span className="header-sub">Movement Map · 1822–1865</span>
          </div>
        </div>
        <div className="header-right">
          <a
            className="icon-btn"
            href="https://github.com/ewiner/grant-map"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            data-testid="link-github"
            title="View source on GitHub"
          >
            <SiGithub size={17} />
          </a>
          <button
            className="icon-btn"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
            data-testid="button-theme-toggle"
            title="Toggle light/dark mode"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {/* Mobile hamburger */}
          <button
            className="icon-btn mobile-menu-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle sidebar"
            data-testid="button-sidebar-toggle"
            title="Toggle sidebar"
          >
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : "sidebar--closed"}`}>
          {/* Chapter navigation controls */}
          <div className="chapter-nav">
            <button
              className="nav-btn"
              onClick={goPrev}
              disabled={currentChapterIdx === 0}
              data-testid="button-prev-chapter"
              aria-label="Previous chapter"
              title="Previous chapter (←)"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="chapter-counter" data-testid="text-chapter-counter">
              {currentChapter && (
                <span className="vol-badge">Vol. {currentChapter.volume}</span>
              )}
              <span className="chapter-num">Ch. {currentChapter?.chapter ?? "—"}</span>
              <span className="chapter-of">/ {chapters.length}</span>
            </div>
            <button
              className="nav-btn"
              onClick={goNext}
              disabled={currentChapterIdx === chapters.length - 1}
              data-testid="button-next-chapter"
              aria-label="Next chapter"
              title="Next chapter (→)"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {currentChapter ? (
            <>
              {/* Chapter picker */}
              <div className="chapter-picker-wrap">
                <button
                  className="chapter-picker-toggle"
                  onClick={() => setShowChapterList((v) => !v)}
                  data-testid="button-chapter-list-toggle"
                  aria-expanded={showChapterList}
                >
                  {showChapterList ? (
                    <X size={13} className="picker-icon" />
                  ) : (
                    <List size={13} className="picker-icon" />
                  )}
                  <span>Jump to chapter</span>
                </button>

                {showChapterList && (
                  <div className="chapter-list-dropdown">
                    <div className="chapter-list-group">
                      <div className="chapter-list-header">Volume I — Early Life &amp; Mexican War</div>
                      {vol1Chapters.map((ch) => {
                        const globalIdx = chapters.findIndex((c) => c.chapter === ch.chapter);
                        return (
                          <button
                            key={ch.chapter}
                            className={`chapter-list-item ${globalIdx === currentChapterIdx ? "chapter-list-item--active" : ""}`}
                            onClick={() => {
                              setCurrentChapterIdx(globalIdx);
                              setShowChapterList(false);
                            }}
                            data-testid={`chapter-list-item-${ch.chapter}`}
                          >
                            <span className="cli-num">{ch.roman}</span>
                            <span className="cli-title">{formatTitle(ch.title).slice(0, 48)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="chapter-list-group">
                      <div className="chapter-list-header">Volume II — Civil War Command</div>
                      {vol2Chapters.map((ch) => {
                        const globalIdx = chapters.findIndex((c) => c.chapter === ch.chapter);
                        return (
                          <button
                            key={ch.chapter}
                            className={`chapter-list-item ${globalIdx === currentChapterIdx ? "chapter-list-item--active" : ""}`}
                            onClick={() => {
                              setCurrentChapterIdx(globalIdx);
                              setShowChapterList(false);
                            }}
                            data-testid={`chapter-list-item-${ch.chapter}`}
                          >
                            <span className="cli-num">{ch.roman}</span>
                            <span className="cli-title">{formatTitle(ch.title).slice(0, 48)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Chapter title */}
              <div className="chapter-header">
                <div className="chapter-roman-row">
                  <span className="chapter-roman">{currentChapter.roman}</span>
                  <span className="chapter-mapped-count">
                    <MapPin size={11} />
                    {mappedCount} location{mappedCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <h2 className="chapter-title" data-testid="text-chapter-title">
                  {formatTitle(currentChapter.title)}
                </h2>
              </div>

              {/* Movements list */}
              <div className="movements-list">
                {currentChapter.movements.length === 0 ? (
                  <div className="movements-empty">No movements recorded in this chapter.</div>
                ) : (
                  <ul role="list" className="movements-ul">
                    {currentChapter.movements.map((mv, idx) => {
                      const hasCoords = mv.lat != null && mv.lng != null;
                      const isSelected = idx === selectedMovementIdx;
                      let mapNum = 0;
                      for (let i = 0; i <= idx; i++) {
                        if (currentChapter.movements[i].lat != null) mapNum++;
                      }
                      return (
                        <li
                          key={idx}
                          className={`movement-item ${isSelected ? "movement-item--selected" : ""} ${!hasCoords ? "movement-item--nomapped" : ""}`}
                          onClick={() =>
                            hasCoords && setSelectedMovementIdx(isSelected ? null : idx)
                          }
                          data-testid={`movement-item-${idx}`}
                          role={hasCoords ? "button" : undefined}
                          tabIndex={hasCoords ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (hasCoords && (e.key === "Enter" || e.key === " ")) {
                              setSelectedMovementIdx(isSelected ? null : idx);
                            }
                          }}
                        >
                          {hasCoords && (
                            <div className={`movement-num ${isSelected ? "movement-num--active" : ""}`}>
                              {mapNum}
                            </div>
                          )}
                          {!hasCoords && (
                            <div className="movement-num movement-num--none" title="No map coordinates">
                              –
                            </div>
                          )}
                          <div className="movement-content">
                            <div className="movement-location">{mv.location}</div>
                            {mv.date && <div className="movement-date">{mv.date}</div>}
                            <div className="movement-desc">{mv.description}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="sidebar-loading">
              <div className="loading-spinner" />
              <p>Loading chapter data…</p>
            </div>
          )}

          {/* Keyboard hint */}
          <div className="sidebar-footer">
            <span>← → to navigate chapters</span>
          </div>
        </aside>

        {/* Map */}
        <main className="map-container">
          <div ref={mapContainerRef} className="map" data-testid="map-container" />
        </main>
      </div>
    </div>
  );
}
