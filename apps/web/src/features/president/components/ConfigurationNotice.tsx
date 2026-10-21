import styles from './PresidentPage.module.css'
import panelStyles from './ResultsPanel.module.css'
import noticeStyles from './UpdateNotice.module.css'

export function ConfigurationNotice({ problems }: { problems: string[] }) {
  return (
    <div className={styles.root}>
      <main className={styles.main}>
        <section aria-labelledby="config-title" className={panelStyles.panel}>
          <h1 id="config-title" className={panelStyles.title}>
            Origem dos resultados não configurada
          </h1>
          <div role="alert" className={noticeStyles.notice}>
            <span className={noticeStyles.text}>
              Este build não sabe de onde ler os resultados e não fará
              consultas.
            </span>
          </div>
          <ul className={panelStyles.hint}>
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
