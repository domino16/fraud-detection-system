import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FraudEngineService } from './services/fraud-engine-service';
import { TransactionStatus } from './models/transaction';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy {
  readonly fraudService = inject(FraudEngineService);

  // Filtrowanie widoku
  filterStatus = signal<'ALL' | TransactionStatus>('ALL');
  isStreaming = signal(false);
  private streamInterval: any;

  // Pola formularza do ręcznego testowania reguł
  customTx = {
    userId: 'USR-101',
    amount: 12500,
    merchant: 'CryptoExchange X',
    country: 'NG',
    nightMode: false
  };

  filteredTransactions = computed(() => {
    const filter = this.filterStatus();
    const all = this.fraudService.transactions();
    if (filter === 'ALL') return all;
    return all.filter(t => t.status === filter);
  });

  toggleStream(): void {
    if (this.isStreaming()) {
      clearInterval(this.streamInterval);
      this.isStreaming.set(false);
    } else {
      this.isStreaming.set(true);
      this.streamInterval = setInterval(() => {
        this.fraudService.generateRandomTransaction();
      }, 2000);
    }
  }

  submitCustomTransaction(): void {
    const date = new Date();
    if (this.customTx.nightMode) {
      date.setHours(2, 30, 0);
    }

    this.fraudService.evaluateAndAddTransaction({
      timestamp: date,
      userId: this.customTx.userId,
      amount: Number(this.customTx.amount),
      currency: 'PLN',
      merchant: this.customTx.merchant,
      country: this.customTx.country.toUpperCase(),
      ipAddress: '83.14.22.109'
    });
  }

  ngOnDestroy(): void {
    if (this.streamInterval) clearInterval(this.streamInterval);
  }
}