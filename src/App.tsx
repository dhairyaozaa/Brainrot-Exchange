import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from './stores/gameStore';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { MarketView } from './components/MarketView';
import { PortfolioView } from './components/PortfolioView';
import { NewsView } from './components/NewsView';
import { RotterView } from './components/RotterView';
import { BrainrotIndex } from './components/BrainrotIndex';
import { TradingRoom } from './components/TradingRoom';
import { MissionsView } from './components/MissionsView';
import { AchievementsView } from './components/AchievementsView';
import { StatisticsView } from './components/StatisticsView';
import { PrestigeView } from './components/PrestigeView';
import { SettingsView } from './components/SettingsView';
import { AssetDetail } from './components/AssetDetail';

function App() {
  const initGame = useGameStore(s => s.initGame);
  const marketTick = useGameStore(s => s.marketTick);
  const speed = useGameStore(s => s.speed);
  const paused = useGameStore(s => s.paused);
  const settings = useGameStore(s => s.settings);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);

  const [activeView, setActiveView] = useState('market');
  const [assetDetailId, setAssetDetailId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const openAssetDetail = useCallback((assetId: string) => {
    setAssetDetailId(assetId);
    setActiveView('market');
  }, []);

  const closeAssetDetail = useCallback(() => {
    setAssetDetailId(null);
  }, []);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef(0);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (paused) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }

    const tickInterval = Math.max(500, 5000 / speed);

    const tick = () => {
      marketTick();
    };

    tickRef.current = setInterval(tick, tickInterval);
    lastTickRef.current = Date.now();

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [speed, paused, marketTick]);

  useEffect(() => {
    const autosave = setInterval(() => {
      try {
        const json = useGameStore.getState().exportSave();
        localStorage.setItem('brainrot_exchange_save', json);
      } catch {
        // Silently fail
      }
    }, 30000);

    return () => clearInterval(autosave);
  }, []);

  const renderView = () => {
    if (assetDetailId) {
      return <AssetDetail assetId={assetDetailId} onBack={closeAssetDetail} />;
    }
    switch (activeView) {
      case 'market': return <MarketView onViewAsset={openAssetDetail} />;
      case 'portfolio': return <PortfolioView onViewAsset={openAssetDetail} />;
      case 'news': return <NewsView onViewAsset={openAssetDetail} />;
      case 'rotter': return <RotterView onViewAsset={openAssetDetail} />;
      case 'index': return <BrainrotIndex onViewAsset={openAssetDetail} />;
      case 'room': return <TradingRoom />;
      case 'missions': return <MissionsView />;
      case 'achievements': return <AchievementsView />;
      case 'stats': return <StatisticsView />;
      case 'prestige': return <PrestigeView />;
      case 'settings': return <SettingsView />;
      default: return <MarketView onViewAsset={openAssetDetail} />;
    }
  };

  return (
    <div className={`min-h-screen bg-brainrot-dark ${!settings.reducedMotion ? 'scanline' : ''} ${settings.darkMode === false ? 'light-mode' : ''}`}>
      <TopBar onMenuClick={() => setMobileDrawerOpen(true)} />

      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-56 bg-brainrot-darker border-r border-brainrot-border p-2">
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-brainrot-accent font-bold text-sm">🧠 BRAINROT</span>
              <button onClick={() => setMobileDrawerOpen(false)} className="text-brainrot-muted text-lg">✕</button>
            </div>
            <Sidebar
              activeView={activeView}
              onViewChange={(v) => { setActiveView(v); setMobileDrawerOpen(false); }}
              collapsed={false}
            />
          </div>
        </div>
      )}

      <div className="hidden sm:block">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          collapsed={sidebarCollapsed}
        />
      </div>

      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden sm:block fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-brainrot-darker border border-brainrot-border rounded-r p-1 text-brainrot-muted hover:text-brainrot-accent transition-colors"
        style={{ left: sidebarCollapsed ? '48px' : '192px' }}
      >
        {sidebarCollapsed ? '→' : '←'}
      </button>

      <main
        className={`pt-12 pb-20 sm:pb-8 px-2 sm:px-6 transition-all duration-200 ${
          sidebarCollapsed ? 'sm:ml-[60px]' : 'sm:ml-[200px]'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          {renderView()}
        </div>
      </main>

      {prestigeLevel > 2 && !settings.reducedGlitch && (
        <div className="fixed bottom-4 right-4 text-2xl opacity-30 pointer-events-none select-none animate-pulse">
          🧠🔄💀
        </div>
      )}
    </div>
  );
}

export default App;
