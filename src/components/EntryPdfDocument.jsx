import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// --- STYLES ---
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#374151'
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  date: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
    fontSize: 10,
    color: '#6b7280'
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4
  },
  body: {
    marginBottom: 20,
    textAlign: 'justify'
  },
  // Markdown Styles
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 15, marginBottom: 6, color: '#111827' },
  h2: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 4, color: '#374151' },
  paragraph: { marginBottom: 8 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  
  // Gallery
  galleryTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#9ca3af',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  imageWrapper: {
    width: '30%', // roughly 3 columns
    height: 150,
    marginBottom: 10,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6'
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  }
});

// --- HELPER: MARKDOWN PARSER FOR PDF ---
// Splits text by formatting markers and renders styled Text components
const MarkdownText = ({ text }) => {
  if (!text) return null;

  // Split by newlines first to handle paragraphs/headers
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Headers
    if (line.startsWith('# ')) {
      return <Text key={lineIdx} style={styles.h1}>{line.replace('# ', '')}</Text>;
    }
    if (line.startsWith('## ')) {
      return <Text key={lineIdx} style={styles.h2}>{line.replace('## ', '')}</Text>;
    }

    // Paragraph parsing for Bold (**) and Italic (*)
    // Regex matches: **bold** OR *italic* OR normal text
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return (
      <Text key={lineIdx} style={styles.paragraph}>
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <Text key={partIdx} style={styles.bold}>{part.slice(2, -2)}</Text>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <Text key={partIdx} style={styles.italic}>{part.slice(1, -1)}</Text>;
          }
          return <Text key={partIdx}>{part}</Text>;
        })}
        {'\n'} 
      </Text>
    );
  });
};

// --- MAIN PDF DOCUMENT COMPONENT ---
const EntryPdfDocument = ({ entry, moodLabel, moodColorHex }) => {
  const dateObj = new Date(entry.date);
  const dateString = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeString = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{dateString}</Text>
            <Text style={{ color: '#9ca3af', fontSize: 10, marginTop: 4 }}>{timeString}</Text>
          </View>
          {entry.location && (
            <View>
              <Text style={{ textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{entry.location}</Text>
              {entry.weather && <Text style={{ textAlign: 'right', color: '#6b7280', fontSize: 10 }}>{entry.weather}</Text>}
            </View>
          )}
        </View>

        {/* META (Mood & Tags) */}
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            {/* Visual Icon: A colored circle representing the mood */}
            <View style={[styles.moodDot, { backgroundColor: moodColorHex || '#9ca3af' }]} />
            <Text>Mood: {moodLabel || 'Neutral'}</Text>
          </View>
          {entry.tags && entry.tags.length > 0 && (
            <View style={styles.metaItem}>
              <Text>•   Tags: {entry.tags.map(t => `#${t}`).join(', ')}</Text>
            </View>
          )}
        </View>

        {/* BODY CONTENT */}
        <View style={styles.body}>
          <MarkdownText text={entry.content} />
        </View>

        {/* IMAGE GALLERY */}
        {entry.images && entry.images.length > 0 && (
          <View wrap={false}>
            <Text style={styles.galleryTitle}>Attachments</Text>
            <View style={styles.galleryGrid}>
              {entry.images.map((imgBlob, index) => {
                // Determine source: Blob URL or Base64 string
                // Note: @react-pdf/renderer <Image> accepts Blob URLs directly!
                let src = imgBlob;
                if (imgBlob instanceof Blob) {
                   src = URL.createObjectURL(imgBlob); 
                }
                
                return (
                  <View key={index} style={styles.imageWrapper}>
                    <Image src={src} style={styles.image} />
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </Page>
    </Document>
  );
};

export default EntryPdfDocument;