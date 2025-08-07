import { OnlineUserCount } from './onlineUserCount'
import { TotalVisitors } from './totalVisitors'
import { AverageRating } from './fetchRating'

export default function Stats() {
  return (
    <div className='stats'>
      <span><OnlineUserCount/></span>
      <span><TotalVisitors/></span>
      <span><AverageRating/></span>
    </div>
  )
}
