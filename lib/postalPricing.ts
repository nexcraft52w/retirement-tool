export type PostalPlan = "light" | "standard" | "full";

export type PriceDecision = {
  plan: PostalPlan;
  amount: number;
  label: string;
};

export function getPostalPlan(value: unknown): PostalPlan {
  if (value === "light" || value === "standard" || value === "full") {
    return value;
  }

  return "standard";
}

export function getPostalPrice(
  plan: PostalPlan,
  isFreeMode: boolean
): PriceDecision {
  if (isFreeMode) {
    return {
      plan,
      amount: 0,
      label: "無料期間中",
    };
  }

  switch (plan) {
    case "light":
      return {
        plan: "light",
        amount: 1000,
        label: "ライトプラン",
      };

    case "standard":
      return {
        plan: "standard",
        amount: 1200,
        label: "標準プラン",
      };

    case "full":
      return {
        plan: "full",
        amount: 1500,
        label: "フルプラン",
      };

    default:
      return {
        plan: "standard",
        amount: 1200,
        label: "標準プラン",
      };
  }
}