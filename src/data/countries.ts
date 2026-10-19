export interface Country {
  code: string; // ISO 3166-1 alpha-2, lowercase; matches public/flags/<code>.svg
  name: string;
}

// Start small; extend to all countries. SVGs: https://github.com/lipis/flag-icons (MIT)
export const COUNTRIES: Country[] = [
  { code: 'cz', name: 'Česko' },
  { code: 'sk', name: 'Slovensko' },
  { code: 'de', name: 'Německo' },
  { code: 'pl', name: 'Polsko' },
  { code: 'fr', name: 'Francie' },
  { code: 'it', name: 'Itálie' },
  { code: 'es', name: 'Španělsko' },
  { code: 'gb', name: 'Velká Británie' },
];
