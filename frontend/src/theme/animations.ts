// Animation system for smooth user interactions
export const animations = {
  // Timing functions
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },
  
  // Duration scale
  duration: {
    fastest: 150,
    fast: 200,
    normal: 300,
    slow: 500,
    slowest: 700
  },
  
  // Common transitions
  transitions: {
    // Hover effects
    hover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
    },
    
    // Focus effects
    focus: {
      outline: '2px solid',
      outlineOffset: '2px',
      transition: 'outline-offset 200ms cubic-bezier(0.4, 0, 0.2, 1)'
    },
    
    // Loading states
    loading: {
      opacity: 0.6,
      pointerEvents: 'none',
      transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)'
    },
    
    // Modal/Dialog animations
    modal: {
      enter: {
        opacity: 1,
        transform: 'scale(1)',
        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
      },
      exit: {
        opacity: 0,
        transform: 'scale(0.95)',
        transition: 'all 200ms cubic-bezier(0.4, 0, 1, 1)'
      }
    },
    
    // Slide animations
    slide: {
      left: {
        enter: { transform: 'translateX(0)', opacity: 1 },
        exit: { transform: 'translateX(-100%)', opacity: 0 }
      },
      right: {
        enter: { transform: 'translateX(0)', opacity: 1 },
        exit: { transform: 'translateX(100%)', opacity: 0 }
      },
      up: {
        enter: { transform: 'translateY(0)', opacity: 1 },
        exit: { transform: 'translateY(-100%)', opacity: 0 }
      },
      down: {
        enter: { transform: 'translateY(0)', opacity: 1 },
        exit: { transform: 'translateY(100%)', opacity: 0 }
      }
    }
  },
  
  // Keyframe animations
  keyframes: {
    fadeIn: {
      '@keyframes fadeIn': {
        '0%': { opacity: 0 },
        '100%': { opacity: 1 }
      },
      animation: 'fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1)'
    },
    
    slideInUp: {
      '@keyframes slideInUp': {
        '0%': { transform: 'translateY(20px)', opacity: 0 },
        '100%': { transform: 'translateY(0)', opacity: 1 }
      },
      animation: 'slideInUp 400ms cubic-bezier(0.4, 0, 0.2, 1)'
    },
    
    slideInDown: {
      '@keyframes slideInDown': {
        '0%': { transform: 'translateY(-20px)', opacity: 0 },
        '100%': { transform: 'translateY(0)', opacity: 1 }
      },
      animation: 'slideInDown 400ms cubic-bezier(0.4, 0, 0.2, 1)'
    },
    
    scaleIn: {
      '@keyframes scaleIn': {
        '0%': { transform: 'scale(0.9)', opacity: 0 },
        '100%': { transform: 'scale(1)', opacity: 1 }
      },
      animation: 'scaleIn 300ms cubic-bezier(0.4, 0, 0.2, 1)'
    },
    
    pulse: {
      '@keyframes pulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 }
      },
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    },
    
    spin: {
      '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
      },
      animation: 'spin 1s linear infinite'
    },
    
    bounce: {
      '@keyframes bounce': {
        '0%, 100%': { 
          transform: 'translateY(-25%)',
          animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
        },
        '50%': { 
          transform: 'translateY(0)',
          animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
        }
      },
      animation: 'bounce 1s infinite'
    },
    
    shake: {
      '@keyframes shake': {
        '0%, 100%': { transform: 'translateX(0)' },
        '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
        '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' }
      },
      animation: 'shake 0.5s ease-in-out'
    }
  }
};

// Stagger animation for lists
export const staggerAnimation = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  }
};

// Page transition animations
export const pageTransitions = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },
  
  slide: {
    initial: { x: 300, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -300, opacity: 0 },
    transition: { duration: 0.3 }
  },
  
  scale: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
    transition: { duration: 0.3 }
  }
};