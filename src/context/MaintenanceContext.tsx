import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { onMaintenanceMode } from '../api/client';
import type { MaintenanceStatus } from '../api/types';

interface MaintenanceValue {
  maintenance: MaintenanceStatus | null;
  isMaintenanceActive: boolean;
  loading: boolean;
  checkMaintenance: () => Promise<MaintenanceStatus | null>;
  setMaintenance: React.Dispatch<React.SetStateAction<MaintenanceStatus | null>>;
}

const MaintenanceContext = createContext<MaintenanceValue>({
  maintenance: null,
  isMaintenanceActive: false,
  loading: true,
  checkMaintenance: async () => null,
  setMaintenance: () => {},
});

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  useEffect(() => {
    void checkMaintenance();

    // Hook API client 503 response listener
    onMaintenanceMode((payload) => {
      if (payload) {
        setMaintenance(payload);
      } else {
        void checkMaintenance();
      }
    });

    // Background polling every 25 seconds to detect status changes in real time
    const interval = setInterval(() => {
      void checkMaintenance();
    }, 25000);

    return () => {
      clearInterval(interval);
      onMaintenanceMode(null);
    };
  }, [checkMaintenance]);

  const value = useMemo<MaintenanceValue>(
    () => ({
      maintenance,
      isMaintenanceActive: !!maintenance?.enabled,
      loading,
      checkMaintenance,
      setMaintenance,
    }),
    [maintenance, loading, checkMaintenance],
  );

  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}
