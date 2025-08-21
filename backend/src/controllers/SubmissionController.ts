import { Request, Response } from 'express';
import { SubmissionRepository } from '../models/SubmissionRepository.js';
import { UserRepository } from '../models/UserRepository.js';
import { ConferenceRepository } from '../models/ConferenceRepository.js';
import { EmailService } from '../services/EmailService.js';
import { FileService } from '../services/FileService.js';
import { submissionValidation } from '../models/validation.js';
import { processMarkdownForStorage } from '../utils/markdown.js';
import { CreateSubmissionRequest, UpdateSubmissionRequest, SubmissionResponse } from '../types/submission.js';
import { AuthenticatedRequest } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export class SubmissionController {
  private submissionRepository: SubmissionRepository;
  private userRepository: UserRepository;
  private conferenceRepository: ConferenceRepository;
  private emailService: EmailService;
  private fileService: FileService;

  constructor() {
    this.submissionRepository = new SubmissionRepository();
    this.userRepository = new UserRepository();
    this.conferenceRepository = new ConferenceRepository();
    this.emailService = new EmailService();
    this.fileService = new FileService();
  }

  async createSubmission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
        });
        return;
      }

      // Validate request data
      const { error, value } = submissionValidation.createSubmission.validate(req.body, { abortEarly: false });
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid submission data',
            details: error.details.map(detail => detail.message)
          }
        });
        return;
      }

      const submissionData: CreateSubmissionRequest = value;

      // Check if user exists and has appropriate permissions
      const user = await this.userRepository.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
        return;
      }

      // Check if user's payment is verified (requirement for submission)
      if (user.paymentStatus !== 'payment_verified') {
        res.status(403).json({
          success: false,
          error: { 
            code: 'PAYMENT_NOT_VERIFIED', 
            message: 'Payment must be verified before submitting abstracts' 
          }
        });
        return;
      }

      // Check submission deadline
      const conference = await this.conferenceRepository.getActiveConference();
      if (!conference) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_ACTIVE_CONFERENCE', message: 'No active conference found' }
        });
        return;
      }

      if (new Date() > conference.submissionDeadline) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'SUBMISSION_DEADLINE_PASSED', 
            message: 'Submission deadline has passed' 
          }
        });
        return;
      }

      // Process markdown content
      const { sanitizedMarkdown, html, plainText, wordCount } = processMarkdownForStorage(submissionData.abstract);

      // Generate unique submission ID
      const submissionId = uuidv4();

      // Validate that corresponding author is in the authors list
      const correspondingAuthorExists = submissionData.authors.some(
        author => author.email === submissionData.correspondingAuthor && author.isCorresponding
      );

      if (!correspondingAuthorExists) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CORRESPONDING_AUTHOR',
            message: 'Corresponding author must be included in the authors list and marked as corresponding'
          }
        });
        return;
      }

      // Create submission
      const submission = await this.submissionRepository.create({
        id: submissionId,
        userId,
        title: submissionData.title,
        abstract: sanitizedMarkdown,
        abstractHtml: html,
        keywords: submissionData.keywords,
        sessionType: submissionData.sessionType,
        presentationType: submissionData.presentationType,
        status: 'submitted',
        submissionDate: new Date(),
        correspondingAuthor: submissionData.correspondingAuthor,
        createdAt: new Date()
      });

      // Create authors
      for (const authorData of submissionData.authors) {
        await this.submissionRepository.createAuthor({
          id: uuidv4(),
          submissionId: submission.id,
          name: authorData.name,
          affiliation: authorData.affiliation,
          email: authorData.email,
          isCorresponding: authorData.isCorresponding,
          authorOrder: authorData.authorOrder,
          createdAt: new Date()
        });
      }

      // Get complete submission with authors
      const completeSubmission = await this.submissionRepository.findByIdWithAuthors(submission.id);
      if (!completeSubmission) {
        throw new Error('Failed to retrieve created submission');
      }

      // Send confirmation email
      try {
        await this.emailService.sendSubmissionConfirmation(
          user.email,
          user.firstName,
          completeSubmission
        );
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the submission if email fails
      }

      res.status(201).json({
        success: true,
        data: completeSubmission,
        message: 'Submission created successfully'
      });

    } catch (error) {
      console.error('Error creating submission:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create submission' }
      });
    }
  }

  async getUserSubmissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
        });
        return;
      }

      const submissions = await this.submissionRepository.findByUserId(userId);

      res.json({
        success: true,
        data: submissions
      });

    } catch (error) {
      console.error('Error fetching user submissions:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch submissions' }
      });
    }
  }

  async getSubmissionById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
        });
        return;
      }

      const submission = await this.submissionRepository.findByIdWithAuthors(id);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }

      // Check permissions: user must own the submission or be admin/reviewer
      if (submission.userId !== userId && !['admin', 'reviewer'].includes(userRole || '')) {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Access denied' }
        });
        return;
      }

      res.json({
        success: true,
        data: submission
      });

    } catch (error) {
      console.error('Error fetching submission:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch submission' }
      });
    }
  }

  async updateSubmission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
        });
        return;
      }

      // Validate request data
      const { error, value } = submissionValidation.updateSubmission.validate(req.body, { abortEarly: false });
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid submission data',
            details: error.details.map(detail => detail.message)
          }
        });
        return;
      }

      const updateData: UpdateSubmissionRequest = value;

      // Check if submission exists and user owns it
      const existingSubmission = await this.submissionRepository.findById(id);
      if (!existingSubmission) {
        res.status(404).json({
          success: false,
          error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }

      if (existingSubmission.userId !== userId) {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'You can only edit your own submissions' }
        });
        return;
      }

      // Check if submission is still editable
      if (existingSubmission.status !== 'submitted') {
        res.status(400).json({
          success: false,
          error: { 
            code: 'SUBMISSION_NOT_EDITABLE', 
            message: 'Submission cannot be edited in its current status' 
          }
        });
        return;
      }

      // Check submission deadline
      const conference = await this.conferenceRepository.getActiveConference();
      if (conference && new Date() > conference.submissionDeadline) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'SUBMISSION_DEADLINE_PASSED', 
            message: 'Submission deadline has passed' 
          }
        });
        return;
      }

      // Process markdown if abstract is being updated
      let processedData: any = { ...updateData };
      if (updateData.abstract) {
        const { sanitizedMarkdown, html } = processMarkdownForStorage(updateData.abstract);
        processedData.abstract = sanitizedMarkdown;
        processedData.abstractHtml = html;
      }

      // Update submission
      const updatedSubmission = await this.submissionRepository.update(id, {
        ...processedData,
        updatedAt: new Date()
      });

      // Update authors if provided
      if (updateData.authors) {
        // Delete existing authors
        await this.submissionRepository.deleteAuthorsBySubmissionId(id);
        
        // Create new authors
        for (const authorData of updateData.authors) {
          await this.submissionRepository.createAuthor({
            id: uuidv4(),
            submissionId: id,
            name: authorData.name,
            affiliation: authorData.affiliation,
            email: authorData.email,
            isCorresponding: authorData.isCorresponding,
            authorOrder: authorData.authorOrder,
            createdAt: new Date()
          });
        }
      }

      // Get complete updated submission
      const completeSubmission = await this.submissionRepository.findByIdWithAuthors(id);

      res.json({
        success: true,
        data: completeSubmission,
        message: 'Submission updated successfully'
      });

    } catch (error) {
      console.error('Error updating submission:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update submission' }
      });
    }
  }

  async deleteSubmission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
        });
        return;
      }

      // Check if submission exists and user owns it
      const submission = await this.submissionRepository.findById(id);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }

      if (submission.userId !== userId) {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'You can only delete your own submissions' }
        });
        return;
      }

      // Check if submission can be deleted (only if not under review or accepted)
      if (['under_review', 'accepted'].includes(submission.status)) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'SUBMISSION_NOT_DELETABLE', 
            message: 'Cannot delete submission that is under review or accepted' 
          }
        });
        return;
      }

      await this.submissionRepository.delete(id);

      res.json({
        success: true,
        message: 'Submission deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting submission:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete submission' }
      });
    }
  }

  async getAllSubmissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, sessionType, status } = req.query;
      
      const filters: any = {};
      if (sessionType) filters.sessionType = sessionType;
      if (status) filters.status = status;

      const submissions = await this.submissionRepository.findAll({
        page: Number(page),
        limit: Number(limit),
        filters
      });

      res.json({
        success: true,
        data: submissions
      });

    } catch (error) {
      console.error('Error fetching all submissions:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch submissions' }
      });
    }
  }

  async updateSubmissionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!['submitted', 'under_review', 'accepted', 'rejected'].includes(status)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Invalid submission status' }
        });
        return;
      }

      const submission = await this.submissionRepository.findById(id);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }

      const updatedSubmission = await this.submissionRepository.update(id, {
        status,
        updatedAt: new Date()
      });

      // Send notification email to author about status change
      try {
        const user = await this.userRepository.findById(submission.userId);
        if (user) {
          await this.emailService.sendSubmissionStatusUpdate(
            user.email,
            user.firstName,
            submission,
            status,
            adminNotes
          );
        }
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
      }

      res.json({
        success: true,
        data: updatedSubmission,
        message: 'Submission status updated successfully'
      });

    } catch (error) {
      console.error('Error updating submission status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update submission status' }
      });
    }
  }

  async getSubmissionsBySession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionType } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!['CHE', 'CSE', 'BIO', 'MST', 'PFD'].includes(sessionType)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_SESSION_TYPE', message: 'Invalid session type' }
        });
        return;
      }

      const submissions = await this.submissionRepository.findAll({
        page: Number(page),
        limit: Number(limit),
        filters: { sessionType }
      });

      res.json({
        success: true,
        data: submissions
      });

    } catch (error) {
      console.error('Error fetching submissions by session:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch submissions' }
      });
    }
  }

  async getSubmissionStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await this.submissionRepository.getStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error fetching submission statistics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch statistics' }
      });
    }
  }

  // Manuscript upload methods

  async uploadManuscript(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
        });
        return;
      }

      // Check if submission exists and user owns it
      const submission = await this.submissionRepository.findById(submissionId);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }

      if (submission.userId !== userId) {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'You can only upload manuscripts for your own submissions' }
        });
        return;
      }

      // Check if submission is in a state that allows manuscript upload
      if (!['submitted', 'under_review'].includes(submission.status)) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'INVALID_SUBMISSION_STATUS', 
            message: 'Manuscript can only be uploaded for submitted or under review submissions' 
          }
        });
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_FILE_UPLOADED', message: 'No manuscript file was uploaded' }
        });
        return;
      }

      // Validate uploaded file
      const validationError = await this.fileService.validateUploadedFile(req.file.path);
      if (validationError) {
        // Clean up invalid file
        await this.fileService.deleteFile(req.file.path);
        res.status(400).json({
          success: false,
          error: { code: validationError.code, message: validationError.message }
        });
        return;
      }

      // Scan for viruses
      const scanResult = await this.fileService.scanForViruses(req.file.path);
      if (!scanResult.clean) {
        // Clean up infected file
        await this.fileService.deleteFile(req.file.path);
        res.status(400).json({
          success: false,
          error: { 
            code: 'VIRUS_DETECTED', 
            message: `File rejected: ${scanResult.threat || 'Security threat detected'}` 
          }
        });
        return;
      }

      // Delete old manuscript if exists
      if (submission.manuscriptPath) {
        const oldPath = this.fileService.getAbsolutePath(submission.manuscriptPath);
        await this.fileService.deleteFile(oldPath);
      }

      // Organize file in proper directory structure
      const organizedPath = await this.fileService.organizeFile(
        req.file.path, 
        submissionId, 
        req.file.originalname
      );

      // Get relative path for database storage
      const relativePath = this.fileService.getRelativePath(organizedPath);

      // Update submission with manuscript path
      const updatedSubmission = await this.submissionRepository.update(submissionId, {
        manuscriptPath: relativePath,
        updatedAt: new Date()
      });

      if (!updatedSubmission) {
        // Clean up file if database update failed
        await this.fileService.deleteFile(organizedPath);
        res.status(500).json({
          success: false,
          error: { code: 'DATABASE_ERROR', message: 'Failed to update submission with manuscript path' }
        });
        return;
      }

      // Send notification email
      try {
        const user = await this.userRepository.findById(userId);
        if (user) {
          await this.emailService.sendManuscriptUploadConfirmation(
            user.email,
            user.firstName,
            submission,
            req.file.originalname
          );
        }
      } catch (emailError) {
        console.error('Failed to send manuscript upload confirmation email:', emailError);
      }

      res.json({
        success: true,
        data: {
          submissionId,
          manuscriptPath: relativePath,
          originalName: req.file.originalname,
          size: req.file.size,
          uploadDate: new Date()
        },
        message: 'Manuscript uploaded successfully'
      });

    } catch (error) {
      console.error('Error uploading manuscript:', error);
      
      // Clean up file if it exists
      if (req.file?.path) {
        await this.fileService.deleteFile(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to upload manuscript' }
      });
    }
  }

  async downloadManuscript(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
        });
        return;
      }

      // Get submission
      const submission = await this.submissionRepository.findById(submissionId);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }

      // Check permissions: user must own the submission or be admin/reviewer
      if (submission.userId !== userId && !['admin', 'reviewer'].includes(userRole || '')) {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Access denied' }
        });
        return;
      }

      // Check if manuscript exists
      if (!submission.manuscriptPath) {
        res.status(404).json({
          success: false,
          error: { code: 'MANUSCRIPT_NOT_FOUND', message: 'No manuscript found for this submission' }
        });
        return;
      }

      const filePath = this.fileService.getAbsolutePath(submission.manuscriptPath);
      const fileInfo = await this.fileService.getFileInfo(filePath);

      if (!fileInfo.exists) {
        res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Manuscript file not found on server' }
        });
        return;
      }

      // Set appropriate headers for file download
      res.setHeader('Content-Type', fileInfo.mimetype || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
      res.setHeader('Content-Length', fileInfo.size?.toString() || '0');

      // Stream file to response
      const fileStream = await fs.open(filePath, 'r');
      const readStream = fileStream.createReadStream();
      
      readStream.pipe(res);
      
      readStream.on('end', async () => {
        await fileStream.close();
      });

      readStream.on('error', async (error) => {
        console.error('Error streaming file:', error);
        await fileStream.close();
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: { code: 'FILE_STREAM_ERROR', message: 'Error downloading file' }
          });
        }
      });

    } catch (error) {
      console.error('Error downloading manuscript:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to download manuscript' }
        });
      }
    }
  }

  async deleteManuscript(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
        });
        return;
      }

      // Get submission
      const submission = await this.submissionRepository.findById(submissionId);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }

      // Check permissions: user must own the submission
      if (submission.userId !== userId) {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'You can only delete manuscripts for your own submissions' }
        });
        return;
      }

      // Check if submission allows manuscript deletion
      if (['accepted', 'rejected'].includes(submission.status)) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'INVALID_SUBMISSION_STATUS', 
            message: 'Cannot delete manuscript for accepted or rejected submissions' 
          }
        });
        return;
      }

      // Check if manuscript exists
      if (!submission.manuscriptPath) {
        res.status(404).json({
          success: false,
          error: { code: 'MANUSCRIPT_NOT_FOUND', message: 'No manuscript found for this submission' }
        });
        return;
      }

      // Delete file from filesystem
      const filePath = this.fileService.getAbsolutePath(submission.manuscriptPath);
      await this.fileService.deleteFile(filePath);

      // Update submission to remove manuscript path
      await this.submissionRepository.update(submissionId, {
        manuscriptPath: null,
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Manuscript deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting manuscript:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete manuscript' }
      });
    }
  }

  async getManuscriptInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
        });
        return;
      }

      // Get submission
      const submission = await this.submissionRepository.findById(submissionId);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }

      // Check permissions: user must own the submission or be admin/reviewer
      if (submission.userId !== userId && !['admin', 'reviewer'].includes(userRole || '')) {
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Access denied' }
        });
        return;
      }

      // Check if manuscript exists
      if (!submission.manuscriptPath) {
        res.json({
          success: true,
          data: {
            hasManuscript: false,
            submissionId
          }
        });
        return;
      }

      const filePath = this.fileService.getAbsolutePath(submission.manuscriptPath);
      const fileInfo = await this.fileService.getFileInfo(filePath);

      res.json({
        success: true,
        data: {
          hasManuscript: fileInfo.exists,
          submissionId,
          filename: fileInfo.filename,
          size: fileInfo.size,
          mimetype: fileInfo.mimetype,
          uploadDate: submission.updatedAt || submission.createdAt
        }
      });

    } catch (error) {
      console.error('Error getting manuscript info:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get manuscript information' }
      });
    }
  }

  // Get multer middleware for file uploads
  public getUploadMiddleware() {
    return this.fileService.getMulterConfig().single('manuscript');
  }
}