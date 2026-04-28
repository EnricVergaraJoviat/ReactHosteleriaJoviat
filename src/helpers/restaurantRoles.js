export const RESTAURANT_ROLE_KEYS = [
  'owner',
  'manager',
  'kitchen',
  'diningRoom',
  'pastryBakery',
  'teacher',
  'innovation',
  'sales',
];

const ROLE_ALIASES = {
  owner: ['owner', 'propietari/a', 'propietario/a'],
  manager: ['manager', 'directiu/iva-gerent', 'directivo/a-gerente', 'director-manager'],
  kitchen: ['kitchen', 'departament de cuina', 'departamento de cocina', 'kitchen department'],
  diningRoom: ['diningroom', 'departament de sala', 'departamento de sala', 'dining room department'],
  pastryBakery: [
    'pastrybakery',
    'departament de pastisseria/forneria',
    'departamento de pasteleria/panaderia',
    'pastry/bakery department',
  ],
  teacher: ['teacher', 'docent', 'docente'],
  innovation: ['innovation', 'i+d', 'r+d', 'r&d'],
  sales: ['sales', 'comercial'],
};

function normalizeComparableValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, '+')
    .replace(/[^a-z0-9+/]+/g, '');
}

export function normalizeRestaurantRole(value) {
  const trimmedValue = String(value ?? '').trim();

  if (!trimmedValue) {
    return '';
  }

  if (RESTAURANT_ROLE_KEYS.includes(trimmedValue)) {
    return trimmedValue;
  }

  const comparableValue = normalizeComparableValue(trimmedValue);
  const matchedKey = RESTAURANT_ROLE_KEYS.find((roleKey) =>
    ROLE_ALIASES[roleKey]?.some((alias) => normalizeComparableValue(alias) === comparableValue)
  );

  return matchedKey ?? trimmedValue;
}

export function getRestaurantRoleOptions(t) {
  return RESTAURANT_ROLE_KEYS.map((roleKey) => ({
    value: roleKey,
    label: t(`roles.${roleKey}`),
  }));
}

export function translateRestaurantRole(value, t) {
  const normalizedValue = normalizeRestaurantRole(value);

  if (RESTAURANT_ROLE_KEYS.includes(normalizedValue)) {
    return t(`roles.${normalizedValue}`);
  }

  return String(value ?? '').trim();
}
