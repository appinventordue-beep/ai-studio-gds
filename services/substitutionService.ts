
import { ScheduleData, DayKey, AbsencesMap, Absentee, SubstitutionResult, BreakableCoTeacher } from '../types';
import { MOTIVATION_COLORS } from '../constants';

const getPresentTeachers = (day: DayKey, allTeachers: string[], absences: AbsencesMap): string[] => {
    return allTeachers.filter(teacher => {
        const absenceValue = absences[`${teacher}-${day}`] || '';
        return absenceValue !== 'A';
    });
};

const getAvailableTeachersAtHour = (hourIndex: number, day: DayKey, presentTeachers: string[], scheduleData: ScheduleData, absences: AbsencesMap): string[] => {
    const currentHour = hourIndex + 1;
    return presentTeachers.filter(teacher => {
        const scheduleEntry = scheduleData.teacherSchedules[teacher]?.[day]?.[hourIndex];
        if (!scheduleEntry || !scheduleEntry.toLowerCase().includes('ora disposizione')) return false;

        const absenceValue = absences[`${teacher}-${day}`] || '';
        if (absenceValue === '') return true;

        const absentHours = absenceValue.split(',').map(h => parseInt(h.trim(), 10)).filter(h => !isNaN(h));
        return !absentHours.includes(currentHour);
    });
};

const findBreakableCoTeachers = (hourIndex: number, day: DayKey, presentTeachers: string[], scheduleData: ScheduleData): BreakableCoTeacher[] => {
    const options: BreakableCoTeacher[] = [];
    for (const className in scheduleData.classSchedules) {
        const entry = scheduleData.classSchedules[className]?.[day]?.[hourIndex];
        if (entry && entry.includes(' / ')) {
            const teachersInClass = entry.split(' / ').map(e => e.split(' - ')[1]?.trim()).filter(Boolean);
            if (teachersInClass.length === 2 && presentTeachers.includes(teachersInClass[0]) && presentTeachers.includes(teachersInClass[1])) {
                options.push({ name: teachersInClass[0], fromClass: className, with: teachersInClass[1] });
                options.push({ name: teachersInClass[1], fromClass: className, with: teachersInClass[0] });
            }
        }
    }
    return options;
};

const findSubstitute = (absentee: Absentee, availableTeachers: string[], scheduleData: ScheduleData): SubstitutionResult => {
    const { name: absentTeacherName, class: absentClass } = absentee;
    const { classCouncils, teacherSubjects } = scheduleData;

    const classCouncil = classCouncils[absentClass] || [];
    const p1_substitute = availableTeachers.find(t => classCouncil.includes(t));
    if (p1_substitute) return { substitute: p1_substitute, reason: "Docente della Classe", ...MOTIVATION_COLORS.CLASSE };

    const absentTeacherSubjects = teacherSubjects[absentTeacherName] || [];
    const p2_substitute = availableTeachers.find(t => (teacherSubjects[t] || []).some(subSubject => absentTeacherSubjects.includes(subSubject)));
    if (p2_substitute) return { substitute: p2_substitute, reason: "Stessa Materia", ...MOTIVATION_COLORS.MATERIA };
    
    if (availableTeachers.length > 0) return { substitute: availableTeachers[0], reason: "Disponibilità Generica", ...MOTIVATION_COLORS.DISPONIBILITA };

    return { substitute: "NON TROVATO", reason: "Nessun docente disponibile", ...MOTIVATION_COLORS.NON_TROVATO };
};

export const generateDailyPlan = (day: DayKey, scheduleData: ScheduleData, absences: AbsencesMap) => {
    const { teacherSchedules, classSchedules } = scheduleData;
    const allTeachers = Object.keys(teacherSchedules).sort();
    const presentTeachers = getPresentTeachers(day, allTeachers, absences);
    const plan = [];

    for (let hourIndex = 0; hourIndex < 10; hourIndex++) {
        const currentHour = hourIndex + 1;
        const assignedSubsThisHour = new Set<string>();
        
        const absentTeachersThisHour: Absentee[] = [];
        allTeachers.forEach(teacherName => {
            const absenceValue = absences[`${teacherName}-${day}`] || '';
            if (!absenceValue) return;

            const isAbsentThisHour = absenceValue === 'A' || absenceValue.split(',').map(h => parseInt(h.trim(), 10)).includes(currentHour);
            
            if (isAbsentThisHour) {
                const scheduleEntry = teacherSchedules[teacherName]?.[day]?.[hourIndex];
                if (scheduleEntry && !scheduleEntry.toLowerCase().includes('ora disposizione')) {
                    const parts = scheduleEntry.split(' - ');
                    absentTeachersThisHour.push({
                        name: teacherName,
                        class: parts[0]?.trim() || 'N/A',
                        subject: parts[1]?.trim().replace('.', '') || 'N/A',
                        fullEntry: scheduleEntry
                    });
                }
            }
        });

        const availableNow = getAvailableTeachersAtHour(hourIndex, day, presentTeachers, scheduleData, absences);
        const breakableCoTeachers = findBreakableCoTeachers(hourIndex, day, presentTeachers, scheduleData);

        if (absentTeachersThisHour.length === 0) {
            plan.push({
                type: 'AVAILABLE',
                hourIndex,
                availableTeachers: availableNow,
                coTeachersOptions: breakableCoTeachers
            });
            continue;
        }

        absentTeachersThisHour.forEach(absentee => {
            let initialSub: SubstitutionResult | null = null;
            
            const classScheduleEntry = classSchedules[absentee.class]?.[day]?.[hourIndex];
            if (classScheduleEntry && classScheduleEntry.includes(' / ')) {
                const teachersInClass = classScheduleEntry.split(' / ').map(e => e.split(' - ')[1]?.trim()).filter(Boolean);
                const otherTeacher = teachersInClass.find(t => t && t !== absentee.name && presentTeachers.includes(t) && !assignedSubsThisHour.has(t));

                if (otherTeacher) {
                    initialSub = { substitute: `(${otherTeacher})`, reason: "Copertura in Compresenza", ...MOTIVATION_COLORS.COMPRESENZA };
                    assignedSubsThisHour.add(otherTeacher);
                }
            }

            if (!initialSub) {
                const trulyAvailable = availableNow.filter(t => !assignedSubsThisHour.has(t));
                const subResult = findSubstitute(absentee, trulyAvailable, scheduleData);
                if (subResult.substitute !== "NON TROVATO") {
                    assignedSubsThisHour.add(subResult.substitute);
                }
                initialSub = subResult;
            }

            plan.push({
                type: 'SUBSTITUTION',
                hourIndex,
                absentee,
                initialSub
            });
        });
    }
    return plan;
};
