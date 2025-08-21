import React, { useState, useEffect } from 'react';
import { ManuscriptUpload } from './ManuscriptUpload';
import { submissionApi } from '../services/submissionApi';
import { ManuscriptInfo, SubmissionResponse } from '../types/submission';

interface ManuscriptManagerProps {
  submission: SubmissionResponse;
  onManuscriptUpdate?: (hasManuscript: boolean) => void;
  readOnly?: boolean;
}

export const ManuscriptManager: React.FC<ManuscriptManagerProps> = ({
  submission,
  onManuscriptUpdate,
  readOnly = false
}) => {
  const [manuscriptInfo, setManuscriptInfo] = useState<ManuscriptInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load manuscript info on component mount
  useEffect(() => {
    loadManuscriptInfo();
  }, [submission.id]);

  const loadManuscriptInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await submissionApi.getManuscriptInfo(submission.id);
      if (response.success && response.data) {
        setManuscriptInfo(response.data);
        onManuscriptUpdate?.(response.data.hasManuscript);
      } else {
        setError(response.error?.message || 'Failed to load manuscript information');
      }
    } catch (error: any) {
      console.error('Error loading manuscript info:', error);
      setError('Failed to load manuscript information');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (info: ManuscriptInfo) => {
    setManuscriptInfo(info);
    setSuccess('Manuscript uploaded successfully!');
    setError(null);
    onManuscriptUpdate?.(info.hasManuscript);
    
    // Clear success message after 5 seconds
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
  };

  const handleDownload = async () => {
    if (!manuscriptInfo?.hasManuscript) return;

    try {
      setError(null);
      const blob = await submissionApi.downloadManuscript(submission.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = manuscriptInfo.filename || `manuscript_${submission.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
      setError('Failed to download manuscript');
    }
  };

  const handleDelete = async () => {
    if (!manuscriptInfo?.hasManuscript) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this manuscript? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      setError(null);
      
      const response = await submissionApi.deleteManuscript(submission.id);
      if (response.success) {
        setManuscriptInfo({ hasManuscript: false, submissionId: submission.id });
        setSuccess('Manuscript deleted successfully');
        onManuscriptUpdate?.(false);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(response.error?.message || 'Failed to delete manuscript');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      setError('Failed to delete manuscript');
    } finally {
      setIsDeleting(false);
    }
  };

  const canUploadManuscript = () => {
    return ['submitted', 'under_review'].includes(submission.status) && !readOnly;
  };

  const canDeleteManuscript = () => {
    return !['accepted', 'rejected'].includes(submission.status) && !readOnly;
  };

  if (loading) {
    return (
      <div className="manuscript-manager loading">
        <div className="loading-spinner">⏳</div>
        <div>Loading manuscript information...</div>
      </div>
    );
  }

  return (
    <div className="manuscript-manager">
      <div className="section-header">
        <h3>📄 Manuscript Submission</h3>
        <div className="section-description">
          Upload your full manuscript in PDF format. This is optional but recommended for review.
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      <ManuscriptUpload
        submissionId={submission.id}
        manuscriptInfo={manuscriptInfo}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
        disabled={!canUploadManuscript()}
      />

      {manuscriptInfo?.hasManuscript && (
        <div className="manuscript-actions">
          <button
            type="button"
            onClick={handleDownload}
            className="btn btn-primary"
          >
            📥 Download Manuscript
          </button>

          {canDeleteManuscript() && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : '🗑️ Delete Manuscript'}
            </button>
          )}
        </div>
      )}

      {!canUploadManuscript() && (
        <div className="upload-restrictions">
          <div className="restriction-info">
            {submission.status === 'accepted' && (
              <span>✅ Manuscript upload is no longer available for accepted submissions</span>
            )}
            {submission.status === 'rejected' && (
              <span>❌ Manuscript upload is no longer available for rejected submissions</span>
            )}
            {readOnly && (
              <span>👁️ Viewing in read-only mode</span>
            )}
          </div>
        </div>
      )}

      <div className="manuscript-guidelines">
        <h4>Manuscript Guidelines</h4>
        <ul>
          <li>File format: PDF only</li>
          <li>Maximum file size: 10MB</li>
          <li>Recommended length: 4-8 pages</li>
          <li>Include all figures and tables</li>
          <li>Use standard academic formatting</li>
          <li>You can replace your manuscript at any time before final review</li>
        </ul>
      </div>

      <style jsx>{`
        .manuscript-manager {
          margin: 20px 0;
        }

        .manuscript-manager.loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
          color: #666;
        }

        .loading-spinner {
          font-size: 2rem;
          margin-bottom: 10px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .section-header {
          margin-bottom: 20px;
        }

        .section-header h3 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 1.25rem;
        }

        .section-description {
          color: #666;
          font-size: 0.875rem;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alert-error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .alert-success {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }

        .alert-icon {
          font-size: 1.1rem;
        }

        .manuscript-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .upload-restrictions {
          margin-top: 16px;
          padding: 12px;
          background-color: #f8f9fa;
          border-radius: 6px;
          border-left: 4px solid #6c757d;
        }

        .restriction-info {
          color: #495057;
          font-size: 0.875rem;
        }

        .manuscript-guidelines {
          margin-top: 24px;
          padding: 16px;
          background-color: #f8f9fa;
          border-radius: 6px;
          border-left: 4px solid #007bff;
        }

        .manuscript-guidelines h4 {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 1rem;
        }

        .manuscript-guidelines ul {
          margin: 0;
          padding-left: 20px;
          color: #555;
        }

        .manuscript-guidelines li {
          margin-bottom: 4px;
          font-size: 0.875rem;
        }

        .btn {
          padding: 10px 16px;
          border: 1px solid transparent;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          color: #fff;
          background-color: #007bff;
          border-color: #007bff;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
          border-color: #0056b3;
        }

        .btn-danger {
          color: #fff;
          background-color: #dc3545;
          border-color: #dc3545;
        }

        .btn-danger:hover:not(:disabled) {
          background-color: #c82333;
          border-color: #bd2130;
        }

        @media (max-width: 768px) {
          .manuscript-actions {
            flex-direction: column;
          }

          .btn {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};