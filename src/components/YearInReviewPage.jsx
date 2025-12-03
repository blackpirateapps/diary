import React, { useState } from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';
import { ChevronLeft, FileDown, Loader2, Book, User } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

// --- 1. STYLES (Ported from EntryPdfDocument) ---
const styles = StyleSheet.create({
  // Base Page
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.3,
    color: '#1f2937'
  },
  
  // Cover Page Specifics
  coverPage: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#ffffff',
    fontFamily: 'Times-Roman',
  },
  coverTitle: { 
    fontSize: 36, 
    fontFamily: 'Times-Bold', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#111827'
  },
  coverAuthor: { 
    fontSize: 18, 
    fontFamily: 'Times-Italic',
    color: '#4b5563', 
    marginBottom: 10 
  },
  coverYear: { 
    fontSize: 14, 
    color: '#9ca3af',
    marginTop: 40 
  },

  // TOC
  tocTitle: { fontSize: 24, fontFamily: 'Times-Bold', marginBottom: 20 },
  tocRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#e5e7eb', 
    marginBottom: 5, 
    paddingBottom: 2 
  },

  // --- ENTRY STYLING (Direct Match) ---
  entryContainer: {
    marginBottom: 25,
    paddingBottom: 20,
    borderBottomWidth: 1, // Separator between days
    borderBottomColor: '#e5e7eb'
  },
  header: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#9ca3af',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerLeft: { flexDirection: 'column', maxWidth: '70%' },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end', maxWidth: '30%', marginTop: 6 },
  date: { fontSize: 22, fontFamily: 'Times-Bold', color: '#111827', marginBottom: 2, lineHeight: 1 },
  time: { color: '#6b7280', fontSize: 10, fontFamily: 'Times-Roman' },
  
  metaContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
    fontSize: 10,
    color: '#4b5563'
  },
  metaItem: { flexDirection: 'row', alignItems: 'center' },

  // Body & Markdown
  body: { marginBottom: 15, textAlign: 'justify' },
  h1: { fontSize: 16, fontFamily: 'Times-Bold', marginTop: 8, marginBottom: 2, color: '#111827' },
  h2: { fontSize: 13, fontFamily: 'Times-Bold', marginTop: 6, marginBottom: 2, color: '#374151' },
  paragraph: { marginBottom: 4 },
  bold: { fontFamily: 'Times-Bold' },
  italic: { fontFamily: 'Times-Italic' },
  listItem: { flexDirection: 'row', marginBottom: 2, paddingLeft: 10 },
  bullet: { width: 10, fontFamily: 'Times-Bold' },

  // Section Headers
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Times-Bold',
    color: '#111827',
    marginTop: 10,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  // Sleep Layout
  sleepContainer: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#6b7280'
  },
  sleepRow: { flexDirection: 'row', marginBottom: 1, fontSize: 10 },
  sleepLabel: { fontFamily: 'Times-Bold', width: 80, color: '#374151' },
  sleepValue: { fontFamily: 'Times-Roman', color: '#111827' },

  // Gallery Grid
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageWrapper: {
    width: '30%',
    height: 150,
    marginBottom: 10,
    borderRadius: 2,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  image: { width: '100%', height: '100%', objectFit: 'contain' },

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

const formatTime = (dateObj) => {
  return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Data preparation for PDF
const processEntriesForPdf = async (entries, sleepSessions) => {
  return Promise.all(entries.map(async (entry) => {
    let processedImages = [];
    if (entry.images && entry.images.length > 0) {
      processedImages = await Promise.all(entry.images.map(async (img) => {
        if (img instanceof Blob) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(img);
          });
        }
        return img;
      }));
    }

    // Attach Sleep Data
    const entryDate = new Date(entry.date).toDateString();
    const sleep = sleepSessions.filter(s => new Date(s.startTime).toDateString() === entryDate);

    return { ...entry, images: processedImages, sleep };
  }));
};

// --- 3. MARKDOWN RENDERER (Updated to match EntryPdf styling) ---
const MarkdownPdfRenderer = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');

  // Simple inline parser
  const parseInlineStyles = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
      if (part.startsWith('*') && part.endsWith('*')) return <Text key={i} style={styles.italic}>{part.slice(1, -1)}</Text>;
      return <Text key={i}>{part}</Text>;
    });
  };

  return (
    <View>
      {lines.map((line, index) => {
        if (line.startsWith('# ')) return <Text key={index} style={styles.h1}>{line.replace('# ', '')}</Text>;
        if (line.startsWith('## ')) return <Text key={index} style={styles.h2}>{line.replace('## ', '')}</Text>;
        
        // List styling
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.paragraph}>{parseInlineStyles(line.replace(/^[-*] /, ''))}</Text>
            </View>
          );
        }

        if (line.trim() === '') return <View key={index} style={{ height: 4 }} />;

        return <Text key={index} style={styles.paragraph}>{parseInlineStyles(line)}</Text>;
      })}
    </View>
  );
};


// --- 4. PDF DOCUMENT STRUCTURE ---
const JournalDocument = ({ year, entries, bookTitle, authorName }) => {
  return (
    <Document>
      
      {/* A. COVER PAGE */}
      <Page size="A4" style={styles.coverPage}>
        <View>
          <Text style={styles.coverTitle}>{bookTitle}</Text>
          <Text style={{...styles.coverTitle, fontSize: 24, fontFamily: 'Times-Roman'}}>{year}</Text>
          <View style={{ width: 100, height: 1, backgroundColor: '#333', marginVertical: 20, alignSelf: 'center' }} />
          <Text style={styles.coverAuthor}>{authorName}</Text>
          <Text style={styles.coverYear}>Generated via Journal App</Text>
        </View>
      </Page>

      {/* B. INDEX */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.tocTitle}>Index</Text>
        {entries.map((entry, idx) => (
          <View key={idx} style={styles.tocRow}>
            <Text style={{ fontFamily: 'Times-Bold' }}>
              {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
            <Text style={{ fontFamily: 'Times-Italic', color: '#6b7280' }}>
               {entry.mood || 'No Mood'} • {entry.location || ''}
            </Text>
          </View>
        ))}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (`${pageNumber} / ${totalPages}`)} fixed />
      </Page>

      {/* C. ENTRIES (Continuous Flow) */}
      <Page size="A4" style={styles.page} wrap>
        {entries.map((entry, index) => {
            const dateObj = new Date(entry.date);
            const dateString = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            const timeString = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            return (
                <View key={index} style={styles.entryContainer} wrap={false}> 
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.date}>{dateString}</Text>
                            <Text style={styles.time}>{timeString}</Text>
                        </View>
                        {(entry.location || entry.weather) && (
                            <View style={styles.headerRight}>
                                <Text style={{ fontFamily: 'Times-Bold', textAlign: 'right' }}>{entry.location}</Text>
                                {entry.weather && <Text style={{ color: '#6b7280', fontSize: 10, textAlign: 'right' }}>{entry.weather}</Text>}
                            </View>
                        )}
                    </View>

                    {/* Meta (Mood/Tags) */}
                    <View style={styles.metaContainer}>
                        <View style={styles.metaItem}>
                            <Text style={{ fontFamily: 'Times-Bold' }}>Mood: </Text>
                            <Text>{entry.mood || 'Neutral'}</Text>
                        </View>
                        {entry.tags && entry.tags.length > 0 && (
                            <View style={[styles.metaItem, { marginLeft: 20 }]}>
                                <Text style={{ fontFamily: 'Times-Bold' }}>Tags: </Text>
                                <Text>{entry.tags.join(', ')}</Text>
                            </View>
                        )}
                    </View>

                    {/* Content */}
                    <View style={styles.body}>
                         <MarkdownPdfRenderer content={entry.content} />
                    </View>

                    {/* Sleep Data (Styled like EntryPdf) */}
                    {entry.sleep && entry.sleep.length > 0 && (
                        <View wrap={false} style={{ marginTop: 5 }}>
                            <Text style={styles.sectionTitle}>Sleep Insights</Text>
                            {entry.sleep.map((session, sIdx) => {
                                const start = new Date(session.startTime);
                                const end = new Date(session.startTime + (session.duration * 60 * 60 * 1000));
                                
                                return (
                                    <View key={sIdx} style={styles.sleepContainer}>
                                        <View style={styles.sleepRow}>
                                            <Text style={styles.sleepLabel}>Sleep Time:</Text>
                                            <Text style={styles.sleepValue}>{formatTime(start)} — {formatTime(end)}</Text>
                                        </View>
                                        <View style={styles.sleepRow}>
                                            <Text style={styles.sleepLabel}>Duration:</Text>
                                            <Text style={styles.sleepValue}>{session.duration.toFixed(1)} hours</Text>
                                        </View>
                                        {session.deepSleepPerc !== undefined && (
                                            <View style={styles.sleepRow}>
                                                <Text style={styles.sleepLabel}>Deep Sleep:</Text>
                                                <Text style={styles.sleepValue}>{(session.deepSleepPerc * 100).toFixed(0)}%</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Images (Grid Layout) */}
                    {entry.images && entry.images.length > 0 && (
                        <View wrap={false}>
                            <Text style={styles.sectionTitle}>Attachments</Text>
                            <View style={styles.galleryGrid}>
                                {entry.images.map((imgSrc, iIdx) => (
                                    <View key={iIdx} style={styles.imageWrapper}>
                                        <Image src={imgSrc} style={styles.image} />
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            );
        })}

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
        .reverse()
        .toArray();
      
      // Chronological order for a book
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