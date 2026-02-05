// Currency formatting utility for Iraqi Dinar
export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('ar-IQ')} د.ع`;
};

export const formatPrice = (price: number): string => {
  return formatCurrency(price);
};

// Convert existing prices to Iraqi Dinar (example conversion rate)
// You can adjust this conversion rate as needed
export const convertToIQD = (amount: number): number => {
  // Assuming the current prices are in SAR, convert to IQD
  // 1 SAR ≈ 400 IQD (you can adjust this rate)
  return Math.round(amount * 400);
};