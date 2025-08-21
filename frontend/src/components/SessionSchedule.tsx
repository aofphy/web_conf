import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  Science as ScienceIcon,
  Computer as ComputerIcon,
  Biotech as BiotechIcon,
  Calculate as CalculateIcon,
  Engineering as EngineeringIcon,
} from '@mui/icons-material';
import { Session, SessionType } from '../types/conference';

interface SessionScheduleProps {
  sessions: Session[];
  conferenceId: string;
}

const SessionSchedule: React.FC<SessionScheduleProps> = ({ sessions }) => {
  const [selectedTab, setSelectedTab] = useState(0);

  const sessionIcons: Record<SessionType, React.ReactElement> = {
    CHE: <ScienceIcon />,
    CSE: <ComputerIcon />,
    BIO: <BiotechIcon />,
    MST: <CalculateIcon />,
    PFD: <EngineeringIcon />,
  };

  const sessionNames: Record<SessionType, string> = {
    CHE: 'Computational Chemistry',
    CSE: 'Computer Science & Engineering',
    BIO: 'Computational Biology & Bioinformatics',
    MST: 'Mathematics & Statistics',
    PFD: 'Computational Physics & Fluid Dynamics',
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timeString: string) => {
    return new Date(timeString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Session Schedule
          </Typography>
          <Alert severity="info">
            Session schedules will be available soon. Please check back later.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Session Schedule
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {sessions.map((session) => (
              <Tab
                key={session.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {sessionIcons[session.type]}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {session.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {sessionNames[session.type]}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {sessions.map((session, index) => (
          <Box
            key={session.id}
            role="tabpanel"
            hidden={selectedTab !== index}
          >
            {selectedTab === index && (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {sessionIcons[session.type]}
                    {session.name}
                  </Typography>
                  {session.description && (
                    <Typography variant="body2" color="text.secondary">
                      {session.description}
                    </Typography>
                  )}
                </Box>

                {session.schedules && session.schedules.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Time</strong></TableCell>
                          <TableCell><strong>Location</strong></TableCell>
                          <TableCell><strong>Description</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {session.schedules.map((schedule) => (
                          <TableRow key={schedule.id}>
                            <TableCell>
                              <Chip 
                                label={formatDate(schedule.startTime)}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {schedule.location || 'TBA'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {schedule.description || 'Session details'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    Schedule for this session will be announced soon.
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

export default SessionSchedule;