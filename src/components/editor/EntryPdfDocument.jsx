import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// --- MORSE CODE DICTIONARY ---
const MORSE_MAP = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..',
  '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
  '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
  ' ': '   ', // 3 spaces for word separation
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
};

// --- HELPER: TEXT TRANSFORMER ---
const transformText = (text, mode) => {
  if (!text) return '';
  
  if (mode === 'MORSE') {
    // Convert to Uppercase, map to Morse, join with single space for char separation
    return text
      .toUpperCase()
      .split('')
      .map(char => MORSE_MAP[char] !== undefined ? MORSE_MAP[char] : char)
      .join(' '); 
  }
  
  return text;
};

// --- DYNAMIC STYLES GENERATOR ---
const createStyles = (mode) => StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: mode === 'MORSE' ? 'Courier' : 'Helvetica',
    fontSize: mode === 'MORSE' ? 10 : 11,
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
    marginBottom: 10,
    fontSize: 10,
    color: '#4b5563',
    paddingBottom: 5
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15, 
  },
  body: {
    marginBottom: 15,
    textAlign: 'left',
    ...(mode === 'MIRROR' ? {
      transform: 'scale(-1, 1)', 
      opacity: 0.6,              
    } : {})
  },
  
  // --- TYPOGRAPHY ---
  paragraph: { marginBottom: 6 },
  h1: { 
    fontSize: 18, 
    fontFamily: mode === 'MORSE' ? 'Courier-Bold' : 'Helvetica-Bold', 
    marginTop: 12, 
    marginBottom: 6, 
    color: '#111827' 
  },
  h2: { 
    fontSize: 15, 
    fontFamily: mode === 'MORSE' ? 'Courier-Bold' : 'Helvetica-Bold', 
    marginTop: 10, 
    marginBottom: 4, 
    color: '#374151' 
  },
  h3: { 
    fontSize: 13, 
    fontFamily: mode === 'MORSE' ? 'Courier-Bold' : 'Helvetica-Bold', 
    marginTop: 8, 
    marginBottom: 2, 
    color: '#4b5563' 
  },
  
  // --- INLINE STYLES ---
  bold: { fontFamily: mode === 'MORSE' ? 'Courier-Bold' : 'Helvetica-Bold' },
  italic: { fontFamily: mode === 'MORSE' ? 'Courier-Oblique' : 'Helvetica-Oblique' },
  boldItalic: { fontFamily: mode === 'MORSE' ? 'Courier-BoldOblique' : 'Helvetica-BoldOblique' },
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
    width: 25, 
    fontSize: 11,
    fontFamily: mode === 'MORSE' ? 'Courier' : 'Helvetica'
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
  },
  imageWrapper: {
    width: '30%',
    height: 150,
    marginBottom: 10,
    marginRight: '3%',
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
const MarkdownText = ({ text, mode, styles }) => {
  if (!text) return null;
  const safeText = typeof text === 'string' ? text : JSON.stringify(text);
  const lines = safeText.split('\n');

  return lines.map((line, lineIdx) => {
    let cleanLine = line;
    let style = styles.paragraph;
    
    if (line.startsWith('# ')) {
      style = styles.h1;
      cleanLine = line.replace('# ', '');
    } else if (line.startsWith('## ')) {
      style = styles.h2;
      cleanLine = line.replace('## ', '');
    }

    const parts = cleanLine.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return (
      <Text key={lineIdx} style={style}>
        {parts.map((part, partIdx) => {
          let content = part;
          let inlineStyle = {};

          if (part.startsWith('**') && part.endsWith('**')) {
            content = part.slice(2, -2);
            inlineStyle = styles.bold;
          } else if (part.startsWith('*') && part.endsWith('*')) {
            content = part.slice(1, -1);
            inlineStyle = styles.italic;
          }
          
          return <Text key={partIdx} style={inlineStyle}>{transformText(content, mode)}</Text>;
        })}
      </Text>
    );
  });
};

// --- HELPER: PARSE INLINE CSS ---
const parseInlineStyle = (styleString, mode) => {
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
        const size = parseFloat(val);
        if(!isNaN(size)) customStyles.fontSize = size;
        break;
      case 'font-family':
        if (mode === 'MORSE') {
           customStyles.fontFamily = 'Courier';
        } else {
            const lowerVal = val.toLowerCase();
            if (lowerVal.includes('courier') || lowerVal.includes('mono')) {
            customStyles.fontFamily = 'Courier';
            } else if (lowerVal.includes('times') || lowerVal.includes('serif') || lowerVal.includes('georgia')) {
            customStyles.fontFamily = 'Times-Roman';
            } else {
            customStyles.fontFamily = 'Helvetica';
            }
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
const RichTextRenderer = ({ content, mode, styles }) => {
  if (!content) return null;

  let root;
  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    if (json && json.root) root = json.root;
  } catch (e) {
    return <MarkdownText text={content} mode={mode} styles={styles} />;
  }

  if (!root) return <MarkdownText text={content} mode={mode} styles={styles} />;

  // Recursive renderer
  const renderChildren = (children) => {
    if (!children) return null;
    return children.map((node, index) => {
      if (node.type === 'text') {
        const isBold = (node.format & 1) !== 0;
        const isItalic = (node.format & 2) !== 0;
        
        let customStyle = parseInlineStyle(node.style, mode);

        // Font Logic handling Morse/Normal modes
        if (mode === 'MORSE') {
             if (isBold && isItalic) customStyle.fontFamily = 'Courier-BoldOblique';
             else if (isBold) customStyle.fontFamily = 'Courier-Bold';
             else if (isItalic) customStyle.fontFamily = 'Courier-Oblique';
             else customStyle.fontFamily = 'Courier';
        } else {
            // Standard Font Mapping
            if (customStyle.fontFamily === 'Times-Roman') {
                 if (isBold && isItalic) customStyle.fontFamily = 'Times-BoldItalic';
                 else if (isBold) customStyle.fontFamily = 'Times-Bold';
                 else if (isItalic) customStyle.fontFamily = 'Times-Italic';
            } else if (customStyle.fontFamily === 'Helvetica' || !customStyle.fontFamily) {
                 if (isBold && isItalic) customStyle.fontFamily = 'Helvetica-BoldOblique';
                 else if (isBold) customStyle.fontFamily = 'Helvetica-Bold';
                 else if (isItalic) customStyle.fontFamily = 'Helvetica-Oblique';
                 else customStyle.fontFamily = 'Helvetica';
            }
        }

        const nodeStyles = [
          customStyle, 
          (node.format & 4) ? styles.strikethrough : {},
          (node.format & 8) ? styles.underline : {},
          (node.format & 16) ? styles.codeInline : {},
        ];

        return <Text key={index} style={nodeStyles}>{transformText(node.text, mode)}</Text>;
      }
      
      if (node.type === 'linebreak') {
        return <Text key={index}>{'\n'}</Text>;
      }

      // Mentions
      if (node.type === 'mention') {
          return <Text key={index} style={{ color: '#2563eb', fontFamily: mode === 'MORSE' ? 'Courier-Bold' : 'Helvetica-Bold' }}>
            {mode === 'MORSE' ? transformText('@'+node.text, mode) : '@'+node.text}
          </Text>;
      }

      // Links
      if (node.type === 'link' || node.type === 'autolink') {
         return <Text key={index} style={{ color: '#2563eb', textDecoration: 'underline' }}>{renderChildren(node.children)}</Text>;
      }

      return null;
    });
  };

  // Block Renderer
  return (
    <View>
      {root.children.map((block, index) => {
        const alignStyle = block.format ? { textAlign: block.format } : {};

        if (block.type === 'heading') {
          const hStyle = block.tag === 'h1' ? styles.h1 : block.tag === 'h2' ? styles.h2 : styles.h3;
          return <Text key={index} style={[hStyle, alignStyle]}>{renderChildren(block.children)}</Text>;
        }
        
        if (block.type === 'quote') {
          return (
            <View key={index} style={[styles.quoteBlock, alignStyle]}>
              <Text>{renderChildren(block.children)}</Text>
            </View>
          );
        }

        if (block.type === 'code') {
           return (
             <View key={index} style={styles.codeBlock}>
               <Text>{renderChildren(block.children)}</Text>
             </View>
           );
        }

        if (block.type === 'list') {
          const isNumbered = block.listType === 'number';
          return (
            <View key={index} style={styles.listContainer}>
              {block.children.map((listItem, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.listItemBullet}>
                    {isNumbered ? transformText(`${listItem.value}.`, mode) : (mode === 'MORSE' ? '' : '•')} 
                  </Text>
                  <View style={styles.listItemContent}>
                     <Text style={[styles.paragraph, alignStyle]}>{renderChildren(listItem.children)}</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        }

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
const EntryPdfDocument = ({ entry, moodLabel, sleepSessions, printMode = 'NORMAL' }) => {
  const styles = createStyles(printMode);
  const dateObj = new Date(entry.date);
  const dateString = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeString = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER (Always Readable) */}
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

        {/* META (Always Readable) */}
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

        {/* CONTENT (Transformed) */}
        <View style={styles.body}>
          <RichTextRenderer content={entry.content} mode={printMode} styles={styles} />
        </View>

        {/* SLEEP DATA (Always Readable) */}
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