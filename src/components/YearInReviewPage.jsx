import React, { useState } from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink, Image, Font } from '@react-pdf/renderer';
import { ChevronLeft, FileDown, Loader2, Book, User } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

// --- 1. CONFIGURATION & STYLES ---

// Register a standard font (Helvetica is built-in, but we define weights for "Markdown" feel)
const styles = StyleSheet.create({
  // Base Layout
  page: { 
    paddingTop: 50, 
    paddingBottom: 50, 
    paddingLeft: 50, 
    paddingRight: 50, 
    fontFamily: 'Helvetica', 
    backgroundColor: '#ffffff',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#333'
  },
  
  // Cover Page
  coverPage: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#f9fafb' // Light gray
  },
  coverTitle: { 
    fontSize: 36, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#111827'
  },
  coverAuthor: { 
    fontSize: 18, 
    color: '#4b5563', 
    marginBottom: 10 
  },
  coverYear: { 
    fontSize: 14, 
    color: '#9ca3af',
    marginTop: 40 
  },

  // Table of Contents
  tocTitle: { fontSize: 24, marginBottom: 20, fontWeight: 'bold' },
  tocRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '1px dotted #ccc', marginBottom: 5, paddingBottom: 2 },
  tocDate: { fontSize: 11 },
  tocMood: { fontSize: 11, color: '#666' },

  // Entries
  entryContainer: { 
    marginBottom: 30, 
    paddingBottom: 20, 
    borderBottom: '1px solid #e5e7eb' 
  },
  
  // Metadata Header
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4
  },
  dateText: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  metaRow: { flexDirection: 'row', gap: 10, fontSize: 9, color: '#4b5563', marginTop: 4 },
  
  // Content (Markdown Mappings)
  h1: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 8, color: '#111827' },
  h2: { fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 6, color: '#374151' },
  paragraph: { fontSize: 11, marginBottom: 8, textAlign: 'justify' },
  listItem: { flexDirection: 'row', marginBottom: 4, paddingLeft: 10 },
  bullet: { width: 10, fontSize: 11 },
  bold: { fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
  italic: { fontStyle: 'italic', fontFamily: 'Helvetica-Oblique' },

  // Images
  imageSection: { marginTop: 10, marginBottom: 10 },
  imageWrapper: { marginBottom: 10, alignItems: 'center' },
  entryImage: { 
    width: '100%', 
    maxHeight: 400, 
    objectFit: 'contain' // PREVENTS CROPPING
  },

  // Sleep Widget (Simulated)
  sleepBox: {
    marginTop: 10,
    padding: 10,
    border: '1px solid #e0e7ff',
    backgroundColor: '#eef2ff',
    borderRadius: 4,
  },
  sleepTitle: { fontSize: 10, fontWeight: 'bold', color: '#4338ca', marginBottom: 4 },
  sleepText: { fontSize: 9, color: '#3730a3' },

  // Footer
  pageNumber: {
    position: 'absolute',
    fontSize: 9,
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#9ca3af',
  },
});

// --- 2. HELPERS ---

// Helper to convert images for PDF
const processEntriesForPdf = async (entries, sleepSessions) => {
  return Promise.all(entries.map(async (entry) => {
    let processedImages = [];
    if (entry.images && entry.images.length > 0) {
      processedImages = await Promise.all(entry.images.map(async (img) => {
        if (img instanceof Blob) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result); // Get Base64
            reader.readAsDataURL(img);
          });
        }
        return img;
      }));
    }

    // Attach Sleep Data for this specific date
    const entryDate = new Date(entry.date).toDateString();
    const sleep = sleepSessions.filter(s => new Date(s.startTime).toDateString() === entryDate);

    return { ...entry, images: processedImages, sleep };
  }));
};

const formatSleepRange = (startTime, durationHours) => {
  const start = new Date(startTime);
  const end = new Date(startTime + (durationHours * 60 * 60 * 1000));
  return `${start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
};

// --- 3. CUSTOM MARKDOWN RENDERER FOR PDF ---
// Splits text into simple blocks for Headings, Lists, and Paragraphs
const MarkdownPdfRenderer = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <View>
      {lines.map((line, index) => {
        // Headings
        if (line.startsWith('# ')) return <Text key={index} style={styles.h1}>{line.replace('# ', '')}</Text>;
        if (line.startsWith('## ')) return <Text key={index} style={styles.h2}>{line.replace('## ', '')}</Text>;
        
        // List Items
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.paragraph}>{parseInlineStyles(line.replace(/^[-*] /, ''))}</Text>
            </View>
          );
        }

        // Empty lines
        if (line.trim() === '') return <View key={index} style={{ height: 8 }} />;

        // Standard Paragraph
        return <Text key={index} style={styles.paragraph}>{parseInlineStyles(line)}</Text>;
      })}
    </View>
  );
};

// Simple parser for **bold** within lines. 
// Note: React-PDF Text doesn't support nested Views, but supports nested Text.
const parseInlineStyles = (text) => {
  const parts = text.split(/(\*\*.*?\*\*)/g); // Split by bold markers
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
};


// --- 4. PDF DOCUMENT STRUCTURE ---
const JournalDocument = ({ year, entries, bookTitle, authorName }) => {
  return (
    <Document>
      
      {/* A. COVER PAGE */}
      <Page size="A4" style={styles.coverPage}>
        <View>
          <Text style={styles.coverTitle}>{bookTitle}</Text>
          <Text style={{...styles.coverTitle, fontSize: 24, fontWeight: 'normal'}}>{year}</Text>
          <View style={{ width: 100, height: 2, backgroundColor: '#333', marginVertical: 20, alignSelf: 'center' }} />
          <Text style={styles.coverAuthor}>{authorName}</Text>
          <Text style={styles.coverYear}>Generated via Journal App</Text>
        </View>
      </Page>

      {/* B. INDEX / TABLE OF CONTENTS */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.tocTitle}>Index</Text>
        {entries.map((entry, idx) => (
          <View key={idx} style={styles.tocRow}>
            <Text style={styles.tocDate}>
              {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
            </Text>
            <Text style={styles.tocMood}>
              {entry.mood ? `Mood: ${entry.mood}/10` : ''} • {entry.location || 'No Location'}
            </Text>
          </View>
        ))}
        {/* Page numbering handled by Footer */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />
      </Page>

      {/* C. ENTRIES (Auto Pagination) */}
      <Page size="A4" style={styles.page} wrap>
        {entries.map((entry, index) => (
          <View key={index} style={styles.entryContainer} break={index > 0}> 
            {/* break={true} forces new page per entry if you prefer, or remove it to flow continuously */}
            
            {/* 1. Header Block */}
            <View style={styles.metaHeader} wrap={false}>
              <View>
                <Text style={styles.dateText}>
                  {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                <View style={styles.metaRow}>
                   <Text>{new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                   {entry.location && <Text>•   {entry.location}</Text>}
                   {entry.weather && <Text>•   {entry.weather}</Text>}
                </View>
              </View>
              {entry.mood && (
                <View style={{ alignItems: 'flex-end' }}>
                   <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{entry.mood}</Text>
                   <Text style={{ fontSize: 9, color: '#6b7280' }}>MOOD</Text>
                </View>
              )}
            </View>

            {/* 2. Sleep Data (If exists) */}
            {entry.sleep && entry.sleep.length > 0 && (
               <View style={styles.sleepBox} wrap={false}>
                  <Text style={styles.sleepTitle}>SLEEP SESSION</Text>
                  {entry.sleep.map((s, i) => (
                    <Text key={i} style={styles.sleepText}>
                      • {formatSleepRange(s.startTime, s.duration)} ({s.duration.toFixed(1)}h)
                    </Text>
                  ))}
               </View>
            )}

            {/* 3. Markdown Content */}
            <View style={{ marginTop: 10 }}>
               <MarkdownPdfRenderer content={entry.content} />
            </View>

            {/* 4. Images (Full Width, Contained) */}
            {entry.images && entry.images.length > 0 && (
              <View style={styles.imageSection}>
                {entry.images.map((img, i) => (
                   <View key={i} style={styles.imageWrapper} wrap={false}>
                      <Image src={img} style={styles.entryImage} />
                   </View>
                ))}
              </View>
            )}
            
          </View>
        ))}

        {/* Footer on Every Page */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />
      </Page>

    </Document>
  );
};

// --- 5. MAIN UI PAGE COMPONENT ---
const YearInReviewPage = ({ navigate }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [bookTitle, setBookTitle] = useState('My Journal');
  const [authorName, setAuthorName] = useState('Me');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfData, setPdfData] = useState(null);

  const availableYears = useLiveQuery(async () => {
    const all = await db.entries.toArray();
    const years = new Set(all.map(e => new Date(e.date).getFullYear()));
    return [...years].sort((a, b) => b - a);
  }) || [];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setPdfData(null);
    try {
      // 1. Get Entries
      const rawEntries = await db.entries
        .filter(e => new Date(e.date).getFullYear() === selectedYear)
        .reverse() // Chronological for book (or reverse if you prefer)
        .toArray();
      
      // Chronological order usually better for reading a book
      rawEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

      // 2. Get Sleep Sessions
      const rawSleep = await db.sleep_sessions.toArray();

      // 3. Process
      const processed = await processEntriesForPdf(rawEntries, rawSleep);
      setPdfData(processed);
    } catch (e) {
      console.error("PDF Prep Error", e);
      alert("Failed to prepare data");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24 animate-slideUp">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 border-b border-gray-200/50 flex items-center gap-3">
        <button onClick={() => navigate('more')} className="p-2 -ml-2 text-blue-500 rounded-full hover:bg-blue-50">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Year in Review</h1>
      </div>

      <div className="p-6 space-y-6 max-w-lg mx-auto">
        
        {/* Configuration Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Book Details</h2>
            <p className="text-sm text-gray-500 mb-4">Customize the cover of your PDF.</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Title</label>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                  <Book size={16} className="text-gray-400" />
                  <input 
                    type="text" 
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    className="bg-transparent w-full outline-none text-gray-800 text-sm font-medium"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Author</label>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                  <User size={16} className="text-gray-400" />
                  <input 
                    type="text" 
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="bg-transparent w-full outline-none text-gray-800 text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Select Year</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => { setSelectedYear(year); setPdfData(null); }}
                  className={`py-2 px-4 rounded-xl text-sm font-bold border transition-all ${
                    selectedYear === year 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>

            {!pdfData ? (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <FileDown size={20} />}
                {isGenerating ? 'Compiling Book...' : 'Prepare PDF'}
              </button>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm font-medium text-center border border-green-100">
                   Book Ready! {pdfData.length} entries processed.
                </div>
                <PDFDownloadLink
                  document={<JournalDocument year={selectedYear} entries={pdfData} bookTitle={bookTitle} authorName={authorName} />}
                  fileName={`${bookTitle.replace(/\s+/g, '_')}_${selectedYear}.pdf`}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-500/20"
                >
                  {({ loading }) => (loading ? 'Building File...' : 'Download PDF Now')}
                </PDFDownloadLink>
                <button 
                  onClick={() => setPdfData(null)} 
                  className="w-full py-2 text-gray-400 font-medium text-xs hover:text-gray-600"
                >
                  Start Over
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearInReviewPage;