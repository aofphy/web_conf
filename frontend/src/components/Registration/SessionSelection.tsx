import React from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  Alert,
  Chip,
} from '@mui/material';
import { SessionType, ParticipantType } from '../../types/user';

interface SessionInfo {
  type: SessionType;
  name: string;
  description: string;
  topics: string[];
}

const sessions: SessionInfo[] = [
  {
    type: 'CHE',
    name: 'Computational Chemistry',
    description: 'Theoretical and computational approaches to chemical problems',
    topics: ['Quantum Chemistry', 'Molecular Dynamics', 'Chemical Kinetics', 'Catalysis'],
  },
  {
    type: 'CSE',
    name: 'High Performance Computing/Computer Science/Engineering',
    description: 'Advanced computing methods and engineering applications',
    topics: ['Parallel Computing', 'Algorithm Design', 'Software Engineering', 'System Architecture'],
  },
  {
    type: 'BIO',
    name: 'Computational Biology/Bioinformatics/Biochemistry/Biophysics',
    description: 'Computational approaches to biological and biochemical systems',
    topics: ['Genomics', 'Protein Structure', 'Systems Biology', 'Biophysical Modeling'],
  },
  {
    type: 'MST',
    name: 'Mathematics and Statistics',
    description: 'Mathematical modeling and statistical analysis methods',
    topics: ['Applied Mathematics', 'Statistical Methods', 'Numerical Analysis', 'Data Science'],
  },
  {
    type: 'PFD',
    name: 'Computational Physics/Computational Fluid Dynamics/Solid Mechanics',
    description: 'Physics simulations and mechanical system modeling',
    topics: ['Fluid Dynamics', 'Solid Mechanics', 'Plasma Physics', 'Materials Science'],
  },
];

interface SessionSelectionProps {
  selectedSessions: SessionType[];
  onSessionsChange: (sessions: SessionType[]) => void;
  participantType: ParticipantType | null;
  error?: string;
}

export const SessionSelection: React.FC<SessionSelectionProps> = ({
  selectedSessions,
  onSessionsChange,
  participantType,
  error,
}) => {
  const handleSessionToggle = (sessionType: SessionType) => {
    const isSelected = selectedSessions.includes(sessionType);
    if (isSelected) {
      onSessionsChange(selectedSessions.filter(s => s !== sessionType));
    } else {
      onSessionsChange([...selectedSessions, sessionType]);
    }
  };

  const getRecommendedText = () => {
    if (!participantType) return '';
    
    if (['oral_presenter', 'poster_presenter'].includes(participantType)) {
      return 'Select the session(s) where you plan to present your research.';
    }
    if (['reviewer', 'scientific_committee'].includes(participantType)) {
      return 'Select the session(s) you are qualified to review.';
    }
    if (['session_chair'].includes(participantType)) {
      return 'Select the session(s) you will chair.';
    }
    return 'Select the session(s) you are interested in attending.';
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Session Selection
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {getRecommendedText()}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <FormGroup>
        {sessions.map((session) => (
          <Card
            key={session.type}
            sx={{
              mb: 2,
              border: selectedSessions.includes(session.type) ? 2 : 1,
              borderColor: selectedSessions.includes(session.type) ? 'primary.main' : 'divider',
            }}
          >
            <CardContent>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedSessions.includes(session.type)}
                    onChange={() => handleSessionToggle(session.type)}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ ml: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6">
                        {session.name}
                      </Typography>
                      <Chip label={session.type} size="small" color="primary" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {session.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {session.topics.map((topic) => (
                        <Chip
                          key={topic}
                          label={topic}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      ))}
                    </Box>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', width: '100%' }}
              />
            </CardContent>
          </Card>
        ))}
      </FormGroup>

      {selectedSessions.length > 0 && (
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Sessions ({selectedSessions.length}):
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedSessions.map((sessionType) => {
              const session = sessions.find(s => s.type === sessionType);
              return (
                <Chip
                  key={sessionType}
                  label={`${sessionType} - ${session?.name}`}
                  color="primary"
                  onDelete={() => handleSessionToggle(sessionType)}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};