export interface SavedList {
  name: string;
  creatorToken: string;
  buyerToken: string;
  createdAt: string;
}

const STORAGE_KEY = 'blindlist_saved_lists';

export const listStorage = {
  // Get all saved lists
  getLists(): SavedList[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  },

  // Save a new list
  saveList(list: SavedList): void {
    try {
      const lists = this.getLists();
      // Check if list already exists (by creator token)
      const exists = lists.some(l => l.creatorToken === list.creatorToken);
      if (!exists) {
        lists.unshift(list); // Add to beginning
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  // Remove a list by creator token
  removeList(creatorToken: string): void {
    try {
      const lists = this.getLists();
      const filtered = lists.filter(l => l.creatorToken !== creatorToken);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  // Clear all saved lists
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },

  // Get count of saved lists
  getCount(): number {
    return this.getLists().length;
  }
};
