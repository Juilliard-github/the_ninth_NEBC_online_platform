'use client'

export default function NewsPage() {
  return (
    <div className="relative z-10 p-8 max-w-5xl mx-auto space-y-8">
      <section>
        <h2 className="text-2xl font-bold border-l-4 border-black pl-2">最新消息</h2>
        <ul className="list-disc ml-6 mt-2 space-y-2">
          <li>2025-06-28 本站新增「練習題清單」功能 🎉</li>
          <li>2025-06-27 修正考試分數與顯示問題 🛠️</li>
        </ul>
      </section>
    </div>
  )
}