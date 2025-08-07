import { usePathname } from "next/navigation";

export const navItems = () => {
  const pathName = usePathname()

  function isNavItemActive(pathname: string, nav: string){
    return pathName.includes(nav)
  }

  return [
    {
      name: '🏠︎ 首頁',
      href: '/',
      active: pathName === '/',
      position: 'top',
    },
    {
      name: '📢 最新消息',
      href: '/news',
      active: isNavItemActive(pathName, '/news'),
      position: 'top',
    },
    {
      name: '💬 留言板',
      href: '/guestbook',
      active: isNavItemActive(pathName, '/guestbook'),
      position: 'top',
    },
    {
      name: '🏅 排行榜',
      href: '/leaderboard',
      active: isNavItemActive(pathName, '/leaderboard'),
      position: 'top',
    },
    {
      name: '🔐 管理員後台',
      href: '/admin/dashboard',
      active: isNavItemActive(pathName, '/admin/dashboard'),
      position: 'side',
    },
    {
      name: '📋 題目清單',
      href: '/admin/questions/list',
      active: isNavItemActive(pathName, '/admin/questions/list'),
      position: 'side',
    },
    {
      name: '⛔ 已結束',
      href: '/user/practice-list#expired',
      active: isNavItemActive(pathName, '/user/practice-list#expired'),
      position: 'side',
    },
    {
      name: '🏫 高中練習',
      href: '/user/practice-list#highschool',
      active: isNavItemActive(pathName, '/user/practice-list#highschool'),
      position: 'side',
    },
    {
      name: '⭐ 錯題收藏',
      href: '/user/favorites/manage',
      active: isNavItemActive(pathName, '/user/favorites/manage'),
      position: 'side',
    }        
  ]
}