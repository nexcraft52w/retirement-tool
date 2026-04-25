export type PriceParams = {
  basePrice?: number;
  episodeDiscountApplied?: boolean;
  aiPolishDiscountApplied?: boolean;
};

export function resolvePrice({
  basePrice = 1500,
  episodeDiscountApplied = false,
  aiPolishDiscountApplied = false,
}: PriceParams) {
  let discount = 0;

  if (episodeDiscountApplied) discount += 300;
  if (aiPolishDiscountApplied) discount += 200;

  const finalPrice = Math.max(basePrice - discount, 0);

  return {
    basePrice,
    discount,
    finalPrice,
  };
}