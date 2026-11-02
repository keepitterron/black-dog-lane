// The line of text over the bottom of the scene. Stays up long enough to read, scaled by length.
import { useEffect, useState } from 'react'
import styles from './Message.module.css'

export type MessageItem = { id: number; text: string }

export function Message({ message }: { message: MessageItem | null }) {
  const [hiddenId, setHiddenId] = useState<number | null>(null)
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setHiddenId(message.id), Math.max(2800, message.text.length * 62))
    return () => clearTimeout(timer)
  }, [message])
  const show = message !== null && message.id !== hiddenId
  return (
    <div className={styles.message} data-show={show ? '' : undefined} role="status" aria-live="polite">
      {message?.text}
    </div>
  )
}
