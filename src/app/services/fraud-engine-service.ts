import { computed, Injectable, signal } from '@angular/core';
import { Transaction, TransactionStatus } from '../models/transaction';

@Injectable({
  providedIn: 'root',
})
export class FraudEngineService {
  // Stan aplikacji oparty o Angular Signals
  private transactionsSignal = signal<Transaction[]>([]);
  
  readonly transactions = this.transactionsSignal.asReadonly();

  // Metryki KPI liczone automatycznie
  readonly stats = computed(() => {
    const all = this.transactionsSignal();
    const suspicious = all.filter(t => t.status === 'SUSPICIOUS').length;
    const blocked = all.filter(t => t.status === 'BLOCKED').length;
    const totalVolume = all.reduce((sum, t) => sum + t.amount, 0);
    const savedVolume = all
      .filter(t => t.status === 'BLOCKED')
      .reduce((sum, t) => sum + t.amount, 0);

    return { total: all.length, suspicious, blocked, totalVolume, savedVolume };
  });

  private readonly highRiskCountries = ['NG', 'RU', 'KP', 'IR', 'VE'];
  private readonly merchants = ['Allegro', 'Amazon', 'Żabka', 'Orlen', 'CryptoExchange X', 'Luxury Watches', 'Steam'];
  private readonly countries = ['PL', 'PL', 'PL', 'DE', 'GB', 'US', 'NG', 'RU'];

  constructor() {
    // Wygeneruj kilka transakcji startowych
    for (let i = 0; i < 6; i++) {
      this.generateRandomTransaction();
    }
  }

  /**
   * Główny silnik scoringowy analizujący pojedynczą transakcję
   */
  evaluateAndAddTransaction(raw: Omit<Transaction, 'id' | 'riskScore' | 'triggeredRules' | 'status'>): Transaction {
    let score = 0;
    const rules: string[] = [];

    // REGUŁA 1: Nietypowo wysoka kwota
    if (raw.amount > 10000) {
      score += 45;
      rules.push('Kwota > 10 000 PLN (+45 pkt)');
    } else if (raw.amount > 4000) {
      score += 20;
      rules.push('Podwyższona kwota > 4 000 PLN (+20 pkt)');
    }

    // REGUŁA 2: Kraj podwyższonego ryzyka (AML / Geo-IP)
    if (this.highRiskCountries.includes(raw.country.toUpperCase())) {
      score += 40;
      rules.push(`Kraj wysokiego ryzyka: ${raw.country} (+40 pkt)`);
    } else if (raw.country.toUpperCase() !== 'PL') {
      score += 15;
      rules.push(`Transakcja zagraniczna: ${raw.country} (+15 pkt)`);
    }

    // REGUŁA 3: Podejrzana kategoria sprzedawcy (np. giełdy krypto)
    if (raw.merchant.toLowerCase().includes('crypto')) {
      score += 25;
      rules.push('Branża wysokiego ryzyka: Krypto (+25 pkt)');
    }

    // REGUŁA 4: Godziny nocne (01:00 - 04:59)
    const hour = raw.timestamp.getHours();
    if (hour >= 1 && hour <= 4) {
      score += 20;
      rules.push(`Aktywność w godzinach nocnych (${hour}:00) (+20 pkt)`);
    }

    // REGUŁA 5: Velocity Check & Impossible Travel (analiza historii użytkownika)
    const userHistory = this.transactionsSignal().filter(t => t.userId === raw.userId);
    if (userHistory.length > 0) {
      const lastTx = userHistory[0]; // najnowsza jest na początku listy
      const diffSeconds = (raw.timestamp.getTime() - lastTx.timestamp.getTime()) / 1000;

      if (diffSeconds < 15) {
        score += 35;
        rules.push(`Velocity Check: Kolejna transakcja w ${Math.round(diffSeconds)}s (+35 pkt)`);
      }

      if (lastTx.country !== raw.country && diffSeconds < 3600) {
        score += 50;
        rules.push(`Impossible Travel: Zmiana kraju ${lastTx.country} -> ${raw.country} (+50 pkt)`);
      }
    }

    // Normalizacja wyniku do max 100
    score = Math.min(score, 100);

    let status: TransactionStatus = 'CLEAN';
    if (score >= 75) {
      status = 'BLOCKED'; // Automatyczna blokada przy krytycznym ryzyku
    } else if (score >= 40) {
      status = 'SUSPICIOUS'; // Wymaga weryfikacji analityka
    }

    const evaluated: Transaction = {
      ...raw,
      id: 'TX-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      riskScore: score,
      triggeredRules: rules,
      status
    };

    this.transactionsSignal.update(list => [evaluated, ...list]);
    return evaluated;
  }

  /**
   * Generator symulujący ruch w systemie
   */
  generateRandomTransaction(): void {
    const users = ['USR-101', 'USR-102', 'USR-103', 'USR-104'];
    const isAnomaly = Math.random() < 0.35;

    const amount = isAnomaly
      ? Math.floor(Math.random() * 18000) + 3000
      : Math.floor(Math.random() * 600) + 20;

    const country = isAnomaly
      ? this.countries[Math.floor(Math.random() * this.countries.length)]
      : 'PL';

    const merchant = this.merchants[Math.floor(Math.random() * this.merchants.length)];
    const userId = users[Math.floor(Math.random() * users.length)];

    this.evaluateAndAddTransaction({
      timestamp: new Date(),
      userId,
      amount,
      currency: 'PLN',
      merchant,
      country,
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    });
  }

  /**
   * Decyzja analityka (SOC / Fraud Analyst)
   */
  updateStatus(id: string, newStatus: TransactionStatus): void {
    this.transactionsSignal.update(list =>
      list.map(tx => (tx.id === id ? { ...tx, status: newStatus } : tx))
    );
  }
}