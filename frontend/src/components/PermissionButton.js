'use client';

import React from 'react';
import { useActionPermission } from '../hooks/useActionPermission';
import { Lock } from 'lucide-react';

/**
 * Reusable PermissionButton Component
 * Automatically enforces Role Permission Matrix action rules (can_view, can_add, can_edit, can_delete, can_approve)
 * for any module and action button in present or future pages.
 */
export default function PermissionButton({
  moduleKey,
  action, // 'can_add' | 'can_edit' | 'can_delete' | 'can_approve'
  children,
  onClick,
  className,
  style,
  disabled = false,
  ...props
}) {
  const perms = useActionPermission(moduleKey);

  const isAllowed = perms[action] !== false;
  const isButtonDisabled = disabled || !isAllowed || !perms.isLoaded;

  const getActionLabel = (act) => {
    switch (act) {
      case 'can_add': return 'Add / Save';
      case 'can_edit': return 'Edit / Modify';
      case 'can_delete': return 'Delete / Cancel';
      case 'can_approve': return 'Approve / Verify';
      default: return 'Action';
    }
  };

  return (
    <button
      {...props}
      onClick={isButtonDisabled ? undefined : onClick}
      disabled={isButtonDisabled}
      className={className}
      style={{
        opacity: isAllowed ? 1 : 0.5,
        cursor: isAllowed ? 'pointer' : 'not-allowed',
        position: 'relative',
        ...style
      }}
      title={!isAllowed ? `🔒 ${getActionLabel(action)} permission restricted for your role in Role Permission Matrix` : props.title}
    >
      {!isAllowed && <Lock size={14} style={{ marginRight: '6px', color: '#ef4444' }} />}
      {children}
    </button>
  );
}
