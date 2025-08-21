import { Request, Response } from 'express';
import { SessionRepository } from '../models/SessionRepository.js';
import { validateSessionData } from '../models/validation.js';

export class SessionController {
  // Create a new session for a conference
  static async createSession(req: Request, res: Response) {
    try {
      const { conferenceId } = req.params;
      const sessionData = req.body;
      
      // Validate session data
      const validation = validateSessionData(sessionData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid session data',
            details: validation.errors
          }
        });
      }

      const session = await SessionRepository.create(conferenceId, sessionData);
      
      return res.status(201).json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error creating session:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create session'
        }
      });
    }
  }

  // Update session
  static async updateSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const session = await SessionRepository.update(id, updateData);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        });
      }

      return res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error updating session:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update session'
        }
      });
    }
  }

  // Delete session
  static async deleteSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const deleted = await SessionRepository.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        });
      }

      return res.json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete session'
        }
      });
    }
  }

  // Add schedule to session
  static async addSessionSchedule(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const scheduleData = req.body;
      
      const schedule = await SessionRepository.addSchedule(sessionId, scheduleData);
      
      return res.status(201).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      console.error('Error adding session schedule:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add session schedule'
        }
      });
    }
  }

  // Update session schedule
  static async updateSessionSchedule(req: Request, res: Response) {
    try {
      const { scheduleId } = req.params;
      const updateData = req.body;
      
      const schedule = await SessionRepository.updateSchedule(scheduleId, updateData);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SCHEDULE_NOT_FOUND',
            message: 'Session schedule not found'
          }
        });
      }

      return res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      console.error('Error updating session schedule:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update session schedule'
        }
      });
    }
  }

  // Delete session schedule
  static async deleteSessionSchedule(req: Request, res: Response) {
    try {
      const { scheduleId } = req.params;
      
      const deleted = await SessionRepository.deleteSchedule(scheduleId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SCHEDULE_NOT_FOUND',
            message: 'Session schedule not found'
          }
        });
      }

      return res.json({
        success: true,
        message: 'Session schedule deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting session schedule:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete session schedule'
        }
      });
    }
  }
}