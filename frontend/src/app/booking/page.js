'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useHotkeys } from '@/context/HotkeyContext';
import { 
  UserPlus, 
  FlaskConical, 
  Printer, 
  Send, 
  Trash2, 
  Search, 
  CircleDot,
  History,
  Users,
  CreditCard,
  Wallet,
  X,
  Save,
  FileText,
  ShieldAlert,
  Plus,
  ListFilter,
  Calendar,
  Filter,
  RotateCcw,
  Edit3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import styles from './booking.module.css';
import PermissionButton from '@/components/PermissionButton';
import { useActionPermission } from '@/hooks/useActionPermission';

import API_BASE from '@/lib/apiConfig';
import { getDeptBadgeStyle, DEPT_BADGE_BASE } from '@/lib/deptBadge';
import { generateA5BookingReceiptHTML } from '@/lib/bookingReceiptTemplate';
import { generateA5BillReceiptHTML } from '@/lib/billReceiptTemplate';
import { generateA5PartPaymentReceiptHTML } from '@/lib/partPaymentReceiptTemplate';
import { generateA5DepartmentSlipsHTML } from '@/lib/deptSlipTemplate';

export default function NewBooking() {
  const { shortcuts, parseKeyEvent } = useHotkeys();

  const [activeUserSession, setActiveUserSession] = useState(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('sdcp_user_session');
      if (stored) {
        setActiveUserSession(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const bookingPerms = useActionPermission('booking');

  const hasBookingPermission = () => {
    if (!activeUserSession) return true;
    if (activeUserSession.role_code === 'ADMIN') return true;
    const mods = activeUserSession.modules || [];
    const modKeys = mods.map(m => typeof m === 'object' ? m.module_key : m);
    if (!modKeys.includes('booking')) return false;
    return bookingPerms.can_view !== false;
  };

  const [currentDate, setCurrentDate] = useState('');
  const [bookingNo, setBookingNo] = useState('');
  const [bookingSerial, setBookingSerial] = useState('00001');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [savedBookingNo, setSavedBookingNo] = useState('');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState('');
  const [savedBillInfo, setSavedBillInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('CG1');
  const [selectedCollector, setSelectedCollector] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [prefix, setPrefix] = useState('Mr.');
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('Yrs');
  const [sex, setSex] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [drResults, setDrResults] = useState([]);
  const [showDrResults, setShowDrResults] = useState(false);
  const [activeDrIndex, setActiveDrIndex] = useState(0);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [testSearch, setTestSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [discountType, setDiscountType] = useState('percent'); // 'percent' or 'amount'
  const [discountValue, setDiscountValue] = useState('');
  const [collectionCharge, setCollectionCharge] = useState('');
  const [procedureCharge, setProcedureCharge] = useState('');
  const [paymentMode, setPaymentMode] = useState('full'); // 'full' or 'part'
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [isPatientImplemented, setIsPatientImplemented] = useState(false);
  
  // Patient autocomplete states
  const [patientNameResults, setPatientNameResults] = useState([]);
  const [showPatientNameResults, setShowPatientNameResults] = useState(false);
  const [activePatientNameIndex, setActivePatientNameIndex] = useState(0);

  const [patientPhoneResults, setPatientPhoneResults] = useState([]);
  const [showPatientPhoneResults, setShowPatientPhoneResults] = useState(false);
  const [activePatientPhoneIndex, setActivePatientPhoneIndex] = useState(0);

  // Refs to track programmatically set/selected values to prevent auto-search dropdown triggers
  const lastSelectedNameRef = useRef('');
  const lastSelectedPhoneRef = useRef('');

  // New Patient popup modal state
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  
  // New Patient Modal fields
  const [newPrefix, setNewPrefix] = useState('Mr.');
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newAgeUnit, setNewAgeUnit] = useState('Yrs');
  const [newSex, setNewSex] = useState('Male');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Final Invoice Modal State
  const [showFinalInvoiceModal, setShowFinalInvoiceModal] = useState(false);
  const [generatedInvoiceData, setGeneratedInvoiceData] = useState(null);

  // Settlement Prompt Modal States
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementBkNo, setSettlementBkNo] = useState('');
  const [settlementDue, setSettlementDue] = useState(0);
  const [settlementCollectAmt, setSettlementCollectAmt] = useState('');
  const [settlementPayMode, setSettlementPayMode] = useState('Cash');

  // Industrial Booking List Explorer Modal States
  const [showExplorerModal, setShowExplorerModal] = useState(false);
  const [explorerData, setExplorerData] = useState([]);
  const [explorerSummary, setExplorerSummary] = useState(null);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerSearch, setExplorerSearch] = useState('');
  const [explorerDatePreset, setExplorerDatePreset] = useState('all');
  const [explorerFromDate, setExplorerFromDate] = useState('');
  const [explorerToDate, setExplorerToDate] = useState('');
  const [explorerPayStatus, setExplorerPayStatus] = useState('ALL');
  const [explorerPage, setExplorerPage] = useState(1);
  const [explorerLastPage, setExplorerLastPage] = useState(1);
  const [explorerTotal, setExplorerTotal] = useState(0);
  const [activeExplorerIndex, setActiveExplorerIndex] = useState(0);
  const activeExplorerRowRef = useRef(null);
  const activeExplorerIndexRef = useRef(0);
  const explorerDataRef = useRef([]);
  const explorerSearchRef = useRef(null);
  const [searchNotification, setSearchNotification] = useState('');

  useEffect(() => {
    activeExplorerIndexRef.current = activeExplorerIndex;
  }, [activeExplorerIndex]);

  useEffect(() => {
    explorerDataRef.current = explorerData;
  }, [explorerData]);

  // Automatic Modal Focus Trapping & Restoration Logic
  useEffect(() => {
    if (showExplorerModal) {
      const timer = setTimeout(() => {
        explorerSearchRef.current?.focus();
        explorerSearchRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [showExplorerModal]);

  useEffect(() => {
    const isAnyModalOpen = showExplorerModal || showHistoryModal || showNewPatientModal || showPaymentHistoryModal || showSettlementModal || showFinalInvoiceModal;
    if (!isAnyModalOpen) {
      const timer = setTimeout(() => {
        if (codeRef.current && (document.activeElement === document.body || !document.activeElement)) {
          codeRef.current.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [showExplorerModal, showHistoryModal, showNewPatientModal, showPaymentHistoryModal, showSettlementModal, showFinalInvoiceModal]);

  // Keyboard navigation & Autocomplete Index
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  // Form Field Refs for focus traversal
  const codeRef = useRef(null);
  const prefixRef = useRef(null);
  const nameRef = useRef(null);
  const ageRef = useRef(null);
  const ageUnitRef = useRef(null);
  const sexRef = useRef(null);
  const phoneRef = useRef(null);
  const addressRef = useRef(null);
  const referredRef = useRef(null);
  const categoryRef = useRef(null);
  const collectorRef = useRef(null);
  const searchRef = useRef(null);
  const receivedAmountRef = useRef(null);
  const discountValueRef = useRef(null);
  const discountTypeRef = useRef(null);
  const collectionChargeRef = useRef(null);
  const procedureChargeRef = useRef(null);
  const paymentMethodSelectRef = useRef(null);
  const saveBookingBtnRef = useRef(null);
  const printReceiptBtnRef = useRef(null);
  const generateTaxInvBtnRef = useRef(null);
  const sendWhatsappBtnRef = useRef(null);
  const deptSlipBtnRef = useRef(null);
  const searchPatientBtnRef = useRef(null);
  const drContainerRef = useRef(null);
  const testContainerRef = useRef(null);

  const formFields = [
    codeRef,       // 0
    prefixRef,     // 1
    nameRef,       // 2
    ageRef,        // 3
    ageUnitRef,    // 4
    sexRef,        // 5
    phoneRef,      // 6
    addressRef,    // 7
    referredRef,   // 8
    categoryRef,   // 9
    collectorRef,  // 10
    searchRef      // 11
  ];

  const resetToNextBookingNo = () => {
    fetch(`${API_BASE}/api/booking/next-no`)
      .then(res => res.json())
      .then(data => {
        if (data.serial && data.booking_no) {
          setBookingSerial(data.serial);
          setBookingNo(data.booking_no);
        }
      })
      .catch(err => {
        console.error("Error fetching next booking no:", err);
      });
  };

  // Set today's date, live ticking clock, and check table status on load
  useEffect(() => {
    const updateDateTime = () => {
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-GB'); // DD/MM/YYYY
      setCurrentDate(dateStr);
      
      const is24h = localStorage.getItem('sdcp_time_format') === '24h';
      let timeStr = '';
      if (is24h) {
        const hrs = String(today.getHours()).padStart(2, '0');
        const mins = String(today.getMinutes()).padStart(2, '0');
        const secs = String(today.getSeconds()).padStart(2, '0');
        timeStr = `${hrs}:${mins}:${secs}`;
      } else {
        let hrs = today.getHours();
        const mins = String(today.getMinutes()).padStart(2, '0');
        const secs = String(today.getSeconds()).padStart(2, '0');
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        hrs = hrs % 12;
        hrs = hrs ? hrs : 12; // the hour '0' should be '12'
        const hrsStr = String(hrs).padStart(2, '0');
        timeStr = `${hrsStr}:${mins}:${secs} ${ampm}`;
      }
      setCurrentTime(timeStr);
    };

    updateDateTime();
    const clockInterval = setInterval(updateDateTime, 1000);

    // Initial booking number calculation
    resetToNextBookingNo();
    
    // Check patient master status
    fetch(`${API_BASE}/api/master/patients/status`)
      .then(res => res.json())
      .then(data => setIsPatientImplemented(data.implemented))
      .catch(err => console.error("Error checking patient table status:", err));

    // Fetch categories with fallback
    fetch(`${API_BASE}/api/master/categories`)
      .then(res => res.json())
      .then(data => {
        setCategories(data || []);
      })
      .catch(err => {
        console.error("Error fetching categories, using fallback:", err);
        setCategories([{ Code: 'CG1', Descr: 'GENERAL' }]);
      });

    // Fetch collectors with fallback
    fetch(`${API_BASE}/api/master/collectors?per_page=1000`)
      .then(res => res.json())
      .then(data => {
        const loadedCollectors = data.data || [];
        setCollectors(loadedCollectors.filter(c => Number(c.Status) === 1));
      })
      .catch(err => {
        console.error("Error fetching collectors, using fallback:", err);
        setCollectors([{ Code: 'CL000001', Descr: 'KHOKAN DAS', Status: 1 }]);
      });

    codeRef.current?.focus();

    // Listen for storage events (e.g. from the Setup tab)
    const handleStorage = () => {
      updateDateTime();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(clockInterval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const activePatientNameRef = useRef(null);
  const activePatientPhoneRef = useRef(null);

  useEffect(() => {
    if (activePatientNameRef.current) {
      activePatientNameRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [activePatientNameIndex]);

  useEffect(() => {
    if (activePatientPhoneRef.current) {
      activePatientPhoneRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [activePatientPhoneIndex]);

  // Autocomplete suggestions fetch
  useEffect(() => {
    if (patientName === lastSelectedNameRef.current) {
      setPatientNameResults([]);
      setShowPatientNameResults(false);
      return;
    }

    if (!isPatientImplemented || patientName.trim() === '' || patientCode) {
      setPatientNameResults([]);
      setShowPatientNameResults(false);
      return;
    }

    if (patientName.trim().length < 2) {
      setPatientNameResults([]);
      setShowPatientNameResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetch(`${API_BASE}/api/patients/search-name?search=${encodeURIComponent(patientName)}`)
        .then(res => res.json())
        .then(data => {
          setPatientNameResults(data || []);
          setShowPatientNameResults(data && data.length > 0);
          setActivePatientNameIndex(0);
        })
        .catch(err => console.error("Error fetching patients by name:", err));
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [patientName, isPatientImplemented, patientCode]);

  useEffect(() => {
    if (phone === lastSelectedPhoneRef.current) {
      setPatientPhoneResults([]);
      setShowPatientPhoneResults(false);
      return;
    }

    if (!isPatientImplemented || phone.trim() === '' || patientCode) {
      setPatientPhoneResults([]);
      setShowPatientPhoneResults(false);
      return;
    }

    if (phone.trim().length < 2) {
      setPatientPhoneResults([]);
      setShowPatientPhoneResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetch(`${API_BASE}/api/patients/search-phone?phone=${encodeURIComponent(phone)}`)
        .then(res => res.json())
        .then(data => {
          setPatientPhoneResults(data || []);
          setShowPatientPhoneResults(data && data.length > 0);
          setActivePatientPhoneIndex(0);
        })
        .catch(err => console.error("Error fetching patients by phone:", err));
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [phone, isPatientImplemented, patientCode]);

  const handleCodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!patientCode.trim()) {
        prefixRef.current?.focus();
        return;
      }
      
      fetch(`${API_BASE}/api/patients/by-code/${patientCode}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            lastSelectedNameRef.current = data.name || '';
            lastSelectedPhoneRef.current = data.mobile || '';
            setPatientCode(data.code || '');
            setPrefix(data.prefix || 'Mr.');
            setPatientName(data.name || '');
            setAge(data.age_year || '');
            setAgeUnit('Yrs');
            setSex(data.sex || '');
            setPhone(data.mobile || '');
            setAddress(data.address1 || '');
            prefixRef.current?.focus();
          } else {
            prefixRef.current?.focus();
          }
        })
        .catch(err => {
          console.error("Error fetching patient by code:", err);
          prefixRef.current?.focus();
        });
    }
  };

  const selectPatient = (pat) => {
    lastSelectedNameRef.current = pat.name || '';
    lastSelectedPhoneRef.current = pat.mobile || '';
    setPatientCode(pat.code || '');
    setPrefix(pat.prefix || 'Mr.');
    setPatientName(pat.name || '');
    setAge(pat.age_year || '');
    setAgeUnit('Yrs');
    setSex(pat.sex || 'Male');
    setPhone(pat.mobile || '');
    setAddress(pat.address1 || '');
    
    setShowPatientNameResults(false);
    setShowPatientPhoneResults(false);
    
    referredRef.current?.focus();
  };

  const handlePatientNameKeyDown = (e) => {
    if (showPatientNameResults && (patientNameResults.length > 0 || (isPatientImplemented && patientName.trim().length >= 2))) {
      const optionCount = patientNameResults.length + (isPatientImplemented && patientName.trim().length >= 2 ? 1 : 0);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePatientNameIndex(prev => (prev + 1) % optionCount);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePatientNameIndex(prev => (prev - 1 + optionCount) % optionCount);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activePatientNameIndex === patientNameResults.length) {
          openNewPatientPopup(patientName, '');
        } else if (patientNameResults[activePatientNameIndex]) {
          selectPatient(patientNameResults[activePatientNameIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowPatientNameResults(false);
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        ageRef.current?.focus();
      }
    }
  };

  const handlePhoneKeyDown = (e) => {
    if (showPatientPhoneResults && (patientPhoneResults.length > 0 || (isPatientImplemented && phone.trim().length >= 2))) {
      const optionCount = patientPhoneResults.length + (isPatientImplemented && phone.trim().length >= 2 ? 1 : 0);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePatientPhoneIndex(prev => (prev + 1) % optionCount);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePatientPhoneIndex(prev => (prev - 1 + optionCount) % optionCount);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activePatientPhoneIndex === patientPhoneResults.length) {
          openNewPatientPopup('', phone);
        } else if (patientPhoneResults[activePatientPhoneIndex]) {
          selectPatient(patientPhoneResults[activePatientPhoneIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowPatientPhoneResults(false);
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        addressRef.current?.focus();
      }
    }
  };

  const openNewPatientPopup = (initialName = '', initialPhone = '') => {
    setNewPrefix('Mr.');
    setNewName(initialName);
    setNewAge('');
    setNewAgeUnit('Yrs');
    setNewSex('Male');
    setNewPhone(initialPhone);
    setNewAddress('');
    
    setShowPatientNameResults(false);
    setShowPatientPhoneResults(false);
    setShowNewPatientModal(true);
  };

  const handleSaveNewPatient = (e) => {
    e?.preventDefault();
    if (!newName.trim()) {
      alert("Please enter patient name.");
      return;
    }
    
    const payload = {
      Prefix: newPrefix,
      Name: newName,
      Sex: newSex,
      AgeYear: parseInt(newAge) || null,
      AgeMonth: newAgeUnit === 'Mths' ? parseInt(newAge) : null,
      AgeDay: newAgeUnit === 'Days' ? parseInt(newAge) : null,
      Address1: newAddress,
      MobileNo: newPhone
    };

    if (isPatientImplemented) {
      fetch(`${API_BASE}/api/master/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(data => {
          lastSelectedNameRef.current = newName || '';
          lastSelectedPhoneRef.current = newPhone || '';
          setPatientCode(data.code || '');
          setPrefix(newPrefix);
          setPatientName(newName);
          setAge(newAge);
          setAgeUnit(newAgeUnit);
          setSex(newSex);
          setPhone(newPhone);
          setAddress(newAddress);
          setShowNewPatientModal(false);
          referredRef.current?.focus();
        })
        .catch(err => {
          console.error("Error creating patient in DB:", err);
          lastSelectedNameRef.current = newName || '';
          lastSelectedPhoneRef.current = newPhone || '';
          setPrefix(newPrefix);
          setPatientName(newName);
          setAge(newAge);
          setAgeUnit(newAgeUnit);
          setSex(newSex);
          setPhone(newPhone);
          setAddress(newAddress);
          setShowNewPatientModal(false);
          referredRef.current?.focus();
        });
    } else {
      lastSelectedNameRef.current = newName || '';
      lastSelectedPhoneRef.current = newPhone || '';
      setPrefix(newPrefix);
      setPatientName(newName);
      setAge(newAge);
      setAgeUnit(newAgeUnit);
      setSex(newSex);
      setPhone(newPhone);
      setAddress(newAddress);
      setShowNewPatientModal(false);
      referredRef.current?.focus();
    }
  };

  const activeDrRef = useRef(null);
  const activeTestRef = useRef(null);

  // Auto-scroll active doctor item into view
  useEffect(() => {
    if (activeDrRef.current) {
      activeDrRef.current.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [activeDrIndex]);

  // Auto-scroll active test item into view
  useEffect(() => {
    if (activeTestRef.current) {
      activeTestRef.current.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [activeResultIndex]);

  // Fetch doctors from API based on referredBy value
  useEffect(() => {
    if (referredBy.trim() === '') {
      setSelectedDoctor(null);
      setDrResults([]);
      setShowDrResults(false);
      return;
    }

    // If the input matches selected doctor name, don't trigger new search
    if (selectedDoctor && referredBy === selectedDoctor.name) {
      return;
    }

    if (referredBy.trim().length < 2) {
      setDrResults([]);
      setShowDrResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetch(`${API_BASE}/api/doctors?search=${encodeURIComponent(referredBy)}`)
        .then(res => res.json())
        .then(data => {
          setDrResults(data);
          setShowDrResults(true);
          setActiveDrIndex(0);
        })
        .catch(err => {
          console.error("Error fetching doctors:", err);
        });
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [referredBy, selectedDoctor]);

  // Click outside to close doctor dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drContainerRef.current && !drContainerRef.current.contains(event.target)) {
        setShowDrResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch tests from API based on testSearch value
  useEffect(() => {
    if (testSearch.trim().length < 2) {
      setTestResults([]);
      setShowResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetch(`${API_BASE}/api/tests?search=${encodeURIComponent(testSearch)}`)
        .then(res => res.json())
        .then(data => {
          setTestResults(data);
          setShowResults(true);
          setActiveResultIndex(0);
        })
        .catch(err => {
          console.error("Error fetching tests:", err);
        });
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [testSearch]);

  // Click outside to close test dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (testContainerRef.current && !testContainerRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close any open modal on ESC press & Handle Alt+N / Alt+L shortcuts & Modal Up/Down/Enter Navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // 1. ESC Key: Close all modals instantly (using capture listener so even focused inputs trigger ESC!)
      if (e.key === 'Escape') {
        if (showExplorerModal || showHistoryModal || showNewPatientModal || showPaymentHistoryModal || showSettlementModal || showFinalInvoiceModal) {
          e.preventDefault();
          e.stopPropagation();
          setShowExplorerModal(false);
          setShowHistoryModal(false);
          setShowNewPatientModal(false);
          setShowPaymentHistoryModal(false);
          setShowSettlementModal(false);
          setShowFinalInvoiceModal(false);
          return;
        }
      }

      // 2. Alt+N and Alt+L Shortcuts
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handleClearForm();
        return;
      }
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handleOpenExplorerModal();
        return;
      }

      // 3. Up/Down Arrow Navigation inside Booking List Explorer Modal
      if (showExplorerModal) {
        const currentData = explorerDataRef.current;
        if (currentData && currentData.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            const nextIdx = Math.min(currentData.length - 1, activeExplorerIndexRef.current + 1);
            updateActiveExplorerIndex(nextIdx);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            const prevIdx = Math.max(0, activeExplorerIndexRef.current - 1);
            updateActiveExplorerIndex(prevIdx);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [
    showExplorerModal,
    showHistoryModal,
    showNewPatientModal,
    showPaymentHistoryModal,
    showSettlementModal,
    showFinalInvoiceModal,
    explorerData,
    activeExplorerIndex
  ]);
  const calculateDeliveryDate = (durationDays = 0) => {
    const daysToAdd = parseInt(durationDays, 10) || 0;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    
    // Sunday Rollover Rule (Day 0 = Sunday)
    if (targetDate.getDay() === 0) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const yyyy = targetDate.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleDeliveryDateInput = (code, rawVal) => {
    let clean = rawVal.replace(/[^\d]/g, '');
    if (clean.length > 8) clean = clean.slice(0, 8);
    
    let formatted = clean;
    if (clean.length >= 5) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
    } else if (clean.length >= 3) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
    }
    
    setSelectedTests(selectedTests.map(t => t.code === code ? { ...t, delivery_date: formatted } : t));
  };

  const handleAddTest = (test) => {
    if (!selectedTests.some(t => t.code === test.code)) {
      setSelectedTests([...selectedTests, {
        ...test,
        dept_name: test.dept_name || 'PATHOLOGY',
        delivery_date: test.delivery_date || calculateDeliveryDate(test.duration ?? 0)
      }]);
    }
    setTestSearch('');
    setShowResults(false);
  };

  const handleRemoveTest = (code) => {
    setSelectedTests(selectedTests.filter(t => t.code !== code));
  };

  const handleSelectDoctor = (doc) => {
    setSelectedDoctor(doc);
    setReferredBy(doc.name);
    setShowDrResults(false);
    
    // Focus the next field (Patient Category)
    setTimeout(() => {
      categoryRef.current?.focus();
    }, 50);
  };

  const handleDrKeyDown = (e) => {
    if (!showDrResults || drResults.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        categoryRef.current?.focus();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveDrIndex((prev) => (prev + 1) % drResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveDrIndex((prev) => (prev - 1 + drResults.length) % drResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const doc = drResults[activeDrIndex];
      handleSelectDoctor(doc);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDrResults(false);
    }
  };



  // Calculations
  const subtotal = selectedTests.reduce((sum, t) => sum + t.price, 0);
  
  let discount = 0;
  const val = parseFloat(discountValue) || 0;
  if (discountType === 'percent') {
    discount = Math.round(subtotal * (val / 100) * 100) / 100;
  } else {
    discount = val;
  }
  
  if (discount > subtotal) {
    discount = subtotal;
  }
  
  const colChargeVal = parseFloat(collectionCharge) || 0;
  const procChargeVal = parseFloat(procedureCharge) || 0;
  const grandTotal = Math.max(0, (subtotal - discount) + colChargeVal + procChargeVal);
  const totalPaid = paymentsList.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = grandTotal - totalPaid;

  const currentReceivedAmount = parseFloat(receivedAmount) || 0;
  const totalExpectedPaid = totalPaid + currentReceivedAmount;
  const expectedBalanceDue = grandTotal - totalExpectedPaid;
  const isFullyPaid = paymentsList.length > 0 && (grandTotal - totalPaid <= 0);

  useEffect(() => {
    if (paymentsList.length > 0) {
      const curBalance = grandTotal - totalPaid;
      setPaymentMode(curBalance <= 0 ? 'full' : 'part');
    } else {
      setPaymentMode('full');
    }
  }, [paymentsList.length, grandTotal, totalPaid]);

  const handleReceivedAmountChange = (e) => {
    setReceivedAmount(e.target.value);
  };

  // Simple number to words converter for billing
  const numberToWords = (num) => {
    if (num === 0) return 'Zero Rupees Only';
    
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertLessThanOneThousand = (n) => {
      if (n < 20) return a[n];
      const digit = n % 10;
      if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
      return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 === 0 ? '' : ' and ' + convertLessThanOneThousand(n % 100));
    };

    let result = '';
    let tempNum = num;
    
    if (tempNum >= 1000) {
      result += convertLessThanOneThousand(Math.floor(tempNum / 1000)) + ' Thousand ';
      tempNum %= 1000;
    }
    if (tempNum > 0) {
      result += convertLessThanOneThousand(tempNum);
    }
    
    return result.trim() + ' Rupees Only';
  };

  const triggerUniversalSearch = (rawQuery) => {
    const q = (rawQuery || bookingSerial || '').trim();
    if (!q) {
      handleOpenExplorerModal();
      return;
    }

    setSearchNotification('');

    fetch(`${API_BASE}/api/booking/universal-search?query=${encodeURIComponent(q)}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.type === 'single') {
          const targetSerial = resData.serial_no;
          handleLoadBookingFromExplorer({ serialNo: targetSerial });
        } else {
          setExplorerSearch(q);
          fetchExplorerData({ search: q, page: 1 });
          setShowExplorerModal(true);
        }
      })
      .catch(() => {
        const numVal = parseInt(q, 10);
        if (!isNaN(numVal) && numVal > 0) {
          const paddedSerial = String(numVal).padStart(5, '0');
          handleLoadBookingFromExplorer({ serialNo: paddedSerial });
        } else {
          setExplorerSearch(q);
          fetchExplorerData({ search: q, page: 1 });
          setShowExplorerModal(true);
        }
      });
  };

  const handleSearchSerial = (e) => {
    if (e.key === 'Enter' || e.key === 'NumpadEnter' || e.keyCode === 13) {
      e.preventDefault();
      triggerUniversalSearch(bookingSerial);
    }
  };

  const handleOpenHistoryModal = () => {
    fetch(`${API_BASE}/api/booking/recent`)
      .then(res => res.json())
      .then(data => {
        setHistoryBookings(data || []);
        setShowHistoryModal(true);
      })
      .catch(err => {
        console.error("Error fetching recent bookings:", err);
        setHistoryBookings([]);
        setShowHistoryModal(true);
      });
  };

  const updateActiveExplorerIndex = (idx) => {
    setActiveExplorerIndex(idx);
    activeExplorerIndexRef.current = idx;
  };

  const fetchExplorerData = (opts = {}) => {
    setExplorerLoading(true);
    const searchVal = opts.search !== undefined ? opts.search : explorerSearch;
    const fromVal = opts.from_date !== undefined ? opts.from_date : explorerFromDate;
    const toVal = opts.to_date !== undefined ? opts.to_date : explorerToDate;
    const statusVal = opts.payment_status !== undefined ? opts.payment_status : explorerPayStatus;
    const pageVal = opts.page !== undefined ? opts.page : explorerPage;

    let url = `${API_BASE}/api/booking/explorer?page=${pageVal}&per_page=25`;
    if (searchVal.trim()) url += `&search=${encodeURIComponent(searchVal.trim())}`;
    if (fromVal) url += `&from_date=${encodeURIComponent(fromVal)}`;
    if (toVal) url += `&to_date=${encodeURIComponent(toVal)}`;
    if (statusVal && statusVal !== 'ALL') url += `&payment_status=${encodeURIComponent(statusVal)}`;

    fetch(url)
      .then(res => res.json())
      .then(resData => {
        const list = resData.data || [];
        setExplorerData(list);
        explorerDataRef.current = list;
        updateActiveExplorerIndex(0);
        setExplorerSummary(resData.summary || null);
        setExplorerPage(resData.current_page || 1);
        setExplorerLastPage(resData.last_page || 1);
        setExplorerTotal(resData.total || 0);
        setExplorerLoading(false);
      })
      .catch(err => {
        console.error("Error fetching explorer bookings:", err);
        setExplorerLoading(false);
      });
  };

  const handleOpenExplorerModal = () => {
    updateActiveExplorerIndex(0);
    setShowExplorerModal(true);
    fetchExplorerData();
  };

  useEffect(() => {
    if (showExplorerModal && activeExplorerRowRef.current) {
      activeExplorerRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeExplorerIndex, showExplorerModal]);

  const handleDatePresetChange = (preset) => {
    setExplorerDatePreset(preset);
    const today = new Date();
    const formatDateStr = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    let fromStr = '';
    let toStr = '';

    if (preset === 'today') {
      fromStr = formatDateStr(today);
      toStr = formatDateStr(today);
    } else if (preset === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      fromStr = formatDateStr(yest);
      toStr = formatDateStr(yest);
    } else if (preset === 'last7') {
      const d7 = new Date(today);
      d7.setDate(d7.getDate() - 6);
      fromStr = formatDateStr(d7);
      toStr = formatDateStr(today);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      fromStr = formatDateStr(firstDay);
      toStr = formatDateStr(today);
    } else if (preset === 'all') {
      fromStr = '';
      toStr = '';
    }

    setExplorerFromDate(fromStr);
    setExplorerToDate(toStr);
    fetchExplorerData({ from_date: fromStr, to_date: toStr, page: 1 });
  };

  const handleLoadBookingFromExplorer = (item) => {
    if (!item) return;
    const rawBkNo = item.bookingNo || '';
    const serialStr = rawBkNo ? (rawBkNo.split('/').pop() || rawBkNo) : item.serialNo;
    setShowExplorerModal(false);
    if (!serialStr) return;
    setBookingSerial(String(serialStr).padStart(5, '0'));
    
    fetch(`${API_BASE}/api/booking/by-no/${serialStr}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          lastSelectedNameRef.current = data.patientName || '';
          lastSelectedPhoneRef.current = data.phone || '';
          setShowPatientNameResults(false);
          setShowPatientPhoneResults(false);
          setPatientNameResults([]);
          setPatientPhoneResults([]);
          setShowDrResults(false);
          setShowResults(false);

          setPatientCode(data.patientCode || '');
          setPrefix(data.prefix || 'Mr.');
          setPatientName(data.patientName || '');
          setAge(data.age || '');
          setAgeUnit(data.ageUnit || 'Yrs');
          setSex(data.sex || 'Male');
          setPhone(data.phone || '');
          setAddress(data.address || '');
          setReferredBy(data.referredBy || '');
          if (data.selectedDoctor) {
            setSelectedDoctor(data.selectedDoctor);
          }
          const loadedTests = (data.selectedTests || []).map(t => ({
            ...t,
            delivery_date: t.delivery_date || calculateDeliveryDate(t.duration || 0)
          }));
          setSelectedTests(loadedTests);
          setDiscountValue(data.discountValue || '');
          setCollectionCharge(data.collectionCharge ? String(data.collectionCharge) : '');
          setProcedureCharge(data.procedureCharge ? String(data.procedureCharge) : '');
          setReceivedAmount('');
          setPaymentMethod(data.paymentMethod || 'Cash');
          setBookingNo(data.bookingNo);
          setSavedBookingNo(data.bookingNo);
          setPaymentsList(data.payments || []);

          if (data.created_at_formatted || data.date) {
            const formattedDate = data.created_at_formatted || (data.date ? new Date(data.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');
            const user = data.created_by_user || 'Admin';
            setSavedBillInfo({ date: formattedDate, user: user });
          } else {
            setSavedBillInfo(null);
          }
          setTimeout(() => {
            codeRef.current?.focus();
          }, 80);
        } else {
          alert(`Could not load booking: ${data?.error || 'Booking data error'}`);
        }
      })
      .catch(err => {
        alert(`Error loading booking: ${err.message}`);
      });
  };



  const handleGenerateFinalInvoice = () => {
    const targetBkNo = savedBookingNo || bookingNo;
    if (!targetBkNo) {
      alert("Please save or select a booking first.");
      return;
    }

    if (balanceDue > 0) {
      setSettlementBkNo(targetBkNo);
      setSettlementDue(balanceDue);
      setSettlementCollectAmt(balanceDue.toFixed(2));
      setSettlementPayMode('Cash');
      setShowSettlementModal(true);
    } else {
      executeGenerateInvoice(targetBkNo, 0, 'Cash');
    }
  };

  const reloadCurrentBooking = (bkNo) => {
    if (!bkNo) return;
    const serialStr = bkNo.split('/').pop() || bkNo;
    fetch(`${API_BASE}/api/booking/by-no/${serialStr}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setPaymentsList(data.payments || []);
          setReceivedAmount('');
        }
      })
      .catch(err => console.error("Error refreshing booking state:", err));
  };

  const executeGenerateInvoice = (targetBkNo, collectAmount, payMode) => {
    fetch(`${API_BASE}/api/invoice/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingNo: targetBkNo,
        collectAmount: parseFloat(collectAmount) || 0,
        paymentMode: payMode || 'Cash'
      })
    })
      .then(res => res.json())
      .then(data => {
        setShowSettlementModal(false);
        if (data.invoice_no) {
          reloadCurrentBooking(targetBkNo);
          fetch(`${API_BASE}/api/invoice/details?inv_no=${encodeURIComponent(data.invoice_no)}`)
            .then(r => r.json())
            .then(invData => {
              setGeneratedInvoiceData(invData);
              setShowFinalInvoiceModal(true);
            });
        } else {
          alert(data.error || "Failed to generate final invoice");
        }
      })
      .catch(err => alert("Error generating final invoice"));
  };

  const handleSaveBooking = () => {
    if (!patientName.trim()) {
      alert('Please enter patient name.');
      nameRef.current?.focus();
      return;
    }
    if (selectedTests.length === 0) {
      alert('Please select at least one test.');
      searchRef.current?.focus();
      return;
    }

    const payload = {
      existingBookingNo: savedBookingNo || '',
      patientCode,
      prefix,
      patientName,
      sex,
      age: parseInt(age) || null,
      ageUnit,
      phone,
      address,
      referredBy,
      selectedDoctor,
      selectedCategory,
      selectedCollector,
      selectedTests,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      collectionCharge: parseFloat(collectionCharge) || 0,
      procedureCharge: parseFloat(procedureCharge) || 0,
      receivedAmount: parseFloat(receivedAmount) || 0,
      paymentMethod
    };

    fetch(`${API_BASE}/api/booking/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.is_updated) {
          alert(`Booking ${data.bookingNo} Updated Successfully!`);
        } else {
          alert(`New Web Booking Saved Successfully! Booking No: ${data.bookingNo}`);
        }
        handleClearForm(); // Auto-reset form & load next fresh booking serial
      })
      .catch(err => {
        console.error("Error saving booking to database:", err);
        alert("Error saving booking to database. Please check backend connection.");
      });
  };

  const handlePrintBooking = () => {
    if (!patientName.trim()) {
      alert('Please enter patient name.');
      nameRef.current?.focus();
      return;
    }
    if (selectedTests.length === 0) {
      alert('Please select at least one test.');
      searchRef.current?.focus();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the booking receipt.');
      return;
    }

    const currentTotalPaid = parseFloat(receivedAmount || 0);
    const calculatedPaid = paymentsList.length > 0 ? (totalPaid + currentTotalPaid) : currentTotalPaid;
    const calcDue = grandTotal - calculatedPaid;

    const htmlContent = generateA5BookingReceiptHTML({
      bookingNo: savedBookingNo || bookingNo,
      bookingDate: savedBillInfo?.date || new Date().toLocaleString('en-GB'),
      patientCode,
      prefix,
      patientName,
      age,
      ageUnit,
      sex,
      patientType: selectedCategory || 'GENERAL',
      phone,
      address,
      referredBy,
      selectedTests,
      totalAmount: subtotal,
      discountAmount: discount,
      collectionCharge: parseFloat(collectionCharge) || 0,
      procedureCharge: parseFloat(procedureCharge) || 0,
      grandTotal: grandTotal,
      advanceReceived: calculatedPaid,
      balanceDue: calcDue,
      paymentMethod,
      printedBy: activeUserSession?.user_name || 'Admin',
    });

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintFinalTaxInvoice = () => {
    if (!generatedInvoiceData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the final tax invoice.');
      return;
    }

    const currentInvPaid = generatedInvoiceData.paidAmount || 0;
    const currentInvDue = generatedInvoiceData.dueAmount || 0;
    const latestPayment = generatedInvoiceData.latestPaymentAmount || 0;
    const initialAdvance = Math.max(0, currentInvPaid - latestPayment);

    const htmlContent = generateA5BillReceiptHTML({
      invoiceNo: generatedInvoiceData.invoiceNo || 'INV/26-27/00001',
      invoiceDate: generatedInvoiceData.date_formatted || (currentDate && currentTime ? `${currentDate} ${currentTime}` : new Date().toLocaleString('en-GB')),
      bookingNo: generatedInvoiceData.bookingNo || savedBookingNo || bookingNo,
      patientCode: generatedInvoiceData.patientCode || patientCode,
      prefix: generatedInvoiceData.prefix || prefix,
      patientName: generatedInvoiceData.patientName || patientName,
      age: generatedInvoiceData.age || age,
      ageUnit: ageUnit || 'Yrs',
      sex: generatedInvoiceData.sex || sex,
      patientType: selectedCategory || 'GENERAL',
      phone: generatedInvoiceData.phone || phone,
      address: generatedInvoiceData.address || address,
      referredBy: referredBy || 'Dr. SELF',
      selectedTests: (generatedInvoiceData.items || []).map(item => ({
        code: item.code,
        name: item.name,
        price: item.price,
        delivery_date: item.delivery_date || 'Same Day'
      })),
      totalAmount: subtotal,
      discountAmount: generatedInvoiceData.discountAmount || discount || 0,
      collectionCharge: generatedInvoiceData.collectionCharge ?? parseFloat(collectionCharge) ?? 0,
      procedureCharge: generatedInvoiceData.procedureCharge ?? parseFloat(procedureCharge) ?? 0,
      netAmount: generatedInvoiceData.netAmount || grandTotal,
      advanceReceived: initialAdvance,
      currentPayment: latestPayment,
      totalPaid: currentInvPaid,
      balanceDue: currentInvDue,
      paymentMethod: generatedInvoiceData.paymentMethod || paymentMethod || 'Cash',
      printedBy: activeUserSession?.user_name || 'Admin',
    });

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintPartPayment = (paymentRecord, partSeq, prevPaid = 0, cumulativePaid = 0) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the part payment receipt.');
      return;
    }

    const currentPayAmt = parseFloat(paymentRecord.amount || paymentRecord.paid_amount || 0);
    const prevPaidAmt = parseFloat(prevPaid || 0);
    const cumulativeAmt = parseFloat(cumulativePaid || (prevPaidAmt + currentPayAmt));
    const calcDue = Math.max(0, grandTotal - cumulativeAmt);

    const bkNoStr = savedBookingNo || bookingNo || 'BK/26-27/00001';
    const bkParts = bkNoStr.split('/');
    const fyPart = bkParts.length >= 2 ? bkParts[1] : '26-27';
    const serialPart = bkParts.length >= 3 ? bkParts[2] : '00001';

    const htmlContent = generateA5PartPaymentReceiptHTML({
      receiptNo: paymentRecord.receipt_no || `RCP/${fyPart}/${serialPart}-P${partSeq}`,
      receiptDate: paymentRecord.date || paymentRecord.created_at || (currentDate && currentTime ? `${currentDate} ${currentTime}` : new Date().toLocaleString('en-GB')),
      bookingNo: bkNoStr,
      patientCode,
      prefix,
      patientName,
      age,
      ageUnit,
      sex,
      patientType: selectedCategory || 'GENERAL',
      phone,
      address,
      referredBy: referredBy || 'Dr. SELF',
      selectedTests,
      collectionCharge: parseFloat(collectionCharge) || 0,
      procedureCharge: parseFloat(procedureCharge) || 0,
      grandTotal,
      previousPaid: prevPaidAmt,
      currentPayment: currentPayAmt,
      totalPaid: cumulativeAmt,
      balanceDue: calcDue,
      paymentMethod: paymentRecord.mode || paymentRecord.method || paymentRecord.payment_mode || 'Cash',
      partSeq: partSeq,
      printedBy: paymentRecord.received_by || paymentRecord.user || activeUserSession?.user_name || 'Admin',
    });

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintDeptSlips = () => {
    if (!patientName.trim()) {
      alert('Please enter patient name first.');
      nameRef.current?.focus();
      return;
    }
    if (selectedTests.length === 0) {
      alert('Please select at least one test.');
      searchRef.current?.focus();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print department slips.');
      return;
    }

    const htmlContent = generateA5DepartmentSlipsHTML({
      bookingNo: savedBookingNo || bookingNo,
      bookingDate: currentDate && currentTime ? `${currentDate} ${currentTime}` : new Date().toLocaleString('en-GB'),
      patientCode,
      prefix,
      patientName,
      age,
      ageUnit,
      sex,
      patientType: selectedCategory || 'GENERAL',
      phone,
      address,
      referredBy: referredBy || 'Dr. SELF',
      selectedTests,
      printedBy: activeUserSession?.user_name || 'Admin',
    });

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleClearForm = () => {
    lastSelectedNameRef.current = '';
    lastSelectedPhoneRef.current = '';
    setSavedBookingNo('');
    setPatientCode('');
    setPrefix('Mr.');
    setPatientName('');
    setAge('');
    setAgeUnit('Yrs');
    setSex('');
    setPhone('');
    setAddress('');
    setReferredBy('');
    setSelectedDoctor(null);
    setSelectedCategory('CG1');
    setSelectedCollector('');
    setDrResults([]);
    setShowDrResults(false);
    setSelectedTests([]);
    setDiscountType('percent');
    setDiscountValue('');
    setCollectionCharge('');
    setProcedureCharge('');
    setReceivedAmount('');
    setPaymentMode('full');
    setTestSearch('');
    setShowResults(false);
    setPaymentsList([]);
    setLastSavedTimestamp('');
    setSavedBillInfo(null);
    resetToNextBookingNo();
    codeRef.current?.focus();
  };

  // Focus Traversal handle on Enter key
  const handleFieldKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextField = formFields[index + 1]?.current;
      if (nextField) {
        nextField.focus();
        if (nextField.select) nextField.select();
      }
    }
  };

  // Test Search Field keyboard controller
  const handleSearchKeyDown = (e) => {
    if (!showResults || testResults.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedTests.length === 0) {
          alert('Please select at least one test.');
          return;
        }
        discountValueRef.current?.focus();
        if (discountValueRef.current?.select) discountValueRef.current.select();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveResultIndex((prev) => (prev + 1) % testResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveResultIndex((prev) => (prev - 1 + testResults.length) % testResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTest(testResults[activeResultIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowResults(false);
    }
  };

  const handleSaveBookingRef = useRef(handleSaveBooking);
  const handlePrintBookingRef = useRef(handlePrintBooking);
  const handleClearFormRef = useRef(handleClearForm);

  useEffect(() => {
    handleSaveBookingRef.current = handleSaveBooking;
    handlePrintBookingRef.current = handlePrintBooking;
    handleClearFormRef.current = handleClearForm;
  });

  // Local Page shortcuts listener
  useEffect(() => {
    const handleLocalHotkeys = (e) => {
      const combo = parseKeyEvent(e);
      
      if (combo === shortcuts.FOCUS_TEST_SEARCH.key) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (combo === shortcuts.SAVE_VOUCHER.key) {
        e.preventDefault();
        handleSaveBookingRef.current();
      } else if (combo === shortcuts.PRINT_INVOICE.key) {
        e.preventDefault();
        handlePrintBookingRef.current();
      } else if (combo === shortcuts.CLEAR_FORM.key) {
        e.preventDefault();
        handleClearFormRef.current();
      }
    };

    window.addEventListener('keydown', handleLocalHotkeys);
    return () => window.removeEventListener('keydown', handleLocalHotkeys);
  }, [shortcuts, parseKeyEvent]);

  if (activeUserSession && !hasBookingPermission()) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: 'var(--surface-container-lowest)',
        border: '1px solid #fca5a5',
        borderRadius: 'var(--radius-xl)',
        margin: '40px auto',
        maxWidth: '600px',
        boxShadow: '0 12px 32px rgba(225, 29, 72, 0.1)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#991b1b', margin: '0 0 8px 0' }}>
          Access Denied: Booking Module Restricted
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--outline)', margin: 0 }}>
          Your account (<strong>{activeUserSession.username}</strong> - {activeUserSession.role_name || activeUserSession.role_code}) does not have permission to access Booking / Advance. Contact Administrator to grant access.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Page Title & Booking Info */}
      <section className={styles.topSection}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <nav className={styles.breadcrumb}>
              <span>Transaction</span>
              <span>/</span>
              <span className={styles.breadcrumbActive}>Booking/Advance</span>
            </nav>
            <h2 style={{ margin: 0 }}>Pathology Diagnostic Booking</h2>
          </div>

          {/* Top Header Action Bar: New Button & Booking List Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={handleClearForm}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.2s ease'
              }}
              title="Start New Booking (Alt + N)"
            >
              <Plus size={16} />
              <span>New</span>
            </button>

            <button
              type="button"
              onClick={handleOpenExplorerModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                backgroundColor: 'var(--surface-container-high)',
                color: 'var(--on-surface)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-md)',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Open Industrial Booking List Explorer (Alt + L)"
            >
              <ListFilter size={16} style={{ color: 'var(--primary)' }} />
              <span>Booking List</span>
              {explorerTotal > 0 && (
                <span style={{
                  padding: '1px 6px',
                  backgroundColor: 'var(--primary-container)',
                  color: 'var(--on-primary-container)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '800'
                }}>
                  {explorerTotal}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className={styles.voucherInfo}>
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <span>Booking No:</span>
            <span className={styles.voucherNo} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              BK/{bookingNo.split('/')[1] || '26-27'}/
              <input 
                type="text" 
                className={styles.bookingNoInput}
                value={bookingSerial}
                onChange={(e) => setBookingSerial(e.target.value)}
                onKeyDown={handleSearchSerial}
                placeholder="00000"
                title="Type serial number, patient name, phone, or booking no and press Enter to search"
              />
              <button
                type="button"
                onClick={() => triggerUniversalSearch(bookingSerial)}
                style={{
                  background: 'var(--primary-container)',
                  border: '1px solid var(--outline-variant)',
                  color: 'var(--on-primary-container)',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-md)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: '700'
                }}
                title="Click to search booking"
              >
                <Search size={14} /> Search
              </button>
            </span>
          </p>
          <p>Date: <span>{currentDate}</span> | Time: <span>{currentTime}</span></p>
          {lastSavedTimestamp && (
            <p style={{ fontSize: '11.5px', color: 'var(--secondary)', fontWeight: '600', marginTop: '4px', textAlign: 'right' }}>
              Last Saved: <span style={{ fontFamily: 'var(--font-mono)' }}>{lastSavedTimestamp}</span>
            </p>
          )}
          {searchNotification && (
            <div style={{
              marginTop: '6px',
              padding: '6px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-md)',
              color: '#b91c1c',
              fontSize: '12px',
              fontWeight: '700',
              textAlign: 'right',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)',
              animation: 'fadeIn 0.2s ease-in-out'
            }}>
              ⚠️ {searchNotification}
            </div>
          )}
        </div>
      </section>

      {/* Main Form Grid */}
      <section className={styles.bookingGrid}>
        {/* Left Column: Form and Selection */}
        <div className={styles.formCol}>
          {/* Patient Info */}
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <UserPlus size={20} />
              <h3>Patient Information</h3>
            </div>
            
            <div className={styles.formGrid}>
              {/* Patient Code */}
              <div className="form-group">
                <label className="form-label">Patient Code</label>
                <input 
                  ref={codeRef}
                  className="form-input" 
                  placeholder="Code" 
                  value={patientCode}
                  onChange={(e) => setPatientCode(e.target.value)}
                  onKeyDown={handleCodeKeyDown}
                  type="text" 
                />
              </div>

              {/* Prefix & Patient Name */}
              <div className={`${styles.colSpan2} form-group`} style={{ position: 'relative' }}>
                <label className="form-label">Patient Name</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    ref={prefixRef}
                    className="form-input"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, 1)}
                    style={{ width: '80px', padding: '10px 8px', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <option>Mr.</option>
                    <option>Mrs.</option>
                    <option>Miss</option>
                    <option>Dr.</option>
                    <option>Baby</option>
                    <option>Mast.</option>
                  </select>
                  <input 
                    ref={nameRef}
                    className="form-input" 
                    placeholder="Full legal name" 
                    value={patientName}
                    onChange={(e) => {
                      lastSelectedNameRef.current = '';
                      setPatientName(e.target.value);
                      setShowPatientNameResults(true);
                    }}
                    onFocus={() => {
                      if (isPatientImplemented && !patientCode && patientName.trim().length >= 2 && patientName !== lastSelectedNameRef.current) {
                        setShowPatientNameResults(true);
                      }
                    }}
                    onKeyDown={handlePatientNameKeyDown}
                    onBlur={() => setTimeout(() => setShowPatientNameResults(false), 200)}
                    type="text" 
                    style={{ flexGrow: 1 }}
                  />
                </div>

                {/* Autocomplete Dropdown for Patient Name */}
                {showPatientNameResults && (patientNameResults.length > 0 || (isPatientImplemented && patientName.trim().length >= 2)) && (
                  <div className={styles.searchResultsDropdown} style={{ width: '100%', top: '100%', marginTop: '4px', zIndex: 10 }}>
                    {patientNameResults.map((pat, idx) => (
                      <div
                        key={pat.code}
                        ref={idx === activePatientNameIndex ? activePatientNameRef : null}
                        className={`${styles.resultItem} ${idx === activePatientNameIndex ? styles.resultItemActive : ''}`}
                        onMouseDown={() => selectPatient(pat)}
                      >
                        <div>
                          <div className={styles.resultName} style={{ color: idx === activePatientNameIndex ? '#ffffff' : 'var(--primary)' }}>
                            {pat.prefix} {pat.name}
                          </div>
                          <div className={styles.resultCode} style={{ color: idx === activePatientNameIndex ? 'rgba(255,255,255,0.7)' : 'var(--outline)' }}>
                            Code: {pat.code} {pat.mobile ? `• Mobile: ${pat.mobile}` : ''} {pat.address1 ? `• Addr: ${pat.address1}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isPatientImplemented && patientName.trim().length >= 2 && (
                      <div
                        ref={activePatientNameIndex === patientNameResults.length ? activePatientNameRef : null}
                        className={`${styles.resultItem} ${activePatientNameIndex === patientNameResults.length ? styles.resultItemActive : ''}`}
                        onMouseDown={() => openNewPatientPopup(patientName, '')}
                        style={{ borderTop: '1px solid var(--outline-variant)', fontWeight: '700' }}
                      >
                        <div className={styles.resultName} style={{ color: activePatientNameIndex === patientNameResults.length ? '#ffffff' : 'var(--primary)' }}>
                          {`+ Add New Patient "${patientName}"`}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Age */}
              <div className="form-group">
                <label className="form-label">Age</label>
                <div className={styles.ageGroup}>
                  <input 
                    ref={ageRef}
                    className="form-input" 
                    placeholder="e.g. 45" 
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, 3)}
                    type="number" 
                    style={{ flexGrow: 1, width: '60px' }}
                  />
                  <select 
                    ref={ageUnitRef}
                    className="form-input" 
                    value={ageUnit}
                    onChange={(e) => setAgeUnit(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, 4)}
                    style={{ padding: '10px 8px', cursor: 'pointer' }}
                  >
                    <option>Yrs</option>
                    <option>Mo</option>
                    <option>Days</option>
                  </select>
                </div>
              </div>

              {/* Sex */}
              <div className={`${styles.colSpan2} form-group`}>
                <label className="form-label">Sex</label>
                <select 
                  ref={sexRef}
                  className="form-input"
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 5)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Contact Number */}
              <div className={`${styles.colSpan2} form-group`} style={{ position: 'relative' }}>
                <label className="form-label">Contact Number</label>
                <div className={styles.phoneInputWrapper}>
                  <span className={styles.phonePrefix}>+91</span>
                  <input 
                    ref={phoneRef}
                    className={`form-input ${styles.phoneInput}`} 
                    placeholder="10-digit mobile" 
                    value={phone}
                    onChange={(e) => {
                      lastSelectedPhoneRef.current = '';
                      setPhone(e.target.value);
                      setShowPatientPhoneResults(true);
                    }}
                    onFocus={() => {
                      if (isPatientImplemented && !patientCode && phone.trim().length >= 2 && phone !== lastSelectedPhoneRef.current) {
                        setShowPatientPhoneResults(true);
                      }
                    }}
                    onKeyDown={handlePhoneKeyDown}
                    onBlur={() => setTimeout(() => setShowPatientPhoneResults(false), 200)}
                    type="tel" 
                  />
                </div>

                {/* Autocomplete Dropdown for Patient Phone */}
                {showPatientPhoneResults && (patientPhoneResults.length > 0 || (isPatientImplemented && phone.trim().length >= 2)) && (
                  <div className={styles.searchResultsDropdown} style={{ width: '100%', top: '100%', marginTop: '4px', zIndex: 10 }}>
                    {patientPhoneResults.map((pat, idx) => (
                      <div
                        key={pat.code}
                        ref={idx === activePatientPhoneIndex ? activePatientPhoneRef : null}
                        className={`${styles.resultItem} ${idx === activePatientPhoneIndex ? styles.resultItemActive : ''}`}
                        onMouseDown={() => selectPatient(pat)}
                      >
                        <div>
                          <div className={styles.resultName} style={{ color: idx === activePatientPhoneIndex ? '#ffffff' : 'var(--primary)' }}>
                            {pat.prefix} {pat.name}
                          </div>
                          <div className={styles.resultCode} style={{ color: idx === activePatientPhoneIndex ? 'rgba(255,255,255,0.7)' : 'var(--outline)' }}>
                            Code: {pat.code} {pat.mobile ? `• Mobile: ${pat.mobile}` : ''} {pat.address1 ? `• Addr: ${pat.address1}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isPatientImplemented && phone.trim().length >= 2 && (
                      <div
                        ref={activePatientPhoneIndex === patientPhoneResults.length ? activePatientPhoneRef : null}
                        className={`${styles.resultItem} ${activePatientPhoneIndex === patientPhoneResults.length ? styles.resultItemActive : ''}`}
                        onMouseDown={() => openNewPatientPopup('', phone)}
                        style={{ borderTop: '1px solid var(--outline-variant)', fontWeight: '700' }}
                      >
                        <div className={styles.resultName} style={{ color: activePatientPhoneIndex === patientPhoneResults.length ? '#ffffff' : 'var(--primary)' }}>
                          {`+ Add New Patient with Mobile "${phone}"`}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Address */}
              <div className={`${styles.colSpan2} form-group`}>
                <label className="form-label">Address</label>
                <input 
                  ref={addressRef}
                  className="form-input" 
                  placeholder="Patient's address" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 7)}
                  type="text" 
                />
              </div>

              <div className={`${styles.colSpan2} form-group`} style={{ position: 'relative' }}>
                <label className="form-label">Referred By (Doctor)</label>
                <div style={{ position: 'relative' }} ref={drContainerRef}>
                  <input 
                    ref={referredRef}
                    className="form-input" 
                    placeholder="Dr. Name / Self" 
                    value={referredBy}
                    onChange={(e) => setReferredBy(e.target.value)}
                    onFocus={() => {
                      if (drResults.length > 0 && referredBy.trim().length >= 2 && (!selectedDoctor || referredBy !== selectedDoctor.name)) {
                        setShowDrResults(true);
                      }
                    }}
                    onKeyDown={handleDrKeyDown}
                    type="text" 
                    style={{ width: '100%' }}
                  />
                  {showDrResults && drResults.length > 0 && (
                    <div className={styles.searchResultsDropdown} style={{ width: '100%', top: '100%', marginTop: '4px', zIndex: 10 }}>
                      {drResults.map((doc, idx) => (
                        <div 
                          key={doc.code} 
                          ref={idx === activeDrIndex ? activeDrRef : null}
                          className={`${styles.resultItem} ${idx === activeDrIndex ? styles.resultItemActive : ''}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectDoctor(doc);
                          }}
                        >
                          <div>
                            <div className={styles.resultName} style={{ color: idx === activeDrIndex ? '#ffffff' : 'var(--primary)' }}>
                              {doc.name}
                            </div>
                            <div className={styles.resultCode} style={{ color: idx === activeDrIndex ? 'rgba(255,255,255,0.7)' : 'var(--outline)' }}>
                              {doc.code} {doc.address ? `• ${doc.address}` : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Category */}
              <div className={`${styles.colSpan2} form-group`}>
                <label className="form-label">Patient Category</label>
                <select
                  ref={categoryRef}
                  className="form-input"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 9)}
                  style={{ cursor: 'pointer', width: '100%' }}
                >
                  {categories.map(cat => (
                    <option key={cat.Code} value={cat.Code}>{cat.Descr}</option>
                  ))}
                </select>
              </div>

              {/* Collector */}
              <div className={`${styles.colSpan2} form-group`}>
                <label className="form-label">Collector</label>
                <select
                  ref={collectorRef}
                  className="form-input"
                  value={selectedCollector}
                  onChange={(e) => setSelectedCollector(e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 10)}
                  style={{ cursor: 'pointer', width: '100%' }}
                >
                  <option value="">-- SELECT COLLECTOR --</option>
                  {collectors.map(col => (
                    <option key={col.Code} value={col.Code}>{col.Descr}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Test Selection */}
          <div className={styles.formCard}>
            <div className={styles.testSelectionHeader}>
              <div className={styles.formHeader} style={{ marginBottom: 0 }}>
                <FlaskConical size={20} />
                <h3>Test Selection</h3>
              </div>
              <button className={styles.legacyLink} onClick={handleClearForm} type="button">
                <span><u>C</u>lear Form</span>
              </button>
            </div>

            {/* Test Search Autocomplete */}
            <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
              <u>F</u>ind / Search Tests
            </label>
            <div className={styles.searchBoxWrapper} ref={testContainerRef}>
              <Search size={16} className={styles.searchIcon} />
              <input
                ref={searchRef}
                className={styles.searchFieldInput}
                placeholder="Search tests (e.g. CBC, Lipid Profile, Sugar)..."
                value={testSearch}
                onChange={(e) => {
                  setTestSearch(e.target.value);
                  setShowResults(e.target.value.length > 1);
                }}
                onFocus={() => setShowResults(testSearch.length > 1)}
                onKeyDown={handleSearchKeyDown}
              />

              {showResults && testResults.length > 0 && (
                <div className={styles.searchResultsDropdown} style={{ zIndex: 10 }}>
                  {testResults.map((test, idx) => (
                    <div 
                      key={test.code} 
                      ref={idx === activeResultIndex ? activeTestRef : null}
                      className={`${styles.resultItem} ${idx === activeResultIndex ? styles.resultItemActive : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleAddTest(test);
                      }}
                    >
                      <div>
                        <div className={styles.resultName} style={{ color: idx === activeResultIndex ? '#ffffff' : 'var(--primary)' }}>{test.name}</div>
                        <div className={styles.resultCode} style={{ color: idx === activeResultIndex ? 'rgba(255,255,255,0.7)' : 'var(--outline)' }}>
                          {test.code} {test.sub_dept ? `• ${test.sub_dept}` : ''}
                        </div>
                      </div>
                      <span className={styles.resultPrice} style={{ color: idx === activeResultIndex ? '#ffffff' : 'var(--secondary)' }}>
                        ₹ {test.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Tests Table */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Dept. Name</th>
                    <th className={styles.th}>Test Name</th>
                    <th className={styles.th}>REPORT / DELIVERY DT.</th>
                    <th className={styles.th} style={{ textAlign: 'right' }}>Price</th>
                    <th className={styles.th} style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody className="zebra-table">
                  {selectedTests.map((t) => (
                    <tr key={t.code}>
                      <td className={styles.td}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          ...getDeptBadgeStyle(t.dept_name)
                        }}>
                          {t.dept_name || 'PATHOLOGY'}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>{t.name}</span>
                      </td>
                      <td className={styles.td}>
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          maxLength={10}
                          value={t.delivery_date || ''}
                          onChange={(e) => handleDeliveryDateInput(t.code, e.target.value)}
                          style={{
                            width: '115px',
                            padding: '5px 8px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--outline-variant)',
                            backgroundColor: 'var(--surface-container-low)',
                            color: 'var(--on-background)',
                            fontSize: '13px',
                            fontWeight: '700',
                            fontFamily: 'var(--font-mono)',
                            textAlign: 'center',
                            outline: 'none'
                          }}
                        />
                      </td>
                      <td className={styles.td} style={{ textAlign: 'right' }}>
                        <span className={styles.testPrice}>₹ {t.price.toFixed(2)}</span>
                      </td>
                      <td className={styles.td} style={{ textAlign: 'center' }}>
                        <button 
                          className={styles.removeBtn}
                          onClick={() => handleRemoveTest(t.code)}
                          title="Remove test"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {selectedTests.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--outline)' }}>
                        No tests selected. Search and select tests from the box above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Billing & Calculations */}
        <div className={styles.billingCol}>
          <div className={styles.billingCard}>
            <div className={styles.billingHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} />
                <h4>Booking Summary</h4>
              </div>
              {savedBillInfo && (
                <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: '500', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  ( Saved: {savedBillInfo.date} | By: {savedBillInfo.user} )
                </span>
              )}
            </div>

            <div className={styles.billingBody}>
              <div className={styles.billRow}>
                <span>Subtotal</span>
                <span className={styles.billSubtotal}>₹ {subtotal.toFixed(2)}</span>
              </div>
              <div className={styles.billRow} style={{ gap: '8px', alignItems: 'center' }}>
                <span>Discount</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    ref={discountValueRef}
                    type="number"
                    value={discountValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (parseFloat(val) >= 0 || val === '') {
                        setDiscountValue(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        discountTypeRef.current?.focus();
                      }
                    }}
                    placeholder="0"
                    style={{
                      width: '70px',
                      padding: '4px 8px',
                      border: '1px solid var(--outline-variant)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-container-low)',
                      color: 'var(--on-background)',
                      textAlign: 'right',
                      outline: 'none',
                      fontSize: '13.5px',
                      fontFamily: 'var(--font-mono)'
                    }}
                    min="0"
                  />
                  <select
                    ref={discountTypeRef}
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        collectionChargeRef.current?.focus();
                      }
                    }}
                    style={{
                      padding: '4px 6px',
                      border: '1px solid var(--outline-variant)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-container-low)',
                      color: 'var(--on-background)',
                      outline: 'none',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    <option value="percent">%</option>
                    <option value="amount">Flat</option>
                  </select>
                </div>
              </div>
              {discount > 0 && (
                <div className={styles.billRow} style={{ fontSize: '13px', marginTop: '-4px' }}>
                  <span style={{ color: 'var(--outline)' }}>Applied Discount</span>
                  <span className={styles.billDiscount}>-₹ {discount.toFixed(2)}</span>
                </div>
              )}

              {/* Collection Charge Input */}
              <div className={styles.billRow} style={{ gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--on-background)', fontWeight: '600' }}>Collection Charge</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--outline)' }}>₹</span>
                  <input
                    ref={collectionChargeRef}
                    type="number"
                    value={collectionCharge}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (parseFloat(val) >= 0 || val === '') {
                        setCollectionCharge(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        procedureChargeRef.current?.focus();
                      }
                    }}
                    placeholder="0"
                    style={{
                      width: '75px',
                      padding: '4px 8px',
                      border: '1px solid var(--outline-variant)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-container-low)',
                      color: 'var(--on-background)',
                      textAlign: 'right',
                      outline: 'none',
                      fontSize: '13.5px',
                      fontFamily: 'var(--font-mono)'
                    }}
                    min="0"
                  />
                </div>
              </div>

              {/* Dr. Procedure Charge Input */}
              <div className={styles.billRow} style={{ gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--on-background)', fontWeight: '600' }}>Dr. Procedure Charge</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--outline)' }}>₹</span>
                  <input
                    ref={procedureChargeRef}
                    type="number"
                    value={procedureCharge}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (parseFloat(val) >= 0 || val === '') {
                        setProcedureCharge(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!isFullyPaid) {
                          receivedAmountRef.current?.focus();
                        } else {
                          saveBookingBtnRef.current?.focus();
                        }
                      }
                    }}
                    placeholder="0"
                    style={{
                      width: '75px',
                      padding: '4px 8px',
                      border: '1px solid var(--outline-variant)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-container-low)',
                      color: 'var(--on-background)',
                      textAlign: 'right',
                      outline: 'none',
                      fontSize: '13.5px',
                      fontFamily: 'var(--font-mono)'
                    }}
                    min="0"
                  />
                </div>
              </div>

              <div className={styles.billTotalDivider}>
                <div className={styles.grandTotalRow}>
                  <span className={styles.grandTotalLabel}>Grand Total</span>
                  <span className={styles.grandTotalVal}>₹ {grandTotal.toFixed(2)}</span>
                </div>
                <p className={styles.inWords}>
                  In words: {numberToWords(Math.round(grandTotal))}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--outline)' }}>Payment Status</span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    backgroundColor: 
                      totalExpectedPaid >= grandTotal ? 'rgba(46, 125, 50, 0.15)' :
                      totalExpectedPaid > 0 ? 'rgba(237, 108, 2, 0.15)' :
                      'rgba(179, 38, 30, 0.15)',
                    color: 
                      totalExpectedPaid >= grandTotal ? '#2e7d32' :
                      totalExpectedPaid > 0 ? '#ed6c02' :
                      '#b3261e',
                    border:
                      totalExpectedPaid >= grandTotal ? '1px solid rgba(46, 125, 50, 0.3)' :
                      totalExpectedPaid > 0 ? '1px solid rgba(237, 108, 2, 0.3)' :
                      '1px solid rgba(179, 38, 30, 0.3)'
                  }}>
                    {totalExpectedPaid >= grandTotal ? 'Full Payment' :
                     totalExpectedPaid > 0 ? 'Advance Payment' :
                     'Unpaid'}
                  </span>
                </div>

                {(totalExpectedPaid > 0 || paymentsList.length > 0) && (
                  <div style={{ marginTop: '12px', borderTop: '1px dashed var(--outline-variant)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {totalExpectedPaid < grandTotal ? 'Advance Payment' : 'Full Payment'}
                        <button
                          type="button"
                          onClick={() => setShowPaymentHistoryModal(true)}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: 'var(--secondary-container)',
                            color: 'var(--on-secondary-container)',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          title="View Payment History"
                        >
                          +{paymentsList.length + (currentReceivedAmount > 0 ? 1 : 0)}
                        </button>
                      </span>
                      <span style={{ fontWeight: '700', color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                        ₹ {totalExpectedPaid.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: '4px',
                      padding: '6px 8px',
                      backgroundColor: expectedBalanceDue > 0 ? 'rgba(179, 38, 30, 0.06)' : 'rgba(46, 125, 50, 0.06)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--on-surface)' }}>Balance Due</span>
                      <span style={{ 
                        fontWeight: '800', 
                        fontSize: '26px', 
                        color: expectedBalanceDue > 0 ? '#b3261e' : '#2e7d32', 
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1
                      }}>
                        ₹ {Math.max(0, expectedBalanceDue).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Mode toggles */}
              <div className={styles.paymentModeSection}>
                <label className="form-label">Payment Mode</label>
                <div className={styles.paymentButtons}>
                  <button
                    className={`${styles.payModeBtn} ${paymentMode === 'full' ? styles.payModeBtnActive : ''}`}
                    onClick={() => {
                      if (!isFullyPaid && paymentsList.length === 0) {
                        setPaymentMode('full');
                      }
                    }}
                    type="button"
                    disabled={isFullyPaid || paymentsList.length > 0}
                  >
                    <CircleDot size={14} style={{ fill: paymentMode === 'full' ? 'currentColor' : 'transparent' }} />
                    <span>Payment</span>
                  </button>
                  <button
                    className={`${styles.payModeBtn} ${paymentMode === 'part' ? styles.payModeBtnActive : ''}`}
                    onClick={() => {
                      if (!isFullyPaid && paymentsList.length > 0) {
                        setPaymentMode('part');
                        setTimeout(() => receivedAmountRef.current?.focus(), 50);
                      }
                    }}
                    type="button"
                    disabled={isFullyPaid || paymentsList.length === 0}
                  >
                    <CircleDot size={14} style={{ fill: paymentMode === 'part' ? 'currentColor' : 'transparent' }} />
                    <span>Part Payment</span>
                  </button>
                </div>

                {isFullyPaid ? (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    border: '1px solid rgba(46, 125, 50, 0.2)',
                    borderRadius: 'var(--radius-lg)',
                    color: '#2e7d32',
                    fontWeight: '700',
                    fontSize: '11px',
                    textAlign: 'center',
                    marginTop: '8px'
                  }}>
                    ✓ This booking is fully paid.
                  </div>
                ) : (
                  <div className={styles.receivedField}>
                    <label className="form-label">Received Amount</label>
                    <div className={styles.receivedInputWrapper}>
                      <span className={styles.receivedInputSign}>₹</span>
                      <input
                        ref={receivedAmountRef}
                        className={styles.receivedInputField}
                        placeholder="0.00"
                        value={receivedAmount}
                        onChange={handleReceivedAmountChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            paymentMethodSelectRef.current?.focus();
                          }
                        }}
                        type="number"
                        disabled={isFullyPaid}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method Option */}
              <div 
                className={styles.payMethodGroup}
                ref={paymentMethodSelectRef}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveBookingBtnRef.current?.focus();
                  }
                }}
                style={{ outline: 'none' }}
              >
                <label className="form-label" style={{ marginBottom: 0 }}>Payment Method</label>
                <div className={styles.payMethodOptions}>
                  <label className={styles.payRadioLabel}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="Cash"
                      checked={paymentMethod === 'Cash'}
                      onChange={() => setPaymentMethod('Cash')}
                      style={{ accentColor: 'var(--secondary)' }} 
                      disabled={isFullyPaid}
                    />
                    <span>Cash</span>
                  </label>
                  <label className={styles.payRadioLabel}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="Card/UPI"
                      checked={paymentMethod === 'Card/UPI'}
                      onChange={() => setPaymentMethod('Card/UPI')}
                      style={{ accentColor: 'var(--secondary)' }} 
                      disabled={isFullyPaid}
                    />
                    <span>Card/UPI</span>
                  </label>
                  <label className={styles.payRadioLabel}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="Insurance"
                      checked={paymentMethod === 'Insurance'}
                      onChange={() => setPaymentMethod('Insurance')}
                      style={{ accentColor: 'var(--secondary)' }} 
                      disabled={isFullyPaid}
                    />
                    <span>Insurance</span>
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className={styles.actionGrid}>
                <div className={styles.savePrintRow}>
                  <PermissionButton 
                    ref={saveBookingBtnRef}
                    moduleKey="booking"
                    action="can_add"
                    id="saveBtn"
                    className={styles.saveInvoiceBtn}
                    onClick={handleSaveBooking}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveBooking();
                        setTimeout(() => printReceiptBtnRef.current?.focus(), 100);
                      }
                    }}
                    type="button"
                  >
                    <Save size={18} />
                    <span><u>S</u>ave Booking</span>
                  </PermissionButton>
                  <button 
                    ref={printReceiptBtnRef}
                    id="printBtn"
                    className={styles.printInvoiceBtn}
                    onClick={handlePrintBooking}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePrintBooking();
                        setTimeout(() => generateTaxInvBtnRef.current?.focus(), 100);
                      }
                    }}
                    type="button"
                  >
                    <Printer size={18} />
                    <span><u>P</u>rint Receipt</span>
                  </button>
                </div>
                <button
                  ref={generateTaxInvBtnRef}
                  type="button"
                  onClick={handleGenerateFinalInvoice}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGenerateFinalInvoice();
                      setTimeout(() => sendWhatsappBtnRef.current?.focus(), 100);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                    marginTop: '4px'
                  }}
                >
                  <FileText size={16} />
                  <span>Generate Final Tax Invoice (INV)</span>
                </button>
                <button 
                  ref={sendWhatsappBtnRef}
                  className={styles.whatsappBtn} 
                  type="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      deptSlipBtnRef.current?.focus();
                    }
                  }}
                >
                  <Send size={16} />
                  <span>Send Invoice (WhatsApp)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className={styles.quickLinksGrid}>
            <div 
              ref={deptSlipBtnRef}
              tabIndex={0}
              className={styles.quickLinkCard}
              onClick={handlePrintDeptSlips}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePrintDeptSlips();
                  searchPatientBtnRef.current?.focus();
                }
              }}
              style={{ cursor: 'pointer', outline: 'none' }}
              title="Print Departmental Work Slips (rptbookingslip_dep transfer)"
            >
              <FileText size={24} style={{ color: 'var(--secondary)' }} />
              <span className={styles.quickLinkCardSpan}>Department Slip</span>
            </div>
            <div 
              ref={searchPatientBtnRef}
              tabIndex={0}
              className={styles.quickLinkCard}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  codeRef.current?.focus();
                }
              }}
              style={{ outline: 'none' }}
            >
              <Users size={24} style={{ color: 'var(--secondary)' }} />
              <span className={styles.quickLinkCardSpan}>Search Patient</span>
            </div>
          </div>
        </div>
      </section>

      {/* New Patient Registration Popup Modal */}
      {showNewPatientModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <form 
            onSubmit={handleSaveNewPatient}
            style={{
              backgroundColor: 'var(--surface-container-lowest)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>Register New Patient</h3>
              <button 
                type="button" 
                onClick={() => setShowNewPatientModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--outline)' }}>Prefix & Patient Name</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    className="form-input"
                    value={newPrefix}
                    onChange={(e) => setNewPrefix(e.target.value)}
                    style={{ width: '80px', padding: '10px 8px', cursor: 'pointer' }}
                  >
                    <option>Mr.</option>
                    <option>Mrs.</option>
                    <option>Miss</option>
                    <option>Dr.</option>
                    <option>Baby</option>
                    <option>Mast.</option>
                  </select>
                  <input
                    type="text"
                    className="form-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Full name"
                    required
                    style={{ flexGrow: 1 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--outline)' }}>Age</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="Age"
                    required
                    style={{ flexGrow: 1 }}
                  />
                  <select
                    className="form-input"
                    value={newAgeUnit}
                    onChange={(e) => setNewAgeUnit(e.target.value)}
                    style={{ width: '75px', padding: '10px 6px', cursor: 'pointer' }}
                  >
                    <option>Yrs</option>
                    <option>Mths</option>
                    <option>Days</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--outline)' }}>Sex</label>
                <select
                  className="form-input"
                  value={newSex}
                  onChange={(e) => setNewSex(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--outline)' }}>Contact Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="10-digit mobile"
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--outline)' }}>Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Residential address"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--outline-variant)', paddingTop: '16px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowNewPatientModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--outline-variant)',
                  backgroundColor: 'transparent',
                  color: 'var(--on-surface-variant)',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(7, 10, 97, 0.15)'
                }}
              >
                Save & Fill Form
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Last 5 Bookings Popup Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>Last 5 Bookings</h3>
              <button 
                type="button" 
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {historyBookings.map((b) => (
                <div 
                  key={b.bookingNo}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--outline-variant)',
                    backgroundColor: 'var(--surface-container-low)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '14.5px', color: 'var(--primary)' }}>
                      {b.prefix} {b.patientName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--outline)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                      No: {b.bookingNo} • {b.date} {b.time}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--outline)', marginTop: '2px' }}>
                      Tests: {b.selectedTests.map(t => t.name).join(', ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: '700', fontSize: '14.5px', color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                      ₹ {b.grandTotal.toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        lastSelectedNameRef.current = b.patientName || '';
                        lastSelectedPhoneRef.current = b.phone || '';
                        setShowPatientNameResults(false);
                        setShowPatientPhoneResults(false);
                        setShowDrResults(false);
                        setShowResults(false);

                        setPatientCode(b.patientCode || '');
                        setPrefix(b.prefix || 'Mr.');
                        setPatientName(b.patientName || '');
                        setAge(b.age || '');
                        setAgeUnit(b.ageUnit || 'Yrs');
                        setSex(b.sex || '');
                        setPhone(b.phone || '');
                        setAddress(b.address || '');
                        setReferredBy(b.referredBy || '');
                        setSelectedDoctor(b.selectedDoctor || null);
                        const historyLoadedTests = (b.selectedTests || []).map(t => ({
                          ...t,
                          delivery_date: t.delivery_date || calculateDeliveryDate(t.duration || 0)
                        }));
                        setSelectedTests(historyLoadedTests);
                        setDiscountType(b.discountType || 'percent');
                        setDiscountValue(b.discountValue || '');
                        
                        const matchTotalPaid = (b.payments || []).reduce((sum, p) => sum + p.amount, 0);
                        const matchGrandTotal = b.grandTotal || 0;
                        const matchBalanceDue = matchGrandTotal - matchTotalPaid;
                        
                        setPaymentsList(b.payments || []);
                        setPaymentMode(matchBalanceDue <= 0 ? 'full' : 'part');
                        setReceivedAmount('');
                        setPaymentMethod(b.paymentMethod || 'Cash');
                        setBookingNo(b.bookingNo);
                        setSelectedCategory(b.selectedCategory || 'CG1');
                        setSelectedCollector(b.selectedCollector || '');
                        setLastSavedTimestamp(b.date && b.time ? `${b.date} ${b.time}` : '');
                        setSavedBillInfo({
                          date: b.date && b.time ? `${b.date} ${b.time}` : (b.date || ''),
                          user: b.addUser || 'Admin'
                        });
                        
                        const parts = b.bookingNo.split('/');
                        if (parts.length === 3) {
                          setBookingSerial(parts[2]);
                        }

                        setShowHistoryModal(false);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Load
                    </button>
                  </div>
                </div>
              ))}
              {historyBookings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--outline)' }}>
                  No historical bookings found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Payment History Popup Modal */}
      {showPaymentHistoryModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            width: '100%',
            maxWidth: '550px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>Part Payment History</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600', backgroundColor: 'var(--surface-container-high)', padding: '4px 8px', borderRadius: '6px' }}>
                  Press <kbd style={{ fontFamily: 'var(--font-mono)' }}>ESC</kbd> to Close
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowPaymentHistoryModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--outline)', padding: '0 8px' }}>
                <span>Booking No: <strong>{bookingNo}</strong></span>
                <span>Grand Total: <strong>₹ {grandTotal.toFixed(2)}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {paymentsList.map((p, idx) => {
                const partPaymentNum = idx + 1;
                const prevPayments = paymentsList.slice(0, idx);
                const prevPaid = prevPayments.reduce((sum, pay) => sum + pay.amount, 0);
                const cumulativePaid = prevPaid + p.amount;
                const isFullyPaidAtThisStep = (grandTotal - cumulativePaid) <= 0;

                let displayLabel = '';
                if (isFullyPaidAtThisStep) {
                  displayLabel = 'Full Payment';
                } else {
                  displayLabel = partPaymentNum === 1 ? 'Advance Payment' : `Part Payment #${partPaymentNum}`;
                }

                return (
                  <div 
                    key={p.id}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--outline-variant)',
                      backgroundColor: 'var(--surface-container-low)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--primary)' }}>
                        {displayLabel} - {p.method}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--outline)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                        Date: {p.date} • Time: {p.time}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--outline)', marginTop: '2px' }}>
                        Collected by: {p.user || 'Admin'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontWeight: '700', fontSize: '14.5px', color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                        ₹ {p.amount.toFixed(2)}
                      </div>
                      {partPaymentNum === 1 ? (
                        <span style={{ fontSize: '11px', color: 'var(--outline)', fontStyle: 'italic', padding: '4px 8px', backgroundColor: 'var(--surface-container-high)', borderRadius: 'var(--radius-md)' }}>
                          (Covered in Main Booking Receipt)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePrintPartPayment(p, partPaymentNum, prevPaid, cumulativePaid)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--secondary)',
                            color: 'var(--secondary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Printer size={14} />
                          Print Receipt
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {paymentsList.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--outline)' }}>
                  No payment records found.
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13.5px' }}>
                Total Paid: <strong style={{ color: 'var(--secondary)' }}>₹ {totalPaid.toFixed(2)}</strong> • Due: <strong style={{ color: balanceDue > 0 ? '#b3261e' : '#2e7d32' }}>₹ {balanceDue.toFixed(2)}</strong>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentHistoryModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--outline-variant)',
                  backgroundColor: 'transparent',
                  color: 'var(--on-surface-variant)',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Prompt Modal before Invoice Generation */}
      {showSettlementModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#b45309', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚠️ Collect Outstanding Balance & Generate Invoice
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--outline)' }}>
                  Booking No: <strong>{settlementBkNo}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600', backgroundColor: 'var(--surface-container-high)', padding: '4px 8px', borderRadius: '6px' }}>
                  Press <kbd style={{ fontFamily: 'var(--font-mono)' }}>ESC</kbd> to Close
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowSettlementModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: 'var(--radius-lg)', color: '#92400e', fontSize: '13.5px' }}>
              This booking currently has an outstanding balance of <strong style={{ color: '#b3261e', fontSize: '16px' }}>₹ {settlementDue.toFixed(2)}</strong>.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--on-surface-variant)' }}>
                Receive Balance Amount (₹):
              </label>
              <input
                type="number"
                value={settlementCollectAmt}
                onChange={(e) => setSettlementCollectAmt(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid #059669',
                  fontSize: '18px',
                  fontWeight: '800',
                  color: '#047857'
                }}
              />

              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                Payment Method:
              </label>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                {['Cash', 'Card/UPI', 'Insurance'].map(m => (
                  <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="settlementPayMode"
                      value={m}
                      checked={settlementPayMode === m}
                      onChange={(e) => setSettlementPayMode(e.target.value)}
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--outline-variant)', paddingTop: '16px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => executeGenerateInvoice(settlementBkNo, settlementCollectAmt, settlementPayMode)}
                style={{
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                }}
              >
                ✓ Collect ₹ {parseFloat(settlementCollectAmt || 0).toFixed(2)} & Generate FULLY PAID Invoice
              </button>

              <button
                type="button"
                onClick={() => executeGenerateInvoice(settlementBkNo, 0, settlementPayMode)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Generate PARTIALLY PAID Invoice (Keep ₹ {settlementDue.toFixed(2)} Due)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Tax Invoice Popup Modal */}
      {showFinalInvoiceModal && generatedInvoiceData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            width: '100%',
            maxWidth: '650px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#059669', margin: 0, fontFamily: 'var(--font-mono)' }}>
                  FINAL TAX INVOICE: {generatedInvoiceData.invoiceNo}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--outline)' }}>
                  Linked Booking No: <strong>{generatedInvoiceData.bookingNo}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600', backgroundColor: 'var(--surface-container-high)', padding: '4px 8px', borderRadius: '6px' }}>
                  Press <kbd style={{ fontFamily: 'var(--font-mono)' }}>ESC</kbd> to Close
                </span>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowFinalInvoiceModal(false);
                    reloadCurrentBooking(savedBookingNo || bookingNo);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Patient Header Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', fontSize: '13px' }}>
              <div><strong>Patient Name:</strong> {generatedInvoiceData.prefix} {generatedInvoiceData.patientName}</div>
              <div><strong>Gender / Age:</strong> {generatedInvoiceData.sex} / {generatedInvoiceData.age} Yrs</div>
              <div><strong>Phone:</strong> +91 {generatedInvoiceData.phone}</div>
              <div><strong>Invoice Date:</strong> {generatedInvoiceData.date_formatted}</div>
            </div>

            {/* Itemized Tests */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--outline-variant)', textAlign: 'left' }}>
                  <th style={{ padding: '6px' }}>Test Code</th>
                  <th style={{ padding: '6px' }}>Test Name</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {generatedInvoiceData.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                    <td style={{ padding: '6px', fontFamily: 'var(--font-mono)' }}>{item.code}</td>
                    <td style={{ padding: '6px' }}>{item.name}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: '700' }}>₹ {item.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Ledger & Paid/Due Seal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: generatedInvoiceData.dueAmount > 0 ? '#fffbeb' : '#ecfdf5',
              padding: '12px',
              borderRadius: 'var(--radius-lg)',
              border: generatedInvoiceData.dueAmount > 0 ? '1px solid #fde68a' : '1px solid #a7f3d0'
            }}>
              <div>
                <div style={{ fontSize: '13px', color: generatedInvoiceData.dueAmount > 0 ? '#b45309' : '#047857', fontWeight: '700' }}>
                  Net Amount: ₹ {generatedInvoiceData.netAmount.toFixed(2)}
                </div>
                <div style={{ fontSize: '13px', color: generatedInvoiceData.dueAmount > 0 ? '#b45309' : '#047857', fontWeight: '700' }}>
                  Total Paid: ₹ {generatedInvoiceData.paidAmount.toFixed(2)}
                </div>
                <div style={{ fontSize: '13px', color: generatedInvoiceData.dueAmount > 0 ? '#b3261e' : '#047857', fontWeight: '700' }}>
                  Balance Due: ₹ {generatedInvoiceData.dueAmount.toFixed(2)}
                </div>
              </div>
              <div style={{
                border: generatedInvoiceData.dueAmount > 0 ? '2px solid #d97706' : '2px solid #059669',
                color: generatedInvoiceData.dueAmount > 0 ? '#d97706' : '#059669',
                padding: '4px 12px',
                borderRadius: '6px',
                fontWeight: '900',
                fontSize: '16px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {generatedInvoiceData.status}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--outline-variant)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowFinalInvoiceModal(false);
                  reloadCurrentBooking(savedBookingNo || bookingNo);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--outline-variant)',
                  backgroundColor: 'transparent',
                  color: 'var(--on-surface-variant)',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintFinalTaxInvoice}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                <Printer size={16} /> Print Final Tax Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Industrial Booking List Explorer Modal */}
      {showExplorerModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '1200px',
            height: '85vh',
            minHeight: '640px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              backgroundColor: 'var(--surface-container-low)',
              borderBottom: '1px solid var(--outline-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px',
                  backgroundColor: 'var(--primary-container)',
                  color: 'var(--on-primary-container)',
                  borderRadius: 'var(--radius-lg)'
                }}>
                  <ListFilter size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--on-surface)' }}>
                    Booking List Explorer
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--outline)' }}>
                    Showing {explorerTotal} total bookings
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600', backgroundColor: 'var(--surface-container-high)', padding: '4px 8px', borderRadius: '6px' }}>
                  Press <kbd style={{ fontFamily: 'var(--font-mono)' }}>ESC</kbd> to Close
                </span>
                <button
                  type="button"
                  onClick={() => setShowExplorerModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--outline)',
                    padding: '4px',
                    borderRadius: '50%'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{
              padding: '16px 24px',
              backgroundColor: 'var(--surface-container-lowest)',
              borderBottom: '1px solid var(--outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Row 1: Date Presets & Custom Date Pickers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--outline)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} /> Quick Date:
                </span>
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'last7', label: 'Last 7 Days' },
                  { id: 'thisMonth', label: 'This Month' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleDatePresetChange(p.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: '1px solid',
                      borderColor: explorerDatePreset === p.id ? 'var(--primary)' : 'var(--outline-variant)',
                      backgroundColor: explorerDatePreset === p.id ? 'var(--primary-container)' : 'var(--surface-container-low)',
                      color: explorerDatePreset === p.id ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {p.label}
                  </button>
                ))}

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--outline)' }}>From:</span>
                  <input
                    type="date"
                    value={explorerFromDate}
                    onChange={(e) => {
                      setExplorerDatePreset('custom');
                      setExplorerFromDate(e.target.value);
                      fetchExplorerData({ from_date: e.target.value, page: 1 });
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--outline-variant)',
                      backgroundColor: 'var(--surface-container-low)',
                      color: 'var(--on-surface)'
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--outline)' }}>To:</span>
                  <input
                    type="date"
                    value={explorerToDate}
                    onChange={(e) => {
                      setExplorerDatePreset('custom');
                      setExplorerToDate(e.target.value);
                      fetchExplorerData({ to_date: e.target.value, page: 1 });
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--outline-variant)',
                      backgroundColor: 'var(--surface-container-low)',
                      color: 'var(--on-surface)'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Search Box & Payment Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)' }} />
                  <input
                    ref={explorerSearchRef}
                    type="text"
                    placeholder="Search by Booking No, Patient Name, Mobile, Doctor... (Press ↑/↓ to navigate)"
                    value={explorerSearch}
                    onChange={(e) => {
                      setExplorerSearch(e.target.value);
                      fetchExplorerData({ search: e.target.value, page: 1 });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const list = explorerDataRef.current;
                        if (list && list.length > 0) {
                          updateActiveExplorerIndex(Math.min(list.length - 1, activeExplorerIndexRef.current + 1));
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const list = explorerDataRef.current;
                        if (list && list.length > 0) {
                          updateActiveExplorerIndex(Math.max(0, activeExplorerIndexRef.current - 1));
                        }
                      } else if (e.key === 'Enter' || e.key === 'NumpadEnter' || e.keyCode === 13) {
                        e.preventDefault();
                        e.stopPropagation();
                        fetchExplorerData({ search: explorerSearch, page: 1 });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 12px 7px 32px',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--outline-variant)',
                      backgroundColor: 'var(--surface-container-low)',
                      color: 'var(--on-surface)',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Filter size={14} style={{ color: 'var(--outline)' }} />
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--outline)' }}>Status:</span>
                  <select
                    value={explorerPayStatus}
                    onChange={(e) => {
                      setExplorerPayStatus(e.target.value);
                      fetchExplorerData({ payment_status: e.target.value, page: 1 });
                    }}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--outline-variant)',
                      backgroundColor: 'var(--surface-container-low)',
                      color: 'var(--on-surface)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="FULL">FULL Payment</option>
                    <option value="PARTIAL">PARTIAL Payment</option>
                    <option value="UNPAID">UNPAID</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => fetchExplorerData({ page: 1 })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--secondary-container)',
                    color: 'var(--on-secondary-container)',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="Refresh Explorer List"
                >
                  <RotateCcw size={14} /> Refresh
                </button>
              </div>

              {/* Metric Summary Cards */}
              {explorerSummary && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '10px',
                  marginTop: '4px'
                }}>
                  <div style={{ padding: '8px 12px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600' }}>TOTAL BOOKINGS</span>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>
                      {explorerSummary.totalCount}
                    </h4>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600' }}>TOTAL NET (₹)</span>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: 'var(--on-surface)' }}>
                      ₹ {explorerSummary.totalNet.toFixed(2)}
                    </h4>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: 'rgba(46, 125, 50, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                    <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>TOTAL COLLECTED (₹)</span>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#2e7d32' }}>
                      ₹ {explorerSummary.totalPaid.toFixed(2)}
                    </h4>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: 'rgba(179, 38, 30, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(179, 38, 30, 0.2)' }}>
                    <span style={{ fontSize: '11px', color: '#b3261e', fontWeight: '600' }}>TOTAL BALANCE DUE (₹)</span>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#b3261e' }}>
                      ₹ {explorerSummary.totalDue.toFixed(2)}
                    </h4>
                  </div>
                </div>
              )}
            </div>

            {/* Industrial Table Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
              {explorerLoading ? (
                <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--outline)' }}>
                  <p style={{ fontSize: '15px', fontWeight: '700' }}>Loading Booking Explorer Data...</p>
                </div>
              ) : explorerData.length === 0 ? (
                <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--outline)' }}>
                  <p style={{ fontSize: '15px', fontWeight: '700' }}>No bookings found matching selected filters.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--outline-variant)', color: 'var(--outline)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '12px 8px' }}>Booking No</th>
                      <th style={{ padding: '12px 8px' }}>Date & Time</th>
                      <th style={{ padding: '12px 8px' }}>Patient Details</th>
                      <th style={{ padding: '12px 8px' }}>Referred Doctor</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Net Amt</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Paid</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Due</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {explorerData.map((item, idx) => {
                      const isActive = idx === activeExplorerIndex;
                      return (
                        <tr
                          key={item.id}
                          tabIndex={0}
                          ref={isActive ? activeExplorerRowRef : null}
                          onClick={(e) => {
                            updateActiveExplorerIndex(idx);
                            e.currentTarget.focus();
                          }}
                          onDoubleClick={() => handleLoadBookingFromExplorer(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'NumpadEnter' || e.keyCode === 13) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleLoadBookingFromExplorer(item);
                            }
                          }}
                          style={{
                            borderBottom: '1px solid var(--outline-variant)',
                            backgroundColor: isActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                            borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                            outline: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '10px 8px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                            {item.bookingNo}
                          </td>
                          <td style={{ padding: '10px 8px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                            {item.dateFormatted}
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ fontWeight: '700', color: 'var(--on-surface)' }}>
                              {item.patientPrefix} {item.patientName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--outline)' }}>
                              {item.age} • {item.sex} {item.mobile ? `• Ph: ${item.mobile}` : ''}
                            </div>
                          </td>
                          <td style={{ padding: '10px 8px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                            {item.doctorName}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                            ₹ {item.netAmount.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#2e7d32' }}>
                            ₹ {item.paidAmount.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '800', fontFamily: 'var(--font-mono)', color: item.dueAmount > 0 ? '#b3261e' : '#2e7d32' }}>
                            ₹ {item.dueAmount.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              backgroundColor: item.paymentStatus === 'FULL' ? 'rgba(46, 125, 50, 0.15)' : (item.paymentStatus === 'PARTIAL' ? 'rgba(237, 108, 2, 0.15)' : 'rgba(179, 38, 30, 0.15)'),
                              color: item.paymentStatus === 'FULL' ? '#2e7d32' : (item.paymentStatus === 'PARTIAL' ? '#ed6c02' : '#b3261e'),
                              border: item.paymentStatus === 'FULL' ? '1px solid rgba(46, 125, 50, 0.3)' : (item.paymentStatus === 'PARTIAL' ? '1px solid rgba(237, 108, 2, 0.3)' : '1px solid rgba(179, 38, 30, 0.3)')
                            }}>
                              {item.paymentStatus}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadBookingFromExplorer(item);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--primary)',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: isActive ? '0 2px 6px rgba(37, 99, 235, 0.35)' : 'none'
                              }}
                              title="Load booking into form for editing or payments (Press Enter)"
                            >
                              <Edit3 size={13} /> Load
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer / Pagination */}
            <div style={{
              padding: '12px 24px',
              backgroundColor: 'var(--surface-container-low)',
              borderTop: '1px solid var(--outline-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--outline)' }}>
                Page {explorerPage} of {explorerLastPage} (Total {explorerTotal} bookings)
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  disabled={explorerPage <= 1}
                  onClick={() => fetchExplorerData({ page: explorerPage - 1 })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--outline-variant)',
                    backgroundColor: 'var(--surface-container-lowest)',
                    cursor: explorerPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: explorerPage <= 1 ? 0.5 : 1,
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <button
                  type="button"
                  disabled={explorerPage >= explorerLastPage}
                  onClick={() => fetchExplorerData({ page: explorerPage + 1 })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--outline-variant)',
                    backgroundColor: 'var(--surface-container-lowest)',
                    cursor: explorerPage >= explorerLastPage ? 'not-allowed' : 'pointer',
                    opacity: explorerPage >= explorerLastPage ? 0.5 : 1,
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
