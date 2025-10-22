import { DayKey } from './types';

export const LOCAL_STORAGE_KEY = 'gestionale-assenze-data-v1';

export const TIME_SLOTS = [
    "08:00-09:00",
    "09:00-10:00",
    "10:00-11:00",
    "11:00-12:00",
    "12:00-13:00",
    "13:00-14:00",
];

export const DAY_COL_MAP: { [key in DayKey]: number } = {
    'Lun': 1,
    'Mar': 2,
    'Mer': 3,
    'Gio': 4,
    'Ven': 5,
};

export const DAY_NAMES: { [key in DayKey]: string } = {
    'Lun': 'Lunedì',
    'Mar': 'Martedì',
    'Mer': 'Mercoledì',
    'Gio': 'Giovedì',
    'Ven': 'Venerdì',
};

export const MOTIVATION_COLORS: { [key: string]: { tw_bg: string, tw_text: string } } = {
  'Compresenza': { tw_bg: 'bg-yellow-200', tw_text: 'text-yellow-800' },
  'Docente della Classe': { tw_bg: 'bg-blue-200', tw_text: 'text-blue-900' },
  'Stessa Materia': { tw_bg: 'bg-orange-200', tw_text: 'text-orange-900' },
  'Disponibilità Generica': { tw_bg: 'bg-green-200', tw_text: 'text-green-900' },
  'Disponibilità Aggiuntiva': { tw_bg: 'bg-teal-200', tw_text: 'text-teal-900' },
  'A Pagamento': { tw_bg: 'bg-gray-300', tw_text: 'text-gray-800' },
  'Pull-out da Compresenza': { tw_bg: 'bg-cyan-200', tw_text: 'text-cyan-900' },
  'Forzatura Manuale': { tw_bg: 'bg-purple-200', tw_text: 'text-purple-900' },
  'NON TROVATO': { tw_bg: 'bg-red-200', tw_text: 'text-red-900' },
};

export const MOTIVATION_OPTIONS = Object.keys(MOTIVATION_COLORS);