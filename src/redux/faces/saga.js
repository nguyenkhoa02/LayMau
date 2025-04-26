import { takeLatest, put, call } from "redux-saga/effects";
import {
  deleteFaceAPI,
  getFaceByCodeAPI,
  getFacesAPI,
  sendFaceAPI,
  sendVideoAPI,
} from "./api";
import {
  deleteFaceFailure,
  deleteFaceStart,
  deleteFaceSuccess,
  getFacesFailure,
  getFacesStart,
  getFacesSuccess,
  createFaceFailure,
  createFaceStart,
  createFaceSuccess,
  createVideoFailure,
  createVideoStart,
  createVideoSuccess,
  getFaceSuccess,
  getFaceFailure,
  getFaceStart,
} from "./slice";

function* handleSendFaces(action) {
  try {
    const data = action.payload;
    const response = yield call(sendFaceAPI, data);
    yield put(createFaceSuccess(response));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    yield put(createFaceFailure(errorMessage));
  }
}

function* handleGetFaces(action) {
  try {
    const { page, limit } = action.payload;
    const response = yield call(getFacesAPI, [page, limit]);
    yield put(getFacesSuccess(response));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    yield put(getFacesFailure(errorMessage));
  }
}

function* handleSendVideo(action) {
  try {
    const data = action.payload;
    const response = yield call(sendVideoAPI, data);
    yield put(createVideoSuccess(response));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    yield put(createVideoFailure(errorMessage));
  }
}

function* handleDeleteFace(action) {
  try {
    const data = action.payload;
    const response = yield call(deleteFaceAPI, data);
    yield put(deleteFaceSuccess(response));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    yield put(deleteFaceFailure(errorMessage));
  }
}

function* handleGetFace(action) {
  try {
    const data = action.payload;
    const response = yield call(getFaceByCodeAPI, data);
    yield put(getFaceSuccess(response));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    yield put(getFaceFailure(errorMessage));
  }
}

function* watchFaceSaga() {
  yield takeLatest(createFaceStart.type, handleSendFaces);
  yield takeLatest(getFacesStart.type, handleGetFaces);
  yield takeLatest(createVideoStart.type, handleSendVideo);
  yield takeLatest(deleteFaceStart.type, handleDeleteFace);
  yield takeLatest(getFaceStart.type, handleGetFace);
}

export default watchFaceSaga;
