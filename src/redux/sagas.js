import { all } from 'redux-saga/effects';
import authSaga from './auth/saga';
import faceSaga from './faces/saga';
import trainSaga from './train/saga';

// Root saga
function* rootSaga() {
  yield all([authSaga(), faceSaga(), trainSaga()]);
}

export default rootSaga;
