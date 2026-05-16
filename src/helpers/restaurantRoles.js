export const RESTAURANT_ROLE_KEYS = [
  'owner',
  'diningRoom',
  'kitchen',
  'advisory',
  'manager',
  'pastryBakery',
  'innovation',
  'sales',
  'teacher',
];

const ROLE_ALIASES = {
  owner: ['owner', 'propietari/a', 'propietario/a', 'restaurador/a o propietari/a', 'restaurador/a o propietario/a'],
  diningRoom: ['diningroom', 'departament de sala', 'departamento de sala', 'dining room department', 'professional de sala', 'profesional de sala'],
  kitchen: ['kitchen', 'departament de cuina', 'departamento de cocina', 'kitchen department', 'professional de cuina', 'profesional de cocina'],
  advisory: ['advisory', 'assessoria', 'asesoria', 'asesoría', 'consultancy'],
  manager: ['manager', 'directiu/iva-gerent', 'directivo/a-gerente', 'director-manager', 'direccio-gerencia', 'dirección-gerencia', 'management'],
  pastryBakery: [
    'pastrybakery',
    'departament de pastisseria/forneria',
    'departamento de pasteleria/panaderia',
    'pastry/bakery department',
    'professional de pastisseria i/o forneria',
    'profesional de pasteleria y/o panaderia',
  ],
  innovation: ['innovation', 'i+d', 'r+d', 'r&d'],
  sales: ['sales', 'comercial'],
  teacher: ['teacher', 'docent', 'docente', 'docencia', 'docència', 'teaching'],
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

export function normalizeRestaurantRoles(value) {
  const roleValues = Array.isArray(value) ? value : [value];
  const normalizedRoles = roleValues
    .map((roleValue) => normalizeRestaurantRole(roleValue))
    .filter(Boolean);

  return [...new Set(normalizedRoles)];
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

export function translateRestaurantRoles(value, t) {
  return normalizeRestaurantRoles(value)
    .map((roleValue) => translateRestaurantRole(roleValue, t))
    .filter(Boolean);
}
