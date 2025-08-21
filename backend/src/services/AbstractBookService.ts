import { SubmissionRepository } from '../models/SubmissionRepository.js';
import { ConferenceRepository } from '../models/ConferenceRepository.js';
import { SubmissionResponse, AuthorResponse } from '../types/submission.js';
import { SessionType, PresentationType, SubmissionStatus } from '../types/database.js';
import { marked } from 'marked';
import puppeteer from 'puppeteer';
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, PageBreak } from 'docx';

export interface AbstractBookFilters {
  sessionTypes?: SessionType[];
  presentationTypes?: PresentationType[];
  status?: SubmissionStatus;
  includeKeywords?: boolean;
  includeAuthors?: boolean;
}

export interface AbstractBookTemplate {
  title: string;
  subtitle?: string;
  coverPage: {
    conferenceTitle: string;
    conferenceSubtitle?: string;
    dates: string;
    venue: string;
    organizers?: string[];
    logo?: string;
  };
  styling: {
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
    margins: string;
    headerColor: string;
    accentColor: string;
  };
  sections: {
    includeTableOfContents: boolean;
    includeSessionSeparators: boolean;
    includeAuthorIndex: boolean;
    includeKeywordIndex: boolean;
  };
}

export interface AbstractBookEntry {
  submission: SubmissionResponse;
  formattedAuthors: string;
  formattedAffiliations: string;
  sessionName: string;
  presentationTypeLabel: string;
}

export interface AbstractBookData {
  metadata: {
    title: string;
    generatedDate: Date;
    totalAbstracts: number;
    sessionBreakdown: Record<SessionType, number>;
    presentationBreakdown: Record<PresentationType, number>;
  };
  sections: {
    [sessionType: string]: {
      name: string;
      abstracts: AbstractBookEntry[];
    };
  };
  indexes?: {
    authors?: { name: string; pages: number[] }[];
    keywords?: { keyword: string; pages: number[] }[];
  };
}

export class AbstractBookService {
  private conferenceRepository: ConferenceRepository;

  constructor() {
    this.conferenceRepository = new ConferenceRepository();
  }

  /**
   * Collect and filter abstracts for the abstract book
   */
  async collectAbstracts(filters: AbstractBookFilters = {}): Promise<AbstractBookData> {
    try {
      // Get all accepted submissions by default, or filter by status
      const status = filters.status || 'accepted';
      let submissions: SubmissionResponse[] = [];

      // Collect submissions based on filters
      if (filters.sessionTypes && filters.sessionTypes.length > 0) {
        // Get submissions for specific session types
        for (const sessionType of filters.sessionTypes) {
          const sessionSubmissions = await SubmissionRepository.findBySessionType(sessionType);
          submissions.push(...sessionSubmissions.filter(s => s.status === status));
        }
      } else {
        // Get all submissions with the specified status
        submissions = await SubmissionRepository.findByStatus(status);
      }

      // Filter by presentation type if specified
      if (filters.presentationTypes && filters.presentationTypes.length > 0) {
        submissions = submissions.filter(s => 
          filters.presentationTypes!.includes(s.presentationType)
        );
      }

      // Sort submissions by session type, then by title
      submissions.sort((a, b) => {
        if (a.sessionType !== b.sessionType) {
          return a.sessionType.localeCompare(b.sessionType);
        }
        return a.title.localeCompare(b.title);
      });

      // Get conference information
      const conference = await ConferenceRepository.findActiveConference();
      const conferenceTitle = conference?.name || 'International Conference';

      // Process submissions into abstract book entries
      const abstractEntries: AbstractBookEntry[] = [];
      const sessionBreakdown: Record<SessionType, number> = {
        CHE: 0, CSE: 0, BIO: 0, MST: 0, PFD: 0
      };
      const presentationBreakdown: Record<PresentationType, number> = {
        oral: 0, poster: 0
      };

      for (const submission of submissions) {
        const entry = this.formatAbstractEntry(submission);
        abstractEntries.push(entry);
        
        sessionBreakdown[submission.sessionType]++;
        presentationBreakdown[submission.presentationType]++;
      }

      // Group abstracts by session
      const sections: { [sessionType: string]: { name: string; abstracts: AbstractBookEntry[] } } = {};
      
      for (const sessionType of ['CHE', 'CSE', 'BIO', 'MST', 'PFD'] as SessionType[]) {
        const sessionAbstracts = abstractEntries.filter(entry => 
          entry.submission.sessionType === sessionType
        );
        
        if (sessionAbstracts.length > 0) {
          sections[sessionType] = {
            name: this.getSessionName(sessionType),
            abstracts: sessionAbstracts
          };
        }
      }

      // Generate indexes if requested
      let indexes: AbstractBookData['indexes'];
      if (filters.includeAuthors || filters.includeKeywords) {
        indexes = {};
        
        if (filters.includeAuthors) {
          indexes.authors = this.generateAuthorIndex(abstractEntries);
        }
        
        if (filters.includeKeywords) {
          indexes.keywords = this.generateKeywordIndex(abstractEntries);
        }
      }

      return {
        metadata: {
          title: `${conferenceTitle} - Abstract Book`,
          generatedDate: new Date(),
          totalAbstracts: submissions.length,
          sessionBreakdown,
          presentationBreakdown
        },
        sections,
        indexes
      };

    } catch (error) {
      console.error('Error collecting abstracts:', error);
      throw new Error('Failed to collect abstracts for abstract book');
    }
  }

  /**
   * Format a submission into an abstract book entry
   */
  private formatAbstractEntry(submission: SubmissionResponse): AbstractBookEntry {
    // Format authors
    const sortedAuthors = submission.authors.sort((a, b) => a.authorOrder - b.authorOrder);
    const formattedAuthors = this.formatAuthors(sortedAuthors);
    const formattedAffiliations = this.formatAffiliations(sortedAuthors);

    return {
      submission,
      formattedAuthors,
      formattedAffiliations,
      sessionName: this.getSessionName(submission.sessionType),
      presentationTypeLabel: submission.presentationType === 'oral' ? 'Oral Presentation' : 'Poster Presentation'
    };
  }

  /**
   * Format authors for display
   */
  private formatAuthors(authors: AuthorResponse[]): string {
    return authors.map((author, index) => {
      const name = author.name;
      const isCorresponding = author.isCorresponding;
      const superscript = index + 1;
      
      return `${name}${superscript}${isCorresponding ? '*' : ''}`;
    }).join(', ');
  }

  /**
   * Format affiliations for display
   */
  private formatAffiliations(authors: AuthorResponse[]): string {
    const uniqueAffiliations = new Map<string, number[]>();
    
    authors.forEach((author, index) => {
      const affiliation = author.affiliation;
      if (!uniqueAffiliations.has(affiliation)) {
        uniqueAffiliations.set(affiliation, []);
      }
      uniqueAffiliations.get(affiliation)!.push(index + 1);
    });

    return Array.from(uniqueAffiliations.entries())
      .map(([affiliation, indices]) => `${indices.join(',')}${affiliation}`)
      .join('; ');
  }

  /**
   * Get session name from session type
   */
  private getSessionName(sessionType: SessionType): string {
    const sessionNames: Record<SessionType, string> = {
      CHE: 'Computational Chemistry',
      CSE: 'High Performance Computing/Computer Science/Engineering',
      BIO: 'Computational Biology/Bioinformatics/Biochemistry/Biophysics',
      MST: 'Mathematics and Statistics',
      PFD: 'Computational Physics/Computational Fluid Dynamics/Solid Mechanics'
    };
    return sessionNames[sessionType];
  }



  /**
   * Create default template for abstract book
   */
  async createDefaultTemplate(): Promise<AbstractBookTemplate> {
    const conference = await ConferenceRepository.findActiveConference();
    
    return {
      title: 'Abstract Book',
      subtitle: 'Conference Proceedings',
      coverPage: {
        conferenceTitle: conference?.name || 'International Conference',
        conferenceSubtitle: conference?.description || '',
        dates: conference ? this.formatConferenceDates(conference.startDate, conference.endDate) : '',
        venue: conference?.venue || '',
        organizers: ['Conference Organizing Committee']
      },
      styling: {
        fontFamily: 'Times New Roman, serif',
        fontSize: '12pt',
        lineHeight: '1.5',
        margins: '2.5cm',
        headerColor: '#2c3e50',
        accentColor: '#3498db'
      },
      sections: {
        includeTableOfContents: true,
        includeSessionSeparators: true,
        includeAuthorIndex: true,
        includeKeywordIndex: true
      }
    };
  }

  /**
   * Format conference dates for display
   */
  private formatConferenceDates(startDate: Date, endDate: Date): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', options);
    } else if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    } else {
      return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    }
  }

  /**
   * Generate HTML content for abstract book
   */
  async generateHTML(
    abstractBookData: AbstractBookData, 
    template: AbstractBookTemplate
  ): Promise<string> {
    try {
      let html = this.generateHTMLHeader(template);
      
      // Cover page
      html += this.generateCoverPage(template);
      
      // Table of contents
      if (template.sections.includeTableOfContents) {
        html += this.generateTableOfContents(abstractBookData, template);
      }
      
      // Abstract sections
      html += this.generateAbstractSections(abstractBookData, template);
      
      // Indexes
      if (template.sections.includeAuthorIndex && abstractBookData.indexes?.authors) {
        html += this.generateAuthorIndex(abstractBookData.indexes.authors, template);
      }
      
      if (template.sections.includeKeywordIndex && abstractBookData.indexes?.keywords) {
        html += this.generateKeywordIndex(abstractBookData.indexes.keywords, template);
      }
      
      html += this.generateHTMLFooter();
      
      return html;
    } catch (error) {
      console.error('Error generating HTML:', error);
      throw new Error('Failed to generate HTML for abstract book');
    }
  }

  /**
   * Generate HTML header with styling
   */
  private generateHTMLHeader(template: AbstractBookTemplate): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.title}</title>
    <style>
        @page {
            size: A4;
            margin: ${template.styling.margins};
        }
        
        body {
            font-family: ${template.styling.fontFamily};
            font-size: ${template.styling.fontSize};
            line-height: ${template.styling.lineHeight};
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        .cover-page {
            page-break-after: always;
            text-align: center;
            padding-top: 20%;
        }
        
        .cover-title {
            font-size: 24pt;
            font-weight: bold;
            color: ${template.styling.headerColor};
            margin-bottom: 20px;
        }
        
        .cover-subtitle {
            font-size: 18pt;
            color: ${template.styling.accentColor};
            margin-bottom: 30px;
        }
        
        .cover-details {
            font-size: 14pt;
            margin: 10px 0;
        }
        
        .toc {
            page-break-after: always;
        }
        
        .toc-title {
            font-size: 18pt;
            font-weight: bold;
            color: ${template.styling.headerColor};
            margin-bottom: 20px;
            text-align: center;
        }
        
        .toc-entry {
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
        }
        
        .session-header {
            page-break-before: always;
            font-size: 16pt;
            font-weight: bold;
            color: ${template.styling.headerColor};
            margin: 30px 0 20px 0;
            text-align: center;
            border-bottom: 2px solid ${template.styling.accentColor};
            padding-bottom: 10px;
        }
        
        .abstract-entry {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .abstract-title {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 10px;
            color: ${template.styling.headerColor};
        }
        
        .abstract-authors {
            font-size: 12pt;
            margin-bottom: 5px;
            font-style: italic;
        }
        
        .abstract-affiliations {
            font-size: 10pt;
            margin-bottom: 10px;
            color: #666;
        }
        
        .abstract-content {
            text-align: justify;
            margin-bottom: 10px;
        }
        
        .abstract-keywords {
            font-size: 10pt;
            color: #666;
            font-style: italic;
        }
        
        .presentation-type {
            font-size: 10pt;
            color: ${template.styling.accentColor};
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .index {
            page-break-before: always;
        }
        
        .index-title {
            font-size: 16pt;
            font-weight: bold;
            color: ${template.styling.headerColor};
            margin-bottom: 20px;
            text-align: center;
        }
        
        .index-entry {
            margin: 2px 0;
            display: flex;
            justify-content: space-between;
        }
        
        .index-name {
            flex: 1;
        }
        
        .index-pages {
            margin-left: 10px;
        }
        
        @media print {
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
`;
  }

  /**
   * Generate cover page HTML
   */
  private generateCoverPage(template: AbstractBookTemplate): string {
    return `
    <div class="cover-page">
        <div class="cover-title">${template.coverPage.conferenceTitle}</div>
        ${template.coverPage.conferenceSubtitle ? `<div class="cover-subtitle">${template.coverPage.conferenceSubtitle}</div>` : ''}
        <div class="cover-details">${template.coverPage.dates}</div>
        <div class="cover-details">${template.coverPage.venue}</div>
        <div style="margin-top: 50px;">
            <div class="cover-title" style="font-size: 20pt;">${template.title}</div>
            ${template.subtitle ? `<div class="cover-subtitle">${template.subtitle}</div>` : ''}
        </div>
        ${template.coverPage.organizers ? `
        <div style="margin-top: 50px;">
            ${template.coverPage.organizers.map(org => `<div class="cover-details">${org}</div>`).join('')}
        </div>
        ` : ''}
    </div>
`;
  }

  /**
   * Generate table of contents HTML
   */
  private generateTableOfContents(data: AbstractBookData, template: AbstractBookTemplate): string {
    let toc = `
    <div class="toc">
        <div class="toc-title">Table of Contents</div>
`;

    let pageNumber = 1;
    Object.entries(data.sections).forEach(([sessionType, section]) => {
      toc += `
        <div class="toc-entry">
            <span>${section.name}</span>
            <span>${pageNumber}</span>
        </div>
`;
      pageNumber += section.abstracts.length;
    });

    if (template.sections.includeAuthorIndex && data.indexes?.authors) {
      toc += `
        <div class="toc-entry">
            <span>Author Index</span>
            <span>${pageNumber}</span>
        </div>
`;
      pageNumber++;
    }

    if (template.sections.includeKeywordIndex && data.indexes?.keywords) {
      toc += `
        <div class="toc-entry">
            <span>Keyword Index</span>
            <span>${pageNumber}</span>
        </div>
`;
    }

    toc += `    </div>`;
    return toc;
  }

  /**
   * Generate abstract sections HTML
   */
  private generateAbstractSections(data: AbstractBookData, template: AbstractBookTemplate): string {
    let html = '';

    Object.entries(data.sections).forEach(([sessionType, section]) => {
      if (template.sections.includeSessionSeparators) {
        html += `<div class="session-header">${section.name}</div>`;
      }

      section.abstracts.forEach(entry => {
        html += this.generateAbstractHTML(entry);
      });
    });

    return html;
  }

  /**
   * Generate HTML for a single abstract
   */
  private generateAbstractHTML(entry: AbstractBookEntry): string {
    const { submission, formattedAuthors, formattedAffiliations, presentationTypeLabel } = entry;
    
    // Convert markdown to HTML if needed
    const abstractContent = submission.abstractHtml || marked(submission.abstract);

    return `
    <div class="abstract-entry">
        <div class="presentation-type">${presentationTypeLabel}</div>
        <div class="abstract-title">${submission.title}</div>
        <div class="abstract-authors">${formattedAuthors}</div>
        <div class="abstract-affiliations">${formattedAffiliations}</div>
        <div class="abstract-content">${abstractContent}</div>
        ${submission.keywords.length > 0 ? `
        <div class="abstract-keywords">
            <strong>Keywords:</strong> ${submission.keywords.join(', ')}
        </div>
        ` : ''}
    </div>
`;
  }



  /**
   * Generate HTML footer
   */
  private generateHTMLFooter(): string {
    return `
</body>
</html>
`;
  }

  /**
   * Generate DOCX document for abstract book
   */
  async generateDOCX(
    abstractBookData: AbstractBookData, 
    template: AbstractBookTemplate
  ): Promise<Buffer> {
    try {
      const doc = new Document({
        creator: 'Conference Management System',
        title: template.title,
        description: `Abstract book for ${template.coverPage.conferenceTitle}`,
        styles: {
          default: {
            document: {
              run: {
                font: 'Times New Roman',
                size: 24 // 12pt in half-points
              }
            }
          },
          paragraphStyles: [
            {
              id: 'coverTitle',
              name: 'Cover Title',
              basedOn: 'Normal',
              next: 'Normal',
              run: {
                size: 48, // 24pt
                bold: true,
                color: '2c3e50'
              },
              paragraph: {
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
              }
            },
            {
              id: 'coverSubtitle',
              name: 'Cover Subtitle',
              basedOn: 'Normal',
              next: 'Normal',
              run: {
                size: 36, // 18pt
                color: '3498db'
              },
              paragraph: {
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 }
              }
            },
            {
              id: 'sessionHeader',
              name: 'Session Header',
              basedOn: 'Normal',
              next: 'Normal',
              run: {
                size: 32, // 16pt
                bold: true,
                color: '2c3e50'
              },
              paragraph: {
                alignment: AlignmentType.CENTER,
                spacing: { before: 600, after: 400 },
                border: {
                  bottom: {
                    color: '3498db',
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 6
                  }
                }
              }
            },
            {
              id: 'abstractTitle',
              name: 'Abstract Title',
              basedOn: 'Normal',
              next: 'Normal',
              run: {
                size: 28, // 14pt
                bold: true,
                color: '2c3e50'
              },
              paragraph: {
                spacing: { after: 200 }
              }
            },
            {
              id: 'abstractAuthors',
              name: 'Abstract Authors',
              basedOn: 'Normal',
              next: 'Normal',
              run: {
                size: 24, // 12pt
                italics: true
              },
              paragraph: {
                spacing: { after: 100 }
              }
            },
            {
              id: 'abstractAffiliations',
              name: 'Abstract Affiliations',
              basedOn: 'Normal',
              next: 'Normal',
              run: {
                size: 20, // 10pt
                color: '666666'
              },
              paragraph: {
                spacing: { after: 200 }
              }
            },
            {
              id: 'abstractContent',
              name: 'Abstract Content',
              basedOn: 'Normal',
              next: 'Normal',
              run: {
                size: 24 // 12pt
              },
              paragraph: {
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 200 }
              }
            },
            {
              id: 'abstractKeywords',
              name: 'Abstract Keywords',
              basedOn: 'Normal',
              next: 'Normal',
              run: {
                size: 20, // 10pt
                color: '666666',
                italics: true
              },
              paragraph: {
                spacing: { after: 600 }
              }
            }
          ]
        },
        sections: []
      });

      // Create sections array to build the document
      const sections = [];

      // Cover page
      const coverSection = {
        children: [
          new Paragraph({
            text: template.coverPage.conferenceTitle,
            style: 'coverTitle'
          }),
          ...(template.coverPage.conferenceSubtitle ? [
            new Paragraph({
              text: template.coverPage.conferenceSubtitle,
              style: 'coverSubtitle'
            })
          ] : []),
          new Paragraph({
            children: [
              new TextRun({
                text: template.coverPage.dates,
                size: 28
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: template.coverPage.venue,
                size: 28
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
          }),
          new Paragraph({
            text: template.title,
            style: 'coverTitle'
          }),
          ...(template.subtitle ? [
            new Paragraph({
              text: template.subtitle,
              style: 'coverSubtitle'
            })
          ] : []),
          ...(template.coverPage.organizers ? template.coverPage.organizers.map(org =>
            new Paragraph({
              children: [
                new TextRun({
                  text: org,
                  size: 28
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 }
            })
          ) : [])
        ]
      };

      sections.push(coverSection);

      // Table of contents
      if (template.sections.includeTableOfContents) {
        const tocSection = {
          children: [
            new PageBreak(),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Table of Contents',
                  size: 36,
                  bold: true,
                  color: '2c3e50'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            ...this.generateDOCXTableOfContents(abstractBookData, template)
          ]
        };
        sections.push(tocSection);
      }

      // Abstract sections
      Object.entries(abstractBookData.sections).forEach(([sessionType, section]) => {
        const sectionChildren = [];

        // Session header
        if (template.sections.includeSessionSeparators) {
          sectionChildren.push(
            new PageBreak(),
            new Paragraph({
              text: section.name,
              style: 'sessionHeader'
            })
          );
        }

        // Abstracts
        section.abstracts.forEach(entry => {
          sectionChildren.push(...this.generateDOCXAbstract(entry));
        });

        sections.push({ children: sectionChildren });
      });

      // Indexes
      if (template.sections.includeAuthorIndex && abstractBookData.indexes?.authors) {
        const authorIndexSection = {
          children: [
            new PageBreak(),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Author Index',
                  size: 32,
                  bold: true,
                  color: '2c3e50'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            ...this.generateDOCXAuthorIndex(abstractBookData.indexes.authors)
          ]
        };
        sections.push(authorIndexSection);
      }

      if (template.sections.includeKeywordIndex && abstractBookData.indexes?.keywords) {
        const keywordIndexSection = {
          children: [
            new PageBreak(),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Keyword Index',
                  size: 32,
                  bold: true,
                  color: '2c3e50'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            ...this.generateDOCXKeywordIndex(abstractBookData.indexes.keywords)
          ]
        };
        sections.push(keywordIndexSection);
      }

      // Combine all sections into the document
      const allChildren: (Paragraph | PageBreak)[] = [];
      sections.forEach(section => {
        allChildren.push(...section.children);
      });
      
      // Create the document with all content
      const finalDoc = new Document({
        creator: 'Conference Management System',
        title: template.title,
        description: `Abstract book for ${template.coverPage.conferenceTitle}`,
        sections: [{
          children: allChildren
        }]
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(finalDoc);
      return buffer;

    } catch (error) {
      console.error('Error generating DOCX:', error);
      throw new Error('Failed to generate DOCX document');
    }
  }

  /**
   * Generate DOCX table of contents
   */
  private generateDOCXTableOfContents(data: AbstractBookData, template: AbstractBookTemplate): Paragraph[] {
    const tocEntries: Paragraph[] = [];
    let pageNumber = 1;

    Object.entries(data.sections).forEach(([sessionType, section]) => {
      tocEntries.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.name,
              size: 24
            }),
            new TextRun({
              text: `\t${pageNumber}`,
              size: 24
            })
          ],
          spacing: { after: 100 }
        })
      );
      pageNumber += section.abstracts.length;
    });

    if (template.sections.includeAuthorIndex && data.indexes?.authors) {
      tocEntries.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Author Index',
              size: 24
            }),
            new TextRun({
              text: `\t${pageNumber}`,
              size: 24
            })
          ],
          spacing: { after: 100 }
        })
      );
      pageNumber++;
    }

    if (template.sections.includeKeywordIndex && data.indexes?.keywords) {
      tocEntries.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Keyword Index',
              size: 24
            }),
            new TextRun({
              text: `\t${pageNumber}`,
              size: 24
            })
          ],
          spacing: { after: 100 }
        })
      );
    }

    return tocEntries;
  }

  /**
   * Generate DOCX content for a single abstract
   */
  private generateDOCXAbstract(entry: AbstractBookEntry): Paragraph[] {
    const { submission, formattedAuthors, formattedAffiliations, presentationTypeLabel } = entry;
    
    const paragraphs: Paragraph[] = [];

    // Presentation type
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: presentationTypeLabel,
            size: 20,
            color: '3498db',
            bold: true
          })
        ],
        spacing: { after: 100 }
      })
    );

    // Title
    paragraphs.push(
      new Paragraph({
        text: submission.title,
        style: 'abstractTitle'
      })
    );

    // Authors
    paragraphs.push(
      new Paragraph({
        text: formattedAuthors,
        style: 'abstractAuthors'
      })
    );

    // Affiliations
    paragraphs.push(
      new Paragraph({
        text: formattedAffiliations,
        style: 'abstractAffiliations'
      })
    );

    // Abstract content (convert from HTML/markdown to plain text)
    const abstractText = this.htmlToPlainText(submission.abstractHtml || marked(submission.abstract));
    paragraphs.push(
      new Paragraph({
        text: abstractText,
        style: 'abstractContent'
      })
    );

    // Keywords
    if (submission.keywords.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Keywords: ',
              bold: true,
              size: 20,
              color: '666666'
            }),
            new TextRun({
              text: submission.keywords.join(', '),
              size: 20,
              color: '666666',
              italics: true
            })
          ],
          spacing: { after: 600 }
        })
      );
    } else {
      // Add spacing if no keywords
      paragraphs.push(
        new Paragraph({
          text: '',
          spacing: { after: 600 }
        })
      );
    }

    return paragraphs;
  }

  /**
   * Generate DOCX author index
   */
  private generateDOCXAuthorIndex(authors: { name: string; pages: number[] }[]): Paragraph[] {
    return authors.map(author =>
      new Paragraph({
        children: [
          new TextRun({
            text: author.name,
            size: 22
          }),
          new TextRun({
            text: `\t${author.pages.join(', ')}`,
            size: 22
          })
        ],
        spacing: { after: 50 }
      })
    );
  }

  /**
   * Generate DOCX keyword index
   */
  private generateDOCXKeywordIndex(keywords: { keyword: string; pages: number[] }[]): Paragraph[] {
    return keywords.map(keyword =>
      new Paragraph({
        children: [
          new TextRun({
            text: keyword.keyword,
            size: 22
          }),
          new TextRun({
            text: `\t${keyword.pages.join(', ')}`,
            size: 22
          })
        ],
        spacing: { after: 50 }
      })
    );
  }

  /**
   * Convert HTML to plain text for DOCX
   */
  private htmlToPlainText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Generate PDF with enhanced options and table of contents
   */
  async generatePDF(htmlContent: string, options: {
    includePageNumbers?: boolean;
    includeBookmarks?: boolean;
    printBackground?: boolean;
  } = {}): Promise<Buffer> {
    let browser: any = null;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600 });
      
      // Set content and wait for any dynamic content to load
      await page.setContent(htmlContent, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });

      // Generate PDF with enhanced settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: options.printBackground !== false,
        preferCSSPageSize: true,
        margin: {
          top: '2.5cm',
          right: '2.5cm',
          bottom: '2.5cm',
          left: '2.5cm'
        },
        displayHeaderFooter: options.includePageNumbers !== false,
        headerTemplate: '<div></div>', // Empty header
        footerTemplate: options.includePageNumbers !== false ? `
          <div style="font-size: 10px; text-align: center; width: 100%; margin: 0 2.5cm; color: #666;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        ` : '<div></div>',
        tagged: true, // For accessibility
        outline: options.includeBookmarks !== false // Generate PDF bookmarks
      });

      return pdfBuffer;

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}