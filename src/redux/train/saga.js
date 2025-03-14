import { applyAPI, trainAPI } from '../train/api';
import { takeLatest, put, call } from 'redux-saga/effects';
import {
  applyFailure,
  applyStart,
  applySuccess,
  trainFailure,
  trainStart,
  trainSuccess,
} from '../train/slice';

function* handleTrain() {
  try {
    const response = yield call(trainAPI);
    yield put(trainSuccess(response));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    yield put(trainFailure(errorMessage));
  }
}

function* handleApply() {
  try {
    const response = yield call(applyAPI);
    yield put(applySuccess(response));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    yield put(applyFailure(errorMessage));
  }
}

function* watchTrainSaga() {
  yield takeLatest(trainStart.type, handleTrain);
  yield takeLatest(applyStart.type, handleApply);
}

export default watchTrainSaga;
