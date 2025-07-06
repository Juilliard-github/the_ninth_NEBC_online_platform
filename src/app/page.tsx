'use client'
import React, { useEffect, useState } from 'react';

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
      <div className='my-6 text-6xl font-bold text-center splash-text'>
          歡迎回來<br/>竹科實中 9th 生研線上練習平台
      </div>
      <p className="fade-in-text break-word">讓我們開始探索之旅，突破自我，迎接挑戰！</p>
    </div>
  )
}

export default HomePage;
