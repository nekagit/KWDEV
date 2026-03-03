/** Ambient types for pdf-parse package (PDF text extraction). */
declare module "pdf-parse" {
  export class PDFParse {
    constructor(options: { data: Buffer });
    getText(): Promise<{ text?: string }>;
    destroy(): Promise<void>;
  }
}
