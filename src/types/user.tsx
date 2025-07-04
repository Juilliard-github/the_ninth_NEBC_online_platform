import { Timestamp } from "firebase/firestore"

export type userType = {
  uid: string
  role: string
  name: string
  nickname: string
  avatarUrl: string
  totalScore: number
  correctRate: number // 正確率 = 正確題數 / 總題數
  totalQuestions: number
  updatedAt: Timestamp
  createdAt: Timestamp
  lastRatedAt: Timestamp
  theme: string
  correctCount: number
  email: string
}

