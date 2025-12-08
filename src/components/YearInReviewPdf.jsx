import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// --- STYLES ---
const styles = StyleSheet.create({
  // Base Page Layout
  page: {
    paddingTop: 50,
    paddingBottom: 60, // Space for footer
    paddingHorizontal: 48,
    backgroundColor: '#ffffff',
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1f2937'
  },
  
  // --- FOOTER ---
  pageFooter: {
    position: 'absolute',
    bottom: 25,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 8
  },
  footerText: {
    fontSize: 9,
    color: '#9ca3af',
    fontFamily: 'Helvetica'
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
    marginBottom: 20
  },
  coverAuthor: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#6b7280',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 10
  },
  coverStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 60,
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
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    flexDirection: 'column',
    gap: 8
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4
  },
  
  // Header Elements
  dateMain: { 
    fontSize: 20, 
    fontFamily: 'Helvetica-Bold', 
    marginBottom: 0 // Removed margin to control spacing via gap
  },
  timeText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase'
  },
  locationText: { 
    fontFamily: 'Helvetica-Bold', 
    fontSize: 10, 
    textAlign: 'right',
    color: '#374151'
  },
  weatherText: { 
    fontSize: 10, 
    color: '#374151', // Fixed contrast (Dark Grey)
    textAlign: 'right',
    marginTop: 2,
    fontFamily: 'Helvetica'
  },
  metaPill: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#4b5563',
    backgroundColor: '#f3f4f6',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4
  },

  // --- CONTENT STYLES ---
  body: { 
    marginBottom: 15, 
    textAlign: 'left',
    fontSize: 11,
    fontFamily: 'Times-Roman'
  },
  paragraph: { marginBottom: 8 },
  
  // Headings - Now fully supported
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 8, color: '#111827' },
  h2: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 6, color: '#1f2937' },
  h3: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 4, color: '#374151' },
  h4: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 4, color: '#4b5563', textTransform: 'uppercase' },
  h5: { fontSize: 11, fontFamily: 'Helvetica-BoldOblique', marginTop: 8, marginBottom: 2, color: '#4b5563' },
  h6: { fontSize: 11, fontFamily: 'Helvetica-Oblique', marginTop: 6, marginBottom: 2, color: '#6b7280', textDecoration: 'underline' },

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
    paddingLeft: 12,
    fontStyle: 'italic',
    color: '#374151',
    marginVertical: 10,
    fontFamily: 'Times-Italic',
    backgroundColor: '#f9fafb',
    paddingVertical: 6
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
  galleryContainer: { marginTop: 10, marginBottom: 10 },
  attachmentsTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#9ca3af',
    marginBottom: 8,
    letterSpacing: 1
  },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageBox: { width: 150, height: 150, backgroundColor: '#f3f4f6' },
  image: { width: '100%', height: '100%', objectFit: 'contain' },
});

// --- HELPER 1: PARSE INLINE CSS ---
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

// --- HELPER 2: MARKDOWN FALLBACK ---
const MarkdownText = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    if (line.startsWith('# ')) return <Text key={lineIdx} style={styles.h1}>{line.replace('# ', '')}</Text>;
    if (line.startsWith('## ')) return <Text key={lineIdx} style={styles.h2}>{line.replace('## ', '')}</Text>;
    if (line.startsWith('### ')) return <Text key={lineIdx} style={styles.h3}>{line.replace('### ', '')}</Text>;

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

// --- HELPER 3: RICH TEXT RENDERER ---
const RichTextRenderer = ({ content }) => {
  if (!content) return null;

  let root;
  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    if (json.root) root = json.root;
  } catch (e) {
    return <MarkdownText text={typeof content === 'string' ? content : ''} />;
  }

  if (!root) return <MarkdownText text={typeof content === 'string' ? content : ''} />;

  const renderChildren = (children) => {
    return children.map((node, index) => {
      if (node.type === 'text') {
        const isBold = (node.format & 1) !== 0;
        const isItalic = (node.format & 2) !== 0;
        
        let customStyle = parseInlineStyle(node.style);

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
      if (node.type === 'mention') return <Text key={index} style={{ color: '#2563eb', fontFamily: 'Helvetica-Bold' }}>@{node.text}</Text>;
      if (node.type === 'link' || node.type === 'autolink') return <Text key={index} style={{ color: '#2563eb', textDecoration: 'underline' }}>{renderChildren(node.children)}</Text>;
      return null;
    });
  };

  return (
    <View>
      {root.children.map((block, index) => {
        const alignStyle = block.format ? { textAlign: block.format } : {};
        
        // Handle all heading levels
        if (block.type === 'heading') {
          let hStyle = styles.h1;
          if (block.tag === 'h2') hStyle = styles.h2;
          if (block.tag === 'h3') hStyle = styles.h3;
          if (block.tag === 'h4') hStyle = styles.h4;
          if (block.tag === 'h5') hStyle = styles.h5;
          if (block.tag === 'h6') hStyle = styles.h6;
          return <Text key={index} style={[hStyle, alignStyle]}>{renderChildren(block.children)}</Text>;
        }
        if (block.type === 'quote') return <View key={index} style={[styles.quoteBlock, alignStyle]}><Text>{renderChildren(block.children)}</Text></View>;
        if (block.type === 'code') return <View key={index} style={styles.codeBlock}><Text>{renderChildren(block.children)}</Text></View>;
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

// --- ENTRY ITEM ---
const EntryItem = ({ entry, moodLabel, accentColor }) => {
  const dateObj = new Date(entry.date);
  const dateMain = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  // Time logic
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.entryContainer} break>
      {/* Revised Header */}
      <View style={styles.header}>
        
        {/* Top Row: Date & Weather/Location */}
        <View style={styles.headerTopRow}>
            {/* Color accent on Date */}
            <Text style={[styles.dateMain, { color: accentColor }]}>{dateMain}</Text>
            
            {(entry.location || entry.weather) && (
                <View>
                    {entry.location && <Text style={styles.locationText}>{entry.location}</Text>}
                    {entry.weather && <Text style={styles.weatherText}>{entry.weather}</Text>}
                </View>
            )}
        </View>

        {/* Bottom Row: Time | Mood | Tags (Moved here from footer) */}
        <View style={styles.headerBottomRow}>
            <Text style={styles.timeText}>{timeStr}</Text>
            
            {moodLabel && (
                <Text style={styles.metaPill}>Mood: {moodLabel}</Text>
            )}
            
            {entry.tags && entry.tags.length > 0 && (
                <Text style={styles.metaPill}>#{entry.tags.join(' #')}</Text>
            )}
        </View>
      </View>

      {/* Content Body */}
      <View style={styles.body}>
        <RichTextRenderer content={entry.content} />
      </View>

      {/* Images with Header */}
      {entry.images && entry.images.length > 0 && (
        <View style={styles.galleryContainer} wrap={false}>
          <Text style={styles.attachmentsTitle}>Attachments</Text>
          <View style={styles.gallery}>
            {entry.images.map((img, idx) => (
               <View key={idx} style={styles.imageBox}>
                  <Image src={img} style={styles.image} />
               </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// --- MAIN PDF DOCUMENT ---
const YearInReviewPdf = ({ entries, year, author, tagline, accentColor }) => {
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
            {/* Intelligent accent usage: Year needs pop */}
            <Text style={[styles.coverYear, { color: accentColor }]}>{year}</Text>
          </View>
          
          <Text style={styles.coverSubtitle}>{tagline}</Text>
          {author && <Text style={styles.coverAuthor}>Authored by {author}</Text>}
          
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

        {/* FOOTER: Fixed on every page (but cover doesn't technically "fix" elements well, so we add separate logic if needed, but react-pdf 'fixed' prop works on subsequent pages) */}
        <Text 
            style={styles.pageFooter} 
            fixed 
            render={({ pageNumber, totalPages }) => (
                // Don't show footer on cover page (page 1)
                pageNumber === 1 ? null : (
                   <View style={styles.pageFooter}>
                        <Text style={styles.footerText}>{author ? `${author} • ` : ''}{year} Year in Review</Text>
                        <Text style={styles.footerText}>Page {pageNumber} of {totalPages}</Text>
                   </View>
                )
            )} 
        />
      </Page>

      {/* MONTHLY SECTIONS */}
      {sortedMonths.map(monthIndex => (
        <React.Fragment key={monthIndex}>
          {/* Month Divider */}
          <Page size="A4" style={styles.page}>
             <View style={styles.monthPageContainer}>
                {/* Accent color for Month Title */}
                <Text style={[styles.monthTitle, { color: accentColor }]}>{monthNames[monthIndex]}</Text>
                <Text style={styles.monthSubtitle}>{entriesByMonth[monthIndex].length} Entries recorded</Text>
             </View>
             
             {/* Footer Reuse */}
             <Text 
                style={styles.pageFooter} 
                fixed 
                render={({ pageNumber, totalPages }) => (
                   <View style={styles.pageFooter}>
                        <Text style={styles.footerText}>{author ? `${author} • ` : ''}{year} Year in Review</Text>
                        <Text style={styles.footerText}>Page {pageNumber} of {totalPages}</Text>
                   </View>
                )} 
            />
          </Page>

          {/* Entries */}
          <Page size="A4" style={styles.page}>
             {entriesByMonth[monthIndex].map(entry => (
                <EntryItem 
                    key={entry.id} 
                    entry={entry} 
                    moodLabel={MOOD_LABELS[entry.mood]} 
                    accentColor={accentColor}
                />
             ))}
             
             {/* Footer Reuse */}
             <Text 
                style={styles.pageFooter} 
                fixed 
                render={({ pageNumber, totalPages }) => (
                   <View style={styles.pageFooter}>
                        <Text style={styles.footerText}>{author ? `${author} • ` : ''}{year} Year in Review</Text>
                        <Text style={styles.footerText}>Page {pageNumber} of {totalPages}</Text>
                   </View>
                )} 
            />
          </Page>
        </React.Fragment>
      ))}
    </Document>
  );
};

export default YearInReviewPdf;