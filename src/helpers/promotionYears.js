export const CURRENTLY_STUDYING_PROMOTION_VALUE = 'currently-studying';

const PROMOTION_START_YEAR = 1970;

export function createPromotionYears() {
  const currentYear = new Date().getFullYear();

  return Array.from(
    { length: currentYear - PROMOTION_START_YEAR + 1 },
    (_, index) => currentYear - index
  );
}

export function normalizePromotionYearValue(value) {
  if (!value) {
    return '';
  }

  if (value === CURRENTLY_STUDYING_PROMOTION_VALUE) {
    return value;
  }

  return Number(value);
}

export function formatPromotionYear(t, value) {
  if (!value) {
    return '';
  }

  if (value === CURRENTLY_STUDYING_PROMOTION_VALUE) {
    return t('students.currentlyStudying');
  }

  return t('students.promotionYear', { year: value });
}
