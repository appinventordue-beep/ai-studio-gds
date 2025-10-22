import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ScheduleData, DayKey, AbsencesMap, DailyPlanRow, ClassCoverageMap } from '../types';
import { generateDailyPlan } from '../services/substitutionService';
import { DAY_NAMES, TIME_SLOTS, MOTIVATION_COLORS } from '../constants';
import SubstitutionRow from './SubstitutionRow';
import ClassCoverageView from './ClassCoverageView';

interface DailyViewProps {
    day: DayKey;
    scheduleData: ScheduleData;
    absences: AbsencesMap;
    onBack: () => void;
}

// State for the editable rows
type EditablePlanState = { [key: string]: { substitute: string; reason: string; color: string; textColor: string } };

const DailyView: React.FC<DailyViewProps> = ({ day, scheduleData, absences, onBack }) => {
    const [currentView, setCurrentView] = useState<'byHour' | 'byClass'>('byHour');
    const initialPlan = useMemo(() => {
        return generateDailyPlan(day, scheduleData, absences);
    }, [day, scheduleData, absences]);

    const [editablePlan, setEditablePlan] = useState<EditablePlanState>({});

    // Initialize or reset state when the plan changes
    useEffect(() => {
        const initialState: EditablePlanState = {};
        initialPlan.forEach((row) => {
            if (row.type === 'SUBSTITUTION') {
                const key = `${row.hourIndex}-${row.absentee.name}`;
                initialState[key] = {
                    substitute: row.initialSub.substitute,
                    reason: row.initialSub.reason,
                    color: row.initialSub.color,
                    textColor: row.initialSub.textColor,
                };
            }
        });
        setEditablePlan(initialState);
    }, [initialPlan]);

    const classCoverageData = useMemo((): ClassCoverageMap => {
        const substitutionsByClass: ClassCoverageMap = {};
        initialPlan.forEach(row => {
            if (row.type === 'SUBSTITUTION') {
                const { hourIndex, absentee } = row;
                const key = `${hourIndex}-${absentee.name}`;
                const subDetails = editablePlan[key];
    
                // Consider only effective substitutions
                if (subDetails && subDetails.substitute && subDetails.substitute !== 'NON TROVATO') {
                    const { class: className, name: absentTeacher, subject, fullEntry } = absentee;
                    if (!substitutionsByClass[className]) {
                        substitutionsByClass[className] = [];
                    }
                    substitutionsByClass[className].push({
                        hour: hourIndex + 1,
                        absentTeacher,
                        subject,
                        substituteTeacher: subDetails.substitute,
                        fullEntry,
                    });
                }
            }
        });
    
        // Sort substitutions by hour within each class
        for (const className in substitutionsByClass) {
            substitutionsByClass[className].sort((a, b) => a.hour - b.hour);
        }
        
        return substitutionsByClass;
    }, [initialPlan, editablePlan]);

    const handleSubChange = useCallback((key: string, field: 'substitute' | 'reason', value: string) => {
        setEditablePlan(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value,
                reason: field === 'substitute' && prev[key]?.reason !== 'Modifica Manuale' ? 'Modifica Manuale' : (prev[key]?.reason || 'Modifica Manuale'),
                ...MOTIVATION_COLORS.MANUALE,
            },
        }));
    }, []);

    const handleCopyToClipboard = useCallback(async () => {
        let tsvData = '';
        let alertMessage = '';

        if (currentView === 'byClass') {
            const sortedClasses = Object.keys(classCoverageData).sort();
            if (sortedClasses.length === 0) {
                alert("Nessuna sostituzione attiva da copiare per la vista per classe.");
                return;
            }

            tsvData = "Classe\tOra\tDocente Assente\tMateria\tSostituito da\n";
            sortedClasses.forEach(className => {
                classCoverageData[className].forEach(sub => {
                    const cleanSubstituteName = sub.substituteTeacher.replace(/[()]/g, "").trim();
                    tsvData += `${className}\t${sub.hour}a\t${sub.absentTeacher}\t${sub.subject}\t${cleanSubstituteName}\n`;
                });
            });
            alertMessage = 'Vista per classe copiata negli appunti!';
        } else { // 'byHour' view
            const absentTeachersToday = Object.keys(scheduleData.teacherSchedules).filter(teacher => {
                return (absences[`${teacher}-${day}`] || '').trim() !== '';
            }).sort();

            if (absentTeachersToday.length === 0) {
                alert("Nessun docente assente o in permesso per cui generare il report.");
                return;
            }

            const hourHeaders = TIME_SLOTS.map((slot, index) => `${index + 1}a Ora (${slot})`);
            tsvData = "Docente Assente\t" + hourHeaders.join('\t') + '\n';

            absentTeachersToday.forEach(teacherName => {
                tsvData += teacherName + '\t';
                const absenceValue = (absences[`${teacherName}-${day}`] || '').trim().toUpperCase();

                const rowData = TIME_SLOTS.map((_, hourIndex) => {
                    const currentHour = hourIndex + 1;
                    const isAbsentThisHour = absenceValue === 'A' || absenceValue.split(',').map(h => parseInt(h.trim(), 10)).includes(currentHour);

                    if (!isAbsentThisHour) return '""';

                    const scheduleEntry = scheduleData.teacherSchedules[teacherName]?.[day]?.[hourIndex];
                    const isTeaching = scheduleEntry && !scheduleEntry.toLowerCase().includes('ora disposizione');

                    if (!isTeaching) return '""'; // Empty cell if not teaching

                    const planRowKey = `${hourIndex}-${teacherName}`;
                    const subDetails = editablePlan[planRowKey];

                    if (!subDetails) return '"ASSENTE"';

                    if (subDetails.substitute === 'NON TROVATO') {
                        return '"NON SOSTITUITO"';
                    }
                    // For both co-presence (e.g., "(Other Teacher)") and regular subs, just show the name.
                    return `"${subDetails.substitute}"`;
                });
                
                tsvData += rowData.join('\t') + '\n';
            });
            alertMessage = 'Tabella per foglio elettronico copiata negli appunti!';
        }

        try {
            await navigator.clipboard.writeText(tsvData);
            alert(alertMessage);
        } catch (err) {
            console.error('Errore durante la copia:', err);
            alert('Errore durante la copia. Controlla la console per i dettagli.');
        }
    }, [scheduleData, absences, day, editablePlan, currentView, classCoverageData]);

    const copyButtonText = currentView === 'byHour'
        ? 'Copia Tabella per Foglio Elettronico'
        : 'Copia Vista per Classe';

    let lastHourIndex = -1;

    return (
        <div className="mt-12 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-2xl font-semibold text-gray-800">
                    Gestione Sostituzioni per {DAY_NAMES[day]}
                </h2>
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex rounded-md shadow-sm" role="group">
                        <button
                            type="button"
                            onClick={() => setCurrentView('byHour')}
                            className={`px-4 py-2 text-sm font-medium border transition-colors ${
                                currentView === 'byHour'
                                    ? 'bg-blue-600 text-white border-blue-600 z-10 ring-2 ring-blue-300'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            } rounded-l-lg`}
                        >
                            Vista per Ora
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentView('byClass')}
                            className={`px-4 py-2 text-sm font-medium border transition-colors ${
                                currentView === 'byClass'
                                    ? 'bg-blue-600 text-white border-blue-600 z-10 ring-2 ring-blue-300'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            } rounded-r-lg -ml-px`}
                        >
                            Vista per Classe
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCopyToClipboard} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                            {copyButtonText}
                        </button>
                        <button onClick={onBack} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                            &larr; Torna alla Settimana
                        </button>
                    </div>
                </div>
            </div>
            <div className="table-container">
                {currentView === 'byHour' ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-800 text-white">
                            <tr>
                                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-1/6">Ora</th>
                                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-1/6">Docente Assente</th>
                                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-1/5">Classe / Materia</th>
                                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-1/5">Sostituto Assegnato</th>
                                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-1/5">Motivazione</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {initialPlan.map((row) => {
                                const showHour = row.hourIndex !== lastHourIndex;
                                if (showHour) {
                                    lastHourIndex = row.hourIndex;
                                }
                                if (row.type === 'SUBSTITUTION') {
                                    const key = `${row.hourIndex}-${row.absentee.name}`;
                                    return (
                                        <SubstitutionRow
                                            key={key}
                                            rowKey={key}
                                            hourIndex={row.hourIndex}
                                            showHour={showHour}
                                            absentee={row.absentee}
                                            subDetails={editablePlan[key]}
                                            onSubChange={handleSubChange}
                                            availableTeachers={[]} // Simplified for now, datalist can be added
                                            coTeachersOptions={[]}
                                        />
                                    );
                                } else { // type === 'AVAILABLE'
                                    return (
                                        <tr key={`avail-${row.hourIndex}`} className={showHour ? '' : 'border-t-0'}>
                                            <td className="p-3 text-sm font-medium text-gray-900">
                                                {showHour && <>{row.hourIndex + 1}a Ora <span className="text-xs text-gray-400">({TIME_SLOTS[row.hourIndex]})</span></>}
                                            </td>
                                            <td className="p-3 text-sm text-gray-500 italic">/</td>
                                            <td className="p-3 text-sm text-gray-500 italic">/</td>
                                            <td className="p-3 text-sm text-gray-700 text-ellipsis overflow-hidden" title={row.availableTeachers.join(', ')}>
                                                {row.availableTeachers.join(', ') || <em className="text-gray-400">Nessuno</em>}
                                            </td>
                                            <td className="p-3 text-sm text-gray-500 italic">Docenti a Disp.</td>
                                        </tr>
                                    );
                                }
                            })}
                            {initialPlan.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-gray-500">Nessuna assenza da gestire per questo giorno.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <ClassCoverageView data={classCoverageData} />
                )}
            </div>
        </div>
    );
};

export default DailyView;