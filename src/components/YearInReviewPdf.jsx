import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// --- STYLES (Matched exactly to EntryPdfDocument) ---
const styles = StyleSheet.create({
  // Base
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1f2937'
  },
  
  // Book Cover
  coverPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  coverTitle: {
    fontSize: 40,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center'
  },
  coverSubtitle: {
    fontSize: 18,
    fontFamily: 'Helvetica',
    color: '#6b7280',
    marginBottom: 40,
    textAlign: 'center'
  },
  coverStats: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 50,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 30
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937'
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  
  // Chapter Dividers
  monthPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  monthTitle: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 4
  },

  // Entry Layout
  entryContainer: {
    marginBottom: 30,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  header: {
    marginBottom: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerLeft: { flexDirection: 'column', maxWidth: '70%' },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end', maxWidth: '30%', marginTop: 6 },
  date: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2, lineHeight: 1 },
  time: { color: '#6b7280', fontSize: 10, fontFamily: 'Helvetica' },
  
  // Meta
  metaContainer: { flexDirection: 'row', gap: 15, marginBottom: 10, fontSize: 10, color: '#4b5563' },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  
  // Typography
  body: { marginBottom: 15, textAlign: 'left' },
  paragraph: { marginBottom: 6 },
  h1: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 6, color: '#111827' },
  h2: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 4, color: '#374151' },
  h3: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 6, marginBottom: 2, color: '#4b5563' },
  
  // Inline Styles
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  codeInline: { fontFamily: 'Courier', backgroundColor: '#f3f4f6', fontSize: 10, padding: 2 },
  
  // Blocks
  quoteBlock: {
    borderLeftWidth: 2, borderLeftColor: '#d1d5db', paddingLeft: 10, 
    fontStyle: 'italic', color: '#4b5563', marginBottom: 8, marginTop: 4, 
    backgroundColor: '#f9fafb', paddingVertical: 4
  },
  codeBlock: {
    fontFamily: 'Courier', backgroundColor: '#1f2937', color: '#f3f4f6', 
    padding: 10, fontSize: 10, borderRadius: 4, marginBottom: 8
  },
  listContainer: { marginBottom: 6 },
  listItem: { flexDirection: 'row', marginBottom: 3, paddingLeft: 4 },
  listItemBullet: { width: 15, fontSize: 11 },
  listItemContent: { flex: 1 },

  // Images
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  imageWrapper: { width: '30%', height: 120, marginBottom: 10, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', objectFit: 'contain' }
});

// --- HELPERS ---

const MarkdownText = ({ text }) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => (
    <Text key={i} style={styles.paragraph}>{line}</Text>
  ));
};

const parseInlineStyle = (styleString) => {
  if (!styleString) return {};
  const customStyles = {};
  styleString.split(';').forEach(rule => {
    const [key, val] = rule.split(':').map(s => s.trim());
    if (key === 'color') customStyles.color = val;
    // Map common fonts
    const lowerVal = val.toLowerCase();
    if (key === 'font-family') {
        if (lowerVal.includes('mono')) customStyles.fontFamily = 'Courier';
        else if (lowerVal.includes('serif')) customStyles.fontFamily = 'Times-Roman';
        else customStyles.fontFamily = 'Helvetica';
    }
  });
  return customStyles;
};

// Rich Text Renderer
const RichTextRenderer = ({ content }) => {
  if (!content) return null;
  
  let root;
  try {
    // Check if content is already an object (sometimes DB stores it as object)
    if (typeof content === 'object') {
        root = content.root || content;
    } else {
        const json = JSON.parse(content);
        if (json.root) root = json.root;
    }
  } catch (e) { 
    // Fallback to Markdown if parsing fails
    return <MarkdownText text={typeof content === 'string' ? content : ''} />; 
  }

  if (!root) return <MarkdownText text={typeof content === 'string' ? content : ''} />;

  const renderChildren = (children) => {
    return children.map((node, index) => {
      if (node.type === 'text') {
        const isBold = (node.format & 1) !== 0;
        const isItalic = (node.format & 2) !== 0;
        
        let customStyle = parseInlineStyle(node.style);
        
        // Font Family Logic (Bold/Italic)
        if (!customStyle.fontFamily || customStyle.fontFamily === 'Helvetica') {
           if (isBold && isItalic) customStyle.fontFamily = 'Helvetica-BoldOblique';
           else if (isBold) customStyle.fontFamily = 'Helvetica-Bold';
           else if (isItalic) customStyle.fontFamily = 'Helvetica-Oblique';
        }

        const nodeStyles = [
          customStyle,
          (node.format & 4) ? { textDecoration: 'line-through' } : {},
          (node.format & 8) ? { textDecoration: 'underline' } : {},
          (node.format & 16) ? styles.codeInline : {},
        ];
        return <Text key={index} style={nodeStyles}>{node.text}</Text>;
      }
      
      if (node.type === 'linebreak') return <Text key={index}>{'\n'}</Text>;
      
      if (node.type === 'mention') {
          return <Text key={index} style={{ color: '#2563eb', fontFamily: 'Helvetica-Bold' }}>@{node.text}</Text>;
      }
      
      if (node.type === 'link' || node.type === 'autolink') {
          return <Text key={index} style={{ color: '#2563eb', textDecoration: 'underline' }}>{renderChildren(node.children)}</Text>;
      }
      
      return null;
    });
  };

  return (
    <View>
      {root.children.map((block, index) => {
        const alignStyle = block.format ? { textAlign: block.format } : {};
        
        if (block.type === 'heading') {
          const hStyle = block.tag === 'h1' ? styles.h1 : block.tag === 'h2' ? styles.h2 : styles.h3;
          return <Text key={index} style={[hStyle, alignStyle]}>{renderChildren(block.children)}</Text>;
        }
        if (block.type === 'quote') {
          return <View key={index} style={[styles.quoteBlock, alignStyle]}><Text>{renderChildren(block.children)}</Text></View>;
        }
        if (block.type === 'code') {
           return <View key={index} style={styles.codeBlock}><Text>{renderChildren(block.children)}</Text></View>;
        }
        if (block.type === 'list') {
          const isNumbered = block.listType === 'number';
          return (
            <View key={index} style={styles.listContainer}>
              {block.children.map((listItem, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.listItemBullet}>{isNumbered ? `${listItem.value}.` : '•'}</Text>
                  <View style={styles.listItemContent}><Text style={[styles.paragraph, alignStyle]}>{renderChildren(listItem.children)}</Text></View>
                </View>
              ))}
            </View>
          );
        }
        return <Text key={index} style={[styles.paragraph, alignStyle]}>{renderChildren(block.children)}</Text>;
      })}
    </View>
  );
};

// --- ENTRY COMPONENT ---
// FIXED: Removed 'wrap={false}' to fix overlapping issues with long entries
const EntryItem = ({ entry, moodLabel }) => {
  const dateObj = new Date(entry.date);
  const dateString = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeString = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.entryContainer}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.date}>{dateString}</Text>
          <Text style={styles.time}>{timeString}</Text>
        </View>
        {entry.location && (
          <View style={styles.headerRight}>
            <Text style={{ fontFamily: 'Helvetica-Bold', textAlign: 'right', fontSize: 10 }}>{entry.location}</Text>
            {entry.weather && <Text style={{ color: '#6b7280', fontSize: 9, textAlign: 'right' }}>{entry.weather}</Text>}
          </View>
        )}
      </View>

      {/* META */}
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

      {/* BODY */}
      <View style={styles.body}>
        <RichTextRenderer content={entry.content} />
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
      if(!txt && typeof curr.content === 'string' && !curr.content.trim().startsWith('{')) txt = curr.content;
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
          <Text style={styles.coverTitle}>{year}</Text>
          <Text style={styles.coverSubtitle}>Personal Journal Archive</Text>
          
          <View style={styles.coverStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalEntries}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{avgMood} / 10</Text>
              <Text style={styles.statLabel}>Avg Mood</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(totalWords / 100) * 100}+</Text>
              <Text style={styles.statLabel}>Words</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* MONTHLY CHAPTERS */}
      {sortedMonths.map((monthKey) => (
        <React.Fragment key={monthKey}>
          {/* Month Divider */}
          <Page size="A4" style={styles.page}>
             <View style={styles.monthPage}>
                <Text style={styles.monthTitle}>{monthNames[monthKey]}</Text>
                <Text style={{ marginTop: 10, color: '#9ca3af' }}>{entriesByMonth[monthKey].length} Entries</Text>
             </View>
          </Page>

          {/* Entries (Continuous Flow) */}
          <Page size="A4" style={styles.page}>
            {entriesByMonth[monthKey].map((entry) => (
              <EntryItem 
                key={entry.id} 
                entry={entry} 
                moodLabel={MOODS_LABELS[entry.mood]} 
              />
            ))}
          </Page>
        </React.Fragment>
      ))}
    </Document>
  );
};

export default YearInReviewPdf;