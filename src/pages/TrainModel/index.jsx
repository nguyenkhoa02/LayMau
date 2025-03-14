import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { trainStart, trainReset, applyStart } from '../../redux/train/slice';
import { Loader2, XCircle, CheckCircle } from 'lucide-react';

const TrainModel = () => {
  const dispatch = useDispatch();
  const { isLoading, isSuccess, isFailure, isApplySuccess, isApplyFailure } = useSelector(
    (state) => state.train,
  );
  const [trainingComplete, setTrainingComplete] = useState(false);

  const [isApplySuccessState, setIsApplySuccessState] = useState(false);

  const train = async () => {
    setTrainingComplete(false);
    dispatch(trainReset()); // Reset trạng thái trước khi bắt đầu huấn luyện mới
    dispatch(trainStart());
  };
  const applyModel = () => {
    setIsApplySuccessState(false);
    dispatch(applyStart());
  };

  useEffect(() => {
    if (isSuccess) {
      setTrainingComplete(true);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isApplySuccess) {
      alert('Mô hình đã được áp dụng thành công!');
      setIsApplySuccessState(true);
    } else if (isApplyFailure) {
      alert('Đã xảy ra lỗi khi áp dụng mô hình!');
      setIsApplySuccessState(false);
    }
  }, [isApplySuccess, isApplyFailure]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 flex flex-col items-center justify-center space-y-4">
      <button
        onClick={train}
        disabled={isLoading}
        className={`w-96 flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 
          ${
            isLoading
              ? 'bg-blue-500 cursor-not-allowed'
              : isFailure
                ? 'bg-red-600 hover:bg-red-700'
                : trainingComplete
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
          }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Đang huấn luyện...
          </>
        ) : isFailure ? (
          <>
            <XCircle className="w-4 h-4 mr-2" />
            Huấn luyện thất bại
          </>
        ) : trainingComplete ? (
          'Huấn luyện hoàn tất'
        ) : (
          'Huấn luyện'
        )}
      </button>

      {trainingComplete && (
        <button
          onClick={applyModel}
          disabled={isApplySuccessState}
          className={`w-96 flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 
      ${isApplySuccessState ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {isApplySuccessState ? 'Đã áp dụng' : 'Áp dụng mô hình'}
        </button>
      )}
    </div>
  );
};

export default TrainModel;
