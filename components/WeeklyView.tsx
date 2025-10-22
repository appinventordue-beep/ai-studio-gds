
import React from 'react';
// Fix: DAY_KEYS is exported from types.ts, not constants.ts.
import { ScheduleData, DayKey, AbsencesMap, DAY_KEYS } from '../types';
import { DAY_NAMES } from '../constants';

interface WeeklyViewProps {
    scheduleData: ScheduleData;
    absences: AbsencesMap;
    onAbsenceChange: (teacher: string, day: DayKey, value: string) => void;
    onDayClick: (day: DayKey) => void;
}

const WeeklyView: React.FC<WeeklyViewProps> = ({ scheduleData, absences, onAbsenceChange, onDayClick }) => {
    const sortedTeachers = React.useMemo(() => Object.keys(scheduleData.teacherSchedules).sort(), [scheduleData.teacherSchedules]);

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-800">Pianificazione Settimanale Assenze</h2>
                <p className="text-sm text-gray-500 mt-2">
                    Inserisci <strong>"A"</strong> per assenza totale o le ore di permesso (es: <strong>"3,4,5"</strong>).
                    <br />
                    Clicca sull'intestazione del giorno (es. "Lunedì") per generare il foglio sostituzioni.
                </p>
            </div>
            <div className="table-container">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider">Docente</th>
                            {DAY_KEYS.map(day => (
                                <th 
                                    key={day}
                                    className="p-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                                    onClick={() => onDayClick(day)}
                                >
                                    {DAY_NAMES[day]}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedTeachers.map(teacher => (
                            <tr key={teacher} className="hover:bg-gray-50">
                                <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{teacher}</td>
                                {DAY_KEYS.map(day => (
                                    <td key={day} className="p-2 text-center">
                                        <input
                                            type="text"
                                            className="w-24 text-center border border-gray-300 rounded-md p-1 text-sm uppercase transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                            value={absences[`${teacher}-${day}`] || ''}
                                            onChange={(e) => onAbsenceChange(teacher, day, e.target.value)}
                                            placeholder="A / 3,4"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default React.memo(WeeklyView);