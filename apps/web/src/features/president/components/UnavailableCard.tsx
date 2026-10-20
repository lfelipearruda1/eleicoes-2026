import styles from './ResultCard.module.css'

interface UnavailableCardProps {
  title: string
  message: string
  separated?: boolean
}

export function UnavailableCard({
  title,
  message,
  separated = false,
}: UnavailableCardProps) {
  return (
    <div className={`${styles.card} ${separated ? styles.separated : ''}`}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
    </div>
  )
}
