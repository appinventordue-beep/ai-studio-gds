
import React, { useCallback, ChangeEvent } from 'react';

interface StatusSectionProps {
    status: 'initializing' | 'loading' | 'error' | 'ready' | 'needs_upload';
    message: string;
    onFilesSelected: (files: FileList | null) => void;
    onReset: () => void;
}

const StatusSection: React.FC<StatusSectionProps> = ({ status, message, onFilesSelected, onReset }) => {
    
    const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        onFilesSelected(event.target.files);
    }, [onFilesSelected]);
    
    const showUploader = status === 'needs_upload' || status === 'error';
    const showResetButton = status === 'ready' || status === 'error';

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-700">
                    Stato Applicazione
                </h2>
                {showResetButton && (
                    <button 
                        onClick={onReset}
                        className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                        Resetta Orari
                    </button>
                )}
            </div>

            <p className={`text-sm mt-3 ${status === 'error' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                {message}
            </p>

            {showUploader && (
                <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-4">
                        Seleziona tutti i file <code>.csv</code> degli orari. Verranno salvati nel browser.
                    </p>
                    <input 
                        type="file" 
                        id="csv-uploader" 
                        multiple 
                        accept=".csv"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500
                                   file:mr-4 file:py-2 file:px-4
                                   file:rounded-lg file:border-0
                                   file:text-sm file:font-semibold
                                   file:bg-blue-50 file:text-blue-700
                                   hover:file:bg-blue-100 cursor-pointer"
                    />
                </div>
            )}
             {status === 'loading' && (
                <div className="mt-4">
                    <p className="text-blue-600 animate-pulse">Caricamento in corso...</p>
                </div>
            )}
        </div>
    );
};

export default StatusSection;
