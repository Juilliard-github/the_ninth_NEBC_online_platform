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
      <motion.svg
        width="1200"
        height="200"
        viewBox="0 0 800 200"
        xmlns="http://www.w3.org/2000/svg"
        className="z-10 mx-auto">
        {/* 使用motion.text進行逐字筆劃動畫 */}
        <motion.text
          x="50%" 
          y="40%" 
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="80" 
          fontWeight="normal"
          fill="black"
          stroke="white"
          strokeWidth='0.5'
          initial={{ strokeDasharray: 800, strokeDashoffset: 800 }}  // 初始狀態，文字完全隱藏
          animate={{ strokeDashoffset: 0 }}  // 動畫過程，逐筆顯示文字
          transition={{ duration: 5, ease: 'easeInOut' }}  // 設定動畫時長與過渡效果
        >
          歡迎來到
        </motion.text>
        <motion.text
          x="50%" 
          y="80%" 
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="80" 
          fontWeight="normal"
          fill="black"
          stroke="white"
          strokeWidth='0.5'
          initial={{ strokeDasharray: 800, strokeDashoffset: 800 }}  // 初始狀態，文字完全隱藏
          animate={{ strokeDashoffset: 0 }}  // 動畫過程，逐筆顯示文字
          transition={{ duration: 3, ease: 'easeInOut', delay: 0.5 }}  // 設定動畫時長與過渡效果
        >
          竹科實中 9th 生研線上練習平台
        </motion.text>
      </motion.svg>
      {/* 顯示更多文本 */}
      <motion.p
        className="text-4xl mt-6 drop-shadow-md"
                      style={{ textShadow: '2px 2px 2px rgba(0, 0, 0, 0.15)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3, delay: 0.5 }}
      >
        讓我們開始探索之旅，突破自我，迎接挑戰！
      </motion.p>
    </div>
  );
}

export default HomePage;
