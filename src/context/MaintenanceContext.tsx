import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { onMaintenanceMode } from '../api/client';
import { getItem, getItemSync, setItem, StorageKeys } from '../api/storage';
import type { MaintenanceStatus } from '../api/types';

interface MaintenanceValue {
  maintenance: MaintenanceStatus | null;
  isMaintenanceActive: boolean;
  loading: boolean;
  checkMaintenance: () => Promise<MaintenanceStatus | null>;
  setMaintenance: (status: MaintenanceStatus | null) => void;
}

const MaintenanceContext = createContext<MaintenanceValue>({
  maintenance: null,
  isMaintenanceActive: false,
  loading: true,
  checkMaintenance: async () => null,
  setMaintenance: () => {},
});

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const initialMaintenance = useMemo(() => {
    try {
      const raw = getItemSync(StorageKeys.maintenance);
      if (raw) return JSON.parse(raw) as MaintenanceStatus;
    } catch {
      // ignore
    }
    return null;
  }, []);

  const [maintenance, setMaintenanceState] = useState<MaintenanceStatus | null>(initialMaintenance);
  const [loading, setLoading] = useState(!initialMaintenance);

  const setMaintenance = useCallback((status: MaintenanceStatus | null) => {
    setMaintenanceState(status);
    if (status) {
      void setItem(StorageKeys.maintenance, JSON.stringify(status));
    }
  }, []);

  const checkMaintenance = useCallback(async (): Promise<MaintenanceStatus | null> => {
    try {
      const status = await api.maintenanceStatus();
      setMaintenance(status);
      return status;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [setMaintenance]);

  useEffect(() => {
    void checkMaintenance();

    // Hook API client 503 response listener: instantly enable maintenance if any API returned 503 maintenance_mode
    onMaintenanceMode((payload) => {
      if (payload && payload.enabled !== undefined) {
        setMaintenance(payload);
      } else {
        // If 503 returned without payload or generic payload, mark enabled
        const fallback: MaintenanceStatus = {
          enabled: true,
          title: payload?.title || 'Tijdelijk offline voor onderhoud',
          message: payload?.message || 'Dichtbij3D is momenteel niet bereikbaar wegens gepland onderhoud.',
          until: payload?.until || null,
          updatedAt: payload?.updatedAt || new Date().toISOString(),
        };
        setMaintenance(fallback);
      }
    });

    // Background polling every 10 seconds to detect status changes in near real time
    const interval = setInterval(() => {
      void checkMaintenance();
    }, 10000);

    return () => {
      clearInterval(interval);
      onMaintenanceMode(null);
    };
  }, [checkMaintenance, setMaintenance]);

  const value = useMemo<MaintenanceValue>(
    () => ({
      maintenance,
      isMaintenanceActive: !!maintenance?.enabled,
      loading,
      checkMaintenance,
      setMaintenance,
    }),
    [maintenance, loading, checkMaintenance, setMaintenance],
  );

  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}
