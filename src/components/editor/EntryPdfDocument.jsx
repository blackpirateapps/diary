import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// --- LATEX STYLES ---
const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 50,
    backgroundColor: '#ffffff',
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.4,
    color: '#000000'
  },
  // Title Block (\maketitle emulation)
  titleBlock: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Times-Bold',
    marginBottom: 8,
    color: '#000000'
  },
  metaLine: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    fontSize: 10,
    fontFamily: 'Times-Italic',
    marginBottom: 4,
    color: '#333333'
  },
  separator: {
    marginVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    width: '100%'
  },
  // Abstract / Keywords
  keywordsBlock: {
    marginBottom: 20,
    paddingHorizontal: 20,
    textAlign: 'center'
  },
  keywordsLabel: {
    fontFamily: 'Times-Bold',
    fontSize: 9,
  },
  keywordsText: {
    fontFamily: 'Times-Roman',
    fontSize: 9,
  },
  // Body Content
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Times-Bold',
    marginTop: 15,
    marginBottom: 8,
    borderBottomWidth: 0.5, // Subtle section underline
    borderBottomColor: '#666',
    paddingBottom: 2,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify', // Hallmark of LaTeX
    textIndent: 0, 
  },
  // Markdown Styles
  h1: { fontSize: 16, fontFamily: 'Times-Bold', marginTop: 12, marginBottom: 6 },
  h2: { fontSize: 13, fontFamily: 'Times-Bold', marginTop: 10, marginBottom: 4 },
  bold: { fontFamily: 'Times-Bold' },
  italic: { fontFamily: 'Times-Italic' },
  code: { fontFamily: 'Courier', backgroundColor: '#f0f0f0', padding: 2, fontSize: 10 },

  // Scientific Table Style (Sleep)
  table: {
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderTopWidth: 1.5, // Thick top line
    borderTopColor: '#000',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  tableCellHead: {
    flex: 1,
    fontFamily: 'Times-Bold',
    fontSize: 10,
    textAlign: 'left'
  },
  tableCell: {
    flex: 1,
    fontFamily: 'Times-Roman',
    fontSize: 10,
    textAlign: 'left'
  },
  
  // Figures
  figureContainer: {
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center'
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10
  },
  imageWrapper: {
    width: 150, // Fixed width for uniform figures
    height: 150,
    marginBottom: 5,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },
  caption: {
    marginTop: 4,
    fontSize: 9,
    fontFamily: 'Times-Italic',
    textAlign: 'center'
  }
});

// --- HELPER: MARKDOWN PARSER ---
const MarkdownText = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    if (line.startsWith('# ')) return <Text key={lineIdx} style={styles.h1}>{line.replace('# ', '')}</Text>;
    if (line.startsWith('## ')) return <Text key={lineIdx} style={styles.h2}>{line.replace('## ', '')}</Text>;
    // Code block detection (simplified)
    if (line.startsWith('```')) return null; 

    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    return (
      <Text key={lineIdx} style={styles.paragraph}>
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) return <Text key={partIdx} style={styles.bold}>{part.slice(2, -2)}</Text>;
          if (part.startsWith('*') && part.endsWith('*')) return <Text key={partIdx} style={styles.italic}>{part.slice(1, -1)}</Text>;
          if (part.startsWith('`') && part.endsWith('`')) return <Text key={partIdx} style={styles.code}>{part.slice(1, -1)}</Text>;
          return <Text key={partIdx}>{part}</Text>;
        })}
      </Text>
    );
  });
};

// --- HELPER: FORMAT TIME ---
const formatTime = (timestamp) => {
    if(!timestamp) return '--:--';
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// --- MAIN PDF DOCUMENT COMPONENT ---
const EntryPdfDocument = ({ entry, moodLabel, sleepSessions }) => {
  const dateObj = new Date(entry.date);
  const dateString = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  
  // Format metadata for the subtitle block
  const metaParts = [
    entry.location || null,
    entry.weather || null,
    moodLabel ? `Mood: ${moodLabel}` : null
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* LATEX TITLE BLOCK */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{dateString}</Text>
          <View style={styles.separator} />
          <View style={styles.metaLine}>
            {metaParts.map((part, index) => (
                <Text key={index}>
                    {part}{index < metaParts.length - 1 ? '   \u2022   ' : ''}
                </Text>
            ))}
          </View>
        </View>

        {/* ABSTRACT / KEYWORDS STYLE */}
        {entry.tags && entry.tags.length > 0 && (
          <View style={styles.keywordsBlock}>
             <Text style={styles.keywordsText}>
                <Text style={styles.keywordsLabel}>Keywords: </Text>
                {entry.tags.join(', ')}
             </Text>
          </View>
        )}

        {/* MAIN CONTENT */}
        <View>
          <MarkdownText text={entry.content} />
        </View>

        {/* SLEEP DATA (SCIENTIFIC TABLE STYLE) */}
        {sleepSessions && sleepSessions.length > 0 && (
            <View wrap={false}>
                <Text style={styles.sectionTitle}>Sleep Analysis</Text>
                
                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={styles.tableCellHead}>Time Range</Text>
                        <Text style={styles.tableCellHead}>Duration</Text>
                        <Text style={styles.tableCellHead}>Deep Sleep</Text>
                        <Text style={styles.tableCellHead}>Efficiency</Text>
                    </View>

                    {/* Table Rows */}
                    {sleepSessions.map((session, index) => {
                        const start = session.startTime;
                        const end = session.startTime + (session.duration * 60 * 60 * 1000);
                        
                        return (
                            <View key={index} style={[styles.tableRow, index === sleepSessions.length - 1 ? { borderBottomWidth: 1.5, borderBottomColor: '#000' } : {}]}>
                                <Text style={styles.tableCell}>{formatTime(start)} — {formatTime(end)}</Text>
                                <Text style={styles.tableCell}>{session.duration.toFixed(1)} h</Text>
                                <Text style={styles.tableCell}>{(session.deepSleepPerc * 100).toFixed(0)}%</Text>
                                <Text style={styles.tableCell}>{session.rating ? session.rating.toFixed(1) : '-'}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        )}

        {/* FIGURES / IMAGES */}
        {entry.images && entry.images.length > 0 && (
          <View wrap={false} style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Figures</Text>
            <View style={styles.galleryGrid}>
              {entry.images.map((imgSrc, index) => (
                <View key={index} style={styles.figureContainer}>
                    <View style={styles.imageWrapper}>
                         <Image src={imgSrc} style={styles.image} />
                    </View>
                    <Text style={styles.caption}>Fig {index + 1}. Attachment {index + 1}</Text>
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