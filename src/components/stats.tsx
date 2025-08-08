import { OnlineUserCount } from '@/components/onlineUserCount'
import { TotalVisitors } from '@/components/totalVisitors'
import { AverageRating } from '@/components/fetchRating'

export default function Stats() {
  return (
    <div className='stats'>
      <span><OnlineUserCount/></span>
      <span><TotalVisitors/></span>
      <span><AverageRating/></span>
    </div>
  )
}
