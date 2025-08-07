'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Exam } from '@/types/exam'
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
  
  if (!exam) return <div className="p-5 text-gray-400 text-center">載入中...</div>

  return (
    <main>
      <h1>{exam.title} 排行榜</h1>
      <div className="mb-4">
        <label htmlFor="sortBy" className="mr-2">排序依據：</label>
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
              <tr className="border-b bg-zinc-200/20">
                <th className='min-w-[6rem]'>排名</th>
                <th className='min-w-[6rem]'>頭像</th>
                <th className='min-w-[10rem]'>暱稱</th>
                <th className='min-w-[6rem]'>正確率</th>
                <th className='min-w-[6rem]'>分數</th>
                <th className='min-w-[8rem]'>作答時間</th>            
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
                    {idx < 3 ? (<td key={generateId()} className="text-3xl">{rankEmoji}</td>) : (<td>#{idx + 1}</td>)}
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
                    <td key={generateId()}>{user.time === -1 ? '♾️' : `${(user.time/60000).toFixed(0)}分${((user.time/1000)%60).toFixed(0)}秒` }</td>
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
