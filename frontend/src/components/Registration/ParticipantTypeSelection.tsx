import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Alert,
} from '@mui/material';
import {
  RecordVoiceOver,
  People,
  AdminPanelSettings,
  Support,
  Star,
} from '@mui/icons-material';
import { ParticipantType } from '../../types/user';

interface ParticipantTypeOption {
  type: ParticipantType;
  label: string;
  description: string;
  icon: React.ReactElement;
  category: string;
  fee: number;
}

const participantTypes: ParticipantTypeOption[] = [
  // Presenters/Speakers
  {
    type: 'keynote_speaker',
    label: 'Keynote Speaker',
    description: 'Invited main speakers for the conference',
    icon: <Star />,
    category: 'Presenters/Speakers',
    fee: 0,
  },
  {
    type: 'oral_presenter',
    label: 'Oral Presenter',
    description: 'Present research findings in oral sessions',
    icon: <RecordVoiceOver />,
    category: 'Presenters/Speakers',
    fee: 150,
  },
  {
    type: 'poster_presenter',
    label: 'Poster Presenter',
    description: 'Present research through poster sessions',
    icon: <RecordVoiceOver />,
    category: 'Presenters/Speakers',
    fee: 120,
  },
  {
    type: 'panelist',
    label: 'Panelist',
    description: 'Participate in panel discussions',
    icon: <People />,
    category: 'Presenters/Speakers',
    fee: 100,
  },
  {
    type: 'workshop_leader',
    label: 'Workshop Leader',
    description: 'Lead workshops and training sessions',
    icon: <AdminPanelSettings />,
    category: 'Presenters/Speakers',
    fee: 80,
  },
  // Attendees
  {
    type: 'regular_participant',
    label: 'Regular Participant',
    description: 'Attend sessions and networking events',
    icon: <People />,
    category: 'Attendees',
    fee: 200,
  },
  {
    type: 'observer',
    label: 'Observer',
    description: 'Observe sessions without active participation',
    icon: <People />,
    category: 'Attendees',
    fee: 100,
  },
  {
    type: 'industry_representative',
    label: 'Industry Representative',
    description: 'Represent industry interests and partnerships',
    icon: <People />,
    category: 'Attendees',
    fee: 250,
  },
  // Organizers
  {
    type: 'conference_chair',
    label: 'Conference Chair',
    description: 'Lead the overall conference organization',
    icon: <AdminPanelSettings />,
    category: 'Organizers',
    fee: 0,
  },
  {
    type: 'scientific_committee',
    label: 'Scientific Committee',
    description: 'Review and evaluate scientific content',
    icon: <AdminPanelSettings />,
    category: 'Organizers',
    fee: 0,
  },
  {
    type: 'organizing_committee',
    label: 'Organizing Committee',
    description: 'Help organize conference logistics',
    icon: <AdminPanelSettings />,
    category: 'Organizers',
    fee: 50,
  },
  {
    type: 'session_chair',
    label: 'Session Chair',
    description: 'Chair specific conference sessions',
    icon: <AdminPanelSettings />,
    category: 'Organizers',
    fee: 75,
  },
  // Support Roles
  {
    type: 'reviewer',
    label: 'Reviewer',
    description: 'Review submitted papers and abstracts',
    icon: <Support />,
    category: 'Support Roles',
    fee: 50,
  },
  {
    type: 'technical_support',
    label: 'Technical Support',
    description: 'Provide technical assistance during the conference',
    icon: <Support />,
    category: 'Support Roles',
    fee: 25,
  },
  {
    type: 'volunteer',
    label: 'Volunteer',
    description: 'Volunteer to help with conference activities',
    icon: <Support />,
    category: 'Support Roles',
    fee: 0,
  },
  // Special Guests
  {
    type: 'sponsor',
    label: 'Sponsor',
    description: 'Conference sponsor with special privileges',
    icon: <Star />,
    category: 'Special Guests',
    fee: 0,
  },
  {
    type: 'government_representative',
    label: 'Government Representative',
    description: 'Represent government agencies or institutions',
    icon: <AdminPanelSettings />,
    category: 'Special Guests',
    fee: 150,
  },
];

const categories = Array.from(new Set(participantTypes.map(type => type.category)));

interface ParticipantTypeSelectionProps {
  selectedType: ParticipantType | null;
  onTypeSelect: (type: ParticipantType) => void;
  error?: string;
}

export const ParticipantTypeSelection: React.FC<ParticipantTypeSelectionProps> = ({
  selectedType,
  onTypeSelect,
  error,
}) => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Select Your Participant Type
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Choose the option that best describes your role in the conference. This will determine your access level and registration fee.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {categories.map((category) => (
        <Box key={category} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom color="primary">
            {category}
          </Typography>
          <Grid container spacing={2}>
            {participantTypes
              .filter(type => type.category === category)
              .map((option) => (
                <Grid item xs={12} sm={6} md={4} key={option.type}>
                  <Card
                    sx={{
                      height: '100%',
                      border: selectedType === option.type ? 2 : 1,
                      borderColor: selectedType === option.type ? 'primary.main' : 'divider',
                      '&:hover': {
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => onTypeSelect(option.type)}
                      sx={{ height: '100%', p: 0 }}
                    >
                      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {option.icon}
                          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                            {option.label}
                          </Typography>
                          <Chip
                            label={option.fee === 0 ? 'Free' : `$${option.fee}`}
                            color={option.fee === 0 ? 'success' : 'primary'}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                          {option.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
};