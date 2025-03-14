import React, { useEffect, useState } from 'react';
import { User, IdCard, Video } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { createVideoStart, resetFaceState } from '../../redux/faces/slice';

const LayMauVideo = () => {
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [error, setError] = useState('');
  const [videoNoMask, setVideoNoMask] = useState(null);
  const [videoWithMask, setVideoWithMask] = useState(null);
  const [videoNoMaskPreview, setVideoNoMaskPreview] = useState('');
  const [videoWithMaskPreview, setVideoWithMaskPreview] = useState(null);
  const dispatch = useDispatch();
  const { isLoading, createSuccess, createFailure } = useSelector((state) => state.face);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || !fullName || !videoNoMask) {
      setError('Vui lòng điền đầy đủ thông tin và chọn video.');
      return;
    }
    setError('');

    const formData = new FormData();
    formData.append('code', code);
    formData.append('full_name', fullName);
    formData.append('is_staff', isStaff);
    formData.append('video_no_mask', videoNoMask);
    if (videoWithMask) {
      formData.append('video_with_mask', videoWithMask);
    }

    dispatch(createVideoStart(formData));
  };

  const handleVideoNoMaskChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoNoMask(file);
      setVideoNoMaskPreview(URL.createObjectURL(file));
    }
  };

  const handleVideoWithMaskChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoWithMask(file);
      setVideoWithMaskPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    if (createSuccess) {
      alert('Gửi video thành công!');
      setCode('');
      setFullName('');
      setIsStaff(false);
      setVideoNoMask(null);
      setVideoWithMask(null);
      setVideoNoMaskPreview('');
      setVideoWithMaskPreview('');
    }
    if (createFailure) {
      alert('Gửi video thất bại, vui lòng thử lại!');
    }

    return () => {
      dispatch(resetFaceState());
    };
  }, [createSuccess, createFailure]);

  return (
    <div className="max-w-3xl mx-auto w-full p-4 min-h-screen flex flex-col items-center py-8">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full space-y-6">
        {error && <div className="text-red-600 text-sm text-center">{error}</div>}

        <div className={'flex flex-wrap w-full'}>
          <div className={'w-full md:w-1/2 pr-3'}>
            <label htmlFor="code" className="block font-medium text-gray-700 mb-2">
              Mã sinh viên/Mã cán bộ
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IdCard className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="code"
                name="code"
                type="text"
                required
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập mã sinh viên/mã cán bộ"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          <div className={'w-full md:w-1/2 pl-3'}>
            <label htmlFor="fullName" className="block font-medium text-gray-700 mb-2">
              Họ và tên
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập họ và tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="isStaff"
            type="checkbox"
            checked={isStaff}
            onChange={(e) => setIsStaff(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isStaff" className="ml-2 text-sm text-gray-900">
            Là cán bộ
          </label>
        </div>

        <div className={'flex flex-wrap w-full'}>
          <div className={'w-full md:w-1/2 pr-3'}>
            <label htmlFor="video" className="block font-medium text-gray-700 mb-2">
              Tải lên video không khẩu trang
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Video className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="video"
                name="video"
                type="file"
                accept="video/*"
                required
                className="block w-full pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onChange={handleVideoNoMaskChange}
              />
            </div>
          </div>

          <div className={'w-full md:w-1/2 pl-3'}>
            <label htmlFor="video" className="block font-medium text-gray-700 mb-2">
              Tải lên video có khẩu trang
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Video className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="videoWithMask"
                name="video"
                type="file"
                accept="video/*"
                className="block w-full pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onChange={handleVideoWithMaskChange}
              />
            </div>
          </div>
        </div>

        <div className={'flex flex-wrap w-full'}>
          {videoNoMaskPreview && (
            <div className={'w-full md:w-1/2 pr-3'}>
              <video className=" w-full mt-4 rounded-lg" controls>
                <source src={videoNoMaskPreview} type="video/mp4" />
                Trình duyệt của bạn không hỗ trợ video.
              </video>
            </div>
          )}

          {videoWithMaskPreview && (
            <div className={'w-full md:w-1/2 pl-3'}>
              <video className="w-full mt-4 rounded-lg" controls>
                <source src={videoWithMaskPreview} type="video/mp4" />
                Trình duyệt của bạn không hỗ trợ video.
              </video>
            </div>
          )}
        </div>
        <button
          type="submit"
          className={`w-full py-2 px-4 rounded-lg text-white ${
            isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          } transition duration-200`}
          disabled={isLoading}
        >
          {isLoading ? 'Đang gửi...' : 'Gửi'}
        </button>
      </form>
    </div>
  );
};

export default LayMauVideo;
