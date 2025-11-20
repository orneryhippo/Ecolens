
import React, { useState, useCallback, DragEvent, ChangeEvent, MouseEvent, useRef } from 'react';
import { analyzeImage, generateSimilarImage } from './services/geminiService';
import { IdentifiedItem, GeneratedVariation } from './types';

// --- Helper & UI Components ---

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

interface GeneratedImageCardProps {
  variation: GeneratedVariation;
}

const GeneratedImageCard: React.FC<GeneratedImageCardProps> = ({ variation }) => (
  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg shadow-sm w-full mb-4 border border-indigo-100 dark:border-indigo-800">
    <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-3 flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
      Generated Variation
    </h3>
    
    <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border border-indigo-100 dark:border-indigo-800 text-sm">
        <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Generation Prompt:</p>
        <p className="text-gray-700 dark:text-gray-300 italic">"{variation.description}"</p>
    </div>

    <div className="rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
      <img src={variation.imageUrl} alt="AI Generated Variation" className="w-full h-auto object-cover" />
    </div>
  </div>
);


// --- Main App Component ---
const App: React.FC = () => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<IdentifiedItem[] | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedVariation | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [focusPoint, setFocusPoint] = useState<{x: number, y: number} | undefined>(undefined);
  const imageRef = useRef<HTMLImageElement>(null);

  const isLoading = isAnalyzing || isGenerating;

  const resetState = () => {
    setImageDataUrl(null);
    setAnalysisResult(null);
    setGeneratedContent(null);
    setFocusPoint(undefined);
    setError(null);
    setIsAnalyzing(false);
    setIsGenerating(false);
  };
  
  const handleFile = useCallback((file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageDataUrl(reader.result as string);
        setAnalysisResult(null);
        setGeneratedContent(null);
        setFocusPoint(undefined);
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

  const handleImageClick = (e: MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setFocusPoint({ x, y });
    // Clear previous specific analysis if the focus point changes
    setAnalysisResult(null); 
  };

  const prepareImageData = () => {
    if (!imageDataUrl) throw new Error("No image selected");
    const [header, base64Data] = imageDataUrl.split(',');
    if (!header || !base64Data) throw new Error("Invalid image data.");
    const mimeType = header.match(/:(.*?);/)?.[1];
    if (!mimeType) throw new Error("Could not determine mime type.");
    return { base64Data, mimeType };
  };

  const handleAnalyzeClick = useCallback(async () => {
    if (!imageDataUrl) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const { base64Data, mimeType } = prepareImageData();
      const result = await analyzeImage(base64Data, mimeType, focusPoint);
      setAnalysisResult(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageDataUrl, focusPoint]);

  const handleGenerateClick = useCallback(async () => {
    if (!imageDataUrl) return;
    setIsGenerating(true);
    setError(null);

    try {
      const { base64Data, mimeType } = prepareImageData();
      const result = await generateSimilarImage(base64Data, mimeType);
      setGeneratedContent(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsGenerating(false);
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
      <main className="w-full max-w-5xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 md:p-8">
            <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white">
              EcoLens<span className="text-green-600">+</span>AI
            </h1>
            <p className="mt-2 text-center text-gray-500 dark:text-gray-400">
              Identify nature or generate variations with Gemini.
            </p>
          </div>
          
          <div className="px-6 md:px-10 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Column: Uploader/Image Preview */}
              <div className="flex flex-col items-center space-y-4">
                {!imageDataUrl ? (
                  <div
                    {...dragEventProps}
                    className={`relative w-full h-80 border-2 border-dashed rounded-xl flex flex-col justify-center items-center text-center p-4 transition-colors ${
                      isDragging ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <UploadIcon />
                    <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      <span className="text-green-600">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WEBP</p>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="relative inline-block w-full flex justify-center bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
                      <img 
                        ref={imageRef}
                        src={imageDataUrl} 
                        onClick={handleImageClick}
                        alt="Upload preview" 
                        className="max-w-full max-h-96 object-contain cursor-crosshair" 
                      />
                      {focusPoint && (
                        <div 
                          className="absolute w-8 h-8 -ml-4 -mt-4 border-2 border-white bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-sm font-bold pointer-events-none shadow-lg transform transition-all duration-200"
                          style={{ left: `${focusPoint.x}%`, top: `${focusPoint.y}%` }}
                        >
                          X
                        </div>
                      )}
                      {!focusPoint && (
                        <div className="absolute bottom-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full pointer-events-none backdrop-blur-sm">
                          Click image to focus
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={resetState}
                      className="mt-2 text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition"
                    >
                      Clear Image
                    </button>
                  </div>
                )}
                
                <div className="w-full grid grid-cols-2 gap-3">
                  <button
                    onClick={handleAnalyzeClick}
                    disabled={!imageDataUrl || isLoading}
                    className="bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md flex items-center justify-center"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  </button>
                  <button
                    onClick={handleGenerateClick}
                    disabled={!imageDataUrl || isLoading}
                    className="bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md flex items-center justify-center"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Similar'}
                  </button>
                </div>
                {isLoading && <Spinner />}
              </div>
              
              {/* Right Column: Analysis Results */}
              <div className="w-full min-h-[20rem] flex flex-col">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex justify-between items-center">
                  Results
                  {(analysisResult || generatedContent) && (
                    <span className="text-xs font-normal px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                      Generated with Gemini
                    </span>
                  )}
                </h2>
                <div className="flex-grow bg-gray-100/50 dark:bg-gray-900/50 rounded-xl p-4 overflow-y-auto max-h-[32rem]">
                  
                  {error && <p className="text-red-500 text-center p-4">{error}</p>}
                  
                  {/* Generated Image Section */}
                  {generatedContent && <GeneratedImageCard variation={generatedContent} />}

                  {/* Analysis Results Section */}
                  {analysisResult && (
                    analysisResult.length > 0 ? (
                      <div className="space-y-4">
                        {analysisResult.map((item, index) => (
                          <AnalysisCard key={index} item={item} />
                        ))}
                      </div>
                    ) : (
                      !generatedContent && <p className="text-center text-gray-500 dark:text-gray-400">No plants or animals were identified.</p>
                    )
                  )}

                  {!isLoading && !error && !analysisResult && !generatedContent && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                       <svg className="w-16 h-16 mb-4 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                       <p>Upload an image and choose an action.</p>
                       <p className="text-sm mt-2 text-center max-w-xs">
                         Click "Analyze" to identify wildlife.<br/>
                         Click "Generate Similar" to create AI art.
                       </p>
                    </div>
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
