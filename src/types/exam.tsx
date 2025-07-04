import { Timestamp } from "firebase/firestore"

export interface Exam {
  id: string
  title: string
  description: string
  questionIds: {
    questionId: string
    score: number
  }[]
  groupType: 'highschool' | 'prep' | 'review'
  explanation?: string
  openAt?: Timestamp
  closeAt?: Timestamp
  createdAt: Timestamp
  updatedAt?: Timestamp
  timeLimit?: number
  deleted: boolean
  answerAvailableAt?: Timestamp
}