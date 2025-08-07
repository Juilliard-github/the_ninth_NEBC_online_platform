'use client'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
interface SimplifiedUser {
  uid: string,
  name: string,
  nickname: string,
  avatarUrl: string,
  totalScore: number,
  correctRate: number, // 正確率
  totalQuestions: number,
  correctCount: number,
}

export default function GlobalLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<SimplifiedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'correctRate' | 'totalScore'>('totalScore') // 排序依據，默認根據分數排序
  const generateId = () => Math.random().toString()

  useEffect(() => {
    const fetchScores = async () => {
      // Fetch users data
      const usersSnap = await getDocs(collection(db, 'users'))
      const userMap: Record<string, SimplifiedUser> = {}

      // Loop through users to collect data
      usersSnap.forEach(userDoc => {
        const data = userDoc.data()
        if (data.deleted) return
        const id = data.uid
        const name = data.name
        const nickname = data.nickname || name
        const avatarUrl = data.avatarUrl || ''
        const totalScore = data.totalScore || 0
        const correctCount = data.correctCount || 0
        const totalQuestions = data.totalQuestions || 0
        // Initialize user data
        userMap[id] = {
          uid: id,
          name,
          nickname,
          avatarUrl,
          totalScore,
          correctRate: totalQuestions > 0 ? correctCount / totalQuestions : 0, // 正確率
          totalQuestions,
          correctCount,
        }
      })

      // Sort users based on the selected sorting option (`correctRate` or `totalScore`)
      const sorted = Object.values(userMap).sort((a, b) => {
        return sortBy === 'correctRate'
          ? b.correctRate - a.correctRate // Sort by correct rate
          : b.totalScore - a.totalScore // Sort by total score
      })

      setLeaderboard(sorted)
      setLoading(false)
    }

    fetchScores()
  }, [sortBy]) // Re-run when sorting method changes

  return (
    <main>
      <h1><EmojiEventsIcon/> 成績排行榜</h1>
      <div className="mb-4">
        <label htmlFor="sortBy">排序依據：</label>
        <select
          id="sortBy"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'correctRate' | 'totalScore')}
          className="p-2 bg-zinc-200/20 border border-gray-300 rounded-xl"
        >
          <option value="totalScore">分數</option>
          <option value="correctRate">正確率</option>
        </select>
      </div>

      {leaderboard.length === 0 ? (
        <div>尚無作答資料。</div>
      ) : (
        <div className='overflow-x-auto'>
          <table>
            <thead>
              <tr className="bg-zinc-200/20">
                <th className='min-w-[6rem]'>排名</th>
                <th className='min-w-[6rem]'>頭像</th>
                <th className='min-w-[10rem]'>暱稱</th>
                <th className='min-w-[6rem]'>正確率</th>
                <th className='min-w-[6rem]'>分數</th>
                <th className='min-w-[6rem]'>作答次數</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((user, idx) => {
                let rankEmoji = '❓'
                if (idx === 0) rankEmoji = '🥇'
                else if (idx === 1) rankEmoji = '🥈'
                else if (idx === 2) rankEmoji = '🥉'

                return (
                  <tr key={generateId()}>
                    {idx < 3 ? (<td key={generateId()} className="rankEmoji">{rankEmoji}</td>) : (<td>#{idx + 1}</td>)}
                    <td key={generateId()}>
                      <img
                        className='avatar'
                        src={user.avatarUrl === '' ? '/img/profile-icon-design-free-vector.jpg' : user.avatarUrl}
                        alt={user.name}
                      />
                    </td>
                    <td key={generateId()}>{user.nickname || user.name || '⚡'}</td>
                    <td key={generateId()}>{(user.correctRate * 100).toFixed(2)}%</td>
                    <td key={generateId()}>{user.totalScore}</td>
                    <td key={generateId()}>{user.totalQuestions}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
