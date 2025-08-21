import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  abstractBookApi,
  AbstractBookFilters,
  AbstractBookTemplate,
  AbstractBookPreview,
  FilterOptions,
  GenerateRequest,
  SavedAbstractBook
} from '../services/abstractBookApi';

interface AbstractBookGeneratorProps {
  onClose?: () => void;
}

export const AbstractBookGenerator: React.FC<AbstractBookGeneratorProps> = ({ onClose }) => {
  // State management
  const [filters, setFilters] = useState<AbstractBookFilters>({
    sessionTypes: [],
    presentationTypes: [],
    status: 'accepted',
    includeKeywords: true,
    includeAuthors: true
  });
  
  const [template, setTemplate] = useState<AbstractBookTemplate | null>(null);
  const [preview, setPreview] = useState<AbstractBookPreview | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [savedBooks, setSavedBooks] = useState<SavedAbstractBook[]>([]);
  
  const [format, setFormat] = useState<'html' | 'pdf' | 'docx'>('pdf');
  const [filename, setFilename] = useState('');
  const [pdfOptions, setPdfOptions] = useState({
    includePageNumbers: true,
    includeBookmarks: true,
    printBackground: true
  });
  
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [filterOpts, defaultTemplate, savedBooksList] = await Promise.all([
        abstractBookApi.getFilterOptions(),
        abstractBookApi.getDefaultTemplate(),
        abstractBookApi.listSavedAbstractBooks()
      ]);
      
      setFilterOptions(filterOpts);
      setTemplate(defaultTemplate);
      setSavedBooks(savedBooksList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  // Preview abstract book
  const handlePreview = async () => {
    try {
      setPreviewLoading(true);
      setError(null);
      const previewData = await abstractBookApi.previewAbstractBook(filters);
      setPreview(previewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview abstract book');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Generate and download abstract book
  const handleGenerate = async () => {
    if (!template) {
      setError('Template not loaded');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const request: GenerateRequest = {
        format,
        filters,
        template,
        ...(format === 'pdf' && { pdfOptions })
      };

      const blob = await abstractBookApi.generateAbstractBook(request);
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const defaultFilename = `abstract-book-${timestamp}.${format}`;
      
      abstractBookApi.downloadBlob(blob, defaultFilename);
      setSuccess(`Abstract book generated and downloaded successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate abstract book');
    } finally {
      setLoading(false);
    }
  };

  // Save abstract book to server
  const handleSave = async () => {
    if (!template) {
      setError('Template not loaded');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const request = {
        format,
        filters,
        template,
        filename: filename || undefined,
        ...(format === 'pdf' && { pdfOptions })
      };

      const result = await abstractBookApi.saveAbstractBook(request);
      setSuccess(`Abstract book saved as ${result.filename}`);
      
      // Refresh saved books list
      const updatedBooks = await abstractBookApi.listSavedAbstractBooks();
      setSavedBooks(updatedBooks);
      
      // Clear filename
      setFilename('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save abstract book');
    } finally {
      setLoading(false);
    }
  };

  // Download saved abstract book
  const handleDownloadSaved = async (savedFilename: string) => {
    try {
      const blob = await abstractBookApi.downloadAbstractBook(savedFilename);
      abstractBookApi.downloadBlob(blob, savedFilename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download saved abstract book');
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof AbstractBookFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPreview(null); // Clear preview when filters change
  };

  // Handle template changes
  const handleTemplateChange = (key: string, value: any) => {
    if (!template) return;
    
    const keys = key.split('.');
    const newTemplate = { ...template };
    let current: any = newTemplate;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setTemplate(newTemplate);
  };

  if (loading && !filterOptions) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Abstract Book Generator
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Filters Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Filters & Options
              </Typography>
              
              {/* Session Types */}
              <FormControl fullWidth margin="normal">
                <InputLabel>Session Types</InputLabel>
                <Select
                  multiple
                  value={filters.sessionTypes || []}
                  onChange={(e) => handleFilterChange('sessionTypes', e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {filterOptions?.sessionTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Presentation Types */}
              <FormControl fullWidth margin="normal">
                <InputLabel>Presentation Types</InputLabel>
                <Select
                  multiple
                  value={filters.presentationTypes || []}
                  onChange={(e) => handleFilterChange('presentationTypes', e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {filterOptions?.presentationTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Status */}
              <FormControl fullWidth margin="normal">
                <InputLabel>Submission Status</InputLabel>
                <Select
                  value={filters.status || 'accepted'}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  {filterOptions?.statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Include Options */}
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.includeKeywords || false}
                      onChange={(e) => handleFilterChange('includeKeywords', e.target.checked)}
                    />
                  }
                  label="Include Keywords"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.includeAuthors || false}
                      onChange={(e) => handleFilterChange('includeAuthors', e.target.checked)}
                    />
                  }
                  label="Include Author Index"
                />
              </FormGroup>

              {/* Format Selection */}
              <FormControl fullWidth margin="normal">
                <InputLabel>Output Format</InputLabel>
                <Select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'html' | 'pdf' | 'docx')}
                >
                  {filterOptions?.formatOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* PDF Options */}
              {format === 'pdf' && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>PDF Options</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={pdfOptions.includePageNumbers}
                            onChange={(e) => setPdfOptions(prev => ({ ...prev, includePageNumbers: e.target.checked }))}
                          />
                        }
                        label="Include Page Numbers"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={pdfOptions.includeBookmarks}
                            onChange={(e) => setPdfOptions(prev => ({ ...prev, includeBookmarks: e.target.checked }))}
                          />
                        }
                        label="Include Bookmarks"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={pdfOptions.printBackground}
                            onChange={(e) => setPdfOptions(prev => ({ ...prev, printBackground: e.target.checked }))}
                          />
                        }
                        label="Print Background Colors"
                      />
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Actions */}
              <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  disabled={previewLoading}
                >
                  {previewLoading ? <CircularProgress size={20} /> : 'Preview'}
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleGenerate}
                  disabled={loading || !preview}
                >
                  {loading ? <CircularProgress size={20} /> : 'Generate'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Preview & Template Section */}
        <Grid item xs={12} md={6}>
          {/* Preview */}
          {preview && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preview
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Abstracts: {preview.totalAbstracts}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Session Breakdown:
                </Typography>
                {preview.sessionSummary.map((session) => (
                  <Box key={session.sessionType} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      {session.sessionName}: {session.abstractCount} abstracts
                    </Typography>
                  </Box>
                ))}
                
                {preview.hasIndexes && (
                  <Typography variant="body2" color="text.secondary">
                    Includes author and keyword indexes
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* Template Customization */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Template Settings
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setTemplateDialogOpen(true)}
                >
                  Customize
                </Button>
              </Box>
              
              {template && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Title:</strong> {template.title}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Conference:</strong> {template.coverPage.conferenceTitle}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Font:</strong> {template.styling.fontFamily}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Save Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Save Abstract Book
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <TextField
                  label="Filename (optional)"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="abstract-book-2024"
                  size="small"
                />
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={loading || !preview}
                >
                  Save to Server
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Saved Books Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Saved Abstract Books
                </Typography>
                <IconButton onClick={loadInitialData} size="small">
                  <RefreshIcon />
                </IconButton>
              </Box>
              
              {savedBooks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No saved abstract books found.
                </Typography>
              ) : (
                <List>
                  {savedBooks.map((book) => (
                    <ListItem key={book.filename} divider>
                      <ListItemText
                        primary={book.filename}
                        secondary={`${book.format.toUpperCase()} • ${(book.size / 1024 / 1024).toFixed(2)} MB • ${new Date(book.createdAt).toLocaleDateString()}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleDownloadSaved(book.filename)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Template Customization Dialog */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Customize Template</DialogTitle>
        <DialogContent>
          {template && (
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="Book Title"
                value={template.title}
                onChange={(e) => handleTemplateChange('title', e.target.value)}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Conference Title"
                value={template.coverPage.conferenceTitle}
                onChange={(e) => handleTemplateChange('coverPage.conferenceTitle', e.target.value)}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Conference Subtitle"
                value={template.coverPage.conferenceSubtitle || ''}
                onChange={(e) => handleTemplateChange('coverPage.conferenceSubtitle', e.target.value)}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Venue"
                value={template.coverPage.venue}
                onChange={(e) => handleTemplateChange('coverPage.venue', e.target.value)}
                margin="normal"
              />
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Styling Options
              </Typography>
              
              <TextField
                fullWidth
                label="Font Family"
                value={template.styling.fontFamily}
                onChange={(e) => handleTemplateChange('styling.fontFamily', e.target.value)}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Header Color"
                value={template.styling.headerColor}
                onChange={(e) => handleTemplateChange('styling.headerColor', e.target.value)}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Accent Color"
                value={template.styling.accentColor}
                onChange={(e) => handleTemplateChange('styling.accentColor', e.target.value)}
                margin="normal"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setTemplateDialogOpen(false)} variant="contained">
            Apply Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};