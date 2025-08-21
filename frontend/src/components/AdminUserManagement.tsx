import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TablePagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { Search, Edit, Delete, Refresh } from '@mui/icons-material';
import { adminUserApi, UserFilters, UserListResponse, UserStatistics } from '../services/adminUserApi';
import { UserResponse, UserRole, PaymentStatus, ParticipantType } from '../types/user';

interface AdminUserManagementProps {}

const AdminUserManagement: React.FC<AdminUserManagementProps> = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Pagination and filtering
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filters, setFilters] = useState<UserFilters>({});
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('participant');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('not_paid');
  
  // Deactivate dialog state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<UserResponse | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentFilters: UserFilters = {
        ...filters,
        page: page + 1,
        limit: rowsPerPage
      };
      
      const response: UserListResponse = await adminUserApi.getAllUsers(currentFilters);
      setUsers(response.users);
      setTotalUsers(response.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await adminUserApi.getUserStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, filters]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const handleFilterChange = (field: keyof UserFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
    setPage(0); // Reset to first page when filtering
  };

  const handleEditUser = (user: UserResponse) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditPaymentStatus(user.paymentStatus);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    try {
      setError(null);
      
      // Update role if changed
      if (editRole !== selectedUser.role) {
        await adminUserApi.updateUserRole(selectedUser.id, editRole);
      }
      
      // Update payment status if changed
      if (editPaymentStatus !== selectedUser.paymentStatus) {
        await adminUserApi.updateUserPaymentStatus(selectedUser.id, editPaymentStatus);
      }
      
      setSuccess('User updated successfully');
      setEditDialogOpen(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeactivateUser = (user: UserResponse) => {
    setUserToDeactivate(user);
    setDeactivateDialogOpen(true);
  };

  const confirmDeactivateUser = async () => {
    if (!userToDeactivate) return;

    try {
      setError(null);
      await adminUserApi.deactivateUser(userToDeactivate.id);
      setSuccess('User deactivated successfully');
      setDeactivateDialogOpen(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'payment_verified': return 'success';
      case 'payment_submitted': return 'warning';
      case 'payment_rejected': return 'error';
      default: return 'default';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'error';
      case 'organizer': return 'warning';
      case 'reviewer': return 'info';
      case 'presenter': return 'success';
      default: return 'default';
    }
  };

  const formatParticipantType = (type: ParticipantType) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Management
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

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h4">
                  {statistics.totalUsers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Verified Payments
                </Typography>
                <Typography variant="h4">
                  {statistics.paymentStatusDistribution.payment_verified || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Presenters
                </Typography>
                <Typography variant="h4">
                  {statistics.roleDistribution.presenter || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Reviewers
                </Typography>
                <Typography variant="h4">
                  {statistics.roleDistribution.reviewer || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Name, email, affiliation..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={filters.role || ''}
                label="Role"
                onChange={(e) => handleFilterChange('role', e.target.value)}
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="participant">Participant</MenuItem>
                <MenuItem value="presenter">Presenter</MenuItem>
                <MenuItem value="organizer">Organizer</MenuItem>
                <MenuItem value="reviewer">Reviewer</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select
                value={filters.paymentStatus || ''}
                label="Payment Status"
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="not_paid">Not Paid</MenuItem>
                <MenuItem value="payment_submitted">Submitted</MenuItem>
                <MenuItem value="payment_verified">Verified</MenuItem>
                <MenuItem value="payment_rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadUsers}
              fullWidth
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Affiliation</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Participant Type</TableCell>
              <TableCell>Payment Status</TableCell>
              <TableCell>Registration Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.affiliation}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {formatParticipantType(user.participantType)}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.paymentStatus.replace('_', ' ')} 
                      color={getPaymentStatusColor(user.paymentStatus)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.registrationDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleEditUser(user)}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeactivateUser(user)}
                    >
                      Deactivate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalUsers}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {selectedUser.firstName} {selectedUser.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedUser.email}
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={editRole}
                  label="Role"
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                >
                  <MenuItem value="participant">Participant</MenuItem>
                  <MenuItem value="presenter">Presenter</MenuItem>
                  <MenuItem value="organizer">Organizer</MenuItem>
                  <MenuItem value="reviewer">Reviewer</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={editPaymentStatus}
                  label="Payment Status"
                  onChange={(e) => setEditPaymentStatus(e.target.value as PaymentStatus)}
                >
                  <MenuItem value="not_paid">Not Paid</MenuItem>
                  <MenuItem value="payment_submitted">Payment Submitted</MenuItem>
                  <MenuItem value="payment_verified">Payment Verified</MenuItem>
                  <MenuItem value="payment_rejected">Payment Rejected</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate User Dialog */}
      <Dialog open={deactivateDialogOpen} onClose={() => setDeactivateDialogOpen(false)}>
        <DialogTitle>Deactivate User</DialogTitle>
        <DialogContent>
          {userToDeactivate && (
            <Typography>
              Are you sure you want to deactivate {userToDeactivate.firstName} {userToDeactivate.lastName}? 
              This action cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeactivateUser} color="error" variant="contained">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUserManagement;