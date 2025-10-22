
import { ScheduleData, DayKey, TeacherSchedules, ClassSchedules, ClassCouncils, TeacherSubjects, DAY_KEYS } from '../types';
import { TIME_SLOTS, DAY_COL_MAP } from '../constants';

const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
};

const parseTeacherSchedule = (csvText: string, teacherSchedules: TeacherSchedules, teacherSubjects: TeacherSubjects) => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return;
    const teacherName = lines[0].split(',')[0].trim();
    if (!teacherName || teacherName.length < 3) return;

    teacherSchedules[teacherName] = {};
    const subjects = new Set<string>();

    for (let i = 0; i < TIME_SLOTS.length; i++) {
        const lineIndex = i + 1;
        if (lineIndex >= lines.length) break;
        const cols = lines[lineIndex].split(',');
        
        DAY_KEYS.forEach(day => {
            const colIndex = DAY_COL_MAP[day];
            if (colIndex >= cols.length) return;
            const entry = cols[colIndex].trim();

            if (!teacherSchedules[teacherName][day]) {
                teacherSchedules[teacherName][day] = Array(TIME_SLOTS.length).fill('');
            }
            teacherSchedules[teacherName][day]![i] = entry;

            if (entry && !entry.toLowerCase().includes('ora disposizione')) {
                const subject = entry.split(' - ')[1]?.trim().replace('.', '');
                if (subject) subjects.add(subject);
            }
        });
    }
    teacherSubjects[teacherName] = Array.from(subjects);
};

const parseClassSchedule = (csvText: string, classSchedules: ClassSchedules, classCouncils: ClassCouncils) => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return;
    const className = lines[0].split(',')[0].trim();
    if (!className || className.length > 5) return;

    classSchedules[className] = {};
    const council = new Set<string>();
    
    for (let i = 0; i < TIME_SLOTS.length; i++) {
        const lineIndex = i + 1;
        if (lineIndex >= lines.length) break;
        const cols = lines[lineIndex].split(',');

        DAY_KEYS.forEach(day => {
            const colIndex = DAY_COL_MAP[day];
            if (colIndex >= cols.length) return;
            const entry = cols[colIndex].trim();

            if (!classSchedules[className][day]) {
                classSchedules[className][day] = Array(TIME_SLOTS.length).fill('');
            }
            classSchedules[className][day]![i] = entry;

            if (entry) {
                const teachers = entry.split(' / ').map(e => e.split(' - ')[1]?.trim()).filter(Boolean);
                teachers.forEach(t => council.add(t));
            }
        });
    }
    classCouncils[className] = Array.from(council);
};

export const processCsvFiles = async (files: FileList): Promise<ScheduleData> => {
    const teacherSchedules: TeacherSchedules = {};
    const classSchedules: ClassSchedules = {};
    const classCouncils: ClassCouncils = {};
    const teacherSubjects: TeacherSubjects = {};

    const filePromises = Array.from(files).map(async file => {
        try {
            const text = await readFileAsText(file);
            const firstLine = text.split(/\r?\n/)[0];
            const namePart = firstLine.split(',')[0].trim();
            if (!namePart) return;

            if (namePart.includes(' ')) { // Heuristic: teacher names have spaces
                parseTeacherSchedule(text, teacherSchedules, teacherSubjects);
            } else { // Heuristic: class names don't
                parseClassSchedule(text, classSchedules, classCouncils);
            }
        } catch (error) {
            console.error(`Errore nell'elaborazione del file ${file.name}:`, error);
        }
    });

    await Promise.all(filePromises);

    return { teacherSchedules, classSchedules, classCouncils, teacherSubjects };
};