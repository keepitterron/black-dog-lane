// The game's line of text. On tall portrait screens it sits in its own strip under the scene and
// the last line stays (dimmed) until the next one; elsewhere it overlays the top of the scene
// and fades out. Tapping it puts it away early. Which of the two is decided in CSS.
import { useEffect, useState } from 'react'
import styles from './Message.module.css'
import { messageMs } from './timing.ts'

export type MessageItem = { id: number; text: string }

export function Message({ message }: { message: MessageItem | null }) {
  const [doneId, setDoneId] = useState<number | null>(null)
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setDoneId(message.id), messageMs(message.text))
    return () => clearTimeout(timer)
  }, [message])
  const fresh = message !== null && message.id !== doneId
  return (
    <div
      className={styles.message}
      data-show={message ? '' : undefined}
      data-fresh={fresh ? '' : undefined}
      role="status"
      aria-live="polite"
      onClick={() => message && setDoneId(message.id)}
    >
      {message?.text}
    </div>
  )
}
