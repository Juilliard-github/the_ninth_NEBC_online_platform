import NewspaperIcon from '@mui/icons-material/Newspaper';
export default function NewsPage() {
  return (
    <main>
      <h1><NewspaperIcon/> 最新消息</h1>
      <ul className="list-disc space-y-2">
        <li>2025-08-07 啟用手機版網頁 📱</li>        
        <li>2025-06-28 本站新增「練習題清單」功能 🎉</li>
        <li>2025-06-27 修正考試分數與顯示問題 🛠️</li>
      </ul>
    </main>
  )
}