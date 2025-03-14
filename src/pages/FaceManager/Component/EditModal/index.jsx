import React, { useEffect, useState } from 'react';
import { Video } from 'lucide-react';

const EditModal = ({ isOpen, onClose, person, onSave }) => {
  const [code, setCode] = useState(person?.code || '');
  const [fullName, setFullName] = useState(person?.fullName || '');
  const [isStaff, setIsStaff] = useState(person?.isStaff || false);
  const [videoFile, setVideoFile] = useState(null);
  // const [videoPreview, setVideoPreview] = useState(null);

  useEffect(() => {
    if (person) {
      setCode(person.code);
      setFullName(person.full_name);
      setIsStaff(person.isStaff);
    }
  }, [person]);

  const handleSave = () => {
    onSave({ ...person, code, fullName, isStaff, videoFile });
    onClose();
  };
  const handleVideoChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      setVideoFile(file);
      // setVideoPreview(URL.createObjectURL(file));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="z-40 fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-bold mb-4">Chỉnh sửa thông tin</h2>

        {/* Mã sinh viên/Mã cán bộ */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Mã sinh viên/Mã cán bộ</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        {/* Họ và tên */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        {/* Là cán bộ */}
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={isStaff}
            onChange={(e) => setIsStaff(e.target.checked)}
            className="h-4 w-4"
          />
          <label className="ml-2 text-sm text-gray-700">Là cán bộ</label>
        </div>

        <div className="mb-4">
          <label htmlFor="video" className="block font-medium text-gray-700 mb-2">
            Tải lên video
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
              className="block w-full pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              onChange={handleVideoChange}
            />
          </div>
        </div>

        {/*{videoPreview && (*/}
        {/*  <video className="w-full mt-4 rounded-lg" controls>*/}
        {/*    <source src={videoPreview} type="video/mp4" />*/}
        {/*    Trình duyệt của bạn không hỗ trợ video.*/}
        {/*  </video>*/}
        {/*)}*/}

        {/* Nút hành động */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
            Hủy
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
