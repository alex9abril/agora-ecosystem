/**
 * Redux Slice para Categorías
 * Maneja el estado de las categorías de productos
 * Las categorías se cargan de forma asíncrona durante la inicialización
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { categoriesService, ProductCategory, CategoriesResponse } from '@/lib/categories';

interface CategoriesState {
  // Categorías raíz (sin padre)
  rootCategories: ProductCategory[];
  // Todas las categorías indexadas por ID para acceso rápido
  categoriesById: Record<string, ProductCategory>;
  // Subcategorías indexadas por parent_id
  subcategoriesByParent: Record<string, ProductCategory[]>;
  // Estado de carga
  loading: boolean;
  error: string | null;
  // Timestamp de última actualización
  lastUpdated: number | null;
  // Flag para indicar si las categorías ya fueron cargadas
  initialized: boolean;
}

const initialState: CategoriesState = {
  rootCategories: [],
  categoriesById: {},
  subcategoriesByParent: {},
  loading: false,
  error: null,
  lastUpdated: null,
  initialized: false,
};

/**
 * Thunk para cargar todas las categorías raíz
 */
export const fetchRootCategories = createAsyncThunk(
  'categories/fetchRootCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await categoriesService.getRootCategories({
        isActive: true,
        globalOnly: true,
        limit: 100,
        sortBy: 'display_order',
        sortOrder: 'asc',
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error al cargar las categorías');
    }
  }
);

/**
 * Thunk para cargar subcategorías de una categoría padre
 */
export const fetchSubcategories = createAsyncThunk(
  'categories/fetchSubcategories',
  async (parentId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { categories: CategoriesState };
      // Si ya tenemos las subcategorías en cache, no hacer la petición
      if (state.categories.subcategoriesByParent[parentId]) {
        return { parentId, subcategories: state.categories.subcategoriesByParent[parentId] };
      }

      const response = await categoriesService.getSubcategories(parentId, {
        isActive: true,
        globalOnly: true,
        limit: 100,
      });
      return { parentId, subcategories: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error al cargar las subcategorías');
    }
  }
);

/**
 * Thunk para cargar una categoría por ID
 */
export const fetchCategoryById = createAsyncThunk(
  'categories/fetchCategoryById',
  async (categoryId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { categories: CategoriesState };
      // Si ya tenemos la categoría en cache, no hacer la petición
      if (state.categories.categoriesById[categoryId]) {
        return state.categories.categoriesById[categoryId];
      }

      const category = await categoriesService.getCategoryById(categoryId);
      return category;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error al cargar la categoría');
    }
  }
);

/**
 * Thunk para inicializar y cargar todas las categorías
 * Se ejecuta durante la carga inicial de la aplicación
 */
export const initializeCategories = createAsyncThunk(
  'categories/initialize',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // Cargar categorías raíz
      const rootCategoriesResult = await dispatch(fetchRootCategories());
      
      if (fetchRootCategories.fulfilled.match(rootCategoriesResult)) {
        const rootCategories = rootCategoriesResult.payload;
        
        // Cargar subcategorías de cada categoría raíz en paralelo
        const subcategoryPromises = rootCategories.map((category: ProductCategory) =>
          dispatch(fetchSubcategories(category.id))
        );
        
        await Promise.all(subcategoryPromises);
        
        return { success: true };
      } else {
        throw new Error('Error al cargar categorías raíz');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error al inicializar las categorías');
    }
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    // Limpiar el estado (útil para resetear en cada carga del sitio)
    clearCategories: (state) => {
      state.rootCategories = [];
      state.categoriesById = {};
      state.subcategoriesByParent = {};
      state.loading = false;
      state.error = null;
      state.lastUpdated = null;
      state.initialized = false;
    },
    // Forzar actualización de categorías
    refreshCategories: (state) => {
      state.initialized = false;
      state.lastUpdated = null;
    },
  },
  extraReducers: (builder) => {
    // fetchRootCategories
    builder
      .addCase(fetchRootCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRootCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.rootCategories = action.payload;
        state.lastUpdated = Date.now();
        
        // Indexar categorías por ID
        action.payload.forEach((category: ProductCategory) => {
          state.categoriesById[category.id] = category;
        });
      })
      .addCase(fetchRootCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchSubcategories
    builder
      .addCase(fetchSubcategories.pending, (state) => {
        // No cambiar loading global para no bloquear la UI
      })
      .addCase(fetchSubcategories.fulfilled, (state, action) => {
        const { parentId, subcategories } = action.payload;
        state.subcategoriesByParent[parentId] = subcategories;
        
        // Indexar subcategorías por ID
        subcategories.forEach((category: ProductCategory) => {
          state.categoriesById[category.id] = category;
        });
      })
      .addCase(fetchSubcategories.rejected, (state, action) => {
        // Error silencioso para subcategorías
        console.error('Error cargando subcategorías:', action.payload);
      });

    // fetchCategoryById
    builder
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        const category = action.payload;
        state.categoriesById[category.id] = category;
      });

    // initializeCategories
    builder
      .addCase(initializeCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeCategories.fulfilled, (state) => {
        state.loading = false;
        state.initialized = true;
        state.lastUpdated = Date.now();
      })
      .addCase(initializeCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.initialized = false;
      });
  },
});

export const { clearCategories, refreshCategories } = categoriesSlice.actions;

// Selectors
export const selectRootCategories = (state: { categories: CategoriesState }) => 
  state.categories.rootCategories;

export const selectCategoryById = (state: { categories: CategoriesState }, categoryId: string) =>
  state.categories.categoriesById[categoryId];

export const selectSubcategories = (state: { categories: CategoriesState }, parentId: string) =>
  state.categories.subcategoriesByParent[parentId] || [];

export const selectCategoriesLoading = (state: { categories: CategoriesState }) =>
  state.categories.loading;

export const selectCategoriesError = (state: { categories: CategoriesState }) =>
  state.categories.error;

export const selectCategoriesInitialized = (state: { categories: CategoriesState }) =>
  state.categories.initialized;

export const selectLastUpdated = (state: { categories: CategoriesState }) =>
  state.categories.lastUpdated;

export default categoriesSlice.reducer;

