import React, { useState } from 'react';
import { Box, Skeleton, Avatar, Card, CardMedia } from '@mui/material';
import { ConferenceIcon } from './IconSystem';

// Image optimization guidelines
export const imageGuidelines = {
  // Recommended sizes for different use cases
  sizes: {
    avatar: { width: 40, height: 40 },
    avatarLarge: { width: 80, height: 80 },
    thumbnail: { width: 150, height: 150 },
    card: { width: 300, height: 200 },
    banner: { width: 1200, height: 400 },
    hero: { width: 1920, height: 800 },
    logo: { width: 200, height: 60 }
  },
  
  // Supported formats
  formats: ['webp', 'jpg', 'png', 'svg'],
  
  // Quality settings
  quality: {
    thumbnail: 70,
    standard: 80,
    high: 90
  },
  
  // Responsive breakpoints
  breakpoints: {
    mobile: 480,
    tablet: 768,
    desktop: 1200
  }
};

// Optimized image component with lazy loading
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: keyof typeof imageGuidelines.quality;
  lazy?: boolean;
  fallback?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 'standard',
  lazy = true,
  fallback,
  className,
  style
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => setLoading(false);
  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // Generate responsive srcSet if CDN is available
  const generateSrcSet = (baseSrc: string) => {
    const sizes = [480, 768, 1200, 1920];
    return sizes.map(size => `${baseSrc}?w=${size}&q=${imageGuidelines.quality[quality]} ${size}w`).join(', ');
  };

  if (error && fallback) {
    return (
      <img
        src={fallback}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
      />
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          width: width || '100%',
          height: height || 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.100',
          color: 'grey.500'
        }}
        className={className}
        style={style}
      >
        <ConferenceIcon name="error" size="lg" />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: width || '100%', height: height || 'auto' }}>
      {loading && (
        <Skeleton
          variant="rectangular"
          width={width || '100%'}
          height={height || 200}
          sx={{ position: 'absolute', top: 0, left: 0 }}
        />
      )}
      <img
        src={src}
        srcSet={generateSrcSet(src)}
        sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
        alt={alt}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        onLoad={handleLoad}
        onError={handleError}
        className={className}
        style={{
          ...style,
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
          width: width || '100%',
          height: height || 'auto',
          objectFit: 'cover'
        }}
      />
    </Box>
  );
};

// Conference-specific image components
export const ConferenceAvatar: React.FC<{
  src?: string;
  name: string;
  size?: 'small' | 'medium' | 'large';
}> = ({ src, name, size = 'medium' }) => {
  const sizes = {
    small: 32,
    medium: 40,
    large: 56
  };

  return (
    <Avatar
      src={src}
      alt={name}
      sx={{
        width: sizes[size],
        height: sizes[size],
        fontSize: size === 'large' ? '1.25rem' : '0.875rem',
        fontWeight: 500
      }}
    >
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );
};

export const ConferenceBanner: React.FC<{
  src: string;
  title: string;
  height?: number;
}> = ({ src, title, height = 300 }) => {
  return (
    <Card sx={{ position: 'relative', overflow: 'hidden' }}>
      <CardMedia
        component="img"
        height={height}
        image={src}
        alt={title}
        sx={{
          objectFit: 'cover',
          filter: 'brightness(0.8)',
          transition: 'filter 0.3s ease-in-out',
          '&:hover': {
            filter: 'brightness(1)'
          }
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          color: 'white',
          p: 3
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
          {title}
        </h2>
      </Box>
    </Card>
  );
};

// Logo component with fallback
export const ConferenceLogo: React.FC<{
  src?: string;
  alt: string;
  height?: number;
  variant?: 'light' | 'dark';
}> = ({ src, alt, height = 40, variant = 'light' }) => {
  if (!src) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: variant === 'light' ? 'primary.main' : 'white'
        }}
      >
        Conference
      </Box>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      height={height}
      style={{ maxWidth: '200px', height: 'auto' }}
    />
  );
};