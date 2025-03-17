import React from 'react';
import LayMauVideo from '../LayMauVideo';
import WebSocket from '../WebSocket';
import FaceManager from '../FaceManager';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from '../../Components/';
import FaceDetail from '../FaceDetail';
import TrainModel from '../TrainModel';
import LayMau from '../LayMau'

const Home = () => {
  const nav = [
    { name: 'Quản lý mẫu', url: '/' },
    { name: 'Lấy mẫu video', url: '/lay-mau' },
    { name: 'Lấy mẫu webcam', url: '/websocket' },
    { name: 'Huấn luyện', url: '/train' },
  ];
  return (
    <>
      <Navbar navigation={nav}></Navbar>
      <LayMau></LayMau>

      <div className="mx-auto">
        <Routes>
          {/*<Route path="/" element= />*/}
          <Route path="/" element={<FaceManager />} />
          <Route path="/lay-mau" element={<LayMauVideo />} />
          <Route path="/websocket" element={<WebSocket />} />
          <Route path={'/faces/:code'} element={<FaceDetail />} />
          <Route path={'/train'} element={<TrainModel />} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </div>
    </>
  );
};

export default Home;
