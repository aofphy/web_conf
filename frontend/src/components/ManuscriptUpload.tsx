import React, { useState, useRef, useCallback } from 'react';
import { submissionApi } from '../services/submissionApi';
import { ManuscriptInfo, FileValidationError } from '../types/submission';

interface ManuscriptUploadProps {
  submissionId: string;
  manuscriptInfo: ManuscriptInfo | null;
  onUploadSuccess: (info: ManuscriptInfo) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
}

export const ManuscriptUpload: React.FC<ManuscriptUploadProps> = ({
  submissionId,
  manuscriptInfo,
  onUploadSuccess,
  onUploadError,
  disabled = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): FileValidationError | null => {
    // Check file type
    if (file.type !== 'application/pdf') {
      return {
        code: 'INVALID_FILE_TYPE',
        message: 'Only PDF files are allowed'
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        code: 'FILE_TOO_LARGE',
        message: 'File size must be less than 10MB'
      };
    }

    // Check filename
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return {
        code: 'INVALID_FILE_EXTENSION',
        message: 'File must have a .pdf extension'
      };
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    if (disabled) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      onUploadError(validationError.message);
      return;
    }

    setIsUploading(true);

    try {
      const response = await submissionApi.uploadManuscript(submissionId, file);
      
      if (response.success && response.data) {
        // Fetch updated manuscript info
        const infoResponse = await submissionApi.getManuscriptInfo(submissionId);
        if (infoResponse.success && infoResponse.data) {
          onUploadSuccess(infoResponse.data);
        }
      } else {
        onUploadError(response.error?.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      onUploadError(
        error.response?.data?.error?.message || 
        'Failed to upload manuscript. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);

    if (disabled) return;

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [disabled, submissionId]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="manuscript-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {manuscriptInfo?.hasManuscript ? (
        <div className="manuscript-info">
          <div className="manuscript-details">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="filename">{manuscriptInfo.filename}</div>
              <div className="file-meta">
                {manuscriptInfo.size && formatFileSize(manuscriptInfo.size)}
                {manuscriptInfo.uploadDate && (
                  <span> • Uploaded {new Date(manuscriptInfo.uploadDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
          
          {!disabled && (
            <div className="manuscript-actions">
              <button
                type="button"
                onClick={openFileDialog}
                className="btn btn-secondary"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Replace File'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`upload-zone ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
        >
          <div className="upload-content">
            {isUploading ? (
              <>
                <div className="upload-spinner">⏳</div>
                <div className="upload-text">Uploading manuscript...</div>
              </>
            ) : (
              <>
                <div className="upload-icon">📄</div>
                <div className="upload-text">
                  <strong>Click to upload</strong> or drag and drop your manuscript
                </div>
                <div className="upload-hint">
                  PDF files only, up to 10MB
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .manuscript-upload {
          margin: 20px 0;
        }

        .manuscript-info {
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          padding: 20px;
          background-color: #f8f9fa;
        }

        .manuscript-details {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
        }

        .file-icon {
          font-size: 2rem;
          color: #dc3545;
        }

        .file-info {
          flex: 1;
        }

        .filename {
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .file-meta {
          font-size: 0.875rem;
          color: #666;
        }

        .manuscript-actions {
          display: flex;
          gap: 10px;
        }

        .upload-zone {
          border: 2px dashed #dee2e6;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: #fafbfc;
        }

        .upload-zone:hover:not(.disabled) {
          border-color: #007bff;
          background-color: #f8f9ff;
        }

        .upload-zone.drag-active {
          border-color: #007bff;
          background-color: #e7f3ff;
        }

        .upload-zone.disabled {
          cursor: not-allowed;
          opacity: 0.6;
          background-color: #f5f5f5;
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .upload-icon {
          font-size: 3rem;
          color: #6c757d;
        }

        .upload-spinner {
          font-size: 2rem;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .upload-text {
          font-size: 1rem;
          color: #333;
        }

        .upload-hint {
          font-size: 0.875rem;
          color: #666;
        }

        .btn {
          padding: 8px 16px;
          border: 1px solid transparent;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          color: #6c757d;
          background-color: #fff;
          border-color: #6c757d;
        }

        .btn-secondary:hover:not(:disabled) {
          color: #fff;
          background-color: #6c757d;
        }
      `}</style>
    </div>
  );
};