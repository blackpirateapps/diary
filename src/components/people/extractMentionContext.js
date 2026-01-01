// components/people/extractMentionContext.js
export const extractMentionContext = (content, personId, personName) => {
  if (!content) return "Mentioned in this entry.";
  
  try {
    // Attempt to parse Lexical JSON structure
    const data = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Recursive function to extract text and ignore formatting/node metadata
    const extractText = (node) => {
      if (node.text) return node.text;
      if (node.children) return node.children.map(extractText).join('');
      return '';
    };

    if (data.root && data.root.children) {
      for (const block of data.root.children) {
        const blockText = extractText(block);
        // Look for the block that contains the person's name
        if (blockText.toLowerCase().includes(personName.toLowerCase())) {
          return blockText.trim();
        }
      }
    }
  } catch (e) {
    // Fallback for plain string content or malformed JSON
    const text = typeof content === 'string' ? content : '';
    const sentences = text.split(/[.!?\n]/);
    const match = sentences.find(s => s.toLowerCase().includes(personName.toLowerCase()));
    return match ? match.trim() + '.' : "Mentioned in this entry.";
  }
  
  return "Mentioned in this entry.";
};