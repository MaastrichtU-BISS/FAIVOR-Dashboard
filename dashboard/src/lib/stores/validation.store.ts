import { writable } from 'svelte/store';
import type { ValidationJob } from '$lib/types/validation';

export type ValidationMode = 'create' | 'view' | 'edit';

// Re-export ValidationJob for backwards compatibility
export type { ValidationJob };

interface ValidationStoreState {
  currentValidation: ValidationJob | null;
  mode: ValidationMode;
  isOpen: boolean;
}

const initialState: ValidationStoreState = {
  currentValidation: null,
  mode: 'create',
  isOpen: false
};

function createValidationStore() {
  const { subscribe, update, set } = writable<ValidationStoreState>(initialState);

  return {
    subscribe,

    openModal: (validation?: ValidationJob, mode: ValidationMode = 'create') => {
      update(state => ({
        ...state,
        currentValidation: validation || null,
        mode,
        isOpen: true
      }));
    },

    closeModal: () => {
      update(state => ({
        ...state,
        isOpen: false
      }));
    },

    setMode: (mode: ValidationMode) => {
      update(state => ({
        ...state,
        mode
      }));
    },

    updateValidation: (updatedValidation: Partial<ValidationJob>) => {
      update(state => {
        if (!state.currentValidation) {
          return {
            ...state,
            currentValidation: updatedValidation as ValidationJob
          };
        }

        return {
          ...state,
          currentValidation: {
            ...state.currentValidation,
            ...updatedValidation
          }
        };
      });
    },

    reset: () => {
      set(initialState);
    }
  };
}

export const validationStore = createValidationStore();
