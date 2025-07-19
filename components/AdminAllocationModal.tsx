'use client';
import React from 'react';
import { X } from 'lucide-react';
import dayjs from 'dayjs';
import styles from './AdminAllocationModal.module.css';
import cardStyles from './AllocationCard.module.css';

interface AdminAllocationModalProps {
  onClose: () => void;
  allocation: {
    total: string;
    tgeUnlock: string;
    cliffMonths: number;
    vestingMonths: number;
    claimed: string;
    startTimestamp: number;
  };
  lookupAddress: string;
}

export default function AdminAllocationModal({
  onClose,
  allocation,
  lookupAddress
}: AdminAllocationModalProps) {
  const fields = [
    { label: 'Total Allocation', value: `${formatWei(allocation.total)} GGC`, top: 85 },
    { label: 'TGE Unlock',        value: `${formatWei(allocation.tgeUnlock)} GGC`, top: 183 },
    { label: 'Cliff Period',      value: `${allocation.cliffMonths} month(s)`, top: 283 },
    { label: 'Vesting Period',    value: `${allocation.vestingMonths} month(s)`, top: 383 },
    { label: 'Claimed',           value: `${formatWei(allocation.claimed)} GGC`, top: 483 },
    { label: 'Start Date',        value: dayjs.unix(allocation.startTimestamp).format('MMMM D, YYYY'), top: 583 },
  ];

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.overlay} />
        <button className={styles.closeBtn} onClick={onClose}>
          <X className="h-4 w-4 text-white" />
        </button>
        <h3 className={styles.title}>{lookupAddress.slice(0, 6)}...{lookupAddress.slice(-4)}</h3>

        {/* reuse your AllocationCard layout but without the claim button */}
        <div className={styles.cardWrapper}>
        <div className={cardStyles.root}>
          <div className={cardStyles.popup} />
          {/* render each field at same absolute positions */}
          {fields.map(({ label, value, top }) => (
            <div
              key={label}
              className={cardStyles.field}
              style={{ top: `${top}px` }}
            >
              <div className={cardStyles.fieldBg} />
              <span className={cardStyles.fieldLabel}>{label}</span>
              <span className={cardStyles.fieldValue}>{value}</span>
            </div>
          ))}
          {/* NO claim-button here */}
        </div>
      </div>
    </div>
    </div>
  );
}

function formatWei(wei: string) {
  const len = wei.length;
  if (len <= 18) return '0.' + '0'.repeat(18 - len) + wei;
  return wei.slice(0, len - 18) + '.' + wei.slice(len - 18, len - 14);
}
