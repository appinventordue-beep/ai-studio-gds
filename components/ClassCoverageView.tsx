import React from 'react';
import { ClassCoverageMap } from '../types';

interface ClassCoverageViewProps {
    data: ClassCoverageMap;
}

const ClassCoverageView: React.FC<ClassCoverageViewProps> = ({ data }) => {
    const sortedClasses = React.useMemo(() => Object.keys(data).sort(), [data]);

    if (sortedClasses.length === 0) {
        return (
            <div className="p-6 text-center text-gray-500">
                <p>Nessuna sostituzione attiva da mostrare in questa vista.</p>
                <p className="text-sm mt-1">Vengono mostrate solo le ore in cui un docente assente è stato effettivamente sostituito.</p>
            </div>
        );
    }

    return (
        <div className="p-2 md:p-4 bg-gray-50">
            {sortedClasses.map(className => (
                <div key={className} className="mb-4 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 bg-gray-100 p-3 border-b">
                        Classe {className}
                    </h3>
                    <div className="p-3">
                        <ul className="space-y-2">
                            {data[className].map((sub, index) => (
                                <li key={`${sub.hour}-${sub.absentTeacher}-${index}`} className="text-sm p-2 rounded-md bg-blue-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                    <div className="flex items-center">
                                        <span className="font-bold text-blue-900 w-16 flex-shrink-0">{sub.hour}a Ora:</span>
                                        <span className="text-red-700 font-medium">{sub.absentTeacher}</span>
                                        <span className="text-gray-600 ml-2 truncate" title={sub.fullEntry}>({sub.subject || 'N/A'})</span>
                                    </div>
                                    <div className="flex items-center font-medium self-end sm:self-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                        <span className="text-green-800 bg-green-100 px-2 py-1 rounded">
                                            {sub.substituteTeacher}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ClassCoverageView;
