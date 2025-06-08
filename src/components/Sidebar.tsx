import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, children, className = '' }) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Touch event handling for swipe to close
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    if (isLeftSwipe) {
      onClose();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handleDrawerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={`sidebar-container ${open ? 'open' : ''} ${className}`}>
      <div className="sidebar-overlay" onClick={handleOverlayClick}></div>
      <div 
        className="sidebar-drawer"
        onClick={handleDrawerClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ zIndex: 3001 }} /* Ensure sidebar is above navbar */
      >
        <button 
          className="sidebar-close-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close sidebar"
          style={{ 
            zIndex: 3002, 
            position: 'absolute',
            top: '15px',
            right: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Sidebar;
