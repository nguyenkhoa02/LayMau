import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: null,
  error: null,
  isSuccess: false,
  isFailure: false,
  isLoading: false,
  isApplySuccess: false,
  isApplyFailure: false,
};

const trainSlice = createSlice({
  name: 'train',
  initialState,
  reducers: {
    trainStart: (state) => {
      state.isLoading = true;
      state.isSuccess = false;
      state.isFailure = false;
      state.error = null;
    },
    trainSuccess: (state, action) => {
      state.isLoading = false;
      state.isSuccess = true;
      state.data = action.payload;
    },
    trainFailure: (state, action) => {
      state.isLoading = false;
      state.isFailure = true;
      state.error = action.payload;
    },

    trainReset: () => initialState,
    applyStart: (state) => {
      state.isApplySuccess = false;
      state.isApplyFailure = false;
    },
    applySuccess: (state, action) => {
      state.isApplySuccess = true;
      state.data = action.payload;
    },
    applyFailure: (state, action) => {
      state.isApplyFailure = true;
      state.error = action.payload;
    },
  },
});

export const {
  trainStart,
  trainSuccess,
  trainFailure,
  trainReset,
  applyStart,
  applySuccess,
  applyFailure,
} = trainSlice.actions;

export default trainSlice.reducer;
