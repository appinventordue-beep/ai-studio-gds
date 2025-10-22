
import React, { useState, useEffect, useCallback } from 'react';
import { ScheduleData, DayKey, AbsencesMap } from './types';
import { loadSchedulesFromLocalStorage, saveSchedulesToLocalStorage, clearSchedulesFromLocalStorage } from './services/storageService';
import { processCsvFiles } from './services/csvParserService';
import StatusSection from './components/StatusSection';
import WeeklyView from './components/WeeklyView';
import DailyView from './components/DailyView';

type AppStatus = 'initializing' | 'loading' | 'error' | 'ready' | 'needs_upload';
type ViewState = { view: 'weekly' } | { view: 'daily'; day: DayKey };

const App: React.FC = () => {
    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [status, setStatus] = useState<AppStatus>('initializing');
    const [statusMessage, setStatusMessage] = useState('Inizializzazione...');
    const [viewState, setViewState] = useState<ViewState>({ view: 'weekly' });
    const [absences, setAbsences] = useState<AbsencesMap>({});

    useEffect(() => {
        const data = loadSchedulesFromLocalStorage();
        if (data) {
            setScheduleData(data);
            setStatus('ready');
            setStatusMessage('Orari caricati con successo dal browser. Puoi iniziare a pianificare le assenze.');
        } else {
            setStatus('needs_upload');
            setStatusMessage('Nessun orario trovato. Per iniziare, carica i file CSV (docenti e classi).');
        }
    }, []);

    const handleFilesSelected = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setStatus('loading');
        setStatusMessage('Caricamento e elaborazione orari in corso... (Potrebbe richiedere un momento)');
        try {
            const data = await processCsvFiles(files);
            if (Object.keys(data.teacherSchedules).length === 0 || Object.keys(data.classSchedules).length === 0) {
                 throw new Error('File docenti o classi mancanti. Assicurati di caricare entrambi i tipi di orario.');
            }
            setScheduleData(data);
            saveSchedulesToLocalStorage(data);
            setStatus('ready');
            setStatusMessage('Orari caricati e salvati nel browser per i futuri accessi.');
            setAbsences({}); // Reset absences on new schedule upload
            setViewState({ view: 'weekly' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
            console.error(error);
            setStatus('error');
            setStatusMessage(`Errore durante l'elaborazione dei file: ${errorMessage}. Riprova.`);
            setScheduleData(null);
        }
    }, []);
    
    const handleResetSchedules = useCallback(() => {
        if (window.confirm("Sei sicuro di voler cancellare gli orari salvati? Dovrai ricaricare i file CSV.")) {
            clearSchedulesFromLocalStorage();
            setScheduleData(null);
            setAbsences({});
            setStatus('needs_upload');
            setStatusMessage('Orari resettati. Carica i nuovi file CSV.');
            setViewState({ view: 'weekly' });
        }
    }, []);

    const handleDayClick = useCallback((day: DayKey) => {
        setViewState({ view: 'daily', day });
    }, []);

    const handleBackToWeek = useCallback(() => {
        setViewState({ view: 'weekly' });
    }, []);
    
    const handleAbsenceChange = useCallback((teacher: string, day: DayKey, value: string) => {
        setAbsences(prev => ({
            ...prev,
            [`${teacher}-${day}`]: value.trim().toUpperCase()
        }));
    }, []);

    const renderContent = () => {
        if (status !== 'ready' || !scheduleData) {
            return null;
        }

        if (viewState.view === 'daily') {
            return (
                <DailyView
                    day={viewState.day}
                    scheduleData={scheduleData}
                    absences={absences}
                    onBack={handleBackToWeek}
                />
            );
        }

        return (
            <WeeklyView 
                scheduleData={scheduleData}
                absences={absences}
                onAbsenceChange={handleAbsenceChange}
                onDayClick={handleDayClick}
            />
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestionale Assenze Docenti</h1>
            <StatusSection
                status={status}
                message={statusMessage}
                onFilesSelected={handleFilesSelected}
                onReset={handleResetSchedules}
            />
            {renderContent()}
        </div>
    );
};

export default App;
