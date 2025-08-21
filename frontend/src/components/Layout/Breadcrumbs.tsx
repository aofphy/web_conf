import React from 'react';
import {
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
  Box,
} from '@mui/material';
import { NavigateNext, Home } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactElement;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

const routeLabels: Record<string, string> = {
  '/': 'Home',
  '/conference': 'Conference Info',
  '/submissions': 'Submissions',
  '/reviews': 'Reviews',
  '/payment': 'Payment',
  '/admin': 'Admin Dashboard',
  '/admin/payments': 'Payment Management',
  '/abstract-book': 'Abstract Book',
  '/profile': 'Profile',
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (items) return items;

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', icon: <Home fontSize="small" /> }
    ];

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      if (currentPath !== location.pathname) {
        breadcrumbs.push({ label, path: currentPath });
      } else {
        breadcrumbs.push({ label });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbItems = generateBreadcrumbs();

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <MuiBreadcrumbs
        separator={<NavigateNext fontSize="small" />}
        aria-label="breadcrumb"
      >
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          if (isLast || !item.path) {
            return (
              <Typography
                key={index}
                color="text.primary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                {item.icon}
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={index}
              underline="hover"
              color="inherit"
              onClick={() => navigate(item.path!)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};