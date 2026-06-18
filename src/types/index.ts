// Shared TypeScript types across the app

export type UserRole = "customer" | "admin" | "qbiqal";
export type OrderStatus =
  | "pending"
  | "payment_pending"
  | "payment_uploaded"
  | "payment_verified"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "uploaded" | "verified" | "rejected";

export type BlogPostStatus = "draft" | "published" | "archived";

export type MediaStorage = "local" | "r2";

// Cart (client-side — stored in localStorage)
export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  imageUrl?: string;
  slug: string;
  quantity: number;
  unitPriceInr: number;   // paise
}

export interface Cart {
  items: CartItem[];
  updatedAt: string;      // ISO timestamp
}

// API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Product with variants
export interface ProductWithVariants {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryId?: string | null;
  categoryName?: string | null;
  subCategory?: string | null;
  description?: string | null;
  longDesc?: string | null;
  sku: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  vendorId?: number | null;
  vendorName?: string | null;
  images: Array<{ id: string; url: string; alt?: string | null; isPrimary: boolean }>;
  variants: Array<{
    id: string;
    name: string;
    priceInr: number;
    mrpInr?: number | null;
    weight?: string | null;
    stock: number;
    sku: string;
    isActive: boolean;
  }>;
}

// Order with items
export interface OrderWithItems {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentGateway: string;
  subtotalInr: number;
  shippingInr: number;
  discountInr: number;
  totalInr: number;
  addressSnapshot?: Record<string, string> | null;
  notes?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  courier?: string | null;
  estimatedDelivery?: string | null;
  isSampleRequest: boolean;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    variantId: string;
    productSnapshot: Record<string, unknown>;
    quantity: number;
    unitPriceInr: number;
    totalInr: number;
  }>;
  customer?: {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
  };
}
