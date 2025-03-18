import React, { useEffect, useState } from 'react';
import ImageList from './components/ImageList';
import WebStream from '../LayMau/Video/WebStream';
import { ProgressBar } from '../../Components';
import { InfoForm } from './components/InfoForm';
import { useDispatch } from 'react-redux';
import { createFaceStart } from '../../redux/faces/slice';

const base64ToBlob = (base64, contentType = 'image/jpeg') => {
  const byteCharacters = atob(base64.split(',')[1]); // Remove "data:image/jpeg;base64," prefix
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

const LayMau = () => {
  const dispatch = useDispatch();

  const [images, setImages] = useState({
    front: [],
    left: [],
    right: [],
    down: [],
    up: [],
  });

  const totalImages = 2 * 5; // Maximum desired images for progress calculation
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const imageCollected = Object.values(images).reduce((acc, arr) => acc + arr.length, 0);
    const newProgress = totalImages > 0 ? (imageCollected / totalImages) * 100 : 0;
    setProgress(newProgress);
  }, [images, totalImages]);

  const onSubmit = (images, code, fullName, is_staff) => {
    const formData = new FormData();

    Object.entries(images).forEach(([direction, imageArray]) => {
      imageArray.forEach((image, index) => {
        const blob = image.startsWith('data:image')
          ? base64ToBlob(image)
          : new Blob([image], { type: 'image/jpeg' });
        formData.append('images', blob, `face_${direction}_${index}.jpg`);
      });
    });

    formData.append('full_name', fullName);
    formData.append('code', code);
    formData.append('is_staff', String(is_staff));

    console.log('Form submitted:', formData);
    dispatch(createFaceStart(formData));
  };

  return (
    <>
      <div>
        <WebStream images={images} setImages={setImages} totalImages={totalImages} />
      </div>
      <div>
        <ProgressBar progress={progress} />
        <ImageList images={images} setImages={setImages} />
      </div>
      <div>
        {images && (
          <InfoForm
            onSubmit={(code, fullName, is_staff) => onSubmit(images, code, fullName, is_staff)}
          />
        )}
      </div>
    </>
  );
};

export default LayMau;
