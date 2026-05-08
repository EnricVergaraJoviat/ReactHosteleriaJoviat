const JOVIAT_STUDY_OPTIONS = [
  {
    value: 'cfgm-cuina-gastronomia-serveis-restauracio',
    label: 'CFGM Cuina i gastronomia i Serveis en restauració',
  },
  {
    value: 'cfgm-pastisseria-forneria-confiteria',
    label: 'CFGM Pastisseria, forneria i confiteria',
  },
  {
    value: 'cfgs-direccio-cuina',
    label: 'CFGS Direcció de cuina',
  },
  {
    value: 'programa-intensiu-cuina-catalana',
    label: 'Programa Intensiu de Cuina Catalana',
  },
  {
    value: 'diploma-sommelier',
    label: 'Diploma de Sommelier',
  },
  {
    value: 'advanced-sommelier-postgraduate-degree',
    label: 'Advanced Sommelier Postgraduate Degree',
  },
];

const JOVIAT_STUDY_VALUES = new Set(JOVIAT_STUDY_OPTIONS.map((study) => study.value));

function normalizeJoviatStudies(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry, index, entries) =>
      JOVIAT_STUDY_VALUES.has(entry) && entries.indexOf(entry) === index
    );
}

function getJoviatStudyOptions() {
  return JOVIAT_STUDY_OPTIONS;
}

function getJoviatStudyLabels(studies) {
  const normalizedStudies = normalizeJoviatStudies(studies);

  return normalizedStudies.map((studyValue) =>
    JOVIAT_STUDY_OPTIONS.find((study) => study.value === studyValue)?.label ?? studyValue
  );
}

export {
  JOVIAT_STUDY_OPTIONS,
  getJoviatStudyLabels,
  getJoviatStudyOptions,
  normalizeJoviatStudies,
};
