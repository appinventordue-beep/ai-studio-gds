
import React, { ChangeEvent } from 'react';
import { Absentee, BreakableCoTeacher } from '../types';
import { TIME_SLOTS } from '../constants';

interface SubstitutionRowProps {
    rowKey: string;
    hourIndex: number;
    showHour: boolean;
    absentee: Absentee;
    subDetails?: { substitute: string; reason: string; color: string; textColor: string };
    onSubChange: (key: string, field: 'substitute' | 'reason', value: string) => void;
    availableTeachers: string[];
    coTeachersOptions: BreakableCoTeacher[];
}

const SubstitutionRow: React.FC<SubstitutionRowProps> = ({
    rowKey,
    hourIndex,
    showHour,
    absentee,
    subDetails,
    onSubChange,
    availableTeachers,
    coTeachersOptions
}) => {
    
    const handleInputChange = (field: 'substitute' | 'reason') => (e: ChangeEvent<HTMLInputElement>) => {
        onSubChange(rowKey, field, e.target.value);
    };

    if (!subDetails) return null; // Should not happen if state is synced

    const dataListId = `dl-${rowKey}`;

    return (
        <tr className={subDetails.color}>
            {showHour && (
                <td className={`p-3 text-sm font-medium ${subDetails.textColor}`}>
                    {hourIndex + 1}a Ora <span className="text-xs text-gray-400">({TIME_SLOTS[hourIndex]})</span>
                </td>
            )}
            {!showHour && <td className="p-3"></td>}

            <td className="p-3 text-sm font-semibold text-red-700">{absentee.name}</td>
            <td className="p-3 text-sm text-red-700">{absentee.fullEntry}</td>
            <td className="p-0">
                <input
                    type="text"
                    value={subDetails.substitute}
                    onChange={handleInputChange('substitute')}
                    list={dataListId}
                    className={`w-full p-2 text-sm border-0 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white ${subDetails.textColor}`}
                />
                 <datalist id={dataListId}>
                    {coTeachersOptions.length > 0 && <optgroup label="Spezzando Compresenza">
                        {coTeachersOptions.map(opt => <option key={`${opt.name}-${opt.fromClass}`} value={`${opt.name} (da ${opt.fromClass})`} />)}
                    </optgroup>}
                    {availableTeachers.length > 0 && <optgroup label="A Disposizione">
                        {availableTeachers.map(t => <option key={t} value={t} />)}
                    </optgroup>}
                </datalist>
            </td>
            <td className="p-0">
                <input
                    type="text"
                    value={subDetails.reason}
                    onChange={handleInputChange('reason')}
                    className={`w-full p-2 text-sm border-0 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white ${subDetails.textColor}`}
                />
            </td>
        </tr>
    );
};

export default React.memo(SubstitutionRow);
