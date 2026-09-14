import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api';
import type { AdvertList } from '../api/types';
import { useAuth } from './AuthContext';

interface ListsContextType {
  lists: AdvertList[];
  defaultList: AdvertList | undefined;
  refreshLists: () => Promise<void>;
  createList: (name: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  addToList: (listId: string, advertId: string) => Promise<void>;
  removeFromList: (listId: string, advertId: string) => Promise<void>;
}

const ListsContext = createContext<ListsContextType | undefined>(undefined);

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [lists, setLists] = useState<AdvertList[]>([]);

  const refreshLists = useCallback(async () => {
    if (!user) {
      setLists([]);
      return;
    }
    try {
      const data = await api.getLists();
      setLists(data);
    } catch {
      setLists([]);
    }
  }, [user]);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  const defaultList = useMemo(() => lists.find((l) => l.isDefault), [lists]);

  const createList = async (name: string) => {
    await api.createList(name);
    await refreshLists();
  };

  const deleteList = async (id: string) => {
    await api.deleteList(id);
    await refreshLists();
  };

  const addToList = async (listId: string, advertId: string) => {
    await api.addToList(listId, advertId);
    await refreshLists();
  };

  const removeFromList = async (listId: string, advertId: string) => {
    await api.removeFromList(listId, advertId);
    await refreshLists();
  };

  return (
    <ListsContext.Provider
      value={{ lists, defaultList, refreshLists, createList, deleteList, addToList, removeFromList }}
    >
      {children}
    </ListsContext.Provider>
  );
}

export function useLists() {
  const context = useContext(ListsContext);
  if (!context) throw new Error('useLists must be used within a ListsProvider');
  return context;
}
