
import { ScheduleData } from '../types';
import { LOCAL_STORAGE_KEY } from '../constants';

export const loadSchedulesFromLocalStorage = (): ScheduleData | null => {
    try {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            console.log("Dati caricati da localStorage");
            return JSON.parse(savedData) as ScheduleData;
        }
        return null;
    } catch (error) {
        console.error("Errore nel caricare i dati da localStorage:", error);
        return null;
    }
};

export const saveSchedulesToLocalStorage = (data: ScheduleData): void => {
    try {
        const dataToSave = { ...data, savedAt: new Date().toISOString() };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
        console.log("Orari salvati con successo in localStorage!");
    } catch (error) {
        console.error("Errore nel salvataggio in localStorage:", error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            alert("Errore: Spazio di salvataggio nel browser esaurito. Impossibile salvare gli orari.");
        }
    }
};

export const clearSchedulesFromLocalStorage = (): void => {
    try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        console.log("Dati eliminati da localStorage.");
    } catch (error) {
        console.error("Errore nell'eliminazione da localStorage:", error);
    }
};
