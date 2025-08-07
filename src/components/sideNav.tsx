'use client'
import { useUser } from './useUser'
import { Button } from "./button"
import { SignInUser } from '@/components/signIn'
import { signOutUser } from '@/components/signOut'
import Link from "next/link"
import { useState } from 'react'
import { Rating } from './ratingPopup'
import HomeIcon from '@mui/icons-material/Home';
import DeleteIcon from '@mui/icons-material/Delete';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import LogoutIcon from '@mui/icons-material/Logout';
import LaunchIcon from '@mui/icons-material/Launch';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import DoDisturbOnIcon from '@mui/icons-material/DoDisturbOn';
import AddBoxIcon from '@mui/icons-material/AddBox';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import ViewListIcon from '@mui/icons-material/ViewList';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import CommentIcon from '@mui/icons-material/Comment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LoginIcon from '@mui/icons-material/Login';
import DrawIcon from '@mui/icons-material/Draw';

export const SideNav = () => {
  const user = useUser()
  const [openSideBar, setOpenSideBar] = useState<boolean>(false)
  return (
    <>
      {user ? (
        <div className='account'>
          <div>{user.name}</div>
          <Link href="/profile" className='noEffect'>
            <img
              src={user.avatarUrl === '' ? '/img/profile-icon-design-free-vector.jpg' : user.avatarUrl}
              alt={user.name}
              className='w-8 h-8 rounded-full'
            />
          </Link>            
          <div>
            <Button onClick={() => {openSideBar === true ? setOpenSideBar(false) : setOpenSideBar(true)}} className={`noEffect ${openSideBar ? 'rotate-90' : 'rotate-0'}`}>
              ☰
            </Button>
            {openSideBar && (     
              <div className='hamburger'>
                <div className='sideNav'>
                  <Link href="/"><HomeIcon/> 首頁</Link>
                  <Link href="/news"><NewspaperIcon/> 最新消息</Link>
                  <Link href="/guestbook"><CommentIcon/> 留言板</Link>
                  <Link href="/leaderboard"><EmojiEventsIcon/> 排行榜</Link>        
                </div>
                {user && user.role === 'admin' && (
                  <>
                    <Link href="/admin/dashboard"><SupervisorAccountIcon/> 管理員後台</Link>
                    <Link href="/admin/questions/list"><ViewListIcon/> 題目清單</Link>
                    <Link href="/admin/questions/new"><AddBoxIcon/> 新增題目</Link>
                    <Link href="/admin/questions/trash"><DeleteIcon/> 題目垃圾桶</Link>
                    <Link href="/admin/exams/list"><ViewListIcon/> 考試清單</Link>
                    <Link href="/admin/exams/new"><AddBoxIcon/> 新增考試</Link>
                    <Link href="/admin/exams/trash"><DeleteIcon/> 考試垃圾桶</Link>
                  </>
                )}
                {user && user.role === 'user' && (
                  <div className='flex-col flex items-start'>
                    <Link href="/user/practice-list#not-yet-open"><HourglassBottomIcon/> 尚未開放考試</Link>
                    <Link href="/user/practice-list#open-now"><LaunchIcon/> 開放中考試</Link>
                    <Link href="/user/practice-list#expired"><DoDisturbOnIcon/> 已結束考試</Link>
                    <Link href="/user/practice-list#highschool"><DrawIcon/> 高中章節自由練習</Link>
                    <Link href="/user/favorites/manage"><BookmarksIcon/> 錯題收藏管理</Link>
                  </div>
                )}
                <Rating/>
                <Button onClick={() => {signOutUser; setOpenSideBar(false)}}><LogoutIcon/> 登出</Button>
              </div>
            )}
            </div>
        </div>
      ) : (
        <Button onClick={SignInUser} className='rainbow-box'><LoginIcon/> 登入</Button>
      )}
    </>
  )
}