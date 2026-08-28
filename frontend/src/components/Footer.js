'use client';

import React, { useState, useEffect } from 'react';
import styles from '../app/layout.module.css';
import { fetchLabSettings } from '../lib/labSettings';

export default function Footer() {
  const [labName, setLabName] = useState('Santoshpur Diagnostic Centre & Polyclinic');

  useEffect(() => {
    fetchLabSettings().then(cfg => {
      if (cfg && cfg.lab_name) setLabName(cfg.lab_name);
    });
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer className={`${styles.footer} no-print`}>
      <div className={styles.footerLeft}>
        <span>© {year} {labName}. All Rights Reserved.</span>
      </div>
      <div className={styles.footerRight}>
        <span className={styles.footerStatus}>
          <span className={styles.statusDot}></span>
          System Status: Online
        </span>
        <span>|</span>
        <span className={styles.footerLink}>Version 5.5</span>
        <span>|</span>
        <span className={styles.footerLink}>Terms of Service</span>
      </div>
    </footer>
  );
}
