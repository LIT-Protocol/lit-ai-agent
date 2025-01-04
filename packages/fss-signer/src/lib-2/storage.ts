import { LocalStorage as NodeLocalStorage } from 'node-localstorage';

export class LocalStorage {
  private storage: NodeLocalStorage;

  constructor() {
    this.storage = new NodeLocalStorage('./.fss-signer-storage');
  }

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }
}