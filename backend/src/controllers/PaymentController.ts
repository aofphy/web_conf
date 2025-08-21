import { Request, Response } from 'express';
import { PaymentRepository } from '../models/PaymentRepository.js';
import { PaymentInstructionsRepository } from '../models/PaymentInstructionsRepository.js';
import { UserRepository } from '../models/UserRepository.js';
import { FileService } from '../services/FileService.js';
import { EmailService } from '../services/EmailService.js';
import path from 'path';

export class PaymentController {
  private static emailService = new EmailService();
  // Get payment information and instructions for a user
  static async getPaymentInfo(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }

      // Get user information to determine registration fee
      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Get payment instructions (assuming there's one active conference)
      const paymentInstructions = await PaymentInstructionsRepository.getActive();
      if (!paymentInstructions) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PAYMENT_INSTRUCTIONS_NOT_FOUND',
            message: 'Payment instructions not available'
          }
        });
      }

      // Get user's payment records
      const paymentRecords = await PaymentRepository.findByUserId(userId);
      const latestPayment = await PaymentRepository.getLatestByUserId(userId);

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            participantType: user.participantType,
            registrationFee: user.registrationFee,
            paymentStatus: user.paymentStatus
          },
          paymentInstructions: {
            bankDetails: {
              bankName: paymentInstructions.bankName,
              accountName: paymentInstructions.accountName,
              accountNumber: paymentInstructions.accountNumber,
              swiftCode: paymentInstructions.swiftCode,
              routingNumber: paymentInstructions.routingNumber
            },
            acceptedMethods: paymentInstructions.acceptedMethods,
            instructions: paymentInstructions.instructions,
            supportContact: paymentInstructions.supportContact
          },
          paymentRecords,
          latestPayment
        }
      });
    } catch (error) {
      console.error('Error getting payment info:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get payment information'
        }
      });
    }
  }

  // Submit proof of payment
  static async submitProofOfPayment(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }

      const { amount, currency, paymentMethod, transactionReference } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: 'Proof of payment file is required'
          }
        });
      }

      // Validate file type (images and PDFs only)
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'application/pdf'
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only JPEG, PNG, and PDF files are allowed'
          }
        });
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size must be less than 5MB'
          }
        });
      }

      // Get user to validate registration fee
      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Validate amount matches registration fee
      if (parseFloat(amount) !== user.registrationFee) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: `Payment amount must match registration fee of ${user.registrationFee} ${currency || 'USD'}`
          }
        });
      }

      // Create payment record
      const paymentData = {
        amount: parseFloat(amount),
        currency: currency || 'USD',
        paymentMethod: paymentMethod || 'bank_transfer',
        transactionReference
      };

      const payment = await PaymentRepository.create(userId, paymentData);

      // Save proof of payment file
      const fileExtension = path.extname(file.originalname);
      const fileName = `payment_proof_${payment.id}${fileExtension}`;
      const filePath = await FileService.savePaymentProof(file, fileName);

      // Update payment record with file path
      const updatedPayment = await PaymentRepository.updateProofPath(payment.id, filePath);

      // Update user payment status
      await UserRepository.updatePaymentStatus(userId, 'payment_submitted');

      return res.json({
        success: true,
        data: updatedPayment,
        message: 'Proof of payment submitted successfully. Your payment will be reviewed by administrators.'
      });
    } catch (error) {
      console.error('Error submitting proof of payment:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to submit proof of payment'
        }
      });
    }
  }

  // Get user's payment status and history
  static async getPaymentStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }

      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      const paymentRecords = await PaymentRepository.findByUserId(userId);
      const latestPayment = await PaymentRepository.getLatestByUserId(userId);

      return res.json({
        success: true,
        data: {
          paymentStatus: user.paymentStatus,
          registrationFee: user.registrationFee,
          paymentRecords,
          latestPayment,
          canSubmitPayment: user.paymentStatus === 'not_paid' || user.paymentStatus === 'payment_rejected'
        }
      });
    } catch (error) {
      console.error('Error getting payment status:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get payment status'
        }
      });
    }
  }

  // Download proof of payment file
  static async downloadProofOfPayment(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { paymentId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }

      const payment = await PaymentRepository.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: 'Payment record not found'
          }
        });
      }

      // Check if user owns this payment or is admin
      const user = await UserRepository.findById(userId);
      if (payment.userId !== userId && user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to access this file'
          }
        });
      }

      if (!payment.proofOfPaymentPath) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Proof of payment file not found'
          }
        });
      }

      // Download file using FileService
      await FileService.downloadPaymentProof(payment.proofOfPaymentPath, res);
      return;
    } catch (error) {
      console.error('Error downloading proof of payment:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to download proof of payment'
        }
      });
    }
  }

  // Admin methods for payment verification

  // Get all pending payments for admin review
  static async getPendingPayments(req: Request, res: Response) {
    try {
      const pendingPayments = await PaymentRepository.getPendingPayments();

      return res.json({
        success: true,
        data: pendingPayments
      });
    } catch (error) {
      console.error('Error getting pending payments:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get pending payments'
        }
      });
    }
  }

  // Verify a payment (admin only)
  static async verifyPayment(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const { adminNotes } = req.body;
      const adminUserId = req.user?.userId;

      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Admin authentication required'
          }
        });
      }

      // Check if payment exists
      const payment = await PaymentRepository.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: 'Payment record not found'
          }
        });
      }

      // Update payment status to verified
      const updatedPayment = await PaymentRepository.updateStatus(
        paymentId,
        'verified',
        adminUserId,
        adminNotes
      );

      if (!updatedPayment) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update payment status'
          }
        });
      }

      // Update user payment status to verified
      await UserRepository.updatePaymentStatus(payment.userId, 'payment_verified');

      // Send payment verification email
      try {
        const user = await UserRepository.findById(payment.userId);
        if (user) {
          await this.emailService.sendPaymentVerificationEmail(
            user.email,
            `${user.firstName} ${user.lastName}`,
            updatedPayment
          );
        }
      } catch (emailError) {
        console.error('Failed to send payment verification email:', emailError);
      }

      return res.json({
        success: true,
        data: updatedPayment,
        message: 'Payment verified successfully'
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify payment'
        }
      });
    }
  }

  // Reject a payment (admin only)
  static async rejectPayment(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const { adminNotes } = req.body;
      const adminUserId = req.user?.userId;

      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Admin authentication required'
          }
        });
      }

      if (!adminNotes || adminNotes.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ADMIN_NOTES_REQUIRED',
            message: 'Admin notes are required when rejecting a payment'
          }
        });
      }

      // Check if payment exists
      const payment = await PaymentRepository.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: 'Payment record not found'
          }
        });
      }

      // Update payment status to rejected
      const updatedPayment = await PaymentRepository.updateStatus(
        paymentId,
        'rejected',
        adminUserId,
        adminNotes
      );

      if (!updatedPayment) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update payment status'
          }
        });
      }

      // Update user payment status to rejected
      await UserRepository.updatePaymentStatus(payment.userId, 'payment_rejected');

      // Send payment rejection email
      try {
        const user = await UserRepository.findById(payment.userId);
        if (user) {
          await this.emailService.sendPaymentRejectionEmail(
            user.email,
            `${user.firstName} ${user.lastName}`,
            updatedPayment,
            adminNotes
          );
        }
      } catch (emailError) {
        console.error('Failed to send payment rejection email:', emailError);
      }

      return res.json({
        success: true,
        data: updatedPayment,
        message: 'Payment rejected successfully'
      });
    } catch (error) {
      console.error('Error rejecting payment:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reject payment'
        }
      });
    }
  }

  // Get payment statistics for admin dashboard
  static async getPaymentStatistics(_req: Request, res: Response) {
    try {
      const stats = await PaymentRepository.getPaymentStats();

      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting payment statistics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get payment statistics'
        }
      });
    }
  }

  // Get all payments with filters (admin only)
  static async getAllPayments(req: Request, res: Response) {
    try {
      const { status } = req.query;

      let payments;
      if (status && typeof status === 'string') {
        payments = await PaymentRepository.findByStatus(status as any);
      } else {
        // Get all payments - we'll need to add this method to PaymentRepository
        const [pending, verified, rejected] = await Promise.all([
          PaymentRepository.findByStatus('pending'),
          PaymentRepository.findByStatus('verified'),
          PaymentRepository.findByStatus('rejected')
        ]);
        payments = [...pending, ...verified, ...rejected].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

      return res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      console.error('Error getting all payments:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get payments'
        }
      });
    }
  }
}