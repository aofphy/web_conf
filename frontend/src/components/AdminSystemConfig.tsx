import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Settings,
  Health,
  Backup,
  Description,
  Refresh,
  Save,
  ExpandMore,
  Memory,
  Storage,
  Computer
} from '@mui/icons-material';
import {
  adminSystemApi,
  SystemHealth,
  SystemConfig,
  UpdateConfigRequest,
  BackupMetadata,
  SystemLog
} from '../services/adminSystemApi';

const AdminSystemConfig: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Config edit dialog state
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<UpdateConfigRequest>({});
  const [savingConfig, setSavingConfig] = useState(false);

  // Backup dialog state
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [includeUserData, setIncludeUserData] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupMetadata | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [healthData, configData, logsData] = await Promise.all([
        adminSystemApi.getSystemHealth(),
        adminSystemApi.getSystemConfig(),
        adminSystemApi.getSystemLogs()
      ]);

      setHealth(healthData);
      setConfig(configData);
      setLogs(logsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      setError(null);

      await adminSystemApi.updateSystemConfig(editingConfig);
      setSuccess('System configuration updated successfully');
      setConfigDialogOpen(false);
      setEditingConfig({});
      loadData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      setError(null);

      const backup = await adminSystemApi.createBackup(includeUserData);
      setLastBackup(backup);
      setSuccess('Backup created successfully');
      setBackupDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'error';
      case 'WARN': return 'warning';
      case 'INFO': return 'info';
      case 'DEBUG': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          System Configuration & Maintenance
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadData}
        >
          Refresh
        </Button>
      </Box>

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
        {/* System Health */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center">
                <Health sx={{ mr: 2, color: 'success.main' }} />
                <Typography variant="h6">System Health</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Storage sx={{ mr: 2, color: 'primary.main' }} />
                        <Typography variant="h6">Database</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Status: <Chip label={health?.database.status || 'Unknown'} color="success" size="small" />
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Response Time: {health?.database.responseTime}ms
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Version: {health?.database.version?.split(' ')[0]}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Memory sx={{ mr: 2, color: 'warning.main' }} />
                        <Typography variant="h6">Memory Usage</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Heap Used: {formatBytes(health?.system.memoryUsage.heapUsed || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Heap Total: {formatBytes(health?.system.memoryUsage.heapTotal || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        RSS: {formatBytes(health?.system.memoryUsage.rss || 0)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Computer sx={{ mr: 2, color: 'info.main' }} />
                        <Typography variant="h6">System Info</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Uptime: {formatUptime(health?.system.uptime || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Node.js: {health?.system.nodeVersion}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Platform: {health?.system.platform} ({health?.system.arch})
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Application Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {health?.application.activeUsers || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Active Users
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main">
                            {health?.application.totalSubmissions || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Submissions
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="warning.main">
                            {health?.application.totalReviews || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Reviews
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="info.main">
                            {health?.application.totalPayments || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Payments
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Configuration */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center">
                <Settings sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Configuration</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Conference Settings</Typography>
                <Button
                  variant="contained"
                  startIcon={<Settings />}
                  onClick={() => {
                    setEditingConfig({
                      conference: config?.conference ? {
                        name: config.conference.name,
                        description: config.conference.description,
                        startDate: config.conference.start_date,
                        endDate: config.conference.end_date,
                        venue: config.conference.venue,
                        registrationDeadline: config.conference.registration_deadline,
                        submissionDeadline: config.conference.submission_deadline
                      } : {},
                      paymentInstructions: config?.paymentInstructions ? {
                        bankName: config.paymentInstructions.bank_name,
                        accountName: config.paymentInstructions.account_name,
                        accountNumber: config.paymentInstructions.account_number,
                        swiftCode: config.paymentInstructions.swift_code,
                        routingNumber: config.paymentInstructions.routing_number,
                        instructions: config.paymentInstructions.instructions,
                        supportContact: config.paymentInstructions.support_contact
                      } : {}
                    });
                    setConfigDialogOpen(true);
                  }}
                >
                  Edit Configuration
                </Button>
              </Box>

              {config?.conference ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Conference Name</Typography>
                    <Typography variant="body1">{config.conference.name}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Venue</Typography>
                    <Typography variant="body1">{config.conference.venue}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Start Date</Typography>
                    <Typography variant="body1">
                      {new Date(config.conference.start_date).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">End Date</Typography>
                    <Typography variant="body1">
                      {new Date(config.conference.end_date).toLocaleDateString()}
                    </Typography>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="warning">No conference configuration found</Alert>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Backup & Maintenance */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center">
                <Backup sx={{ mr: 2, color: 'warning.main' }} />
                <Typography variant="h6">Backup & Maintenance</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Database Backup</Typography>
                <Button
                  variant="contained"
                  startIcon={<Backup />}
                  onClick={() => setBackupDialogOpen(true)}
                >
                  Create Backup
                </Button>
              </Box>

              {lastBackup && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Last backup created: {new Date(lastBackup.createdAt).toLocaleString()}
                  <br />
                  Backup ID: {lastBackup.id}
                </Alert>
              )}

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Database Tables
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Table Name</TableCell>
                      <TableCell align="right">Inserts</TableCell>
                      <TableCell align="right">Updates</TableCell>
                      <TableCell align="right">Deletes</TableCell>
                      <TableCell align="right">Live Rows</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {health?.databaseStats.map((table) => (
                      <TableRow key={table.tablename}>
                        <TableCell>{table.tablename}</TableCell>
                        <TableCell align="right">{table.inserts.toLocaleString()}</TableCell>
                        <TableCell align="right">{table.updates.toLocaleString()}</TableCell>
                        <TableCell align="right">{table.deletes.toLocaleString()}</TableCell>
                        <TableCell align="right">{table.live_tuples.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* System Logs */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center">
                <Description sx={{ mr: 2, color: 'info.main' }} />
                <Typography variant="h6">System Logs</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {logs.map((log, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              label={log.level} 
                              color={getLogLevelColor(log.level) as any}
                              size="small" 
                            />
                            <Typography variant="body2">
                              {log.message}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(log.timestamp).toLocaleString()} - {log.source}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < logs.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      {/* Configuration Edit Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit System Configuration</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Conference Settings
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Conference Name"
                value={editingConfig.conference?.name || ''}
                onChange={(e) => setEditingConfig(prev => ({
                  ...prev,
                  conference: { ...prev.conference, name: e.target.value }
                }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Venue"
                value={editingConfig.conference?.venue || ''}
                onChange={(e) => setEditingConfig(prev => ({
                  ...prev,
                  conference: { ...prev.conference, venue: e.target.value }
                }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={editingConfig.conference?.description || ''}
                onChange={(e) => setEditingConfig(prev => ({
                  ...prev,
                  conference: { ...prev.conference, description: e.target.value }
                }))}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Payment Instructions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bank Name"
                value={editingConfig.paymentInstructions?.bankName || ''}
                onChange={(e) => setEditingConfig(prev => ({
                  ...prev,
                  paymentInstructions: { ...prev.paymentInstructions, bankName: e.target.value }
                }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Account Name"
                value={editingConfig.paymentInstructions?.accountName || ''}
                onChange={(e) => setEditingConfig(prev => ({
                  ...prev,
                  paymentInstructions: { ...prev.paymentInstructions, accountName: e.target.value }
                }))}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveConfig} 
            variant="contained"
            startIcon={<Save />}
            disabled={savingConfig}
          >
            {savingConfig ? <CircularProgress size={20} /> : 'Save Configuration'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)}>
        <DialogTitle>Create Database Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Create a backup of the current database state. This will include all system data.
          </Typography>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            In production, this would create an actual database dump file that can be used for restoration.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateBackup} 
            variant="contained"
            startIcon={<Backup />}
            disabled={creatingBackup}
          >
            {creatingBackup ? <CircularProgress size={20} /> : 'Create Backup'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminSystemConfig;