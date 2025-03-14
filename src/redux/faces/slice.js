import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: null,
  error: null,
  isLoading: false,
  createSuccess: false,
  updateSuccess: false,
  deleteSuccess: false,
  createFailure: false,
  updateFailure: false,
  deleteFailure: false,
};

const faceSlice = createSlice({
  name: 'face',
  initialState,
  reducers: {
    createFaceStart: (state) => {
      state.isLoading = true;
      state.createSuccess = false;
      state.createFailure = false;
      state.error = null;
    },
    createFaceSuccess: (state, action) => {
      state.isLoading = false;
      state.createSuccess = true;
      state.createFailure = false;
      state.data = action.payload;
    },
    createFaceFailure: (state, action) => {
      state.isLoading = false;
      state.createSuccess = false;
      state.createFailure = true;
      state.error = action.payload;
    },

    createVideoStart: (state) => {
      state.isLoading = true;
      state.createSuccess = false;
      state.createFailure = false;
      state.error = null;
    },
    createVideoSuccess: (state, action) => {
      state.isLoading = false;
      state.createSuccess = true;
      state.createFailure = false;
      state.data = action.payload;
    },
    createVideoFailure: (state, action) => {
      state.isLoading = false;
      state.createSuccess = false;
      state.createFailure = true;
      state.error = action.payload;
    },

    getFacesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getFacesSuccess: (state, action) => {
      state.isLoading = false;
      state.data = action.payload;
    },
    getFacesFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteFaceStart: (state) => {
      state.isLoading = true;
      state.deleteSuccess = false;
      state.deleteFailure = false;
      state.error = null;
    },
    deleteFaceSuccess: (state) => {
      state.isLoading = false;
      state.deleteSuccess = true;
      state.deleteFailure = false;
      state.error = null;
    },
    deleteFaceFailure: (state, action) => {
      state.isLoading = false;
      state.deleteSuccess = false;
      state.deleteFailure = true;
      state.error = action.payload;
    },

    getFaceStart: (state) => {
      state.isLoading = true;
      state.error = null;
      state.data = null;
    },
    getFaceSuccess: (state, action) => {
      state.isLoading = false;
      state.data = action.payload;
    },
    getFaceFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    resetFaceState: () => initialState,
  },
});

export const {
  createFaceStart,
  createFaceSuccess,
  createFaceFailure,
  createVideoStart,
  createVideoSuccess,
  createVideoFailure,
  getFacesStart,
  getFacesSuccess,
  getFacesFailure,
  deleteFaceStart,
  deleteFaceSuccess,
  deleteFaceFailure,
  resetFaceState,
  getFaceStart,
  getFaceSuccess,
  getFaceFailure,
} = faceSlice.actions;

export default faceSlice.reducer;
