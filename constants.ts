
import { DayKey } from './types';

export const LOCAL_STORAGE_KEY = 'gestioneAssenzeOrari_react';

export const DAY_NAMES: { [key in DayKey]: string } = {
    Lun: 'Lunedì',
    Mar: 'Martedì',
    Mer: 'Mercoledì',
    Gio: 'Giovedì',
    Ven: 'Venerdì',
};

export const TIME_SLOTS = ["8.00", "8.50", "9.40", "10.30", "11.20", "12.10", "13.00", "13.50", "14.40", "15.30"];

export const DAY_COL_MAP: { [key in DayKey]: number } = { Lun: 1, Mar: 2, Mer: 3, Gio: 4, Ven: 5 };

export const MOTIVATION_COLORS = {
    COMPRESENZA: { color: 'bg-yellow-50', textColor: 'text-gray-900' },
    CLASSE: { color: 'bg-blue-50', textColor: 'text-gray-900' },
    MATERIA: { color: 'bg-orange-50', textColor: 'text-gray-900' },
    DISPONIBILITA: { color: 'bg-green-50', textColor: 'text-gray-900' },
    MANUALE: { color: 'bg-purple-50', textColor: 'text-gray-900' },
    NON_TROVATO: { color: 'bg-red-50', textColor: 'text-red-700' },
};
