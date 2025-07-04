import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore'


// ✅ 替換為你的 Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyCRuuyachKuZe5_9JHNo8Eok5J4ts53R1o",
  authDomain: "nebc-online-platform.firebaseapp.com",
  databaseURL: "https://nebc-online-platform-default-rtdb.firebaseio.com",
  projectId: "nebc-online-platform",
  storageBucket: "nebc-online-platform.firebasestorage.app",
  messagingSenderId: "811077159390",
  appId: "1:811077159390:web:b80a43a0ad14a89f2ff54f"
};


const app = initializeApp(firebaseConfig)
const db = getFirestore(app)


async function migrateUserAnswers() {
  const usersSnap = await getDocs(collection(db, 'users'))
  
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id
    const userAnswersSnap = await getDocs(collection(db, 'users', userId, 'userAnswers'))


    for (const answerDoc of userAnswersSnap.docs) {
      const examId = answerDoc.id
      const data = answerDoc.data()


      const rootDocId = `${examId}_${userId}`


      await setDoc(doc(db, 'userAnswers', rootDocId), {
        userId,
        examId,
        answers: data.answers || {},
        createdAt: data.createdAt || Timestamp.now()
      })


      console.log(`✅ 已搬移: ${rootDocId}`)
    }
  }


  console.log('✅ 所有 userAnswers 已搬移至根集合')
}


migrateUserAnswers().catch(console.error)

