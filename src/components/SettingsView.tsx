import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { setMuted } from '../utils/audio';

export function SettingsView() {
  const settings = useGameStore(s => s.settings);
  const updateSettings = useGameStore(s => s.updateSettings);
  const exportSave = useGameStore(s => s.exportSave);
  const importSave = useGameStore(s => s.importSave);
  const resetGame = useGameStore(s => s.resetGame);
  const [importJson, setImportJson] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [message, setMessage] = useState('');

  const handleExport = () => {
    const json = exportSave();
    navigator.clipboard.writeText(json).then(() => {
      setMessage('Save copied to clipboard!');
      setTimeout(() => setMessage(''), 2000);
    }).catch(() => {
      // Fallback
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'brainrot_save.json';
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Save downloaded!');
      setTimeout(() => setMessage(''), 2000);
    });
  };

  const handleImport = () => {
    if (importSave(importJson)) {
      setMessage('Save imported successfully!');
      setImportJson('');
      setTimeout(() => setMessage(''), 2000);
    } else {
      setMessage('Failed to import save. Check the format.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleReset = () => {
    resetGame();
    setShowReset(false);
    setMessage('Game reset!');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-brainrot-text">Settings</h2>

      {message && (
        <div className="bg-brainrot-accent/20 border border-brainrot-accent/30 rounded-lg p-2 text-sm text-brainrot-accent text-center">
          {message}
        </div>
      )}

      {/* Display settings */}
      <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3 space-y-3">
        <h3 className="text-sm font-bold text-brainrot-text">Display</h3>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={e => updateSettings({ darkMode: e.target.checked })}
            className="accent-brainrot-accent"
          />
          <span className="text-sm text-brainrot-text">Dark Mode</span>
          <span className="text-xs text-brainrot-muted">Toggle between dark and light themes</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={e => updateSettings({ reducedMotion: e.target.checked })}
            className="accent-brainrot-accent"
          />
          <span className="text-sm text-brainrot-text">Reduced Motion</span>
          <span className="text-xs text-brainrot-muted">Disables animations</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.reducedGlitch}
            onChange={e => updateSettings({ reducedGlitch: e.target.checked })}
            className="accent-brainrot-accent"
          />
          <span className="text-sm text-brainrot-text">Reduced Glitch</span>
          <span className="text-xs text-brainrot-muted">Disables late-game visual effects</span>
        </label>
      </div>

      {/* Audio settings */}
      <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3 space-y-3">
        <h3 className="text-sm font-bold text-brainrot-text">Audio</h3>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={e => {
              updateSettings({ soundEnabled: e.target.checked });
              setMuted(!e.target.checked);
            }}
            className="accent-brainrot-accent"
          />
          <span className="text-sm text-brainrot-text">Sound Effects</span>
          <span className="text-xs text-brainrot-muted">Trading, news, and market alerts</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.musicEnabled}
            onChange={e => updateSettings({ musicEnabled: e.target.checked })}
            className="accent-brainrot-accent"
          />
          <span className="text-sm text-brainrot-text">Background Music</span>
        </label>
      </div>

      {/* Save/Load */}
      <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3 space-y-3">
        <h3 className="text-sm font-bold text-brainrot-text">Save & Load</h3>
        <p className="text-xs text-brainrot-muted">
          Your game is automatically saved. You can also manually export or import saves.
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-brainrot-accent/20 text-brainrot-accent border border-brainrot-accent/30 rounded text-sm font-mono hover:bg-brainrot-accent/30 transition-colors"
          >
            📋 Export Save (Copy)
          </button>
          <button
            onClick={() => {
              const json = exportSave();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'brainrot_save.json';
              a.click();
              URL.revokeObjectURL(url);
              setMessage('Save downloaded!');
              setTimeout(() => setMessage(''), 2000);
            }}
            className="px-3 py-2 bg-brainrot-accent/20 text-brainrot-accent border border-brainrot-accent/30 rounded text-sm font-mono hover:bg-brainrot-accent/30 transition-colors"
          >
            💾 Download Save
          </button>
        </div>

        <div className="space-y-2">
          <textarea
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            placeholder="Paste save JSON here to import..."
            className="w-full bg-brainrot-dark border border-brainrot-border rounded p-2 text-xs text-brainrot-text font-mono h-20 focus:outline-none focus:border-brainrot-accent resize-none"
          />
          <button
            onClick={handleImport}
            disabled={!importJson}
            className="px-3 py-2 bg-brainrot-blue/20 text-brainrot-blue border border-brainrot-blue/30 rounded text-sm font-mono hover:bg-brainrot-blue/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            📥 Import Save
          </button>
        </div>

        {showReset ? (
          <div className="bg-red-900/30 border border-brainrot-red rounded-lg p-3 space-y-2">
            <p className="text-sm text-brainrot-red font-bold">⚠️ Are you sure?</p>
            <p className="text-xs text-brainrot-muted">This will permanently delete all your progress!</p>
            <div className="flex gap-2">
              <button onClick={handleReset} className="px-3 py-2 bg-brainrot-red/30 text-brainrot-red border border-brainrot-red rounded text-sm font-mono hover:bg-brainrot-red/50 transition-colors">
                Yes, Reset Everything
              </button>
              <button onClick={() => setShowReset(false)} className="px-3 py-2 bg-brainrot-dark text-brainrot-text border border-brainrot-border rounded text-sm font-mono hover:border-brainrot-text transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowReset(true)}
            className="px-3 py-2 bg-brainrot-red/20 text-brainrot-red border border-brainrot-red/30 rounded text-sm font-mono hover:bg-brainrot-red/30 transition-colors"
          >
            🗑️ Reset Game
          </button>
        )}
      </div>
    </div>
  );
}
