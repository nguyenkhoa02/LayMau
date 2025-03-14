import {createSlice} from '@reduxjs/toolkit';

const initialState = {
    user: null,
    error: null,
    status: 'idle',
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginUser(state) {
            state.status = 'pending';
        },
        loginUserSuccess(state, action) {
            state.user = action.payload.username;
            state.error = null;
            state.status = 'complete';
        },
        loginUserFailure(state, action) {
            state.user = null;
            state.error = action.payload;
            state.status = 'failed';
        },
    },
});

export const {
    loginUser,
    loginUserSuccess,
    loginUserFailure
} = authSlice.actions;

export default authSlice.reducer;