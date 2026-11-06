import React from 'react'
import { Gift } from 'lucide-react'
import styles from '../styles/WishListPage.module.css'

export const ItemSkeletons: React.FC<{ count?: number }> = ({ count = 2 }) => <div className={styles.skeletonList} aria-hidden="true">
  {Array.from({ length: count }, (_, index) => <div key={index} className={styles.skeletonItem}>
    <span className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
    <span className={`${styles.skeletonLine} ${styles.skeletonDetail}`} />
    <span className={styles.skeletonControls}>
      <span className={styles.skeletonControl} />
      <span className={styles.skeletonControl} />
      <span className={styles.skeletonControl} />
    </span>
  </div>)}
</div>

const PageLoading: React.FC<{ message: string }> = ({ message }) => <div className={styles.loadingContainer}>
  <div className={styles.pageSkeleton}>
    <div className={styles.loadingHeading} role="status" aria-live="polite">
      <span className={styles.loadingMark}><Gift size={22} aria-hidden="true" /></span>
      <span>{message}</span>
    </div>
    <div className={styles.loadingGrid} aria-hidden="true">
      <div className={styles.loadingPanel}>
        <span className={`${styles.skeletonLine} ${styles.skeletonHeadingLine}`} />
        <ItemSkeletons count={3} />
      </div>
      <div className={styles.loadingPanel}>
        <span className={`${styles.skeletonLine} ${styles.skeletonHeadingLine}`} />
        <ItemSkeletons count={2} />
      </div>
    </div>
  </div>
</div>

export default PageLoading
