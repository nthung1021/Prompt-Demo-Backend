import { Injectable } from '@nestjs/common';
import { LlmClient } from '../utils/llm-client';
import { buildRAGPrompt } from '../utils/templates';
import { DocumentService } from '../utils/document.service';

interface RAGStep {
  type: 'retrieval' | 'reasoning' | 'generation';
  content: string;
  sources?: string[];
}

interface RetrievedDocument {
  content: string;
  source: string;
  relevanceScore?: number;
}

@Injectable()
export class RAGService {
  constructor(
    private readonly llm: LlmClient,
    private readonly documentService: DocumentService
  ) {}

  async run(inputText: string, params: any = {}) {
    const start = Date.now();
    const maxDocuments = params?.maxDocuments ?? 5;
    const retrievalMethod = params?.retrievalMethod ?? 'semantic';
    const useFilesDirectly = params?.useFilesDirectly ?? true; // New parameter for direct file processing



    // Step 1: Retrieve documents (uploaded + knowledge base)
    const retrievedDocs = await this.simulateRetrieval(inputText, { 
      maxDocuments, 
      method: retrievalMethod,
      useUploaded: params?.useUploadedDocs ?? true
    });

    // Step 2: Check for multimedia files that should be processed directly
    const filesToProcess: Array<{path: string, mimeType: string}> = [];
    const relevantFiles: string[] = [];
    
    if (useFilesDirectly && this.documentService) {
      const allDocs = this.documentService.getAllDocuments();
      
      // Look for relevant uploaded files based on query or recent uploads
      const relevantDocs = allDocs
        .filter(doc => doc.fileType !== 'text' || this.isFileRelevantToQuery(doc.filename, inputText))
        .slice(0, 3); // Limit to 3 files for performance
      
      for (const doc of relevantDocs) {
        const fileInfo = this.documentService.getFileForAI(doc.id);
        if (fileInfo) {
          filesToProcess.push(fileInfo);
          relevantFiles.push(doc.filename);
        }
      }
    }

    // Step 3: Build RAG prompt with retrieved context
    let prompt = buildRAGPrompt(inputText, retrievedDocs, {
      includeRetrievalSteps: true,
      reasoningStyle: params?.reasoningStyle ?? 'analytical'
    });

    // Add file processing instructions if files are included
    if (filesToProcess.length > 0) {
      prompt += `\n\nAdditionally, analyze the following uploaded files that may be relevant to the query:\n`;
      prompt += `Files included: ${relevantFiles.join(', ')}\n`;
      prompt += `Please incorporate insights from these files into your response.\n`;
    }

    // Step 4: Generate response with retrieved context and files
    let result;
    if (filesToProcess.length > 0) {
      // Use the enhanced generateWithFiles method for multimedia support
      result = await this.llm.generateWithFiles(prompt, filesToProcess, {
        temperature: params?.temperature ?? 0.1,
        maxOutputTokens: params?.maxTokens ?? 1500, // Increased for file analysis
      });
    } else {
      // Standard generation without files
      result = await this.llm.generate(prompt, {
        temperature: params?.temperature ?? 0.1,
        maxOutputTokens: params?.maxTokens ?? 1200,
      });
    }

    const text = String(result.text ?? '').trim();

    // Parse the RAG steps
    const steps = this.parseRAGSteps(text, retrievedDocs, relevantFiles);
    
    // Extract final answer
    const finalAnswer = this.extractFinalAnswer(text);

    const latency = Date.now() - start;

    return {
      technique: 'rag',
      prompt,
      outputs: [
        {
          steps,
          retrievedDocuments: retrievedDocs,
          processedFiles: relevantFiles,
          finalAnswer,
          reasoning: this.formatReasoning(steps),
          raw: result.raw,
          rawText: text,
          usage: result.usage ?? null,
          latencyMs: latency,
        },
      ],
    };
  }

  private async simulateRetrieval(query: string, opts: any = {}): Promise<RetrievedDocument[]> {
    const maxDocs = opts.maxDocuments ?? 5;
    const useUploaded = opts.useUploaded ?? true;
    let allDocs: any[] = [];

    // Get uploaded documents if enabled
    if (useUploaded && this.documentService) {
      try {
        console.log('Starting to search uploaded documents...');
        const uploadedResults = await this.documentService.searchDocuments(query);
        console.log('Search completed. Results:', uploadedResults?.length);
        
        if (uploadedResults && uploadedResults.length > 0) {
          const uploadedDocs = uploadedResults.map(result => ({
            content: result.document.content,
            source: `📎 ${result.document.filename}`,
            topics: [], // Will be determined by relevance score
            relevanceScore: result.relevanceScore + 1 // Boost uploaded docs
          }));
          allDocs.push(...uploadedDocs);
          console.log(`Added ${uploadedDocs.length} uploaded documents to retrieval results`);
        } else {
          console.log('No uploaded documents found for query');
        }
      } catch (error) {
        console.error('Error searching uploaded documents:', error);
        // Continue with knowledge base search even if uploaded docs fail
      }
    }
    
    // Simulate a knowledge base with various topics
    const knowledgeBase = [
      {
        content: "Artificial Intelligence (AI) is the simulation of human intelligence in machines that are programmed to think and learn like humans. AI systems can perform tasks that typically require human intelligence, such as visual perception, speech recognition, decision-making, and language translation.",
        source: "AI Fundamentals Encyclopedia",
        topics: ["artificial intelligence", "AI", "machine learning", "technology", "automation"]
      },
      {
        content: "Climate change refers to long-term shifts and alterations in global or regional climate patterns. Since the mid-20th century, climate change has been largely attributed to increased levels of atmospheric carbon dioxide produced by the use of fossil fuels.",
        source: "Environmental Science Handbook",
        topics: ["climate change", "environment", "global warming", "carbon dioxide", "fossil fuels"]
      },
      {
        content: "Renewable energy comes from natural sources that are constantly replenished, such as sunlight, wind, rain, tides, waves, and geothermal heat. These energy sources are sustainable and have a much lower environmental impact compared to fossil fuels.",
        source: "Renewable Energy Guide",
        topics: ["renewable energy", "solar", "wind", "environment", "sustainability", "green energy"]
      },
      {
        content: "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. It focuses on developing algorithms that can access data and use it to learn for themselves.",
        source: "Machine Learning Textbook",
        topics: ["machine learning", "AI", "algorithms", "data science", "programming"]
      },
      {
        content: "Quantum computing uses quantum-mechanical phenomena, such as superposition and entanglement, to perform operations on data. Quantum computers have the potential to solve certain computational problems much faster than classical computers.",
        source: "Quantum Physics Journal",
        topics: ["quantum computing", "quantum mechanics", "superposition", "technology", "computing"]
      },
      {
        content: "Sustainable transportation includes walking, cycling, public transit, electric vehicles, and other low-carbon modes of transport. These alternatives help reduce greenhouse gas emissions and air pollution while promoting healthier communities.",
        source: "Urban Planning Manual",
        topics: ["transportation", "sustainability", "electric vehicles", "public transit", "environment"]
      },
      {
        content: "Data science combines domain expertise, programming skills, and knowledge of mathematics and statistics to extract meaningful insights from data. It uses techniques from statistics, machine learning, and computer science.",
        source: "Data Science Fundamentals",
        topics: ["data science", "statistics", "programming", "analysis", "big data"]
      }
    ];

    // Add knowledge base docs
    const queryLower = query.toLowerCase();
    const knowledgeBaseDocs = knowledgeBase
      .map(doc => {
        let score = 0;
        doc.topics.forEach(topic => {
          if (queryLower.includes(topic.toLowerCase())) {
            score += 1;
          }
        });
        
        // Check for partial matches
        if (doc.content.toLowerCase().includes(queryLower.slice(0, 10))) {
          score += 0.5;
        }

        return {
          ...doc,
          relevanceScore: score
        };
      })
      .filter(doc => doc.relevanceScore > 0);
    
    allDocs.push(...knowledgeBaseDocs);

    // Sort all documents by relevance and limit results
    const relevantDocs = allDocs
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxDocs)
      .map(doc => ({
        content: doc.content,
        source: doc.source,
        relevanceScore: doc.relevanceScore
      }));

    // If no relevant docs found, return top general docs from knowledge base
    if (relevantDocs.length === 0) {
      return knowledgeBase.slice(0, Math.min(3, maxDocs)).map(doc => ({
        content: doc.content,
        source: doc.source,
        relevanceScore: 0.1
      }));
    }

    return relevantDocs;
  }

  private parseRAGSteps(text: string, retrievedDocs: RetrievedDocument[], processedFiles: string[] = []): RAGStep[] {
    const steps: RAGStep[] = [];

    // Add retrieval step
    const retrievalContent = processedFiles.length > 0 
      ? `Retrieved ${retrievedDocs.length} relevant documents from knowledge base and processed ${processedFiles.length} uploaded files: ${processedFiles.join(', ')}`
      : `Retrieved ${retrievedDocs.length} relevant documents from knowledge base`;
    
    steps.push({
      type: 'retrieval',
      content: retrievalContent,
      sources: retrievedDocs.map(doc => doc.source).concat(processedFiles)
    });

    // Look for reasoning patterns
    const reasoningPatterns = [
      /Based on the retrieved information[^.]*\./gi,
      /According to the documents[^.]*\./gi,
      /The sources indicate[^.]*\./gi,
      /From the context provided[^.]*\./gi,
      /DOCUMENT ANALYSIS[:]?[\s\S]*?(?=REASONING|ANSWER|$)/gi,
      /REASONING[:]?[\s\S]*?(?=ANSWER|$)/gi
    ];

    let reasoningContent = '';
    reasoningPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        reasoningContent += matches.join(' ') + ' ';
      }
    });

    if (reasoningContent.trim()) {
      steps.push({
        type: 'reasoning',
        content: reasoningContent.trim()
      });
    }

    // Add generation step (the main response)
    steps.push({
      type: 'generation',
      content: text
    });

    return steps;
  }

  private extractFinalAnswer(text: string): string {
    // Try to find a clear final answer section
    const finalAnswerPatterns = [
      /(?:Final Answer|Conclusion|Summary):\s*([\s\S]*?)(?:\n\n|$)/i,
      /(?:In conclusion|To summarize)[\s,]*([\s\S]*?)(?:\n\n|$)/i
    ];

    for (const pattern of finalAnswerPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If no explicit final answer, return the last paragraph
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    return paragraphs.length > 0 ? paragraphs[paragraphs.length - 1].trim() : text;
  }

  private formatReasoning(steps: RAGStep[]): string {
    return steps
      .map((step, index) => {
        let prefix = '';
        switch (step.type) {
          case 'retrieval':
            prefix = '🔍 Document Retrieval:';
            break;
          case 'reasoning':
            prefix = '🧠 Reasoning:';
            break;
          case 'generation':
            prefix = '✍️ Generated Response:';
            break;
        }
        return `${prefix}\n${step.content}`;
      })
      .join('\n\n');
  }

  private isFileRelevantToQuery(filename: string, query: string): boolean {
    const filenameLower = filename.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Split query into words and check for matches
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    // Check if filename contains any query words
    for (const word of queryWords) {
      if (filenameLower.includes(word)) {
        return true;
      }
    }
    
    // Check for common document types that might be generally relevant
    const relevantTerms = ['definition', 'guide', 'manual', 'tutorial', 'reference', 'doc', 'info'];
    for (const term of relevantTerms) {
      if (filenameLower.includes(term) && queryWords.some(word => 
        ['what', 'how', 'define', 'explain', 'guide', 'help'].includes(word)
      )) {
        return true;
      }
    }
    
    return false;
  }
}