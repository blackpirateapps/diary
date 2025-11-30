import React, { useState, useEffect } from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink, Image, Font } from '@react-pdf/renderer';
import { ChevronLeft, FileDown, Loader2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

// --- PDF STYLES ---
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  coverPage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  coverTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 10, color: '#111827' },
  coverSubtitle: { fontSize: 16, color: '#6b7280' },
  sectionTitle: { fontSize: 24, marginBottom: 20, marginTop: 10, color: '#2563eb', borderBottom: '1px solid #e5e7eb', paddingBottom: 10 },
  entryContainer: { marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' },
  dateHeader: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 5 },
  moodText: { fontSize: 10, color: '#9ca3af', marginBottom: 10 },
  content: { fontSize: 11, lineHeight: 1.5, color: '#1f2937', marginBottom: 10 },
  imageContainer: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  image: { width: 150, height: 150, objectFit: 'cover', borderRadius: 4 },
  statsPage: { flex: 1, padding: 40 },
  statBox: { padding: 20, backgroundColor: '#f9fafb', marginBottom: 10, borderRadius: 8 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },
  statLabel: { fontSize: 12, color: '#6b7280' }
});

// --- HELPER: Process Images for PDF ---
// react-pdf needs valid base64 or URLs. We convert blobs to base64.
const processEntriesForPdf = async (entries) => {
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
        return img; // Already a string/url
      }));
    }
    return { ...entry, images: processedImages };
  }));
};

// --- PDF DOCUMENT COMPONENT ---
const JournalDocument = ({ year, entries }) => {
  const totalWords = entries.reduce((acc, e) => acc + (e.content?.split(' ').length || 0), 0);
  const totalImages = entries.reduce((acc, e) => acc + (e.images?.length || 0), 0);
  
  return (
    <Document>
      {/* COVER PAGE */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>Journal Year in Review</Text>
        <Text style={styles.coverSubtitle}>{year}</Text>
        <Text style={{ marginTop: 40, fontSize: 12, color: '#9ca3af' }}>Generated on {new Date().toLocaleDateString()}</Text>
      </Page>

      {/* STATS PAGE */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{entries.length}</Text>
          <Text style={styles.statLabel}>Total Entries</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalWords.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Words Written</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalImages}</Text>
          <Text style={styles.statLabel}>Photos Captured</Text>
        </View>
      </Page>

      {/* ENTRIES PAGES */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Memories</Text>
        {entries.map((entry, index) => (
          <View key={index} style={styles.entryContainer} wrap={false}>
            <Text style={styles.dateHeader}>
              {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
            {entry.mood && <Text style={styles.moodText}>Mood: {entry.mood}/10</Text>}
            
            {/* Sanitize content simple text only for PDF */}
            <Text style={styles.content}>
              {entry.content.replace(/<[^>]*>?/gm, '')} 
            </Text>

            {/* Images */}
            {entry.images && entry.images.length > 0 && (
              <View style={styles.imageContainer}>
                {entry.images.map((img, i) => (
                   <Image key={i} src={img} style={styles.image} />
                ))}
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
};

// --- MAIN PAGE COMPONENT ---
const YearInReviewPage = ({ navigate }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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
      const rawEntries = await db.entries
        .filter(e => new Date(e.date).getFullYear() === selectedYear)
        .reverse()
        .toArray();
      
      const processed = await processEntriesForPdf(rawEntries);
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

      <div className="p-6 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Select Year</h2>
          <p className="text-sm text-gray-500 mb-6">Choose a year to compile into a printable PDF book.</p>
          
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
              {isGenerating ? 'Processing Photos...' : 'Prepare PDF'}
            </button>
          ) : (
            <div className="space-y-3 animate-fadeIn">
              <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm font-medium text-center">
                 Ready to download! ({pdfData.length} entries)
              </div>
              <PDFDownloadLink
                document={<JournalDocument year={selectedYear} entries={pdfData} />}
                fileName={`Journal_${selectedYear}.pdf`}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {({ loading }) => (loading ? 'Building File...' : 'Download PDF Now')}
              </PDFDownloadLink>
              <button 
                onClick={() => setPdfData(null)} 
                className="w-full py-3 text-gray-500 font-medium text-sm hover:text-gray-700"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YearInReviewPage;