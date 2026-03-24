export interface Drug {
  _id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  expiryDate: string;
  supplier: string;
  supplierContact?: string;
  supplierRating?: number;
  location: string;
  history?: {
    timestamp: string;
    change: number;
    newStock: number;
    type: 'Inbound' | 'Outbound' | 'Adjustment';
  }[];
}

export interface Order {
  _id: string;
  drugId: string | Drug;
  drugName: string;
  quantity: number;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  orderDate: string;
  expectedDelivery: string;
}
