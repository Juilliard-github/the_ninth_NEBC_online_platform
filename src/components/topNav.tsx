'use client'
import Link from "next/link"
import HomeIcon from '@mui/icons-material/Home';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import CommentIcon from '@mui/icons-material/Comment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export const TopNav = () => {
  return (
    <>
      <div className="topNav">
        <Link href="/"><HomeIcon/> 首頁</Link>
        <Link href="/news"><NewspaperIcon/> 最新消息</Link>
        <Link href="/guestbook"><CommentIcon/> 留言板</Link>
        <Link href="/leaderboard"><EmojiEventsIcon/> 排行榜</Link>  
      </div>
    </>
  )
}