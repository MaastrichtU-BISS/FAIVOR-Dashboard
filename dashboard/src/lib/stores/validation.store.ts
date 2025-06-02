import { writable } from 'svelte/store';

export interface ValidationJob {
  val_id: string;
  validation_name?: string;
  start_datetime: string;
  validation_status: 'pending' | 'running' | 'completed' | 'failed';
  validation_result: {
    dataProvided?: boolean;
    dataCharacteristics?: boolean;
    metrics?: boolean;
    published?: boolean;
  };
  userName?: string;
  datasetDescription?: string;
  metricsDescription?: string;
  performanceMetrics?: string;
  modelId?: string;
}

export type ValidationMode = 'create' | 'view' | 'edit';

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
