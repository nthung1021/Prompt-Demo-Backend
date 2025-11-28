import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Param, 
  UseInterceptors, 
  UploadedFile,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService, UploadedDocument } from './utils/document.service';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile()
    file: any,
  ): Promise<{
    success: boolean;
    document?: UploadedDocument;
    message?: string;
  }> {
    try {
      console.log('Upload request received');
      console.log('File object:', {
        exists: !!file,
        originalname: file?.originalname,
        mimetype: file?.mimetype,
        size: file?.size,
        hasBuffer: !!file?.buffer,
        bufferType: typeof file?.buffer,
        keys: file ? Object.keys(file) : 'no file'
      });
      
      if (!file) {
        console.error('No file in request');
        throw new BadRequestException('No file uploaded');
      }

      // Manual file validation - expanded for multimedia
      const allowedTypes = /\.(txt|md|json|pdf|doc|docx|jpg|jpeg|png|gif|bmp|svg|webp|mp3|wav|ogg|m4a|aac|flac|mp4|avi|mov|wmv|flv|webm|mkv)$/i;
      if (!allowedTypes.test(file.originalname)) {
        console.error('Invalid file type:', file.originalname);
        throw new BadRequestException('Invalid file type. Supported formats: text files (.txt, .md, .json), documents (.pdf, .doc, .docx), images (.jpg, .png, .gif, etc.), audio (.mp3, .wav, .ogg, etc.), and video (.mp4, .avi, .mov, etc.)');
      }

      if (file.size > 50000000) { // 50MB for multimedia files
        console.error('File too large:', file.size);
        throw new BadRequestException('File too large. Maximum size is 50MB');
      }

      console.log('File validation passed, proceeding to save...');
      const document = await this.documentService.saveDocument(file);
      
      return {
        success: true,
        document,
        message: 'File uploaded successfully'
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to upload file');
    }
  }

  @Get()
  async getAllDocuments(): Promise<{
    documents: UploadedDocument[];
    count: number;
  }> {
    const documents = this.documentService.getAllDocuments();
    console.log(`Total uploaded documents: ${documents.length}`);
    return {
      documents,
      count: documents.length
    };
  }

  @Get(':id')
  async getDocument(@Param('id') id: string): Promise<UploadedDocument> {
    const document = this.documentService.getDocument(id);
    if (!document) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }
    return document;
  }

  @Get(':id/ai-info')
  async getDocumentForAI(@Param('id') id: string): Promise<{
    id: string;
    filename: string;
    fileType: string;
    mimeType: string;
    canProcessDirectly: boolean;
  }> {
    const document = this.documentService.getDocument(id);
    if (!document) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }
    
    const fileInfo = this.documentService.getFileForAI(id);
    
    return {
      id: document.id,
      filename: document.filename,
      fileType: document.fileType || 'text',
      mimeType: document.mimeType || 'application/octet-stream',
      canProcessDirectly: !!fileInfo
    };
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const deleted = this.documentService.deleteDocument(id);
    if (!deleted) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }
    
    return {
      success: true,
      message: 'Document deleted successfully'
    };
  }
}