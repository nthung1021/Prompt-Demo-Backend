import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';

// For now, we'll disable PDF extraction due to library compatibility issues
// import * as pdfExtraction from 'pdf-extraction';

export interface UploadedDocument {
  id: string;
  filename: string;
  content: string;
  uploadedAt: Date;
  size: number;
  mimeType?: string;
  originalPath?: string;
  fileType?: 'text' | 'pdf' | 'image' | 'audio' | 'video' | 'document';
}

@Injectable()
export class DocumentService {
  private uploadedDocs: Map<string, UploadedDocument> = new Map();
  private uploadsDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async saveDocument(file: any): Promise<UploadedDocument> {
    console.log('Saving document, file object:', {
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      hasBuffer: !!file?.buffer,
      bufferLength: file?.buffer?.length,
      keys: Object.keys(file || {})
    });

    const docId = this.generateId();
    const filename = file.originalname;
    const fileExtension = filename.toLowerCase();
    const mimeType = file.mimetype;
    
    // Check if file buffer exists
    if (!file.buffer) {
      console.error('No file buffer found');
      throw new Error(`File buffer is missing. Please try uploading again.`);
    }

    // Determine file type for Gemini processing
    const fileType = this.determineFileType(mimeType, fileExtension);
    
    // Save the original file for direct Gemini processing
    const originalFilePath = path.join(this.uploadsDir, `${docId}_original_${filename}`);
    fs.writeFileSync(originalFilePath, file.buffer);
    
    // Extract text content based on file type
    let content = '';
    try {
      console.log(`Processing file: ${filename}, extension: ${fileExtension}, buffer size: ${file.buffer?.length || 'unknown'}`);
      
      if (fileType === 'text' || fileExtension.endsWith('.txt') || fileExtension.endsWith('.md')) {
        console.log('Processing as text file');
        content = file.buffer.toString('utf-8');
        console.log(`Text content length: ${content.length}`);
      } else if (fileExtension.endsWith('.json')) {
        console.log('Processing as JSON file');
        const jsonData = JSON.parse(file.buffer.toString('utf-8'));
        content = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
      } else if (fileType === 'pdf' || fileExtension.endsWith('.pdf')) {
        console.log('Processing as PDF file');
        // For PDFs, store metadata and rely on Gemini for content extraction
        content = `[PDF Document: ${filename}]\n\nThis PDF file has been uploaded and can be processed by Gemini 2.0 Flash for content analysis, summarization, and question answering. The file supports direct analysis without manual text extraction.\n\nFile uploaded successfully and ready for AI processing.`;
        console.log('PDF uploaded for Gemini processing:', filename);
      } else if (fileType === 'document' || fileExtension.endsWith('.docx') || fileExtension.endsWith('.doc')) {
        console.log('Processing as Word document');
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        content = result.value;
      } else if (fileType === 'image') {
        console.log('Processing as image file');
        content = `[Image: ${filename}]\n\nThis image file (${mimeType}) has been uploaded and can be analyzed by Gemini 2.0 Flash for visual content analysis, object detection, text extraction (OCR), and image-based question answering.\n\nFile ready for AI vision processing.`;
      } else if (fileType === 'audio') {
        console.log('Processing as audio file');
        content = `[Audio: ${filename}]\n\nThis audio file (${mimeType}) has been uploaded and can be processed by Gemini 2.0 Flash for speech recognition, transcription, audio analysis, and audio-based question answering.\n\nFile ready for AI audio processing.`;
      } else if (fileType === 'video') {
        console.log('Processing as video file');
        content = `[Video: ${filename}]\n\nThis video file (${mimeType}) has been uploaded and can be analyzed by Gemini 2.0 Flash for video content analysis, frame extraction, motion detection, and video-based question answering.\n\nFile ready for AI video processing.`;
      } else {
        console.log('Processing as generic text file');
        // For other file types, try to read as text
        content = file.buffer.toString('utf-8');
      }
      
      console.log(`Content extracted successfully, length: ${content.length}`);
    } catch (error) {
      console.error('File processing error:', error);
      console.error('Error details:', {
        filename,
        fileExtension,
        bufferSize: file.buffer?.length,
        errorMessage: error.message
      });
      
      // For multimedia files, provide a fallback description
      if (fileType === 'image' || fileType === 'audio' || fileType === 'video') {
        content = `[${fileType.toUpperCase()}: ${filename}]\n\nThis ${fileType} file has been uploaded and stored for AI processing. While text extraction failed, the original file is available for direct AI analysis.`;
      } else {
        throw new Error(`Could not process file ${filename}. Error: ${error.message}. Please upload supported file types: .txt, .md, .json, .pdf, .doc, .docx, images, audio, and video files.`);
      }
    }

    // Validate content length (more generous for PDF/Word)
    const maxLength = fileExtension.endsWith('.pdf') || fileExtension.endsWith('.docx') || fileExtension.endsWith('.doc') 
      ? 500000  // 500KB for PDF/Word content
      : 50000;  // 50KB for text files
    
    if (content.length > maxLength) {
      console.error(`Content too large: ${content.length} > ${maxLength}`);
      throw new Error(`File content too large. Please upload files with less than ${maxLength / 1000}KB of text content.`);
    }

    if (content.trim().length === 0) {
      console.error('File content is empty');
      throw new Error('File appears to be empty or unreadable.');
    }

    console.log(`Document validated successfully: ${filename}, content length: ${content.length}`);

    const document: UploadedDocument = {
      id: docId,
      filename,
      content: content.trim(),
      uploadedAt: new Date(),
      size: file.size,
      mimeType,
      originalPath: originalFilePath,
      fileType,
    };

    // Save to memory (in production, you'd save to database)
    this.uploadedDocs.set(docId, document);

    // Save text content to disk for text-based search
    const textFilePath = path.join(this.uploadsDir, `${docId}_content.txt`);
    fs.writeFileSync(textFilePath, content);

    return document;
  }

  getDocument(id: string): UploadedDocument | null {
    return this.uploadedDocs.get(id) || null;
  }

  getAllDocuments(): UploadedDocument[] {
    return Array.from(this.uploadedDocs.values())
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  deleteDocument(id: string): boolean {
    const doc = this.uploadedDocs.get(id);
    if (doc) {
      // Delete from memory
      this.uploadedDocs.delete(id);
      
      // Delete from disk
      try {
        const filePath = path.join(this.uploadsDir, `${id}_${doc.filename}`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error('Error deleting file from disk:', error);
      }
      
      return true;
    }
    return false;
  }

  // Search through uploaded documents
  searchDocuments(query: string): Array<{document: UploadedDocument, relevanceScore: number}> {
    const results: Array<{document: UploadedDocument, relevanceScore: number}> = [];
    const queryLower = query.toLowerCase().trim();
    
    console.log(`Searching ${this.uploadedDocs.size} uploaded documents for query: "${query}"`);
    
    if (this.uploadedDocs.size === 0) {
      console.log('No uploaded documents to search');
      return [];
    }
    
    // Split query into words and filter short words
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);
    console.log('Query words:', queryWords);
    
    for (const doc of this.uploadedDocs.values()) {
      let score = 0;
      const contentLower = doc.content.toLowerCase();
      const filenameLower = doc.filename.toLowerCase();
      
      console.log(`Analyzing document: ${doc.filename}`);
      console.log(`Content preview: ${contentLower.substring(0, 100)}...`);
      
      // Special handling for PDF files with filename matching
      const isPdf = doc.filename.toLowerCase().endsWith('.pdf');
      
      // Exact phrase match (highest priority)
      if (contentLower.includes(queryLower)) {
        score += 10;
        console.log(`Exact phrase match found: +10`);
      }
      
      // Individual word matches
      for (const word of queryWords) {
        // Content word matches
        if (contentLower.includes(word)) {
          const wordCount = (contentLower.match(new RegExp(word, 'g')) || []).length;
          score += wordCount * 3;
          console.log(`Word "${word}" found ${wordCount} times in content: +${wordCount * 3}`);
        }
        
        // Filename matches (boosted for PDFs since they rely on filename matching)
        if (filenameLower.includes(word)) {
          const filenameBonus = isPdf ? 8 : 5; // Higher bonus for PDFs
          score += filenameBonus;
          console.log(`Word "${word}" found in filename: +${filenameBonus}`);
        }
        
        // Partial matches for acronyms (like RAG)
        if (word.length >= 3) {
          const partialRegex = new RegExp(word.split('').join('.*'), 'i');
          if (partialRegex.test(contentLower)) {
            score += 2;
            console.log(`Partial match for "${word}": +2`);
          }
          
          // Also check filename for partial matches
          if (partialRegex.test(filenameLower)) {
            score += 3;
            console.log(`Partial filename match for "${word}": +3`);
          }
        }
      }
      
      // Boost for documents with relevant keywords
      const relevantTerms = ['definition', 'define', 'meaning', 'concept', 'explanation', 'what is', 'prompt', 'engineering', 'guide'];
      for (const term of relevantTerms) {
        if (contentLower.includes(term) || filenameLower.includes(term)) {
          const bonus = isPdf && filenameLower.includes(term) ? 4 : 1;
          score += bonus;
          console.log(`Relevant term "${term}" found: +${bonus}`);
        }
      }
      
      // Special bonus for PDFs that might contain relevant content based on filename
      if (isPdf) {
        // Check if filename suggests it might contain prompt engineering or AI content
        const aiTerms = ['prompt', 'ai', 'engineering', 'rag', 'llm', 'nlp', 'machine', 'learning'];
        for (const term of aiTerms) {
          if (filenameLower.includes(term)) {
            score += 5;
            console.log(`AI-related filename term "${term}" found: +5`);
          }
        }
      }
      
      console.log(`Document ${doc.filename} total score: ${score}`);
      
      if (score > 0) {
        console.log(`Adding match: ${doc.filename} with score ${score}`);
        results.push({ document: doc, relevanceScore: score });
      } else {
        console.log(`No match for document: ${doc.filename}`);
      }
    }

    console.log(`Total matches found: ${results.length}`);
    const sortedResults = results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    if (sortedResults.length > 0) {
      console.log('Top match:', sortedResults[0].document.filename, 'Score:', sortedResults[0].relevanceScore);
      console.log('Content preview:', sortedResults[0].document.content.substring(0, 200));
    } else {
      console.log('No relevant documents found');
    }
    
    return sortedResults;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private determineFileType(mimeType: string, filename: string): 'text' | 'pdf' | 'image' | 'audio' | 'video' | 'document' {
    const lowerFilename = filename.toLowerCase();
    
    if (mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/.test(lowerFilename)) {
      return 'image';
    } else if (mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lowerFilename)) {
      return 'audio';
    } else if (mimeType?.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/.test(lowerFilename)) {
      return 'video';
    } else if (mimeType === 'application/pdf' || lowerFilename.endsWith('.pdf')) {
      return 'pdf';
    } else if (/\.(doc|docx)$/.test(lowerFilename)) {
      return 'document';
    } else {
      return 'text';
    }
  }

  // Get file for direct AI processing (returns file path and mime type)
  getFileForAI(id: string): { path: string; mimeType: string } | null {
    const doc = this.uploadedDocs.get(id);
    if (doc && doc.originalPath && fs.existsSync(doc.originalPath)) {
      return {
        path: doc.originalPath,
        mimeType: doc.mimeType || this.getMimeTypeFromExtension(doc.filename)
      };
    }
    return null;
  }

  private getMimeTypeFromExtension(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeMap: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/m4a',
      'aac': 'audio/aac',
      'flac': 'audio/flac',
      'mp4': 'video/mp4',
      'avi': 'video/avi',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska'
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
  }
}