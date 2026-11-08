export interface CatalogOffer {
  offerId: string;
  condition: string;
  conditionPercentage?: number | null;
  conditionDescription?: string | null;
  price: string | number;
  currency: string;
  stockQuantity: number;
  availableQuantity: number;
  warrantyMonths: number | null;
  status: string;
  basePrice?: number | string;
  discountAmount?: number | string;
  promotionDisplayCopy?: string | null;
  saleBadge?: string | null;
  gifts?: {
    promotionId: number;
    offerId: string;
    productName: string;
    modelCode: string;
    quantity: number;
    selectionRequired: boolean;
    availableQuantity: number;
    active: boolean;
  }[];
}

export function customerVisibleOffers(offers: CatalogOffer[]): CatalogOffer[] {
  return offers.filter((offer) => {
    const price = Number(offer.price);
    return offer.status === "ACTIVE"
      && Number.isFinite(price)
      && price >= 0
      && /^[A-Z]{3}$/.test(offer.currency)
      && Number.isSafeInteger(offer.availableQuantity)
      && offer.availableQuantity >= 0;
  });
}

export function canPurchaseOffer(offer: CatalogOffer | undefined, quantity = 1): boolean {
  if (!offer || !/^[0-9]{1,20}$/.test(offer.offerId)
      || !Number.isSafeInteger(quantity) || quantity < 1) return false;
  return customerVisibleOffers([offer]).length === 1
    && offer.availableQuantity >= quantity;
}
