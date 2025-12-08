import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// --- STYLES ---
const styles = StyleSheet.create({
  // Base
  page: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 50, // Increased margins for book feel
    backgroundColor: '#ffffff',
    fontFamily: 'Times-Roman', // Changed to Serif for body text
    fontSize: 12,
    lineHeight: 1.6,
    color: '#1f2937'
  },
  
  // Book Cover
  coverPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  coverTitle: {
    fontSize: 44,
    fontFamily: 'Helvetica-Bold', // Keep titles Sans for impact
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center'
  },
  coverYear: {
    fontSize: 60,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 30,
    textAlign: 'center'
  },
  coverSubtitle: {
    fontSize: 16,
    fontFamily: 'Times-Roman',
    color: '#4b5563',
    marginBottom: 60,
    textAlign: 'center',
    fontStyle: 'italic'
  },
  coverStats: {
    flexDirection: 'row',
    gap: 60, // Increased spacing between stats
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 40
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#111827'
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#6b7280',
    marginTop: 8, // More space between value and label
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  
  // Chapter Dividers
  monthPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  monthTitle: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 6
  },
  monthSubtitle: {
    marginTop: 25, // Increased spacing significantly
    fontSize: 14,
    fontFamily: 'Times-Roman',
    color: '#9ca3af',
    fontStyle: 'italic'
  },

  // Entry Layout
  entryContainer: {
    marginBottom: 0,
    // No bottom border needed as we are breaking pages now
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  headerLeft: { flexDirection: 'column' },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end' },
  
  date: { 
    fontSize: 22, 
    fontFamily: 'Helvetica-Bold', 
    color: '#111827', 
    marginBottom: 4, 
    lineHeight: 1 
  },
  time: { 
    color: '#6b7280', 
    fontSize: 11, 
    fontFamily: 'Helvetica' 
  },
  location: {
     fontFamily: 'Helvetica-Bold', 
     textAlign: 'right', 
     fontSize: 10,
     color: '#4b5563'
  },
  
  // Meta
  metaContainer: { 
    flexDirection: 'row', 
    gap: 20, 
    marginBottom: 25, 
    fontSize: 10, 
    color: '#6b7280',
    fontFamily: 'Helvetica'
  },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  
  // Typography
  body: { 
    marginBottom: 15, 
    textAlign: 'left',
    fontSize: 12,
    fontFamily: 'Times-Roman' // Explicitly Serif
  },
  paragraph: { marginBottom: 10 },
  
  // Markdown Styles
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 15, marginBottom: 8, color: '#111827' },
  h2: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 6, color: '#374151' },
  h3: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 4, color: '#4b5563' },
  bold: { fontFamily: 'Times-Bold' },
  italic: { fontFamily: 'Times-Italic' },
  
  quoteBlock: {
    borderLeftWidth: 3, 
    borderLeftColor: '#e5e7eb', 
    paddingLeft: 14, 
    fontStyle: 'italic', 
    color: '#4b5563', 
    marginBottom: 12, 
    marginTop: 6, 
    fontFamily: 'Times-Italic'
  },
  
  listContainer: { marginBottom: 10 },
  listItem: { flexDirection: 'row', marginBottom: 4, paddingLeft: 8 },
  listItemBullet: { width: 15, fontSize: 14, fontFamily: 'Helvetica' }, // Sans serif bullet looks cleaner
  listItemContent: { flex: 1 },

  // Images
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginTop: 20 },
  imageWrapper: { 
    width: '47%', // Slightly less than 50 to account for gap
    height: 180, 
    marginBottom: 15, 
    backgroundColor: '#f3f4f6', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: 4 
  },
  image: { width: '100%', height: '100%', objectFit: 'contain' }
});

// --- HELPER: Simple Markdown Formatter ---
// Parses basic markdown (Bold, Italic, H1-H3, Lists, Blockquotes)
const SimpleMarkdownRenderer = ({ text }) => {
  if (!text) return null;

  // Helper to process inline styles (Bold/Italic) within a string
  const renderInline = (str) => {
    // Split by bold (** or __)
    const parts = str.split(/(\*\*|__)(.*?)\1/g); 
    return parts.map((part, i) => {
      if (part === '**' || part === '__') return null;
      // Check if this part was inside the split match (it would be odd index 2, 5, etc in a full regex match, 
      // but simplistic split puts the delimiter in array. 
      // Let's use a simpler approach: check strict alternation if possible, 
      // or just assume if previous was delimiter, this is content.
      
      // Easier RegEx approach for React-PDF map:
      // We will assume the text passed here is a simple string line.
      
      // Let's try a very simple bold parser:
      if (i % 3 === 2) { 
        return <Text key={i} style={styles.bold}>{part}</Text>;
      }
      return <Text key={i}>{part}</Text>;
    });
  };

  const lines = text.split('\n');

  return (
    <View>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <Text key={index} style={{ height: 8 }}> </Text>; // Empty line spacing

        // Headings
        if (trimmed.startsWith('# ')) return <Text key={index} style={styles.h1}>{trimmed.replace('# ', '')}</Text>;
        if (trimmed.startsWith('## ')) return <Text key={index} style={styles.h2}>{trimmed.replace('## ', '')}</Text>;
        if (trimmed.startsWith('### ')) return <Text key={index} style={styles.h3}>{trimmed.replace('### ', '')}</Text>;

        // Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <View key={index} style={styles.quoteBlock}>
              <Text>{renderInline(trimmed.replace('> ', ''))}</Text>
            </View>
          );
        }

        // List Items
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <View key={index} style={styles.listItem}>
              <Text style={styles.listItemBullet}>•</Text>
              <View style={styles.listItemContent}>
                <Text>{renderInline(trimmed.replace(/^[-*] /, ''))}</Text>
              </View>
            </View>
          );
        }

        // Standard Paragraph
        return (
          <Text key={index} style={styles.paragraph}>
            {renderInline(line)}
          </Text>
        );
      })}
    </View>
  );
};

// --- RICH TEXT / CONTENT ROUTER ---
const ContentRenderer = ({ content }) => {
  if (!content) return null;

  // If content is an object (Lexical JSON), we try to parse it. 
  // If it's a string, we assume it's Markdown.
  let isJson = typeof content === 'object';
  if (typeof content === 'string' && content.trim().startsWith('{')) {
    try {
      JSON.parse(content);
      isJson = true;
    } catch (e) {
      isJson = false;
    }
  }

  // NOTE: For this fix, since you mentioned "raw markdown", 
  // we are prioritizing the Markdown Renderer for string content.
  // If you actually have Lexical JSON, the previous RichTextRenderer code 
  // would be needed here, but let's stick to the Markdown fix.
  
  if (isJson) {
     // If you have the complex JSON renderer from before, put it here.
     // For now, let's extract raw text if it's JSON to be safe, or just render.
     // Assuming current issue is with plain string markdown:
     return <Text>Complex JSON content detected (Not rendered in this snippet)</Text>;
  }

  return <SimpleMarkdownRenderer text={content} />;
};


// --- ENTRY COMPONENT ---
const EntryItem = ({ entry, moodLabel }) => {
  const dateObj = new Date(entry.date);
  const dateString = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeString = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const yearString = dateObj.getFullYear();

  return (
    // 'break' prop here forces this View to start on a new page
    <View style={styles.entryContainer} break>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.date}>{dateString}</Text>
          <Text style={styles.time}>{timeString} • {yearString}</Text>
        </View>
        {entry.location && (
          <View style={styles.headerRight}>
            <Text style={styles.location}>{entry.location}</Text>
            {entry.weather && <Text style={{ color: '#9ca3af', fontSize: 9, textAlign: 'right', marginTop: 2 }}>{entry.weather}</Text>}
          </View>
        )}
      </View>

      {/* BODY */}
      <View style={styles.body}>
        <ContentRenderer content={entry.content} />
      </View>

      {/* META (Moved to bottom of entry for cleaner book look) */}
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

      {/* IMAGES */}
      {entry.images && entry.images.length > 0 && (
        <View wrap={false}>
          <View style={styles.galleryGrid}>
            {entry.images.map((imgSrc, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image src={imgSrc} style={styles.image} />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// --- MAIN DOCUMENT ---

const YearInReviewPdf = ({ entries, year }) => {
  // Group Entries by Month
  const entriesByMonth = entries.reduce((acc, entry) => {
    const date = new Date(entry.date);
    const month = date.getMonth(); 
    if (!acc[month]) acc[month] = [];
    acc[month].push(entry);
    return acc;
  }, {});

  const sortedMonths = Object.keys(entriesByMonth).sort((a, b) => a - b);
  sortedMonths.forEach(m => {
    entriesByMonth[m].sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  const totalEntries = entries.length;
  const moodSum = entries.reduce((acc, curr) => acc + (curr.mood || 5), 0);
  const avgMood = totalEntries > 0 ? (moodSum / totalEntries).toFixed(1) : 0;
  
  // Estimate words
  const totalWords = entries.reduce((acc, curr) => {
      let txt = curr.preview || ''; 
      if(!txt && typeof curr.content === 'string') txt = curr.content;
      return acc + txt.split(' ').length;
  }, 0);

  const monthNames = [ "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December" ];

  const MOODS_LABELS = { 1: 'Awful', 2: 'Bad', 3: 'Sad', 4: 'Meh', 5: 'Okay', 6: 'Good', 7: 'Great', 8: 'Happy', 9: 'Loved', 10: 'Amazing' };

  return (
    <Document>
      {/* COVER PAGE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverTitle}>Year in Review</Text>
          <Text style={styles.coverYear}>{year}</Text>
          <Text style={styles.coverSubtitle}>The Collected Memories & Thoughts</Text>
          
          <View style={styles.coverStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalEntries}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{avgMood}</Text>
              <Text style={styles.statLabel}>Avg Mood</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(totalWords / 1000).toFixed(1)}k</Text>
              <Text style={styles.statLabel}>Words</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* MONTHLY CHAPTERS */}
      {sortedMonths.map((monthKey) => (
        <React.Fragment key={monthKey}>
          {/* Month Divider Page */}
          <Page size="A4" style={styles.page}>
             <View style={styles.monthPage}>
                <Text style={styles.monthTitle}>{monthNames[monthKey]}</Text>
                <Text style={styles.monthSubtitle}>{entriesByMonth[monthKey].length} Entries</Text>
             </View>
          </Page>

          {/* Entries - Loop directly here, but each EntryItem has 'break' prop */}
          {entriesByMonth[monthKey].map((entry) => (
            <EntryItem 
                key={entry.id} 
                entry={entry} 
                moodLabel={MOODS_LABELS[entry.mood]} 
            />
          ))}
        </React.Fragment>
      ))}
    </Document>
  );
};

export default YearInReviewPdf;