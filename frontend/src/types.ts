export interface CreatorItem {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  category?: string | null;
  price?: number | null;
  createdAt: string;
}

export interface BuyerItem extends CreatorItem {
  purchased: boolean;
}

export interface CreatorList {
  name: string;
  items: CreatorItem[];
}

export interface BuyerList {
  name: string;
  items: BuyerItem[];
}
