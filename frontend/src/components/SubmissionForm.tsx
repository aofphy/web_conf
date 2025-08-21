import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  Divider,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import MarkdownEditor from './MarkdownEditor';
import { 
  CreateSubmissionRequest, 
  SessionType, 
  PresentationType, 
  SESSION_INFO, 
  PRESENTATION_TYPE_INFO 
} from '../types/submission';
import { submissionApi } from '../services/submissionApi';
import { validateAbstractMarkdown } from '../utils/markdown';

const steps = ['Basic Information', 'Abstract Content', 'Authors & Review'];

const validationSchema = yup.object({
  title: yup.string()
    .min(10, 'Title must be at least 10 characters')
    .max(500, 'Title must be less than 500 characters')
    .required('Title is required'),
  abstract: yup.string()
    .min(100, 'Abstract must be at least 100 characters')
    .max(5000, 'Abstract must be less than 5000 characters')
    .required('Abstract is required'),
  keywords: yup.array()
    .of(yup.string().min(2, 'Keywords must be at least 2 characters'))
    .min(3, 'At least 3 keywords are required')
    .max(10, 'Maximum 10 keywords allowed'),
  sessionType: yup.string()
    .oneOf(['CHE', 'CSE', 'BIO', 'MST', 'PFD'], 'Invalid session type')
    .required('Session type is required'),
  presentationType: yup.string()
    .oneOf(['oral', 'poster'], 'Invalid presentation type')
    .required('Presentation type is required'),
  authors: yup.array()
    .of(yup.object({
      name: yup.string().min(2, 'Name must be at least 2 characters').required('Name is required'),
      affiliation: yup.string().min(2, 'Affiliation is required').required('Affiliation is required'),
      email: yup.string().email('Invalid email').required('Email is required'),
      isCorresponding: yup.boolean().required(),
      authorOrder: yup.number().min(1).required()
    }))
    .min(1, 'At least one author is required')
    .required('Authors are required'),
  correspondingAuthor: yup.string().email('Invalid email').required('Corresponding author email is required')
});

interface SubmissionFormProps {
  onSubmissionCreated?: (submission: any) => void;
  onCancel?: () => void;
  initialData?: Partial<CreateSubmissionRequest>;
  isEditing?: boolean;
  submissionId?: string;
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({
  onSubmissionCreated,
  onCancel,
  initialData,
  isEditing = false,
  submissionId
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [abstractValidation, setAbstractValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid }
  } = useForm<CreateSubmissionRequest>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      title: initialData?.title || '',
      abstract: initialData?.abstract || '',
      keywords: initialData?.keywords || [],
      sessionType: initialData?.sessionType || 'CHE',
      presentationType: initialData?.presentationType || 'oral',
      authors: initialData?.authors || [{
        name: '',
        affiliation: '',
        email: '',
        isCorresponding: true,
        authorOrder: 1
      }],
      correspondingAuthor: initialData?.correspondingAuthor || ''
    },
    mode: 'onChange'
  });

  const { fields: authorFields, append: appendAuthor, remove: removeAuthor } = useFieldArray({
    control,
    name: 'authors'
  });

  const watchedAbstract = watch('abstract');
  const watchedAuthors = watch('authors');
  const watchedSessionType = watch('sessionType');

  // Validate abstract when it changes
  useEffect(() => {
    if (watchedAbstract) {
      const validation = validateAbstractMarkdown(watchedAbstract);
      setAbstractValidation(validation);
    } else {
      setAbstractValidation(null);
    }
  }, [watchedAbstract]);

  // Update corresponding author options when authors change
  useEffect(() => {
    const correspondingAuthors = watchedAuthors.filter(author => author.isCorresponding);
    if (correspondingAuthors.length === 1) {
      setValue('correspondingAuthor', correspondingAuthors[0].email);
    }
  }, [watchedAuthors, setValue]);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && keywordInput.length >= 2) {
      const currentKeywords = getValues('keywords');
      if (currentKeywords.length < 10 && !currentKeywords.includes(keywordInput.trim())) {
        setValue('keywords', [...currentKeywords, keywordInput.trim()]);
        setKeywordInput('');
      }
    }
  };

  const handleRemoveKeyword = (indexToRemove: number) => {
    const currentKeywords = getValues('keywords');
    setValue('keywords', currentKeywords.filter((_, index) => index !== indexToRemove));
  };

  const handleAddAuthor = () => {
    const currentAuthors = getValues('authors');
    appendAuthor({
      name: '',
      affiliation: '',
      email: '',
      isCorresponding: false,
      authorOrder: currentAuthors.length + 1
    });
  };

  const handleRemoveAuthor = (index: number) => {
    if (authorFields.length > 1) {
      removeAuthor(index);
      // Update author orders
      const currentAuthors = getValues('authors');
      currentAuthors.forEach((author, idx) => {
        setValue(`authors.${idx}.authorOrder`, idx + 1);
      });
    }
  };

  const onSubmit = async (data: CreateSubmissionRequest) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let response;
      if (isEditing && submissionId) {
        response = await submissionApi.updateSubmission(submissionId, data);
      } else {
        response = await submissionApi.createSubmission(data);
      }

      if (response.success && response.data) {
        onSubmissionCreated?.(response.data);
      } else {
        setSubmitError(response.error?.message || 'Failed to submit abstract');
      }
    } catch (error: any) {
      setSubmitError(error.response?.data?.error?.message || 'Failed to submit abstract');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ space: 3 }}>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Abstract Title"
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  margin="normal"
                  placeholder="Enter a descriptive title for your research"
                />
              )}
            />

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="sessionType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.sessionType}>
                      <InputLabel>Conference Session</InputLabel>
                      <Select {...field} label="Conference Session">
                        {Object.entries(SESSION_INFO).map(([key, info]) => (
                          <MenuItem key={key} value={key}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {key} - {info.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {info.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.sessionType && (
                        <FormHelperText>{errors.sessionType.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="presentationType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.presentationType}>
                      <InputLabel>Presentation Type</InputLabel>
                      <Select {...field} label="Presentation Type">
                        {Object.entries(PRESENTATION_TYPE_INFO).map(([key, info]) => (
                          <MenuItem key={key} value={key}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {info.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {info.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.presentationType && (
                        <FormHelperText>{errors.presentationType.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>

            {watchedSessionType && (
              <Card sx={{ mt: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {SESSION_INFO[watchedSessionType as SessionType].name}
                  </Typography>
                  <Typography variant="body2">
                    {SESSION_INFO[watchedSessionType as SessionType].guidelines}
                  </Typography>
                </CardContent>
              </Card>
            )}

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Keywords</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {getValues('keywords').map((keyword, index) => (
                  <Chip
                    key={index}
                    label={keyword}
                    onDelete={() => handleRemoveKeyword(index)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Add keyword"
                  size="small"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                />
                <Button
                  onClick={handleAddKeyword}
                  variant="outlined"
                  startIcon={<AddIcon />}
                  disabled={!keywordInput.trim() || getValues('keywords').length >= 10}
                >
                  Add
                </Button>
              </Box>
              {errors.keywords && (
                <FormHelperText error>{errors.keywords.message}</FormHelperText>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Add 3-10 keywords that describe your research. Press Enter or click Add.
              </Typography>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Controller
              name="abstract"
              control={control}
              render={({ field }) => (
                <MarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.abstract}
                  helperText={errors.abstract?.message}
                  height={500}
                />
              )}
            />

            {abstractValidation && (
              <Box sx={{ mt: 2 }}>
                {abstractValidation.errors.length > 0 && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2">Validation Errors:</Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {abstractValidation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {abstractValidation.warnings.length > 0 && (
                  <Alert severity="warning">
                    <Typography variant="subtitle2">Suggestions:</Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {abstractValidation.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Authors</Typography>
            
            {authorFields.map((field, index) => (
              <Card key={field.id} sx={{ mb: 2, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">Author {index + 1}</Typography>
                  {authorFields.length > 1 && (
                    <IconButton
                      onClick={() => handleRemoveAuthor(index)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name={`authors.${index}.name`}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Full Name"
                          error={!!errors.authors?.[index]?.name}
                          helperText={errors.authors?.[index]?.name?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name={`authors.${index}.email`}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Email"
                          type="email"
                          error={!!errors.authors?.[index]?.email}
                          helperText={errors.authors?.[index]?.email?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name={`authors.${index}.affiliation`}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Affiliation"
                          error={!!errors.authors?.[index]?.affiliation}
                          helperText={errors.authors?.[index]?.affiliation?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name={`authors.${index}.isCorresponding`}
                      control={control}
                      render={({ field }) => (
                        <FormControl>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                            <Typography variant="body2">
                              Corresponding Author
                            </Typography>
                          </Box>
                        </FormControl>
                      )}
                    />
                  </Grid>
                </Grid>
              </Card>
            ))}

            <Button
              onClick={handleAddAuthor}
              variant="outlined"
              startIcon={<AddIcon />}
              sx={{ mb: 3 }}
            >
              Add Author
            </Button>

            <Divider sx={{ my: 3 }} />

            <Controller
              name="correspondingAuthor"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.correspondingAuthor}>
                  <InputLabel>Corresponding Author Email</InputLabel>
                  <Select {...field} label="Corresponding Author Email">
                    {watchedAuthors
                      .filter(author => author.isCorresponding && author.email)
                      .map((author, index) => (
                        <MenuItem key={index} value={author.email}>
                          {author.name} ({author.email})
                        </MenuItem>
                      ))}
                  </Select>
                  {errors.correspondingAuthor && (
                    <FormHelperText>{errors.correspondingAuthor.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {isEditing ? 'Edit Abstract Submission' : 'Submit Abstract'}
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Box>
            {onCancel && (
              <Button onClick={onCancel} sx={{ mr: 1 }}>
                Cancel
              </Button>
            )}
            {activeStep > 0 && (
              <Button onClick={handleBack}>
                Back
              </Button>
            )}
          </Box>

          <Box>
            {activeStep === steps.length - 1 ? (
              <>
                <Button
                  onClick={() => setPreviewOpen(true)}
                  startIcon={<PreviewIcon />}
                  sx={{ mr: 1 }}
                >
                  Preview
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!isValid || isSubmitting}
                  startIcon={isEditing ? <SaveIcon /> : <SendIcon />}
                >
                  {isSubmitting 
                    ? (isEditing ? 'Saving...' : 'Submitting...') 
                    : (isEditing ? 'Save Changes' : 'Submit Abstract')
                  }
                </Button>
              </>
            ) : (
              <Button
                onClick={handleNext}
                variant="contained"
                disabled={activeStep === 0 && (!getValues('title') || !getValues('sessionType'))}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </form>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Submission Preview</DialogTitle>
        <DialogContent>
          {/* Preview content would go here */}
          <Typography variant="body2" color="text.secondary">
            Preview functionality will be implemented in the next phase.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SubmissionForm;