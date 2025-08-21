export type SessionType = 'CHE' | 'CSE' | 'BIO' | 'MST' | 'PFD';
export type PresentationType = 'oral' | 'poster';
export type SubmissionStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected';

export interface Author {
  id?: string;
  name: string;
  affiliation: string;
  email: string;
  isCorresponding: boolean;
  authorOrder: number;
}

export interface CreateAuthorRequest {
  name: string;
  affiliation: string;
  email: string;
  isCorresponding: boolean;
  authorOrder: number;
}

export interface CreateSubmissionRequest {
  title: string;
  abstract: string;
  keywords: string[];
  sessionType: SessionType;
  presentationType: PresentationType;
  authors: CreateAuthorRequest[];
  correspondingAuthor: string;
}

export interface UpdateSubmissionRequest {
  title?: string;
  abstract?: string;
  keywords?: string[];
  sessionType?: SessionType;
  presentationType?: PresentationType;
  authors?: CreateAuthorRequest[];
  correspondingAuthor?: string;
}

export interface SubmissionResponse {
  id: string;
  userId: string;
  title: string;
  abstract: string;
  abstractHtml?: string;
  keywords: string[];
  sessionType: SessionType;
  presentationType: PresentationType;
  status: SubmissionStatus;
  submissionDate: Date;
  manuscriptPath?: string;
  correspondingAuthor: string;
  authors: Author[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface SessionInfo {
  type: SessionType;
  name: string;
  description: string;
  guidelines?: string;
}

export const SESSION_INFO: Record<SessionType, SessionInfo> = {
  CHE: {
    type: 'CHE',
    name: 'Computational Chemistry',
    description: 'Research in computational methods for chemical systems, molecular modeling, and quantum chemistry.',
    guidelines: 'Focus on computational approaches to chemical problems, including molecular dynamics, quantum calculations, and chemical informatics.'
  },
  CSE: {
    type: 'CSE',
    name: 'High Performance Computing/Computer Science/Engineering',
    description: 'Research in high-performance computing, computer science algorithms, and computational engineering.',
    guidelines: 'Include work on parallel computing, algorithms, software engineering, and computational methods in engineering.'
  },
  BIO: {
    type: 'BIO',
    name: 'Computational Biology/Bioinformatics/Biochemistry/Biophysics',
    description: 'Research in computational biology, bioinformatics tools, and computational approaches to biological systems.',
    guidelines: 'Cover computational methods in biology, genomics, proteomics, systems biology, and biophysical modeling.'
  },
  MST: {
    type: 'MST',
    name: 'Mathematics and Statistics',
    description: 'Research in mathematical modeling, statistical methods, and computational mathematics.',
    guidelines: 'Include mathematical modeling, statistical analysis, numerical methods, and applied mathematics.'
  },
  PFD: {
    type: 'PFD',
    name: 'Computational Physics/Computational Fluid Dynamics/Solid Mechanics',
    description: 'Research in computational physics, fluid dynamics simulations, and solid mechanics modeling.',
    guidelines: 'Focus on computational methods in physics, CFD simulations, finite element analysis, and materials modeling.'
  }
};

export const PRESENTATION_TYPE_INFO = {
  oral: {
    name: 'Oral Presentation',
    description: 'Present your work in a 15-20 minute talk followed by Q&A',
    duration: '15-20 minutes + Q&A'
  },
  poster: {
    name: 'Poster Presentation',
    description: 'Display your work on a poster during dedicated poster sessions',
    duration: 'Poster session (2-3 hours)'
  }
};

// Manuscript-related types
export interface ManuscriptInfo {
  hasManuscript: boolean;
  submissionId: string;
  filename?: string;
  size?: number;
  mimetype?: string;
  uploadDate?: Date;
}

export interface ManuscriptUploadResult {
  submissionId: string;
  manuscriptPath: string;
  originalName: string;
  size: number;
  uploadDate: Date;
}

export interface FileValidationError {
  code: string;
  message: string;
}