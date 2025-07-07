'use client'

export default function HomePage() {
  return (
    <div className="relative z-10 p-8 max-w-5xl mx-auto space-y-8 font-[ChenYuluoyan] text-center max-h-screen overflow-y-hidden overflow-x-hidden">
      {/* 歡迎標題 */}
      <div className="my-6 text-4xl md:text-5xl lg:text-6xl font-medium splash-text">
        ~ 歡迎回來 ~
        <br />
        竹科實中 9th 生研線上練習平台
      </div>

      {/* 介紹文字 */}
      <div className="text-lg md:text-xl fade-in-text break-word font-light leading-relaxed">
        讓我們開始探索之旅，突破自我，迎接挑戰！
      </div>
    </div>
  )
}
