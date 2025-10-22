import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScheduleData, DayKey, AbsencesMap, DailyPlanRow, SubstitutionResult, Absentee } from '../types';
import { generateDailyPlan, buildClassCoverageMap } from '../services/substitutionService';
import SubstitutionRow from './SubstitutionRow';
import ClassCoverageView from './ClassCoverageView';
import { DAY_NAMES, TIME_SLOTS, MOTIVATION_COLORS } from '../constants';

interface DailyViewProps {
    day: DayKey;
    scheduleData: ScheduleData;
    absences: AbsencesMap;
    onBack: () => void;
}

type ViewMode = 'byHour' | 'byTeacher' | 'byClass';

const Legend: React.FC = () => (
    <div className="mt-8 p-4 border-t-2 border-gray-300">
        <h3 className="text-lg font-bold text-gray-800 mb-4">LEGENDA</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(MOTIVATION_COLORS).map(([reason, { tw_bg, tw_text }]) => (
                <div key={reason} className="flex items-center">
                    <span className={`w-5 h-5 rounded-sm mr-2 ${tw_bg}`}></span>
                    <span className={`text-sm font-medium ${tw_text.split(' ')[0]}`}>{reason}</span>
                </div>
            ))}
        </div>
    </div>
);


// Fix: Correctly type the component's props using the DailyViewProps interface.
const DailyView: React.FC<DailyViewProps> = ({ day, scheduleData, absences, onBack }) => {
    const [dailyPlan, setDailyPlan] = useState<DailyPlanRow[]>([]);
    const [substitutions, setSubstitutions] = useState<{ [key: string]: SubstitutionResult }>({});
    const [viewMode, setViewMode] = useState<ViewMode>('byTeacher');
    const [copyStatus, setCopyStatus] = useState('');

    useEffect(() => {
        const plan = generateDailyPlan(scheduleData, absences, day);
        setDailyPlan(plan);
        
        const initialSubs: { [key: string]: SubstitutionResult } = {};
        plan.forEach(row => {
            if (row.type === 'SUBSTITUTION') {
                const key = `${row.absentee.name}-${row.hourIndex}`;
                initialSubs[key] = row.initialSub;
            }
        });
        setSubstitutions(initialSubs);

    }, [scheduleData, absences, day]);

    const handleSubChange = useCallback((key: string, field: 'substitute' | 'reason', value: string) => {
        setSubstitutions(prev => {
            const newSubstitutions = { ...prev };
            const currentSub = newSubstitutions[key];
            if (!currentSub) return prev;

            if (field === 'reason') {
                const newStyle = MOTIVATION_COLORS[value] || MOTIVATION_COLORS['Disponibilità Generica'];
                newSubstitutions[key] = {
                    ...currentSub,
                    reason: value,
                    color: newStyle.tw_bg,
                    textColor: newStyle.tw_text,
                };
            } else if (field === 'substitute' && value !== currentSub.substitute) {
                 const manualStyle = MOTIVATION_COLORS['Forzatura Manuale'];
                 newSubstitutions[key] = {
                    ...currentSub,
                    substitute: value,
                    reason: 'Forzatura Manuale',
                    color: manualStyle.tw_bg,
                    textColor: manualStyle.tw_text,
                };
            } else {
                 newSubstitutions[key] = { ...currentSub, [field]: value };
            }
            return newSubstitutions;
        });
    }, []);

    const classCoverageData = useMemo(() => buildClassCoverageMap(dailyPlan, substitutions), [dailyPlan, substitutions]);

    const handleCopyToClipboard = useCallback(async () => {
        const cleanSubstituteName = (name: string): string => {
            if (!name) return '';
            const match = name.match(/^(.*?)\s*\(/);
            return (match ? match[1] : name).trim();
        };

        let tableString = '';
        if (viewMode === 'byHour') {
            const headers = ['Ora', 'Fascia', 'Docente Assente', 'Classe', 'Materia', 'Sostituito da'].join('\t');
            const substitutionRows = dailyPlan.filter(r => r.type === 'SUBSTITUTION');

            const body = substitutionRows
                .map(row => {
                    if (row.type !== 'SUBSTITUTION') return null;
                    
                    const key = `${row.absentee.name}-${row.hourIndex}`;
                    const finalSub = substitutions[key] || row.initialSub;

                    if (!finalSub.substitute || finalSub.reason === 'DA ASSEGNARE' || finalSub.reason === 'NON TROVATO') {
                        return null;
                    }

                    const subName = cleanSubstituteName(finalSub.substitute);
                    if (!subName) return null;
                    
                    if(finalSub.reason === 'Compresenza') {
                        return null; // Don't include Compresenza in this export view
                    }

                    return [
                        `${row.hourIndex + 1}a`,
                        TIME_SLOTS[row.hourIndex],
                        row.absentee.name,
                        row.absentee.class,
                        row.absentee.subject,
                        subName
                    ].join('\t');
                })
                .filter(Boolean)
                .join('\n');
            
            tableString = `${headers}\n${body}`;

        } else { // byClass view
            const headers = ['Classe', 'Ora', 'Docente Assente', 'Materia', 'Sostituito da'].join('\t');
            const sortedClasses = Object.keys(classCoverageData).sort();
            
            const body = sortedClasses.flatMap(className => 
                classCoverageData[className].map(sub => {
                    const subName = cleanSubstituteName(sub.substituteTeacher);
                    if (!subName) return null;
                    
                    return [
                        className,
                        `${sub.hour}a`,
                        sub.absentTeacher,
                        sub.subject,
                        subName
                    ].join('\t');
                })
            ).filter(Boolean).join('\n');
            
            tableString = `${headers}\n${body}`;
        }

        try {
            await navigator.clipboard.writeText(tableString);
            setCopyStatus('Copiato!');
            setTimeout(() => setCopyStatus(''), 2000);
        } catch (err) {
            console.error('Errore nella copia:', err);
            setCopyStatus('Errore!');
            setTimeout(() => setCopyStatus(''), 2000);
        }
    }, [viewMode, dailyPlan, substitutions, classCoverageData]);
    
    const substitutionsByTeacherAndHour = useMemo(() => {
        const map = new Map<string, { absentee: Absentee; finalSub: SubstitutionResult }>();
        dailyPlan.forEach(row => {
            if (row.type === 'SUBSTITUTION') {
                const key = `${row.absentee.name}-${row.hourIndex}`;
                const finalSub = substitutions[key] || row.initialSub;
                map.set(key, { absentee: row.absentee, finalSub });
            }
        });
        return map;
    }, [dailyPlan, substitutions]);

    const renderByHourView = () => {
        let lastHour = -1;
        const substitutionRows = dailyPlan.filter(r => r.type === 'SUBSTITUTION');
        
        const availableRowsByHour = dailyPlan.reduce<Record<number, Extract<DailyPlanRow, { type: 'AVAILABLE' }>>>((acc, row) => {
            if (row.type === 'AVAILABLE') {
                acc[row.hourIndex] = row;
            }
            return acc;
        }, {});

        if (substitutionRows.length === 0) {
            return (
                <div className="p-6 text-center text-gray-500">
                    <p className="font-semibold">Nessun docente assente (con ore di lezione) per {DAY_NAMES[day]}.</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-1/6">Ora</th>
                            <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-1/6">Docente Assente</th>
                            <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-2/6">Classe / Materia</th>
                            <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider w-1/3">Sostituto</th>
                            <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider">Motivazione</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {substitutionRows.map(row => {
                           if (row.type !== 'SUBSTITUTION') return null;
                           
                            const showHour = row.hourIndex !== lastHour;
                            lastHour = row.hourIndex;
                            const key = `${row.absentee.name}-${row.hourIndex}`;
                            
                            const availabilityInfo = availableRowsByHour[row.hourIndex];

                            return (
                                <SubstitutionRow
                                    key={key}
                                    rowKey={key}
                                    hourIndex={row.hourIndex}
                                    showHour={showHour}
                                    absentee={row.absentee}
                                    subDetails={substitutions[key]}
                                    onSubChange={handleSubChange}
                                    availableTeachers={availabilityInfo?.availableTeachers || []}
                                    coTeachersOptions={availabilityInfo?.coTeachersOptions || []}
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderByTeacherView = () => {
        const absentTeachers = [...new Set(
            dailyPlan.reduce<string[]>((acc, r) => {
                if (r.type === 'SUBSTITUTION') {
                    acc.push(r.absentee.name);
                }
                return acc;
            }, [])
        )].sort();

        if (absentTeachers.length === 0) {
            return (
                 <div className="p-6 text-center text-gray-500">
                    <p className="font-semibold">Nessun docente assente (con ore di lezione) per {DAY_NAMES[day]}.</p>
                </div>
            )
        }

        return (
            <div className="overflow-x-auto p-2 md:p-4">
                <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-600">Docente assente</th>
                            {TIME_SLOTS.map((_, index) => (
                                <th key={index} className="p-3 text-center text-xs font-semibold uppercase tracking-wider border border-gray-600 w-24">
                                    {index + 1}ora
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {absentTeachers.map(teacher => (
                            <tr key={teacher} className="bg-white">
                                <td className="p-2 border border-gray-300 font-medium text-sm text-gray-900">{teacher}</td>
                                {TIME_SLOTS.map((_, hourIndex) => {
                                    const key = `${teacher}-${hourIndex}`;
                                    const subInfo = substitutionsByTeacherAndHour.get(key);
                                    
                                    if (subInfo) {
                                        const { absentee, finalSub } = subInfo;
                                        const { substitute, reason, color, textColor } = finalSub;
                                        
                                        const isCompresenza = reason.toLowerCase().includes('compresenza');
                                        
                                        return (
                                            <td key={hourIndex} className={`p-2 border border-gray-300 text-center text-xs font-semibold align-top ${color} ${textColor}`}>
                                                <div className="font-bold">{absentee.class}</div>
                                                {(!isCompresenza && substitute) && <div className="font-normal whitespace-pre-wrap">{substitute}</div>}
                                            </td>
                                        );
                                    }
                                    
                                    return <td key={hourIndex} className="p-2 border border-gray-300"></td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const PrintLayout = () => (
        <div className="print-only p-4">
             <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Piano Sostituzioni - {DAY_NAMES[day]}</h2>
             {renderByTeacherView()}
             <Legend />
        </div>
    );

    return (
        <div className="bg-white rounded-lg shadow-md mt-8">
            <div className="no-print">
                <div className="p-4 md:p-6 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Piano Sostituzioni - {DAY_NAMES[day]}</h2>
                        <p className="text-sm text-gray-500 mt-1">Rivedi e modifica le sostituzioni. Le modifiche sono solo per questa sessione.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                            &larr; Indietro
                        </button>
                        <button 
                            onClick={handleCopyToClipboard} 
                            className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors w-28 text-center"
                        >
                            {copyStatus || 'Copia Tabella'}
                        </button>
                        <button onClick={() => window.print()} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                            Stampa
                        </button>
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex justify-center rounded-md shadow-sm" role="group">
                        <button type="button" onClick={() => setViewMode('byHour')} className={`px-4 py-2 text-sm font-medium ${viewMode === 'byHour' ? 'bg-blue-600 text-white z-10 ring-2 ring-blue-500' : 'bg-white text-gray-900 hover:bg-gray-100'} rounded-l-lg border border-gray-200 focus:outline-none`}>
                            Vista per Ora
                        </button>
                        <button type="button" onClick={() => setViewMode('byTeacher')} className={`-ml-px px-4 py-2 text-sm font-medium ${viewMode === 'byTeacher' ? 'bg-blue-600 text-white z-10 ring-2 ring-blue-500' : 'bg-white text-gray-900 hover:bg-gray-100'} border border-gray-200 focus:outline-none`}>
                            Vista per Docente
                        </button>
                        <button type="button" onClick={() => setViewMode('byClass')} className={`-ml-px px-4 py-2 text-sm font-medium ${viewMode === 'byClass' ? 'bg-blue-600 text-white z-10 ring-2 ring-blue-500' : 'bg-white text-gray-900 hover:bg-gray-100'} rounded-r-md border border-gray-200 focus:outline-none`}>
                            Vista per Classe
                        </button>
                    </div>
                </div>

                <div>
                    {viewMode === 'byHour' && renderByHourView()}
                    {viewMode === 'byTeacher' && renderByTeacherView()}
                    {viewMode === 'byClass' && <ClassCoverageView data={classCoverageData} />}
                </div>
            </div>
            <PrintLayout />
        </div>
    );
};

export default DailyView;