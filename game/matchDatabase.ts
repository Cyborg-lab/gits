export interface MatchRecord {
  id: string;
  playedAt: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  shootoutHome?: number;
  shootoutAway?: number;
  mode: string;
  stadium: string;
}

const DATABASE_NAME = 'arcade-fc';
const STORE_NAME = 'matches';
const LEGACY_KEY = 'arcade-fc-match-history';

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, 1);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export async function getMatchHistory(): Promise<MatchRecord[]> {
  try {
    const database = await openDatabase();
    const records = await new Promise<MatchRecord[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as MatchRecord[]);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return records.sort((a, b) => b.playedAt.localeCompare(a.playedAt));
  } catch {
    try {
      return JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]') as MatchRecord[];
    } catch {
      return [];
    }
  }
}

export async function saveMatch(record: MatchRecord): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  database.close();
}
