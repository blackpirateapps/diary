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
    color: '#1f2937'
  },
  header: {
    marginBottom: 10,
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
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 2,
    lineHeight: 1
  },
  time: {
    color: '#6b7280',
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  metaContainer: {
    flexDirection: 'row',
    // gap: 15, // REMOVED: 'gap' causes crashes in older React-PDF versions
    marginBottom: 10,
    fontSize: 10,
    color: '#4b5563',
    paddingBottom: 5
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15, // ADDED replacement for gap
  },
  body: {
    marginBottom: 15,
    textAlign: 'left'
  },
  
  // --- TYPOGRAPHY ---
  paragraph: { marginBottom: 6 },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 6, color: '#111827' },
  h2: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 4, color: '#374151' },
  h3: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 2, color: '#4b5563' },
  
  // --- INLINE STYLES ---
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  boldItalic: { fontFamily: 'Helvetica-BoldOblique' },
  underline: { textDecoration: 'underline' },
  strikethrough: { textDecoration: 'line-through' },
  codeInline: { fontFamily: 'Courier', backgroundColor: '#f3f4f6', fontSize: 10, padding: 2 },

  // --- BLOCKS ---
  quoteBlock: {
    borderLeftWidth: 2,
    borderLeftColor: '#d1d5db',
    paddingLeft: 10,
    fontStyle: 'italic',
    color: '#4b5563',
    marginBottom: 8,
    marginTop: 4,
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
  listContainer: {
    marginBottom: 6
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 4
  },
  listItemBullet: {
    width: 15,
    fontSize: 11,
    fontFamily: 'Helvetica'
  },
  listItemContent: {
    flex: 1
  },

  // --- SECTIONS ---
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginTop: 15,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  // --- SLEEP WIDGET ---
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
    marginBottom: 1,
    fontSize: 10
  },
  sleepLabel: {
    fontFamily: 'Helvetica-Bold',
    width: 80,
    color: '#374151'
  },
  sleepValue: {
    fontFamily: 'Helvetica',
    color: '#111827'
  },

  // --- GALLERY ---
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // gap: 10 // REMOVED
  },
  imageWrapper: {
    width: '30%',
    height: 150,
    marginBottom: 10,
    marginRight: '3%', // ADDED: Manual spacing
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

// --- HELPER: FALLBACK MARKDOWN PARSER (Legacy support) ---
const MarkdownText = ({ text }) => {
  if (!text) return null;
  // Ensure text is a string to prevent .split crash
  const safeText = typeof text === 'string' ? text : JSON.stringify(text);
  const lines = safeText.split('\n');

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
      </Text>
    );
  });
};

// --- HELPER: PARSE INLINE CSS ---
const parseInlineStyle = (styleString) => {
  if (!styleString) return {};
  const customStyles = {};
  const rules = styleString.split(';');
  
  rules.forEach(rule => {
    const [key, val] = rule.split(':').map(s => s.trim());
    if (!key || !val) return;

    switch (key) {
      case 'color':
        customStyles.color = val;
        break;
      case 'background-color':
        customStyles.backgroundColor = val;
        break;
      case 'font-size':
        // React-PDF expects numbers for font size
        const size = parseFloat(val);
        if(!isNaN(size)) customStyles.fontSize = size;
        break;
      case 'font-family':
        // Map common web fonts to PDF standard fonts
        const lowerVal = val.toLowerCase();
        if (lowerVal.includes('courier') || lowerVal.includes('mono')) {
          customStyles.fontFamily = 'Courier';
        } else if (lowerVal.includes('times') || lowerVal.includes('serif') || lowerVal.includes('georgia')) {
          customStyles.fontFamily = 'Times-Roman';
        } else {
          customStyles.fontFamily = 'Helvetica';
        }
        break;
      case 'text-decoration':
        if (val.includes('underline')) customStyles.textDecoration = 'underline';
        if (val.includes('line-through')) customStyles.textDecoration = 'line-through';
        break;
      default:
        break;
    }
  });
  
  return customStyles;
};

// --- HELPER: LEXICAL JSON RENDERER ---
const RichTextRenderer = ({ content }) => {
  if (!content) return null;

  let root;
  try {
    // FIX: Handle content if it is already an Object, or a JSON string
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    if (json && json.root) root = json.root;
  } catch (e) {
    // Not valid JSON, fallback to Markdown text
    return <MarkdownText text={content} />;
  }

  if (!root) return <MarkdownText text={content} />;

  // Recursive renderer for inline nodes (text, links, mentions)
  const renderChildren = (children) => {
    if(!children) return null;
    return children.map((node, index) => {
      if (node.type === 'text') {
        const isBold = (node.format & 1) !== 0;
        const isItalic = (node.format & 2) !== 0;
        
        // Handle font family logic specifically for bold/italic/bold-italic
        let baseFont = styles.page.fontFamily; // Default
        
        // Parse custom style first to check if font-family is overridden
        const customStyle = parseInlineStyle(node.style);
        if (customStyle.fontFamily) {
            // Mapping for custom fonts if needed
            if (customStyle.fontFamily === 'Times-Roman') {
                 if (isBold && isItalic) customStyle.fontFamily = 'Times-BoldItalic';
                 else if (isBold) customStyle.fontFamily = 'Times-Bold';
                 else if (isItalic) customStyle.fontFamily = 'Times-Italic';
            } else if (customStyle.fontFamily === 'Helvetica') {
                 if (isBold && isItalic) customStyle.fontFamily = 'Helvetica-BoldOblique';
                 else if (isBold) customStyle.fontFamily = 'Helvetica-Bold';
                 else if (isItalic) customStyle.fontFamily = 'Helvetica-Oblique';
            } else if (customStyle.fontFamily === 'Courier') {
                 if (isBold && isItalic) customStyle.fontFamily = 'Courier-BoldOblique';
                 else if (isBold) customStyle.fontFamily = 'Courier-Bold';
                 else if (isItalic) customStyle.fontFamily = 'Courier-Oblique';
            }
        } else {
            // Default styling logic
            if (isBold && isItalic) customStyle.fontFamily = 'Helvetica-BoldOblique';
            else if (isBold) customStyle.fontFamily = 'Helvetica-Bold';
            else if (isItalic) customStyle.fontFamily = 'Helvetica-Oblique';
        }

        const nodeStyles = [
          customStyle, // Custom font, color, size
          (node.format & 4) ? styles.strikethrough : {},
          (node.format & 8) ? styles.underline : {},
          (node.format & 16) ? styles.codeInline : {},
        ];

        return <Text key={index} style={nodeStyles}>{node.text}</Text>;
      }
      
      if (node.type === 'linebreak') {
        return <Text key={index}>{'\n'}</Text>;
      }

      // Handle Mentions
      if (node.type === 'mention') {
          return <Text key={index} style={{ color: '#2563eb', fontFamily: 'Helvetica-Bold' }}>@{node.text}</Text>;
      }

      // Handle Links/AutoLinks
      if (node.type === 'link' || node.type === 'autolink') {
         return <Text key={index} style={{ color: '#2563eb', textDecoration: 'underline' }}>{renderChildren(node.children)}</Text>;
      }

      return null;
    });
  };

  // Renderer for Block nodes
  return (
    <View>
      {root.children.map((block, index) => {
        // Handle Alignment
        const alignStyle = block.format ? { textAlign: block.format } : {};

        // Headings
        if (block.type === 'heading') {
          const hStyle = block.tag === 'h1' ? styles.h1 : block.tag === 'h2' ? styles.h2 : styles.h3;
          return <Text key={index} style={[hStyle, alignStyle]}>{renderChildren(block.children)}</Text>;
        }
        
        // Blockquote
        if (block.type === 'quote') {
          return (
            <View key={index} style={[styles.quoteBlock, alignStyle]}>
              <Text>{renderChildren(block.children)}</Text>
            </View>
          );
        }

        // Code Block
        if (block.type === 'code') {
           return (
             <View key={index} style={styles.codeBlock}>
               <Text>{renderChildren(block.children)}</Text>
             </View>
           );
        }

        // Lists
        if (block.type === 'list') {
          const isNumbered = block.listType === 'number';
          return (
            <View key={index} style={styles.listContainer}>
              {block.children.map((listItem, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.listItemBullet}>
                    {isNumbered ? `${listItem.value}.` : '•'}
                  </Text>
                  <View style={styles.listItemContent}>
                     <Text style={[styles.paragraph, alignStyle]}>{renderChildren(listItem.children)}</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        }

        // Default Paragraph
        return (
          <Text key={index} style={[styles.paragraph, alignStyle]}>
            {renderChildren(block.children)}
          </Text>
        );
      })}
    </View>
  );
};

const formatTime = (dateObj) => {
  return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// --- MAIN DOCUMENT ---
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
              <Text style={{ fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>{entry.location}</Text>
              {entry.weather && <Text style={{ color: '#6b7280', fontSize: 10, textAlign: 'right' }}>{entry.weather}</Text>}
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

        {/* CONTENT */}
        <View style={styles.body}>
          <RichTextRenderer content={entry.content} />
        </View>

        {/* SLEEP DATA */}
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

        {/* IMAGES */}
        {entry.images && entry.images.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            <View style={styles.galleryGrid}>
              {entry.images.map((imgSrc, index) => (
                <View key={index} style={styles.imageWrapper}>
                  {/* Ensure imgSrc is valid before rendering */}
                  {imgSrc ? <Image src={imgSrc} style={styles.image} /> : null}
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