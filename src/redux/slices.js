import authReducer from './auth/slice';
import faceReducer from './faces/slice';
import trainReducer from './train/slice';

const reducers = {
  auth: authReducer,
  face: faceReducer,
  train: trainReducer,
};

export default reducers;
