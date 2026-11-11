export interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  price: number;
  originalPrice?: number;
  category: 'Membership' | 'Research Dossier' | 'Code & Tooling' | 'Blueprint';
  featuredImage: string;
  format: string; // e.g., 'Instant PDF + Raw Data', 'Annual Subscription', 'GitHub Access + Docs'
  pageCount?: number;
  badge?: string;
  highlights: string[];
  tableOfContents?: string[];
  isFeatured?: boolean;
}

export type CheckoutStep = 'cart' | 'details' | 'payment' | 'confirmation';

export interface CheckoutCustomerInfo {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  vatNumber?: string;
}

export interface CheckoutPaymentInfo {
  method: 'card' | 'apple-pay' | 'google-pay' | 'crypto';
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export interface OrderConfirmation {
  orderId: string;
  date: string;
  customer: CheckoutCustomerInfo;
  items: {
    product: Product;
    quantity: number;
    subtotal: number;
  }[];
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  downloadToken: string;
}
