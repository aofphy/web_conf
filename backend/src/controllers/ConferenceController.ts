import { Request, Response } from 'express';
import { ConferenceRepository } from '../models/ConferenceRepository.js';
import { 
  CreateConferenceRequest, 
  UpdateConferenceRequest,
  ParticipantType
} from '../types/index.js';
import { validateConferenceData, validateRegistrationFeeData } from '../models/validation.js';
import { CacheService } from '../services/CacheService.js';
import { CacheInvalidator } from '../middleware/cache.js';

export class ConferenceController {
  // Get active conference with all details
  static async getActiveConference(_req: Request, res: Response) {
    try {
      const cache = CacheService.getInstance();
      const cacheKey = CacheService.keys.conference();
      
      // Try to get from cache first
      const cachedConference = await cache.get(cacheKey);
      if (cachedConference) {
        res.set('X-Cache', 'HIT');
        return res.json({
          success: true,
          data: cachedConference
        });
      }

      const conference = await ConferenceRepository.findActiveConference();
      
      if (!conference) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONFERENCE_NOT_FOUND',
            message: 'No active conference found'
          }
        });
      }

      // Cache the result
      await cache.set(cacheKey, conference, CacheService.TTL.LONG);
      res.set('X-Cache', 'MISS');

      return res.json({
        success: true,
        data: conference
      });
    } catch (error) {
      console.error('Error fetching active conference:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch conference information'
        }
      });
    }
  }

  // Get conference by ID
  static async getConferenceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const conference = await ConferenceRepository.findById(id);
      
      if (!conference) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONFERENCE_NOT_FOUND',
            message: 'Conference not found'
          }
        });
      }

      return res.json({
        success: true,
        data: conference
      });
    } catch (error) {
      console.error('Error fetching conference:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch conference'
        }
      });
    }
  }

  // Create new conference (admin only)
  static async createConference(req: Request, res: Response) {
    try {
      const conferenceData: CreateConferenceRequest = req.body;
      
      // Validate conference data
      const validation = validateConferenceData(conferenceData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid conference data',
            details: validation.errors
          }
        });
      }

      const conference = await ConferenceRepository.create(conferenceData);
      
      return res.status(201).json({
        success: true,
        data: conference
      });
    } catch (error) {
      console.error('Error creating conference:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create conference'
        }
      });
    }
  }

  // Update conference (admin only)
  static async updateConference(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateConferenceRequest = req.body;
      
      const conference = await ConferenceRepository.update(id, updateData);
      
      if (!conference) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONFERENCE_NOT_FOUND',
            message: 'Conference not found'
          }
        });
      }

      return res.json({
        success: true,
        data: conference
      });
    } catch (error) {
      console.error('Error updating conference:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update conference'
        }
      });
    }
  }

  // Get conference sessions
  static async getConferenceSessions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessions = await ConferenceRepository.getConferenceSessions(id);
      
      return res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      console.error('Error fetching conference sessions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch conference sessions'
        }
      });
    }
  }

  // Get registration fees for conference
  static async getRegistrationFees(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const fees = await ConferenceRepository.getRegistrationFees(id);
      
      return res.json({
        success: true,
        data: fees
      });
    } catch (error) {
      console.error('Error fetching registration fees:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch registration fees'
        }
      });
    }
  }

  // Get payment instructions
  static async getPaymentInstructions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const instructions = await ConferenceRepository.getPaymentInstructions(id);
      
      if (!instructions) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PAYMENT_INSTRUCTIONS_NOT_FOUND',
            message: 'Payment instructions not found for this conference'
          }
        });
      }

      return res.json({
        success: true,
        data: instructions
      });
    } catch (error) {
      console.error('Error fetching payment instructions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch payment instructions'
        }
      });
    }
  }

  // Update registration fee for specific participant type (admin only)
  static async updateRegistrationFee(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { participantType } = req.params;
      const feeData = req.body;
      
      // Validate registration fee data
      const validation = validateRegistrationFeeData(feeData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration fee data',
            details: validation.errors
          }
        });
      }

      const fee = await ConferenceRepository.upsertRegistrationFee(
        id, 
        participantType as ParticipantType, 
        feeData
      );
      
      return res.json({
        success: true,
        data: fee
      });
    } catch (error) {
      console.error('Error updating registration fee:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update registration fee'
        }
      });
    }
  }
}