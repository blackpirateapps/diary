import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Calendar, Book, BarChart3, Download, ChevronLeft, ChevronRight, Loader2, Palette, User, Quote } from 'lucide-react';

import YearInReviewPdf from './YearInReviewPdf';
import { blobToJpeg } from './editor/editorUtils';

const PDF_THEMES = [
  { name: 'Slate', hex: '#1f2937', label: 'Classic' },
  { name: 'Blue', hex: '#2563eb', label: 'Ocean' },
  { name: 'Emerald', hex: '#059669', label: 'Forest' },
  { name: 'Violet', hex: '#7c3aed', label: 'Royal' },
  { name: 'Rose', hex: '#e11d48', label: 'Berry' },
  { name: 'Amber', hex: '#d97706', label: 'Sunset' },
];

const StatCard = ({ icon: Icon, label, value, subLabel, colorClass }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center text-center">
    <div className={`p-3 rounded-full mb-3 ${colorClass.bg} ${colorClass.text}`}>
      <Icon size={24} />
    </div>
    <span className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</span>
    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
    {subLabel && <span className="text-xs text-gray-400 mt-2">{subLabel}</span>}
  </div>
);

const YearInReviewPage = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Customization State
  const [authorName, setAuthorName] = useState('');
  const [tagline, setTagline] = useState('A collection of moments, thoughts, and memories.');
  const [accentColor, setAccentColor] = useState(PDF_THEMES[0].hex);

  const allEntries = useLiveQuery(() => db.entries.toArray(), []) || [];

  const yearData = useMemo(() => {
    const entries = allEntries.filter(e => new Date(e.date).getFullYear() === selectedYear);
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalEntries = entries.length;
    const totalMood = entries.reduce((acc, curr) => acc + (curr.mood || 5), 0);
    const avgMood = totalEntries ? (totalMood / totalEntries).toFixed(1) : 0;
    
    const totalWords = entries.reduce((acc, curr) => {
        const text = typeof curr.content === 'string' ? curr.content : JSON.stringify(curr.content);
        return acc + text.split(/\s+/).length;
    }, 0);

    const byMonth = entries.reduce((acc, curr) => {
        const m = new Date(curr.date).getMonth();
        if(!acc[m]) acc[m] = 0;
        acc[m]++;
        return acc;
    }, {});

    return { entries, totalEntries, avgMood, totalWords, byMonth };
  }, [allEntries, selectedYear]);

  const handleExportBook = async () => {
    if (yearData.entries.length === 0) return;
    setIsGenerating(true);

    try {
      const processedEntries = await Promise.all(
        yearData.entries.map(async (entry) => {
          let pdfImages = [];
          if (entry.images && entry.images.length > 0) {
            try {
               pdfImages = await Promise.all(entry.images.map(img => blobToJpeg(img)));
            } catch (e) {
               console.warn("Failed to process image for entry", entry.id, e);
            }
          }
          return { ...entry, images: pdfImages.filter(Boolean) };
        })
      );

      const doc = (
        <YearInReviewPdf 
          entries={processedEntries} 
          year={selectedYear} 
          author={authorName}
          tagline={tagline}
          accentColor={accentColor}
        />
      );
      
      const blob = await pdf(doc).toBlob();
      saveAs(blob, `Journal_Year_Book_${selectedYear}.pdf`);
      
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to generate book.");
    } finally {
      setIsGenerating(false);
    }
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Year in Review</h1>
                <p className="text-gray-500 dark:text-gray-400">Your memories, bound into a book.</p>
            </div>
            
            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300"/>
                </button>
                <span className="text-xl font-bold font-mono text-gray-800 dark:text-gray-200 min-w-[80px] text-center">{selectedYear}</span>
                <button onClick={() => setSelectedYear(y => y + 1)} disabled={selectedYear >= new Date().getFullYear()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30">
                    <ChevronRight size={20} className="text-gray-600 dark:text-gray-300"/>
                </button>
            </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatCard icon={Book} label="Total Entries" value={yearData.totalEntries} subLabel={yearData.totalEntries === 0 ? "No entries yet" : "Memories recorded"} colorClass={{ bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-300' }} />
            <StatCard icon={BarChart3} label="Average Mood" value={yearData.avgMood} subLabel="Out of 10.0" colorClass={{ bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-600 dark:text-emerald-300' }} />
            <StatCard icon={Calendar} label="Total Words" value={(yearData.totalWords / 1000).toFixed(1) + 'k'} subLabel="Written this year" colorClass={{ bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-600 dark:text-amber-300' }} />
        </div>

        {/* Personalization Options */}
        {yearData.totalEntries > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-10 shadow-sm">
             <div className="flex items-center gap-2 mb-6">
                <Palette className="text-gray-400" size={20} />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Book Personalization</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                            <input 
                                type="text" 
                                value={authorName} 
                                onChange={(e) => setAuthorName(e.target.value)}
                                placeholder="e.g. John Doe"
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Book Tagline</label>
                        <div className="relative">
                            <Quote className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                            <input 
                                type="text" 
                                value={tagline} 
                                onChange={(e) => setTagline(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Accent Color</label>
                    <div className="flex flex-wrap gap-3">
                        {PDF_THEMES.map((theme) => (
                            <button
                                key={theme.name}
                                onClick={() => setAccentColor(theme.hex)}
                                className={`w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center ${accentColor === theme.hex ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                            >
                                <div className="w-10 h-10 rounded-full" style={{ backgroundColor: theme.hex }}></div>
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-3">Used for headings, covers, and highlights.</p>
                </div>
             </div>
          </div>
        )}

        {/* Action Area */}
        <div className="flex flex-col items-center justify-center py-10 border-t border-gray-200 dark:border-gray-800">
            {yearData.totalEntries > 0 ? (
                <button
                    onClick={handleExportBook}
                    disabled={isGenerating}
                    className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 size={24} className="animate-spin" />
                            <span>Binding Book...</span>
                        </>
                    ) : (
                        <>
                            <Download size={24} />
                            <span>Download {selectedYear} Yearbook</span>
                        </>
                    )}
                </button>
            ) : (
                <div className="text-center text-gray-400">
                    <p>No entries found for {selectedYear}. Start writing to create your book!</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default YearInReviewPage;