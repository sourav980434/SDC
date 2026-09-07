'use client';

import { useState, useEffect } from 'react';

/**
 * Global custom hook for reading Granular Action Permissions (can_view, can_add, can_edit, can_delete, can_approve)
 * for any module key from the active user session.
 */
export function useActionPermission(moduleKey) {
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_add: false,
    can_edit: false,
    can_delete: false,
    can_approve: false,
    isLoaded: false
  });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('sdcp_user_session');
      if (stored) {
        const user = JSON.parse(stored);
        
        // Super Admin always has 100% full access to all actions
        if (user.role_code === 'ADMIN') {
          setPermissions({
            can_view: true,
            can_add: true,
            can_edit: true,
            can_delete: true,
            can_approve: true,
            isLoaded: true
          });
          return;
        }

        // Check 1: Is module assigned in User Management?
        const userModules = user.modules || [];
        const modKeys = userModules.map(m => typeof m === 'object' ? m.module_key : m);
        const isModuleAssignedToUser = modKeys.includes(moduleKey);

        // Check 2: Role Permission Matrix
        const rolePerms = user.permissions || [];
        const match = rolePerms.find(p => p.module_key === moduleKey);
        
        if (match) {
          const matrixView = Number(match.can_view) === 1;
          setPermissions({
            can_view: isModuleAssignedToUser && matrixView,
            can_add: Number(match.can_add) === 1,
            can_edit: Number(match.can_edit) === 1,
            can_delete: Number(match.can_delete) === 1,
            can_approve: Number(match.can_approve) === 1,
            isLoaded: true
          });
          return;
        }
      }
    } catch (e) {
      console.error("Error reading action permissions for module:", moduleKey, e);
    }
    
    // Strict Security Fallback: Non-admin users default to FALSE (Access Denied)
    setPermissions({
      can_view: false,
      can_add: false,
      can_edit: false,
      can_delete: false,
      can_approve: false,
      isLoaded: true
    });
  }, [moduleKey]);

  return permissions;
}
