import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_DOCUMENTS } from '../utils/constants';
import { analyzeChineseText } from '../utils/fileHelper';

export const useDocumentStore = create(
  persist(
    (set, get) => ({
      documents: DEFAULT_DOCUMENTS,
      activeDocumentId: "demo-1",
      folders: [
        { id: 'f-1', name: 'SS8201' },
        { id: 'f-2', name: 'Google AI Studio' }
      ],

      getActiveDocument: () => {
        const state = get();
        return state.documents.find(doc => doc.id === state.activeDocumentId) || null;
      },

      setActiveDocument: (id) => set({ activeDocumentId: id }),

      addFolder: (name) => {
        const cleanName = (name || '').trim();
        if (!cleanName) return null;
        const newFolder = {
          id: 'f-' + Date.now(),
          name: cleanName
        };
        set((state) => ({
          folders: [...(state.folders || []), newFolder]
        }));
        return newFolder;
      },

      renameFolder: (id, newName) => {
        const cleanName = (newName || '').trim();
        if (!cleanName) return;
        set((state) => ({
          folders: (state.folders || []).map(f => f.id === id ? { ...f, name: cleanName } : f)
        }));
      },

      deleteFolder: (id) => set((state) => ({
        folders: (state.folders || []).filter(f => f.id !== id),
        documents: state.documents.map(doc => doc.folderId === id ? { ...doc, folderId: null } : doc)
      })),

      moveDocumentToFolder: (docId, folderId) => set((state) => ({
        documents: state.documents.map(doc => String(doc.id) === String(docId) ? { ...doc, folderId } : doc)
      })),

      addDocument: (title, content, folderId = null) => {
        const id = "doc-" + Date.now();
        const analysis = analyzeChineseText(content);
        
        const newDoc = {
          id,
          title: title || "Untitled Document",
          content,
          date: new Date().toISOString().split('T')[0],
          progress: 0,
          folderId: folderId || null,
          ...analysis
        };

        set((state) => ({
          documents: [newDoc, ...state.documents],
          activeDocumentId: id // automatically switch to newly uploaded file!
        }));
        
        return newDoc;
      },

      deleteDocument: (id) => set((state) => {
        const filteredDocs = state.documents.filter(doc => doc.id !== id);
        // If we deleted the active document, fall back to another one or null
        let newActiveId = state.activeDocumentId;
        if (state.activeDocumentId === id) {
          newActiveId = filteredDocs.length > 0 ? filteredDocs[0].id : null;
        }
        return {
          documents: filteredDocs,
          activeDocumentId: newActiveId
        };
      }),

      updateReadingProgress: (id, progress) => set((state) => ({
        documents: state.documents.map(doc => 
          doc.id === id ? { ...doc, progress: Math.min(100, Math.max(0, progress)) } : doc
        )
      }))
    }),
    {
      name: 'hanora-documents-storage',
    }
  )
);
