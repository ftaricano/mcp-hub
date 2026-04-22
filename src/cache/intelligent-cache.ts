// Cache Inteligente para MCP Hub
// Otimizado para performance de interação IA

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  ttl: number;
  score: number; // Pontuação de relevância
}

interface ToolUsageStats {
  toolKey: string;
  usageCount: number;
  successRate: number;
  avgResponseTime: number;
  lastUsed: number;
  popularityScore: number;
}

export class IntelligentCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private usageStats: Map<string, ToolUsageStats> = new Map();
  private maxSize: number = 1000;
  private defaultTtl: number = 300000; // 5 minutos
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxSize?: number, defaultTtl?: number) {
    if (maxSize) this.maxSize = maxSize;
    if (defaultTtl) this.defaultTtl = defaultTtl;
    
    // Limpa cache automaticamente
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    this.cleanupInterval.unref?.();
  }

  // Cache inteligente com scoring
  set<T>(key: string, data: T, ttl?: number, context?: string): void {
    const now = Date.now();
    const entryTtl = ttl || this.defaultTtl;
    
    // Calcula score baseado no contexto e popularidade
    const score = this.calculateScore(key, context);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      accessCount: 0,
      lastAccess: now,
      ttl: entryTtl,
      score
    };

    // Remove entradas menos relevantes se necessário
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRelevant();
    }

    this.cache.set(key, entry);
  }

  // Recupera com atualização de estatísticas
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Verifica se expirou
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Atualiza estatísticas de acesso
    entry.accessCount++;
    entry.lastAccess = now;
    entry.score += 1; // Aumenta relevância com uso

    return entry.data;
  }

  // Registra uso de ferramenta para estatísticas
  recordToolUsage(toolKey: string, responseTime: number, success: boolean): void {
    const stats = this.usageStats.get(toolKey) || {
      toolKey,
      usageCount: 0,
      successRate: 0,
      avgResponseTime: 0,
      lastUsed: 0,
      popularityScore: 0
    };

    const wasSuccessful = success ? 1 : 0;
    const newUsageCount = stats.usageCount + 1;
    
    // Atualiza estatísticas usando médias móveis
    stats.usageCount = newUsageCount;
    stats.successRate = ((stats.successRate * (newUsageCount - 1)) + wasSuccessful) / newUsageCount;
    stats.avgResponseTime = ((stats.avgResponseTime * (newUsageCount - 1)) + responseTime) / newUsageCount;
    stats.lastUsed = Date.now();
    
    // Calcula score de popularidade
    const timeFactor = Math.max(0, 1 - (Date.now() - stats.lastUsed) / (24 * 60 * 60 * 1000)); // Decai em 24h
    stats.popularityScore = stats.usageCount * stats.successRate * timeFactor;

    this.usageStats.set(toolKey, stats);
  }

  // Obtém ferramentas mais populares
  getMostPopularTools(limit: number = 10): ToolUsageStats[] {
    return Array.from(this.usageStats.values())
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);
  }

  // Obtém ferramentas recém usadas
  getRecentlyUsedTools(limit: number = 5): ToolUsageStats[] {
    return Array.from(this.usageStats.values())
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit);
  }

  // Calcula score de relevância
  private calculateScore(key: string, context?: string): number {
    let score = 1;

    // Score baseado em uso histórico
    const usage = this.usageStats.get(key);
    if (usage) {
      score += usage.popularityScore * 0.5;
      score += usage.successRate * 10;
    }

    // Score baseado em contexto
    if (context) {
      if (key.includes(context)) score += 20;
      if (key.toLowerCase().includes(context.toLowerCase())) score += 10;
    }

    // Ferramentas críticas têm score maior
    if (key.includes('email') || key.includes('send')) score += 15;
    if (key.includes('list') || key.includes('search')) score += 10;

    return score;
  }

  // Remove entradas menos relevantes
  private evictLeastRelevant(): void {
    const entries = Array.from(this.cache.entries());
    
    // Ordena por score (menor primeiro)
    entries.sort(([,a], [,b]) => {
      // Considera score, frequência de acesso e idade
      const scoreA = a.score + (a.accessCount * 2) - (Date.now() - a.lastAccess) / 1000;
      const scoreB = b.score + (b.accessCount * 2) - (Date.now() - b.lastAccess) / 1000;
      return scoreA - scoreB;
    });

    // Remove 10% das entradas menos relevantes
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      const entry = entries[i];
      if (entry) {
        this.cache.delete(entry[0]);
      }
    }
  }

  // Limpeza automática
  public cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      // Remove entradas expiradas
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
      // Remove entradas antigas não usadas (>1 hora sem acesso)
      else if (now - entry.lastAccess > 3600000 && entry.accessCount === 0) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    // Limpa estatísticas antigas (>7 dias sem uso)
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    for (const [key, stats] of this.usageStats.entries()) {
      if (stats.lastUsed < weekAgo) {
        this.usageStats.delete(key);
      }
    }
  }

  // Estatísticas do cache
  getStats(): {
    cacheSize: number;
    totalKeys: number;
    hitRate: number;
    avgResponseTime: number;
    mostPopular: string[];
  } {
    const entries = Array.from(this.cache.values());
    const totalAccess = entries.reduce((sum, e) => sum + e.accessCount, 0);
    const hits = entries.filter(e => e.accessCount > 0).length;
    
    const stats = Array.from(this.usageStats.values());
    const avgResponseTime = stats.length > 0 
      ? stats.reduce((sum, s) => sum + s.avgResponseTime, 0) / stats.length 
      : 0;

    const mostPopular = this.getMostPopularTools(5).map(t => t.toolKey);

    return {
      cacheSize: this.cache.size,
      totalKeys: this.cache.size,
      hitRate: totalAccess > 0 ? hits / totalAccess : 0,
      avgResponseTime: Math.round(avgResponseTime),
      mostPopular
    };
  }

  // Limpa tudo
  clear(): void {
    this.cache.clear();
    this.usageStats.clear();
  }
}

// Instância singleton
export const intelligentCache = new IntelligentCache();