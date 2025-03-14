import React, { useState } from 'react';
import { InfoForm } from './components/InfoForm';
import Socket from './Video';

const WebSocket = () => {
  const [formData, setFormData] = useState(null); // Lưu thông tin từ form
  const [images, setImages] = useState([]); // Lưu trữ ảnh nếu cần
  const [totalImages] = useState(10); // Tổng số ảnh nếu cần

  const handleFormSubmit = (code, fullName, isStaff) => {
    setFormData({ code, fullName, isStaff });
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8">
      {/*<h1 className="text-3xl font-bold mb-8">Face Recognition System</h1>*/}
      {!formData ? (
        <InfoForm onSubmit={handleFormSubmit} />
      ) : (
        <Socket
          images={images}
          setImages={setImages}
          totalImages={totalImages}
          code={formData.code}
          fullName={formData.fullName}
          isStaff={formData.isStaff}
        />
      )}
    </div>
  );
};

export default WebSocket;
