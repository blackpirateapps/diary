import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

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
    paddingBottom: 12, // Increased padding
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start' // Changed from flex-end to handle multi-line better
  },
  headerLeft: {
    flexDirection: 'column',
    maxWidth: '70%'
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    maxWidth: '30%',
    marginTop: 4
  },
  date: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 4, // Added spacing between Date and Time
    lineHeight: 1.2
  },
  time: {
    color: '#9ca3af',
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
    fontSize: 10,
    color: '#6b7280',
    borderBottomWidth: 0.5, // Optional separator
    borderBottomColor: '#f3f4f6',
    paddingBottom: 10
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    width: '30%', 
    height: 150,
    marginBottom: 10,
    borderRadius: 4,
    backgroundColor: '#f3f4f6'
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 4
  }
});

// --- HELPER: MARKDOWN PARSER ---
const MarkdownText = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    if (line.startsWith('# ')) return <Text key={lineIdx} style={styles.h1}>{line.replace('# ', '')}</Text>;
    if (line.startsWith('## ')) return <Text key={lineIdx} style={styles.h2}>{line.replace('## ', '')}</Text>;

    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return (
      <Text key={lineIdx} style={styles.paragraph}>
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) return <Text key={partIdx} style={styles.bold}>{part.slice(2, -2)}</Text>;
          if (part.startsWith('*') && part.endsWith('*')) return <Text key={partIdx} style={styles.italic}>{part.slice(1, -1)}</Text>;
          return <Text key={partIdx}>{part}</Text>;
        })}
        {'\n'} 
      </Text>
    );
  });
};

// --- MAIN PDF DOCUMENT COMPONENT ---
const EntryPdfDocument = ({ entry, moodLabel }) => {
  const dateObj = new Date(entry.date);
  const dateString = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeString = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.date}>{dateString}</Text>
            <Text style={styles.time}>{timeString}</Text>
          </View>
          {entry.location && (
            <View style={styles.headerRight}>
              <Text style={{ fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>{entry.location}</Text>
              {entry.weather && <Text style={{ color: '#6b7280', fontSize: 10, textAlign: 'right' }}>{entry.weather}</Text>}
            </View>
          )}
        </View>

        {/* META (Text Only, No Icons) */}
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Mood: </Text>
            <Text>{moodLabel || 'Neutral'}</Text>
          </View>
          {entry.tags && entry.tags.length > 0 && (
            <View style={[styles.metaItem, { marginLeft: 20 }]}>
               <Text style={{ fontFamily: 'Helvetica-Bold' }}>Tags: </Text>
               <Text>{entry.tags.join(', ')}</Text>
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
              {entry.images.map((imgSrc, index) => (
                <View key={index} style={styles.imageWrapper}>
                  {/* Image source will be a JPEG Data URI */}
                  <Image src={imgSrc} style={styles.image} />
                </View>
              ))}
            </View>
          </View>
        )}

      </Page>
    </Document>
  );
};

export default EntryPdfDocument;