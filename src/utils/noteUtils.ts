/**
 * Utility functions for note operations
 */

/**
 * Extracts a title from note content
 * Tries to find the first H1 heading or first text content
 * 
 * @param content Note content (can be JSON or string)
 * @returns Extracted title or 'Untitled Note'
 */
export const extractTitleFromContent = (content: any): string => {
  if (!content) return 'Untitled Note';
  
  try {
    // If content is a string that looks like JSON, parse it
    let parsedContent;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        // If it's not valid JSON, use the first line or first 30 chars
        const firstLine = content.split('\n')[0].trim();
        return firstLine || content.substring(0, 30) || 'Untitled Note';
      }
    } else {
      parsedContent = content;
    }
    
    // If we have parsed JSON content from Tiptap/ProseMirror
    if (parsedContent && parsedContent.content) {
      // Look for the first heading level 1
      const h1Node = parsedContent.content.find((node: any) => 
        node.type === 'heading' && node.attrs && node.attrs.level === 1
      );
      
      if (h1Node && h1Node.content && h1Node.content.length > 0) {
        // Extract text from the heading
        const headingText = h1Node.content
          .filter((textNode: any) => textNode.type === 'text')
          .map((textNode: any) => textNode.text)
          .join('');
          
        if (headingText) return headingText;
      }
      
      // If no h1 found, look for the first paragraph with text
      const firstTextNode = parsedContent.content.find((node: any) => 
        (node.type === 'paragraph' || node.type === 'heading') && 
        node.content && 
        node.content.length > 0
      );
      
      if (firstTextNode && firstTextNode.content) {
        const text = firstTextNode.content
          .filter((textNode: any) => textNode.type === 'text')
          .map((textNode: any) => textNode.text)
          .join('');
          
        if (text) return text;
      }
    }
    
    // Fallback for empty documents or if no text found
    return 'Untitled Note';
  } catch (error) {
    console.error('Error extracting title:', error);
    return 'Untitled Note';
  }
};
