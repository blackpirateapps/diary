import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Svg, Path, Rect, Line, G } from '@react-pdf/renderer';

// --- STYLES ---
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Times-Roman', // Changed to Serif for print look
    fontSize: 11,
    lineHeight: 1.4,
    color: '#1f2937'
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#9ca3af',
    paddingBottom: 10,
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
    marginBottom: 4,
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
    marginBottom: 15,
    fontSize: 10,
    color: '#4b5563',
    paddingBottom: 5
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    marginBottom: 20,
    textAlign: 'justify'
  },
  // Markdown Styles (Tighter spacing)
  h1: { fontSize: 16, fontFamily: 'Times-Bold', marginTop: 10, marginBottom: 4, color: '#111827' },
  h2: { fontSize: 13, fontFamily: 'Times-Bold', marginTop: 8, marginBottom: 2, color: '#374151' },
  paragraph: { marginBottom: 4 }, // Decreased spacing
  bold: { fontFamily: 'Times-Bold' },
  italic: { fontFamily: 'Times-Italic' },
  
  // Gallery (Full Width)
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Times-Bold',
    color: '#111827',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  imageWrapper: {
    width: '100%', // Full width
    height: 300,   // Fixed height, or allow auto if aspect ratio permits
    marginBottom: 15,
    borderRadius: 2,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' // Ensures whole image is seen
  },

  // Sleep Graphs
  graphContainer: {
    marginBottom: 15,
    marginTop: 5,
    padding: 5,
    backgroundColor: '#f9fafb',
    borderRadius: 4
  },
  graphLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
    fontFamily: 'Times-Bold',
    textTransform: 'uppercase'
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

// --- HELPER: SLEEP GRAPH RENDERER ---
const SleepGraphPdf = ({ session }) => {
  if (!session) return null;

  const width = 500;
  const height = 80;
  const actHeight = 40;
  const padding = 20;

  // 1. Prepare Hypnogram Data
  const hypnoData = session.hypnogram || [];
  const maxTime = hypnoData.length > 0 ? hypnoData[hypnoData.length - 1].time : (session.duration * 60);
  
  // Y-Positions for stages: Deep(0) -> Bottom, Awake(3) -> Top
  // We flip mapping for SVG: Top=0.
  const getStageY = (stage) => {
      // 0:Deep, 1:REM, 2:Light, 3:Awake
      // Map to: Deep=80, REM=60, Light=40, Awake=20
      switch(stage) {
          case 3: return 20;
          case 2: return 40;
          case 1: return 60;
          case 0: return 80;
          default: return 40;
      }
  };

  const getStageColor = (stage) => {
      switch(stage) {
          case 0: return "#4c1d95"; // Deep (Dark Purple)
          case 1: return "#8b5cf6"; // REM (Purple)
          case 2: return "#c4b5fd"; // Light (Light Purple)
          case 3: return "#fbbf24"; // Awake (Yellow)
          default: return "#e5e7eb";
      }
  };

  // 2. Prepare Actigraphy Data
  const moveData = session.movementData || [];
  const maxVal = Math.max(...moveData.map(d => d.value), 10);
  
  // Generate Path for Actigraphy
  let actPath = `M 0 ${actHeight}`;
  moveData.forEach((pt, i) => {
      const x = (i / moveData.length) * width;
      const y = actHeight - ((pt.value / maxVal) * actHeight);
      actPath += ` L ${x} ${y}`;
  });
  actPath += ` L ${width} ${actHeight} Z`;

  return (
    <View wrap={false}>
      {/* 1. Hypnogram Graph */}
      <View style={styles.graphContainer}>
        <Text style={styles.graphLabel}>Sleep Stages</Text>
        <Svg width={width} height={height + 10}>
           {/* Grid Lines */}
           <Line x1="0" y1="20" x2={width} y2="20" stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="2 2" />
           <Line x1="0" y1="40" x2={width} y2="40" stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="2 2" />
           <Line x1="0" y1="60" x2={width} y2="60" stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="2 2" />
           
           {/* Steps */}
           {hypnoData.map((pt, i) => {
               if (i === 0) return null;
               const prev = hypnoData[i-1];
               const x1 = (prev.time / maxTime) * width;
               const x2 = (pt.time / maxTime) * width;
               const w = x2 - x1;
               const y = getStageY(prev.stage);
               const h = height - y; // Fill to bottom approach for Area chart look
               
               return (
                   <Rect 
                    key={i} 
                    x={x1} 
                    y={y} 
                    width={w} 
                    height={h} 
                    fill={getStageColor(prev.stage)} 
                    opacity={0.6}
                   />
               );
           })}
           
           {/* Labels */}
           <Text x={5} y={15} fontSize={8} fill="#9ca3af">Awake</Text>
           <Text x={5} y={75} fontSize={8} fill="#9ca3af">Deep</Text>
        </Svg>
      </View>

      {/* 2. Actigraphy Graph */}
      {moveData.length > 0 && (
          <View style={styles.graphContainer}>
            <Text style={styles.graphLabel}>Actigraphy (Movement)</Text>
            <Svg width={width} height={actHeight}>
                <Path d={actPath} fill="#3b82f6" fillOpacity={0.3} stroke="#2563eb" strokeWidth={1} />
            </Svg>
          </View>
      )}
    </View>
  );
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

        {/* META (Text Only) */}
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

        {/* SLEEP DATA SECTION */}
        {sleepSessions && sleepSessions.length > 0 && (
            <View wrap={false} style={{ marginTop: 10 }}>
                <Text style={styles.sectionTitle}>Sleep Insights</Text>
                {sleepSessions.map((session, index) => (
                    <View key={index} style={{ marginBottom: 10 }}>
                        <Text style={{ fontSize: 10, fontFamily: 'Times-Bold', color: '#4b5563' }}>
                            Session {index + 1}: {session.duration.toFixed(1)}h Duration • {(session.deepSleepPerc * 100).toFixed(0)}% Deep Sleep
                        </Text>
                        <SleepGraphPdf session={session} />
                    </View>
                ))}
            </View>
        )}

        {/* IMAGE GALLERY (Full Size Stack) */}
        {entry.images && entry.images.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            {entry.images.map((imgSrc, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image src={imgSrc} style={styles.image} />
                </View>
            ))}
          </View>
        )}

      </Page>
    </Document>
  );
};

export default EntryPdfDocument;