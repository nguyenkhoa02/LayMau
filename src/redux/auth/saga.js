import {takeLatest, put, call} from 'redux-saga/effects';
import {loginUser, loginUserSuccess, loginUserFailure} from './slice';
import {authenticateUser} from './api';

function* handleLogin(action) {
    try {
        const {username, password} = action.payload;
        const user = yield call(authenticateUser, username, password);
        yield put(loginUserSuccess(user));
    } catch (error) {
        yield put(loginUserFailure(error.message));
    }
}

function* watchAuthSaga() {
    yield takeLatest(loginUser.type, handleLogin);
}

export default watchAuthSaga;