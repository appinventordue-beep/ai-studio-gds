export const DAY_KEYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'] as const;
export type DayKey = typeof DAY_KEYS[number];

export type Schedule = {
    [key in DayKey]?: string[];
};

export type TeacherSchedules = { [teacherName: string]: Schedule };
export type ClassSchedules = { [className: string]: Schedule };
export type ClassCouncils = { [className: string]: string[] };
export type TeacherSubjects = { [teacherName: string]: string[] };

export interface ScheduleData {
    teacherSchedules: TeacherSchedules;
    classSchedules: ClassSchedules;
    classCouncils: ClassCouncils;
    teacherSubjects: TeacherSubjects;
}

// Key format: `${teacherName}-${dayKey}`
export type AbsencesMap = {
    [key: string]: string;
};

export interface Absentee {
    name: string;
    class: string;
    subject: string;
    fullEntry: string;
}

export interface SubstitutionResult {
    substitute: string;
    reason: string;
    color: string;
    textColor: string;
}

export type DailyPlanRow = 
| { type: 'SUBSTITUTION'; hourIndex: number; absentee: Absentee; initialSub: SubstitutionResult }
| { type: 'AVAILABLE'; hourIndex: number; availableTeachers: string[]; coTeachersOptions: BreakableCoTeacher[] };

export interface BreakableCoTeacher {
    name: string;
    fromClass: string;
    with: string;
}

export interface ClassSubstitution {
    hour: number;
    absentTeacher: string;
    subject: string;
    substituteTeacher: string;
    fullEntry: string;
}

export type ClassCoverageMap = {
    [className: string]: ClassSubstitution[];
};
