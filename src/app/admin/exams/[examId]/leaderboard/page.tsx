'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Exam } from '@/types/exam'
import { Toaster, toast } from 'sonner'
interface SimplifiedUserProfile {
  uid: string,
  name: string,
  nickname: string,
  avatarUrl: string,
}
interface SimplifiedUserData {
  uid: string,
  name: string,
  nickname: string,
  avatarUrl: string,
  totalScore: number,
  correctRate: number, // 正確率
  totalQuestions: number,
  correctCount: number,
  time: number,
}

export default function GlobalLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<SimplifiedUserData[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'correctRate' | 'totalScore'>('totalScore')
  const generateId = () => Math.random().toString()   
  const { examId } = useParams()
  const [exam, setExam] = useState<Exam | null>(null)

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)

      const usersSnap = await getDocs(collection(db, 'users'))
      const userMap: Record<string, SimplifiedUserProfile> = {}
      // Loop through users to collect data
      usersSnap.forEach(userDoc => {
        const data = userDoc.data()
        const id = data.uid
        const name = data.name
        const nickname = data.nickname || name
        const avatarUrl = data.avatarUrl || ''
        userMap[id] = {
          uid: id,
          name,
          nickname,
          avatarUrl,
        }
      })

      const examSnap = await getDoc(doc(db, 'exams', examId as string))
      if (!examSnap.exists()) return

      const examData = examSnap.data() as Exam
      setExam({ ...examData, id: examSnap.id })

      const answerSnap = await getDocs(
        query(collection(db, 'userAnswers'), where('examId', '==', examId))
      )

      const userDataMap: Record<string, SimplifiedUserData> = {}
  
      answerSnap.forEach(async userAnsDoc => {
        const data = userAnsDoc.data()
        const userId = data.userId
        const totalScore = data.totalScore || 0
        const correctCount = data.correctCount || 0
        const totalQuestions = data.totalQuestions || 0
        const time = data.time || -1
        const userData = userMap[userId]
        // Initialize user data
        if (userData) {
          // Initialize user data
          userDataMap[userId] = {
            uid: userId,
            name: userData.name,
            nickname: userData.nickname,
            avatarUrl: userData.avatarUrl,
            totalScore,
            correctRate: totalQuestions > 0 ? correctCount / totalQuestions : 0, // 正確率
            totalQuestions,
            correctCount,
            time,
          }
        }
      })

      // Sort users based on the selected sorting option (`correctRate` or `totalScore`)
      const sorted = Object.values(userDataMap).sort((a, b) => {
        return sortBy === 'correctRate'
          ? (b.correctRate - a.correctRate !== 0 ? b.correctRate - a.correctRate : a.time - b.time) // Sort by correct rate
          : (b.totalScore - a.totalScore !== 0 ? b.totalScore - a.totalScore : a.time - b.time) // Sort by total score
      })

      setLeaderboard(sorted)
      setLoading(false)
    }
    fetchScores()
  }, [examId, sortBy])
  
  if (loading || !exam) return <div className="p-6 text-gray-400 text-center">載入中...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Toaster richColors closeButton position="bottom-right" />
      <h1 className="text-2xl font-bold  mb-4">{exam.title} 排行榜</h1>
      
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
              <th className="px-4 py-2">作答時間</th>
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
                  <td key={generateId()} className="px-4 py-2">{user.nickname || user.name || '⚡'}</td>
                  <td key={generateId()} className="px-4 py-2">{(user.correctRate * 100).toFixed(2)}%</td>
                  <td key={generateId()} className="px-4 py-2">{user.totalScore}</td>
                  <td key={generateId()} className="px-4 py-2">{user.time === -1 ? '♾️' : `${(user.time/60000).toFixed(0)}分${((user.time/1000)%60).toFixed(0)}秒` }</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
