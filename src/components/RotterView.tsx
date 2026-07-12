import { useMemo, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import type { RotterAccount } from '../types';

export function RotterView({ onViewAsset }: { onViewAsset?: (assetId: string) => void }) {
  const rotterPosts = useGameStore(s => s.rotterPosts);
  const rotterAccounts = useGameStore(s => s.rotterAccounts);
  const [selectedAccount, setSelectedAccount] = useState<RotterAccount | null>(null);

  const recentPosts = useMemo(() => {
    return [...rotterPosts]
      .reverse()
      .slice(0, 50)
      .map(post => {
        const account = rotterAccounts.find(a => a.id === post.accountId);
        return { ...post, account };
      });
  }, [rotterPosts, rotterAccounts]);

  const getAccountStyle = (account: typeof rotterAccounts[0] | undefined) => {
    if (!account) return 'text-brainrot-muted';
    if (account.isWhale) return 'text-brainrot-yellow';
    if (account.isNews) return 'text-brainrot-blue';
    if (account.isInfluencer) return 'text-brainrot-pink';
    if (account.isBot) return 'text-brainrot-cyan';
    if (account.isAnonymous) return 'text-brainrot-purple';
    if (account.isConspiracy) return 'text-brainrot-orange';
    return 'text-brainrot-text';
  };

  const getAccountBg = (account: typeof rotterAccounts[0] | undefined) => {
    if (!account) return '';
    if (account.historicalAccuracy > 0.7) return 'border-l-2 border-l-brainrot-accent';
    if (account.historicalAccuracy < 0.3) return 'border-l-2 border-l-brainrot-red';
    return '';
  };

  const getFollowerCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-brainrot-text">ROTTER</h2>
      <p className="text-xs text-brainrot-muted">
        The in-game social network. Click an account to see their profile and reliability score.
      </p>

      {recentPosts.length === 0 ? (
        <div className="text-center py-8 text-brainrot-muted text-sm">
          No ROTTER posts yet. They'll appear as the market runs.
        </div>
      ) : (
        <div className="space-y-2">
          {recentPosts.map(post => (
            <div
              key={post.id}
              className={`bg-brainrot-card border border-brainrot-border rounded-lg p-3 space-y-1 transition-all hover:border-brainrot-muted/50 hover:bg-brainrot-card/80 cursor-pointer ${getAccountBg(post.account)}`}
              onClick={() => post.account && setSelectedAccount(post.account)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{post.account?.avatar || '❓'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${getAccountStyle(post.account)}`}>
                      @{post.account?.username || 'unknown'}
                    </span>
                    {post.account && (
                      <span className="text-xs text-brainrot-muted">
                        {getFollowerCount(post.account.followers)} followers
                      </span>
                    )}
                  </div>
                  {post.account && (
                    <div className="flex gap-1 text-xs text-brainrot-muted flex-wrap">
                      {post.account.isWhale && <span className="text-brainrot-yellow">🐋 Whale</span>}
                      {post.account.isNews && <span className="text-brainrot-blue">📰 News</span>}
                      {post.account.isInfluencer && <span className="text-brainrot-pink">⭐ Influencer</span>}
                      {post.account.isBot && <span className="text-brainrot-cyan">🤖 Bot</span>}
                      {post.account.isConspiracy && <span className="text-brainrot-orange">🕵️ Conspiracy</span>}
                      {post.account.isAnonymous && <span className="text-brainrot-purple">🎭 Anonymous</span>}
                      {post.account.historicalAccuracy < 0.3 && (
                        <span className="text-brainrot-red">⚠️ Unreliable</span>
                      )}
                      {post.account.historicalAccuracy > 0.7 && (
                        <span className="text-brainrot-accent">✅ Trusted</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-brainrot-muted flex-shrink-0">
                  <span>♥ {post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}K` : post.likes}</span>
                  <span>↻ {post.reposts >= 1000 ? `${(post.reposts / 1000).toFixed(1)}K` : post.reposts}</span>
                </div>
              </div>
              <div className="pl-10">
                <p className="text-sm text-brainrot-text whitespace-pre-wrap">{post.content}</p>
                {/* Show related asset tickers as clickable chips */}
                {post.relatedAssets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {post.relatedAssets.map(id => (
                      <button
                        key={id}
                        onClick={(e) => { e.stopPropagation(); onViewAsset?.(id); }}
                        className="text-xs bg-brainrot-dark border border-brainrot-border rounded px-1.5 py-0.5 text-brainrot-accent font-mono hover:border-brainrot-accent hover:bg-brainrot-accent/10 transition-colors"
                      >
                        ${useGameStore.getState().brainrots.find(b => b.id === id)?.ticker || id}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account Detail Modal */}
      {selectedAccount && (
        <AccountDetailModal account={selectedAccount} onClose={() => setSelectedAccount(null)} />
      )}
    </div>
  );
}

function AccountDetailModal({ account, onClose }: { account: RotterAccount; onClose: () => void }) {
  const brainrots = useGameStore(s => s.brainrots);
  const rotterPosts = useGameStore(s => s.rotterPosts);

  const accuracyPercent = (account.historicalAccuracy * 100).toFixed(0);
  const trustLabel = account.historicalAccuracy > 0.7 ? 'Trusted' : account.historicalAccuracy > 0.4 ? 'Mixed' : 'Unreliable';
  const trustColor = account.historicalAccuracy > 0.7 ? 'text-brainrot-accent' : account.historicalAccuracy > 0.4 ? 'text-brainrot-yellow' : 'text-brainrot-red';
  const accountPosts = rotterPosts.filter(p => p.accountId === account.id).slice(-10).reverse();
  const favoriteAssetNames = account.favouriteAssets
    .map(id => brainrots.find(b => b.id === id))
    .filter(Boolean)
    .map(a => a!.ticker);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-brainrot-card border border-brainrot-border rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{account.avatar}</span>
            <div>
              <h3 className="text-lg font-bold text-brainrot-text">{account.displayName}</h3>
              <p className="text-sm text-brainrot-muted">@{account.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-brainrot-muted hover:text-brainrot-text text-lg">✕</button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-brainrot-dark rounded-lg p-2 text-center">
            <div className="text-xs text-brainrot-muted">Followers</div>
            <div className="text-sm font-bold text-brainrot-text">
              {account.followers >= 1000000 ? `${(account.followers / 1000000).toFixed(1)}M` :
               account.followers >= 1000 ? `${(account.followers / 1000).toFixed(1)}K` :
               account.followers}
            </div>
          </div>
          <div className="bg-brainrot-dark rounded-lg p-2 text-center">
            <div className="text-xs text-brainrot-muted">Accuracy</div>
            <div className={`text-sm font-bold ${trustColor}`}>{accuracyPercent}%</div>
          </div>
          <div className="bg-brainrot-dark rounded-lg p-2 text-center">
            <div className="text-xs text-brainrot-muted">Trust</div>
            <div className={`text-sm font-bold ${trustColor}`}>{trustLabel}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {account.isWhale && <span className="text-xs bg-brainrot-yellow/20 text-brainrot-yellow border border-brainrot-yellow/30 rounded px-2 py-0.5">🐋 Whale Trader</span>}
          {account.isNews && <span className="text-xs bg-brainrot-blue/20 text-brainrot-blue border border-brainrot-blue/30 rounded px-2 py-0.5">📰 News Source</span>}
          {account.isInfluencer && <span className="text-xs bg-brainrot-pink/20 text-brainrot-pink border border-brainrot-pink/30 rounded px-2 py-0.5">⭐ Influencer</span>}
          {account.isTrader && <span className="text-xs bg-brainrot-accent/20 text-brainrot-accent border border-brainrot-accent/30 rounded px-2 py-0.5">📊 Trader</span>}
          {account.isBot && <span className="text-xs bg-brainrot-cyan/20 text-brainrot-cyan border border-brainrot-cyan/30 rounded px-2 py-0.5">🤖 Bot</span>}
          {account.isConspiracy && <span className="text-xs bg-brainrot-orange/20 text-brainrot-orange border border-brainrot-orange/30 rounded px-2 py-0.5">🕵️ Conspiracy</span>}
          {account.isAnonymous && <span className="text-xs bg-brainrot-purple/20 text-brainrot-purple border border-brainrot-purple/30 rounded px-2 py-0.5">🎭 Anonymous</span>}
        </div>

        {favoriteAssetNames.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-brainrot-muted mb-1">Favorite Assets:</div>
            <div className="flex flex-wrap gap-1.5">
              {favoriteAssetNames.map(t => (
                <span key={t} className="text-xs bg-brainrot-dark border border-brainrot-border rounded px-2 py-0.5 text-brainrot-text font-mono">
                  ${t}
                </span>
              ))}
            </div>
          </div>
        )}

        {accountPosts.length > 0 && (
          <div>
            <div className="text-xs text-brainrot-muted mb-2">Recent Posts ({accountPosts.length}):</div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {accountPosts.map(post => (
                <div key={post.id} className="bg-brainrot-dark rounded p-2 text-xs text-brainrot-text">
                  {post.content}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
