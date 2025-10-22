import {
    ScheduleData,
    DayKey,
    AbsencesMap,
    Absentee,
    SubstitutionResult,
    DailyPlanRow,
    BreakableCoTeacher,
    ClassCoverageMap,
} from '../types';
import { TIME_SLOTS, MOTIVATION_COLORS } from '../constants';

const getAbsentHours = (absence: string | undefined): number[] | 'all' => {
    if (!absence) return [];
    if (absence.toUpperCase() === 'A') return 'all';
    return absence.split(',').map(h => parseInt(h.trim(), 10) - 1).filter(h => !isNaN(h) && h >= 0 && h < TIME_SLOTS.length);
};

const getAbsenteesForDay = (scheduleData: ScheduleData, absences: AbsencesMap, day: DayKey): { [hour: number]: Absentee[] } => {
    const absenteesByHour: { [hour: number]: Absentee[] } = {};

    for (const key in absences) {
        if (absences.hasOwnProperty(key)) {
            const [teacherName, absenceDay] = key.split('-');
            if (absenceDay === day) {
                const absentHours = getAbsentHours(absences[key]);
                const teacherSchedule = scheduleData.teacherSchedules[teacherName]?.[day];

                if (teacherSchedule) {
                    const hoursToProcess = absentHours === 'all' ? teacherSchedule.map((_, i) => i) : absentHours;
                    hoursToProcess.forEach(hourIndex => {
                        const fullEntry = teacherSchedule[hourIndex];
                        if (fullEntry && !fullEntry.toLowerCase().includes('disposizione')) {
                            const [className, subject] = fullEntry.split(' - ');
                            const absentee: Absentee = {
                                name: teacherName,
                                class: className?.trim() || 'N/A',
                                subject: subject?.trim().replace('.', '') || 'N/A',
                                fullEntry,
                            };
                            if (!absenteesByHour[hourIndex]) {
                                absenteesByHour[hourIndex] = [];
                            }
                            absenteesByHour[hourIndex].push(absentee);
                        }
                    });
                }
            }
        }
    }
    return absenteesByHour;
};

const getAvailableTeachers = (scheduleData: ScheduleData, day: DayKey, hourIndex: number, allAbsenteesForDay: string[]): string[] => {
    return Object.keys(scheduleData.teacherSchedules)
        .filter(teacher => !allAbsenteesForDay.includes(teacher))
        .filter(teacher => {
            const schedule = scheduleData.teacherSchedules[teacher]?.[day];
            return schedule?.[hourIndex]?.toLowerCase().includes('disposizione');
        });
};

const getBreakableCoTeachers = (scheduleData: ScheduleData, day: DayKey, hourIndex: number, allAbsenteesForDay: string[]): BreakableCoTeacher[] => {
    const options: BreakableCoTeacher[] = [];
    Object.entries(scheduleData.classSchedules).forEach(([className, schedule]) => {
        const classEntry = schedule[day]?.[hourIndex];
        if (classEntry && classEntry.includes(' / ')) {
            const teachers = classEntry.split(' / ').map(p => p.split(' - ')[1]?.trim()).filter(Boolean) as string[];
            if (teachers.length > 1) {
                teachers.forEach(teacher => {
                    if (!allAbsenteesForDay.includes(teacher)) {
                        const otherTeachers = teachers.filter(t => t !== teacher).join(', ');
                        options.push({
                            name: teacher,
                            fromClass: className,
                            with: otherTeachers,
                        });
                    }
                });
            }
        }
    });
    return options;
};

const findInitialSubstitute = (
    absentee: Absentee & { day: DayKey, hourIndex: number},
    available: string[],
    coTeachers: BreakableCoTeacher[],
    data: ScheduleData,
    absenteesToday: string[]
): SubstitutionResult => {
    
    // Priorità 0: Compresenza
    const classSchedule = data.classSchedules[absentee.class]?.[absentee.day];
    if (classSchedule) {
        const hourEntry = classSchedule[absentee.hourIndex];
        if (hourEntry && hourEntry.includes(' / ')) {
            const teachersInClass = hourEntry.split(' / ').map(p => p.split(' - ')[1]?.trim()).filter(Boolean);
            const otherTeacher = teachersInClass.find(t => t !== absentee.name);
            if(otherTeacher && !absenteesToday.includes(otherTeacher)) {
                 const style = MOTIVATION_COLORS['Compresenza'];
                 return { substitute: otherTeacher, reason: 'Compresenza', color: style.tw_bg, textColor: style.tw_text };
            }
        }
    }
    
    // Priorità 1: Docente della Classe
    const council = data.classCouncils[absentee.class] || [];
    const availableInCouncil = available.filter(t => council.includes(t));
    if (availableInCouncil.length > 0) {
        const style = MOTIVATION_COLORS['Docente della Classe'];
        return { substitute: availableInCouncil[0], reason: 'Docente della Classe', color: style.tw_bg, textColor: style.tw_text };
    }

    // Priorità 2: Stessa Materia
    const absenteeSubject = absentee.subject;
    const availableWithSameSubject = available.filter(t => {
        const subjects = data.teacherSubjects[t] || [];
        return subjects.includes(absenteeSubject);
    });
     if (availableWithSameSubject.length > 0) {
        const style = MOTIVATION_COLORS['Stessa Materia'];
        return { substitute: availableWithSameSubject[0], reason: 'Stessa Materia', color: style.tw_bg, textColor: style.tw_text };
    }

    // Priorità 3: Disponibilità Generica
    if (available.length > 0) {
        const style = MOTIVATION_COLORS['Disponibilità Generica'];
        return { substitute: available[0], reason: 'Disponibilità Generica', color: style.tw_bg, textColor: style.tw_text };
    }

    // Priorità 4: Pull-out da Compresenza
    if (coTeachers.length > 0) {
        const style = MOTIVATION_COLORS['Pull-out da Compresenza'];
        return { substitute: `${coTeachers[0].name} (da ${coTeachers[0].fromClass})`, reason: 'Pull-out da Compresenza', color: style.tw_bg, textColor: style.tw_text };
    }

    // Caso: Non trovato
    const style = MOTIVATION_COLORS['NON TROVATO'];
    return { substitute: '', reason: 'NON TROVATO', color: style.tw_bg, textColor: style.tw_text };
};


export const generateDailyPlan = (scheduleData: ScheduleData, absences: AbsencesMap, day: DayKey): DailyPlanRow[] => {
    const plan: DailyPlanRow[] = [];
    const absenteesByHour = getAbsenteesForDay(scheduleData, absences, day);
    const allAbsentTeachersToday = Object.keys(absences)
        .filter(key => key.endsWith(`-${day}`) && (absences[key]?.toUpperCase() === 'A' || (absences[key] || '').length > 0))
        .map(key => key.split('-')[0]);

    for (let i = 0; i < TIME_SLOTS.length; i++) {
        const hourAbsentees = absenteesByHour[i] || [];
        const availableTeachers = getAvailableTeachers(scheduleData, day, i, allAbsentTeachersToday);
        const coTeachersOptions = getBreakableCoTeachers(scheduleData, day, i, allAbsentTeachersToday);

        if (hourAbsentees.length > 0) {
            hourAbsentees.forEach(absentee => {
                const absenteeWithContext = {...absentee, hourIndex: i, day: day};
                const initialSub = findInitialSubstitute(absenteeWithContext, availableTeachers, coTeachersOptions, scheduleData, allAbsentTeachersToday);
                plan.push({ type: 'SUBSTITUTION', hourIndex: i, absentee, initialSub });
            });
            plan.push({ type: 'AVAILABLE', hourIndex: i, availableTeachers, coTeachersOptions });
        }
    }
    
    return plan;
};

export const buildClassCoverageMap = (plan: DailyPlanRow[], substitutions: {[key: string]: SubstitutionResult}): ClassCoverageMap => {
    const map: ClassCoverageMap = {};
    
    plan.forEach(row => {
        if (row.type === 'SUBSTITUTION') {
            const key = `${row.absentee.name}-${row.hourIndex}`;
            const finalSub = substitutions[key] || row.initialSub;

            if (finalSub.substitute && finalSub.substitute.trim() !== '' && !finalSub.substitute.includes('???')) {
                const className = row.absentee.class;
                if (!map[className]) {
                    map[className] = [];
                }
                map[className].push({
                    hour: row.hourIndex + 1,
                    absentTeacher: row.absentee.name,
                    subject: row.absentee.subject,
                    substituteTeacher: finalSub.substitute,
                    fullEntry: row.absentee.fullEntry
                });
            }
        }
    });

    for (const className in map) {
        map[className].sort((a, b) => a.hour - b.hour);
    }

    return map;
};