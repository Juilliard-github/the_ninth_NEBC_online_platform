'use client'
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const HomePage = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);  // Ensure that the code runs only in the client-side
  }, []);

  if (!isClient) {
    return null;  // or some static fallback content while server-side rendering
  }

  return (
    <div className="font-[ChenYuluoyan] flex flex-col justify-center items-center">
      {/* 歡迎文字動畫 */}
      <svg width="1200" height="200" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" className="z-10 mx-auto">
        <text x="50%" y="40%" textAnchor="middle" dominantBaseline="middle" className="animated-stroke">
          歡迎來到
        </text>
        <text x="50%" y="80%" textAnchor="middle" dominantBaseline="middle" className="animated-stroke delay">
          竹科實中 9th 生研線上練習平台
        </text>
      </svg>

      {/* 說明 */}
      <p className="fade-in-text">讓我們開始探索之旅，突破自我，迎接挑戰！</p>
    </div>
  );
}

export default HomePage;


