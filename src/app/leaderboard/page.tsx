'use client'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

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

  if (loading) return <div className="p-4 text-gray-400 text-center">載入中...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🏆 成績排行榜</h1>
      
      <div className="mb-4">
        <label htmlFor="sortBy" className="mr-2">排序依據：</label>
        <select
          id="sortBy"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'correctRate' | 'totalScore')}
          className="p-2 border rounded bg-zinc-200/20"
        >
          <option value="totalScore">分數</option>
          <option value="correctRate">正確率</option>
        </select>
      </div>

      {leaderboard.length === 0 ? (
        <div>尚無作答資料。</div>
      ) : (
        <table className="min-w-full table-auto shadow">
          <thead>
            <tr className="border-b bg-zinc-200/20">
              <th className="px-4 py-2">排名</th>
              <th className="px-4 py-2">頭像</th>
              <th className="px-4 py-2">暱稱</th>
              <th className="px-4 py-2">正確率</th>
              <th className="px-4 py-2">分數</th>
              <th className="px-4 py-2">作答次數</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user, idx) => {
              let rankEmoji = '❓'
              if (idx === 0) rankEmoji = '🥇'
              else if (idx === 1) rankEmoji = '🥈'
              else if (idx === 2) rankEmoji = '🥉'

              return (
                <tr key={generateId()} className="border-b text-center">
                  {idx < 3 ? (<td key={generateId()} className="px-4 py-2 text-3xl">{rankEmoji}</td>) : (<td className="px-4 py-2">#{idx + 1}</td>)}
                  <td key={generateId()} className="px-4 py-2 flex justify-center items-center">
                    {/*`https://avatars.dicebear.com/api/initials/${user.name}.svg`*/}
                    <img
                      src={user.avatarUrl === '' ? '/img/unknown-user.png' : user.avatarUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  </td>
                  <td key={generateId()} className="px-4 py-2">{user.nickname || user.name}</td>
                  <td key={generateId()} className="px-4 py-2">{(user.correctRate * 100).toFixed(2)}%</td>
                  <td key={generateId()} className="px-4 py-2">{user.totalScore}</td>
                  <td key={generateId()} className="px-4 py-2">{user.totalQuestions}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
