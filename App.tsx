
import React, { useState, useCallback, DragEvent, ChangeEvent } from 'react';
import { analyzeImage } from './services/geminiService';
import { IdentifiedItem } from './types';

// --- Helper & UI Components (defined outside App to prevent re-creation on re-renders) ---

const UploadIcon: React.FC = () => (
  <svg className="w-12 h-12 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlantIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h14a1 1 0 011 1v4.293zM5 6a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2z" />
  </svg>
);

const AnimalIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const Spinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
  </div>
);

interface AnalysisCardProps {
  item: IdentifiedItem;
}
const AnalysisCard: React.FC<AnalysisCardProps> = ({ item }) => (
  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg shadow-sm transition-transform hover:scale-105 hover:shadow-md w-full">
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0">
        {item.type === 'Plant' ? <PlantIcon /> : <AnimalIcon />}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{item.commonName}</h3>
        <p className="text-sm italic text-gray-500 dark:text-gray-400">{item.scientificName}</p>
        <p className="mt-2 text-gray-600 dark:text-gray-300">{item.description}</p>
      </div>
    </div>
  </div>
);


// --- Main App Component ---
const App: React.FC = () => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<IdentifiedItem[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const resetState = () => {
    setImageDataUrl(null);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
  };
  
  const handleFile = useCallback((file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageDataUrl(reader.result as string);
        setAnalysisResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      setError("Please upload a valid image file (e.g., PNG, JPG, WEBP).");
    }
  }, []);

  const handleImageChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
  }, [handleFile]);

  const handleAnalyzeClick = useCallback(async () => {
    if (!imageDataUrl) {
      setError("Please select an image first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const [header, base64Data] = imageDataUrl.split(',');
      if (!header || !base64Data) throw new Error("Invalid image data URL format.");
      
      const mimeType = header.match(/:(.*?);/)?.[1];
      if (!mimeType) throw new Error("Could not determine image mime type.");

      const result = await analyzeImage(base64Data, mimeType);
      setAnalysisResult(result);
    } catch (e) {
      const err = e as Error;
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [imageDataUrl]);

  const dragEventProps = {
    onDragEnter: (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); },
    onDragLeave: (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); },
    onDragOver: (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); },
    onDrop: (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFile(e.dataTransfer.files?.[0] ?? null);
    },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-300">
      <main className="w-full max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 md:p-10">
            <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white">
              EcoLens<span className="text-green-600">.</span>ai
            </h1>
            <p className="mt-2 text-center text-gray-500 dark:text-gray-400">
              Identify plants and animals from your photos with Gemini.
            </p>
          </div>
          
          <div className="px-6 md:px-10 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Column: Uploader/Image Preview */}
              <div className="flex flex-col items-center space-y-4">
                {!imageDataUrl ? (
                  <div
                    {...dragEventProps}
                    className={`relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col justify-center items-center text-center p-4 transition-colors ${
                      isDragging ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <UploadIcon />
                    <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      <span className="text-green-600">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WEBP, etc.</p>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                ) : (
                  <div className="w-full">
                    <img src={imageDataUrl} alt="Upload preview" className="w-full rounded-xl shadow-lg object-contain max-h-96" />
                    <button
                      onClick={resetState}
                      className="mt-4 w-full text-sm text-center text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition"
                    >
                      Clear Image
                    </button>
                  </div>
                )}
                
                <button
                  onClick={handleAnalyzeClick}
                  disabled={!imageDataUrl || isLoading}
                  className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 flex items-center justify-center space-x-2 shadow-lg"
                >
                  {isLoading && (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>{isLoading ? 'Analyzing...' : 'Analyze Image'}</span>
                </button>
              </div>
              
              {/* Right Column: Analysis Results */}
              <div className="w-full min-h-[20rem] flex flex-col">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Analysis</h2>
                <div className="flex-grow bg-gray-100/50 dark:bg-gray-900/50 rounded-xl p-4 overflow-y-auto max-h-96">
                  {isLoading && <Spinner />}
                  {error && <p className="text-red-500 text-center">{error}</p>}
                  {!isLoading && !error && analysisResult && (
                    analysisResult.length > 0 ? (
                      <div className="space-y-4">
                        {analysisResult.map((item, index) => (
                          <AnalysisCard key={index} item={item} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400">No plants or animals were identified in the image.</p>
                    )
                  )}
                  {!isLoading && !error && !analysisResult && (
                    <p className="text-center text-gray-500 dark:text-gray-400">Results will appear here.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
