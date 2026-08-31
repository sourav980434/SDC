import API_BASE from './apiConfig';

export const DEFAULT_LAB_CONFIG = {
  lab_name: 'Santoshpur Diagnostic Centre & Polyclinic',
  lab_short_name: 'SDCP',
  lab_address: '286, S.N. Roy Road, Santoshpur, Kolkata - 700075',
  lab_phone: '+91 33 2400 0000 / 2400 1111',
  lab_email: 'info@santoshpurdiagnostic.com',
  lab_website: 'www.santoshpurdiagnostic.com',
  lab_accreditation: 'NABL ACCREDITED LAB',
  lab_certification: 'ISO 9001:2015 CERTIFIED',
  report_disclaimer: 'Document generated digitally from LIMS Database. Suggested clinical correlation and repeat examination if necessary.',
  copyright_text: 'All Rights Reserved.',
  login_bg_image_url: '/santoshpur_building.jpg',
  login_theme_preset: 'building_image',
  login_logo_animation: 'pulse',
  report_signatories: [
    { name: 'Medical Technologist', designation: 'Checked By', isDoctor: false },
    { name: 'Dr. S. Bhattacharya, MD', designation: 'Consultant Radiologist & Sonologist', isDoctor: true },
    { name: 'Dr. A. K. Roy, MD (Path)', designation: 'Consultant Pathologist', isDoctor: true }
  ]
};

let cachedSettings = null;

export async function fetchLabSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/setup/settings`);
    if (!res.ok) throw new Error("Failed to load settings");
    const data = await res.json();
    
    if (data && data.settings) {
      const merged = { ...DEFAULT_LAB_CONFIG };
      Object.keys(data.settings).forEach(key => {
        if (data.settings[key] && data.settings[key].value !== undefined && data.settings[key].value !== null) {
          merged[key] = data.settings[key].value;
        }
      });
      cachedSettings = merged;
      return merged;
    }
  } catch (err) {
    console.warn("Could not fetch lab settings from backend, using defaults:", err);
  }
  return cachedSettings || DEFAULT_LAB_CONFIG;
}

export function getCachedLabSettings() {
  return cachedSettings || DEFAULT_LAB_CONFIG;
}
