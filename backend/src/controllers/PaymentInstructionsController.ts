import { Request, Response } from 'express';
import { PaymentInstructionsRepository } from '../models/PaymentInstructionsRepository.js';

export class PaymentInstructionsController {
  // Create or update payment instructions for a conference
  static async upsertPaymentInstructions(req: Request, res: Response) {
    try {
      const { conferenceId } = req.params;
      const instructionsData = req.body;
      
      const instructions = await PaymentInstructionsRepository.upsert(conferenceId, instructionsData);
      
      return res.json({
        success: true,
        data: instructions
      });
    } catch (error) {
      console.error('Error updating payment instructions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update payment instructions'
        }
      });
    }
  }

  // Delete payment instructions
  static async deletePaymentInstructions(req: Request, res: Response) {
    try {
      const { conferenceId } = req.params;
      
      const deleted = await PaymentInstructionsRepository.delete(conferenceId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PAYMENT_INSTRUCTIONS_NOT_FOUND',
            message: 'Payment instructions not found'
          }
        });
      }

      return res.json({
        success: true,
        message: 'Payment instructions deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting payment instructions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete payment instructions'
        }
      });
    }
  }
}