import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// --- STYLES ---
const styles = StyleSheet.create({
  // Base Page Layout
  page: {
    padding: 48,
    backgroundColor: '#ffffff',
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1f2937'
  },
  
  // --- COVER PAGE ---
  coverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  coverTitleBlock: {
    marginBottom: 60,
    alignItems: 'center'
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  coverYear: {
    fontSize: 80,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -2,
    lineHeight: 1
  },
  coverSubtitle: {
    fontSize: 14,
    fontFamily: 'Times-Roman',
    color: '#4b5563',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 40
  },
  coverStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 40,
    borderTopWidth: 1.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 30,
    width: '100%'
  },
  statItem: { alignItems: 'center', minWidth: 80 },
  statValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  statLabel: { fontSize: 9, fontFamily: 'Helvetica', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.5 },

  // --- MONTH DIVIDER ---
  monthPageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 8,
    marginBottom: 30
  },
  monthSubtitle: {
    fontSize: 12,
    fontFamily: 'Times-Roman',
    color: '#6b7280',
    fontStyle: 'italic'
  },

  // --- ENTRY LAYOUT ---
  entryContainer: {
    marginBottom: 20,
    flexDirection: 'column'
  },
  header: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#9ca3af',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  headerLeft: { flexDirection: 'column' },
  dateMain: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  metaText: { color: '#4b5563', fontSize: 10, fontFamily: 'Helvetica' },
  
  // --- CONTENT STYLES (Ported for Renderer) ---
  body: { 
    marginBottom: 15, 
    textAlign: 'left',
    fontSize: 11,
    fontFamily: 'Times-Roman'
  },
  paragraph: { marginBottom: 8 },
  // Headings
  h1: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 6, color: '#111827' },
  h2: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 4, color: '#374151' },
  h3: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 2, color: '#4b5563' },
  // Text Decos
  bold: { fontFamily: 'Times-Bold' },
  italic: { fontFamily: 'Times-Italic' },
  boldItalic: { fontFamily: 'Times-BoldItalic' },
  underline: { textDecoration: 'underline' },
  strikethrough: { textDecoration: 'line-through' },
  codeInline: { fontFamily: 'Courier', backgroundColor: '#f3f4f6', fontSize: 10, padding: 2 },
  // Blocks
  quoteBlock: {
    borderLeftWidth: 2,
    borderLeftColor: '#d1d5db',
    paddingLeft: 10,
    fontStyle: 'italic',
    color: '#374151',
    marginVertical: 8,
    fontFamily: 'Times-Italic',
    backgroundColor: '#f9fafb',
    paddingVertical: 4
  },
  codeBlock: {
    fontFamily: 'Courier',
    backgroundColor: '#1f2937',
    color: '#f3f4f6',
    padding: 10,
    fontSize: 10,
    borderRadius: 4,
    marginBottom: 8,
    marginTop: 4
  },
  listContainer: { marginBottom: 6 },
  listItem: { flexDirection: 'row', marginBottom: 3, paddingLeft: 4 },
  listItemBullet: { width: 15, fontSize: 11, fontFamily: 'Times-Roman' },
  listItemContent: { flex: 1 },

  // --- GALLERY ---
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  imageBox: { width: 150, height: 150, backgroundColor: '#f3f4f6' },
  image: { width: '100%', height: '100%', objectFit: 'contain' },

  // --- FOOTER ---
  footer: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#f3f4f6',
    gap: 15
  },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerLabel: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#374151', marginRight: 4 },
  footerValue: { fontFamily: 'Helvetica', fontSize: 9, color: '#6b7280' }
});

// --- HELPER 1: PARSE INLINE CSS (Ported) ---
const parseInlineStyle = (styleString) => {
  if (!styleString) return {};
  const customStyles = {};
  const rules = styleString.split(';');
  
  rules.forEach(rule => {
    const [key, val] = rule.split(':').map(s => s.trim());
    if (!key || !val) return;

    switch (key) {
      case 'color': customStyles.color = val; break;
      case 'background-color': customStyles.backgroundColor = val; break;
      case 'font-size': customStyles.fontSize = parseFloat(val); break;
      case 'font-family':
        const lowerVal = val.toLowerCase();
        if (lowerVal.includes('courier') || lowerVal.includes('mono')) customStyles.fontFamily = 'Courier';
        else if (lowerVal.includes('times') || lowerVal.includes('serif')) customStyles.fontFamily = 'Times-Roman';
        else customStyles.fontFamily = 'Helvetica';
        break;
      case 'text-decoration':
        if (val.includes('underline')) customStyles.textDecoration = 'underline';
        if (val.includes('line-through')) customStyles.textDecoration = 'line-through';
        break;
      default: break;
    }
  });
  return customStyles;
};

// --- HELPER 2: MARKDOWN FALLBACK (Ported & Adapted for Serif) ---
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
          if (part.startsWith('**') && part.endsWith('**')) 
            return <Text key={partIdx} style={styles.bold}>{part.slice(2, -2)}</Text>;
          if (part.startsWith('*') && part.endsWith('*')) 
            return <Text key={partIdx} style={styles.italic}>{part.slice(1, -1)}</Text>;
          return <Text key={partIdx}>{part}</Text>;
        })}
      </Text>
    );
  });
};

// --- HELPER 3: RICH TEXT RENDERER (Ported & Adapted for Serif) ---
const RichTextRenderer = ({ content }) => {
  if (!content) return null;

  let root;
  try {
    // 1. Try to parse as JSON (Lexical format)
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    if (json.root) root = json.root;
  } catch (e) {
    // 2. Fallback to Markdown if not JSON
    return <MarkdownText text={typeof content === 'string' ? content : ''} />;
  }

  if (!root) return <MarkdownText text={typeof content === 'string' ? content : ''} />;

  const renderChildren = (children) => {
    return children.map((node, index) => {
      if (node.type === 'text') {
        const isBold = (node.format & 1) !== 0;
        const isItalic = (node.format & 2) !== 0;
        
        let customStyle = parseInlineStyle(node.style);

        // --- FONT LOGIC (Adapted for Book/Times-Roman) ---
        // If no explicit font family is set in styles, default to Times variants
        if (!customStyle.fontFamily) {
             if (isBold && isItalic) customStyle.fontFamily = 'Times-BoldItalic';
             else if (isBold) customStyle.fontFamily = 'Times-Bold';
             else if (isItalic) customStyle.fontFamily = 'Times-Italic';
        }

        const nodeStyles = [
          customStyle,
          (node.format & 4) ? styles.strikethrough : {},
          (node.format & 8) ? styles.underline : {},
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
                  <View style={styles.listItemContent}>
                     <Text style={[styles.paragraph, alignStyle]}>{renderChildren(listItem.children)}</Text>
                  </View>
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

// --- ENTRY ITEM ---
const EntryItem = ({ entry, moodLabel }) => {
  const dateObj = new Date(entry.date);
  const dateMain = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const dateSub = `${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • ${dateObj.getFullYear()}`;

  return (
    <View style={styles.entryContainer} break>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.dateMain}>{dateMain}</Text>
          <Text style={styles.metaText}>{dateSub}</Text>
        </View>
        {entry.location && (
          <View>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, textAlign: 'right' }}>{entry.location}</Text>
            {entry.weather && <Text style={{ fontSize: 9, color: '#9ca3af', textAlign: 'right' }}>{entry.weather}</Text>}
          </View>
        )}
      </View>

      {/* Content Body with RichTextRenderer */}
      <View style={styles.body}>
        <RichTextRenderer content={entry.content} />
      </View>

      {/* Images */}
      {entry.images && entry.images.length > 0 && (
        <View style={styles.gallery} wrap={false}>
          {entry.images.map((img, idx) => (
             <View key={idx} style={styles.imageBox}>
                <Image src={img} style={styles.image} />
             </View>
          ))}
        </View>
      )}

      {/* Footer Meta */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>MOOD:</Text>
          <Text style={styles.footerValue}>{moodLabel || 'Neutral'}</Text>
        </View>
        {entry.tags && entry.tags.length > 0 && (
          <View style={styles.footerItem}>
             <Text style={styles.footerLabel}>TAGS:</Text>
             <Text style={styles.footerValue}>{entry.tags.join(', ')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// --- MAIN PDF DOCUMENT ---
const YearInReviewPdf = ({ entries, year }) => {
  const entriesByMonth = entries.reduce((acc, entry) => {
    const m = new Date(entry.date).getMonth();
    if (!acc[m]) acc[m] = [];
    acc[m].push(entry);
    return acc;
  }, {});
  
  const sortedMonths = Object.keys(entriesByMonth).sort((a,b) => a - b);
  sortedMonths.forEach(m => entriesByMonth[m].sort((a,b) => new Date(a.date) - new Date(b.date)));

  const totalEntries = entries.length;
  const moodAvg = totalEntries ? (entries.reduce((a,c) => a + (c.mood||5),0)/totalEntries).toFixed(1) : 0;
  
  const wordCount = entries.reduce((acc, curr) => {
     // Safe estimation even with JSON content
     const txt = typeof curr.content === 'string' ? curr.content : JSON.stringify(curr.content);
     return acc + txt.split(/\s+/).length;
  }, 0);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const MOOD_LABELS = { 1:'Awful', 2:'Bad', 3:'Sad', 4:'Meh', 5:'Okay', 6:'Good', 7:'Great', 8:'Happy', 9:'Loved', 10:'Amazing' };

  return (
    <Document>
      {/* COVER PAGE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverContainer}>
          <View style={styles.coverTitleBlock}>
            <Text style={styles.coverTitle}>YEAR IN REVIEW</Text>
            <Text style={styles.coverYear}>{year}</Text>
          </View>
          <Text style={styles.coverSubtitle}>A collection of moments, thoughts, and memories.</Text>
          <View style={styles.coverStatsRow}>
             <View style={styles.statItem}>
               <Text style={styles.statValue}>{totalEntries}</Text>
               <Text style={styles.statLabel}>Entries</Text>
             </View>
             <View style={styles.statItem}>
               <Text style={styles.statValue}>{moodAvg}</Text>
               <Text style={styles.statLabel}>Avg Mood</Text>
             </View>
             <View style={styles.statItem}>
               <Text style={styles.statValue}>{(wordCount/1000).toFixed(1)}k</Text>
               <Text style={styles.statLabel}>Words</Text>
             </View>
          </View>
        </View>
      </Page>

      {/* MONTHLY SECTIONS */}
      {sortedMonths.map(monthIndex => (
        <React.Fragment key={monthIndex}>
          <Page size="A4" style={styles.page}>
             <View style={styles.monthPageContainer}>
                <Text style={styles.monthTitle}>{monthNames[monthIndex]}</Text>
                <Text style={styles.monthSubtitle}>{entriesByMonth[monthIndex].length} Entries recorded</Text>
             </View>
          </Page>
          <Page size="A4" style={styles.page}>
             {entriesByMonth[monthIndex].map(entry => (
                <EntryItem key={entry.id} entry={entry} moodLabel={MOOD_LABELS[entry.mood]} />
             ))}
          </Page>
        </React.Fragment>
      ))}
    </Document>
  );
};

export default YearInReviewPdf;