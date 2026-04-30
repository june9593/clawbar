import React, { useState, useEffect, useRef, useCallback } from 'react';
import LobsterPet from './LobsterPet';
import ClaudePet from './ClaudePet';
import './pet.css';

type PetState = 'idle' | 'hover' | 'active' | 'notification' | 'disconnected';
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';
type PetKind = 'lobster' | 'claude';

const PetApp: React.FC = () => {
  const [petState, setPetState] = useState<PetState>('idle');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [petKind, setPetKind] = useState<PetKind>('lobster');
  const activeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0 });

  // Load petKind from settings on mount; re-poll every 2s so a tray-menu
  // change is reflected without needing a full reload event channel.
  useEffect(() => {
    let cancelled = false;
    const loadKind = async () => {
      const s = await window.electronAPI.settings.get();
      const k = (s as { petKind?: string }).petKind;
      if (!cancelled && (k === 'lobster' || k === 'claude')) setPetKind(k);
    };
    loadKind();
    const t = setInterval(loadKind, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Listen for ws:status from main process
  useEffect(() => {
    const cleanup = window.electronAPI.ws.onStatus((status) => {
      if (status.connected) {
        setConnectionStatus('connected');
        // Clear disconnected state when reconnected
        setPetState((prev) => (prev === 'disconnected' ? 'idle' : prev));
      } else if (status.error) {
        setConnectionStatus('disconnected');
        setPetState('disconnected');
      } else {
        setConnectionStatus('connecting');
      }
    });
    return cleanup;
  }, []);

  // Listen for approval events → notification state
  useEffect(() => {
    const cleanup = window.electronAPI.ws.onApproval(() => {
      setPetState('notification');
    });
    return cleanup;
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (petState === 'notification' || petState === 'disconnected') return;
    setPetState('hover');
  }, [petState]);

  const handleMouseLeave = useCallback(() => {
    if (petState === 'notification' || petState === 'disconnected') return;
    setPetState('idle');
  }, [petState]);

  const handleClick = useCallback(() => {
    if (isDraggingRef.current) return;

    // Clear notification on click
    if (petState === 'notification') {
      setPetState('idle');
    } else {
      setPetState('active');
      if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current);
      activeTimeoutRef.current = setTimeout(() => setPetState('idle'), 400);
    }

    window.electronAPI.pet.onClick();
  }, [petState]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.pet.onRightClick();
  }, []);

  // Drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = false;
    dragStartRef.current = { mouseX: e.screenX, mouseY: e.screenY };

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.screenX - dragStartRef.current.mouseX;
      const dy = ev.screenY - dragStartRef.current.mouseY;
      if (!isDraggingRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDraggingRef.current = true;
      }
      if (isDraggingRef.current) {
        window.electronAPI.pet.onDrag(ev.screenX, ev.screenY);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (isDraggingRef.current) {
        window.electronAPI.pet.onDragEnd();
      }
      // Reset drag flag after a tick so click handler can check it
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const statusDotClass = connectionStatus === 'disconnected' ? 'error'
    : connectionStatus === 'connecting' ? 'connecting'
    : '';

  return (
    <div
      className={`pet-container state-${petState}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
    >
      <div className="lobster-svg">
        {petKind === 'claude' ? <ClaudePet /> : <LobsterPet />}
      </div>
      <div className="pet-shadow" />
      <div className={`status-dot ${statusDotClass}`} />
    </div>
  );
};

export default PetApp;
