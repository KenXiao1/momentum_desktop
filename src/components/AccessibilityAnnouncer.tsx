import React, { useEffect, useRef } from 'react';

interface AccessibilityAnnouncerProps {
  message: string;
  priority?: 'polite' | 'assertive';
  onAnnounced?: () => void;
}

/**
 * Component for announcing theme changes to screen readers
 */
export const AccessibilityAnnouncer: React.FC<AccessibilityAnnouncerProps> = ({
  message,
  priority = 'polite',
  onAnnounced,
}) => {
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && announcerRef.current) {
      // Clear previous message
      announcerRef.current.textContent = '';
      
      // Set new message after a brief delay to ensure screen readers pick it up
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = message;
          onAnnounced?.();
        }
      }, 100);
    }
  }, [message, onAnnounced]);

  return (
    <div
      ref={announcerRef}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      role="status"
    />
  );
};

