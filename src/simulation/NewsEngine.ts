import type { NewsStory, BrainrotCategory } from '../types';
import { generateNews } from '../data/news';

export class NewsEngine {
  private activeNews: NewsStory[] = [];
  private newsCooldown = 0;
  private readonly minCooldown = 30;
  private readonly maxCooldown = 100;

  tick(): NewsStory | null {
    this.newsCooldown--;

    // Expire old news
    this.activeNews = this.activeNews.filter(n => {
      n.expiresAt--;
      return n.expiresAt > 0;
    });

    // Generate new news
    if (this.newsCooldown <= 0) {
      const news = generateNews();
      news.createdAt = Date.now();
      news.expiresAt = news.effectDuration;
      this.activeNews.push(news);
      this.newsCooldown = this.minCooldown + Math.floor(Math.random() * (this.maxCooldown - this.minCooldown));
      return news;
    }

    return null;
  }

  getActiveNews(): NewsStory[] {
    return this.activeNews;
  }

  getNewsForAsset(assetId: string): NewsStory[] {
    return this.activeNews.filter(n => n.relatedAssets.includes(assetId));
  }

  getNewsForCategory(category: BrainrotCategory): NewsStory[] {
    return this.activeNews.filter(n => n.relatedCategories.includes(category));
  }

  getTotalEffectForAsset(assetId: string): number {
    return this.activeNews
      .filter(n => n.relatedAssets.includes(assetId))
      .reduce((sum, n) => sum + n.effectStrength, 0);
  }

  getTotalEffectForCategory(category: BrainrotCategory): number {
    return this.activeNews
      .filter(n => n.relatedCategories.includes(category))
      .reduce((sum, n) => sum + n.effectStrength, 0);
  }

  setNews(news: NewsStory[]): void {
    this.activeNews = news;
  }

  getState() {
    return {
      activeNews: this.activeNews,
    };
  }
}
