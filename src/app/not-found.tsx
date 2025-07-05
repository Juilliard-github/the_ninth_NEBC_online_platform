'use client'

export default function NotFound() {
  console.log('Custom 404 page rendered');
  return (
    <main className="flex items-center flex flex-col justify-center text-center">
      <p className="text-xl">抱歉，找不到這個頁面！請檢查網址。</p>
      <img className="w-max-5xl" src="/img/404.png" alt="(˵ •̀ ᴗ - ˵ ) ✧404" />
    </main>
  )
}
