import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// --- STYLES ---
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.3, // Reduced from 1.4 for tighter lines
    color: '#1f2937'
  },
  header: {
    marginBottom: 10, // Reduced
    borderBottomWidth: 0.5,
    borderBottomColor: '#9ca3af',
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerLeft: {
    flexDirection: 'column',
    maxWidth: '70%'
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    maxWidth: '30%',
    marginTop: 6
  },
  date: {
    fontSize: 22,
    fontFamily: 'Times-Bold',
    color: '#111827',
    marginBottom: 2,
    lineHeight: 1
  },
  time: {
    color: '#6b7280',
    fontSize: 10,
    fontFamily: 'Times-Roman',
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10, // Reduced
    fontSize: 10,
    color: '#4b5563',
    paddingBottom: 5
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    marginBottom: 15,
    textAlign: 'justify'
  },
  // Markdown Styles (Tightened)
  h1: { fontSize: 16, fontFamily: 'Times-Bold', marginTop: 8, marginBottom: 2, color: '#111827' },
  h2: { fontSize: 13, fontFamily: 'Times-Bold', marginTop: 6, marginBottom: 2, color: '#374151' },
  paragraph: { marginBottom: 2 }, // Reduced from 4 to 2
  bold: { fontFamily: 'Times-Bold' },
  italic: { fontFamily: 'Times-Italic' },
  
  // Section Headers
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Times-Bold',
    color: '#111827',
    marginTop: 15,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  // Sleep Text Layout
  sleepContainer: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#6b7280'
  },
  sleepRow: {
    flexDirection: 'row',
    marginBottom: 1, // Tighter rows
    fontSize: 10
  },
  sleepLabel: {
    fontFamily: 'Times-Bold',
    width: 80,
    color: '#374151'
  },
  sleepValue: {
    fontFamily: 'Times-Roman',
    color: '#111827'
  },

  // Gallery (Grid)
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  imageWrapper: {
    width: '30%',
    height: 150,
    marginBottom: 10,
    borderRadius: 2,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
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
        {/* Removed extra newline char to reduce space */}
      </Text>
    );
  });
};

// --- HELPER: FORMAT TIME ---
const formatTime = (dateObj) => {
  return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// --- MAIN PDF DOCUMENT COMPONENT ---
const EntryPdfDocument = ({ entry, moodLabel, sleepSessions }) => {
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
              <Text style={{ fontFamily: 'Times-Bold', textAlign: 'right' }}>{entry.location}</Text>
              {entry.weather && <Text style={{ color: '#6b7280', fontSize: 10, textAlign: 'right' }}>{entry.weather}</Text>}
            </View>
          )}
        </View>

        {/* META */}
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Text style={{ fontFamily: 'Times-Bold' }}>Mood: </Text>
            <Text>{moodLabel || 'Neutral'}</Text>
          </View>
          {entry.tags && entry.tags.length > 0 && (
            <View style={[styles.metaItem, { marginLeft: 20 }]}>
               <Text style={{ fontFamily: 'Times-Bold' }}>Tags: </Text>
               <Text>{entry.tags.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* BODY CONTENT */}
        <View style={styles.body}>
          <MarkdownText text={entry.content} />
        </View>

        {/* SLEEP DATA SECTION (TEXT ONLY) */}
        {sleepSessions && sleepSessions.length > 0 && (
            <View wrap={false} style={{ marginTop: 5 }}>
                <Text style={styles.sectionTitle}>Sleep Insights</Text>
                {sleepSessions.map((session, index) => {
                    const start = new Date(session.startTime);
                    const end = new Date(session.startTime + (session.duration * 60 * 60 * 1000));
                    
                    return (
                        <View key={index} style={styles.sleepContainer}>
                            <View style={styles.sleepRow}>
                                <Text style={styles.sleepLabel}>Sleep Time:</Text>
                                <Text style={styles.sleepValue}>{formatTime(start)} — {formatTime(end)}</Text>
                            </View>
                            <View style={styles.sleepRow}>
                                <Text style={styles.sleepLabel}>Duration:</Text>
                                <Text style={styles.sleepValue}>{session.duration.toFixed(1)} hours</Text>
                            </View>
                            <View style={styles.sleepRow}>
                                <Text style={styles.sleepLabel}>Deep Sleep:</Text>
                                <Text style={styles.sleepValue}>{(session.deepSleepPerc * 100).toFixed(0)}%</Text>
                            </View>
                            {session.rating > 0 && (
                                <View style={styles.sleepRow}>
                                    <Text style={styles.sleepLabel}>Efficiency:</Text>
                                    <Text style={styles.sleepValue}>{session.rating.toFixed(1)} / 5.0</Text>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
        )}

        {/* IMAGE GALLERY (GRID) */}
        {entry.images && entry.images.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            <View style={styles.galleryGrid}>
              {entry.images.map((imgSrc, index) => (
                <View key={index} style={styles.imageWrapper}>
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