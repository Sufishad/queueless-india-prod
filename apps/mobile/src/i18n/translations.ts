export type LanguageCode = 'en' | 'hi' | 'hinglish';

export interface TranslationSchema {
  common: {
    appName: string;
    tagline: string;
    subTagline: string;
    selectLanguage: string;
    changeLanguage: string;
    continue: string;
    back: string;
    loading: string;
    cancel: string;
    confirm: string;
    close: string;
    offlineMode: string;
  };
  roles: {
    selectRoleTitle: string;
    selectRoleSubtitle: string;
    customerTitle: string;
    customerSubtitle: string;
    customerBadge: string;
    customerAction: string;
    ownerTitle: string;
    ownerSubtitle: string;
    ownerBadge: string;
    ownerAction: string;
  };
  queue: {
    tokenNumber: string;
    nowServing: string;
    waitingAhead: string;
    estimatedWait: string;
    joinQueue: string;
    leaveQueue: string;
    callNext: string;
    complete: string;
    skip: string;
    turnNearAlert: string;
    noOtpNotice: string;
  };
  customer: {
    locationLabel: string;
    searchPlaceholder: string;
    categories: {
      all: string;
      clinic: string;
      salon: string;
      bank: string;
      restaurant: string;
      retail: string;
    };
    activeTokenBanner: string;
    viewLiveToken: string;
    peopleAhead: string;
    minsWait: string;
    servicesOffered: string;
    price: string;
    duration: string;
    enterName: string;
    enterMobile: string;
    mobileHelper: string;
    invalidMobileError: string;
    nameRequiredError: string;
    serviceRequiredError: string;
    instantBooking: string;
    zeroOtpGuarantee: string;
    payUpi: string;
    scanToPay: string;
    leaveQueueConfirm: string;
    leaveQueueWarning: string;
    offlineQrNotice: string;
    tabs: {
      explore: string;
      myQueues: string;
      saved: string;
    };
    status: {
      active: string;
      completed: string;
      cancelled: string;
      serving: string;
    };
    emptyBusinesses: string;
    emptySaved: string;
    emptyQueues: string;
  };
  languages: {
    en: string;
    hi: string;
    hinglish: string;
  };
}

export const translations: Record<LanguageCode, TranslationSchema> = {
  en: {
    common: {
      appName: 'QueueLess India',
      tagline: 'Time par, line mein nahi.',
      subTagline: 'Zero-friction real-time smart queuing for Indian local businesses',
      selectLanguage: 'Select Language',
      changeLanguage: 'Change Language',
      continue: 'Continue',
      back: 'Back',
      loading: 'Loading...',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      offlineMode: 'Offline Mode (Saved Token)',
    },
    roles: {
      selectRoleTitle: 'How do you want to use QueueLess?',
      selectRoleSubtitle: 'Choose your profile to proceed. You can switch anytime.',
      customerTitle: "I'm a Customer",
      customerSubtitle: 'Get instant live tokens without waiting in crowded physical lines.',
      customerBadge: 'Zero OTP • 1-Second Token',
      customerAction: 'Find Nearby Queues',
      ownerTitle: "I'm a Business Owner",
      ownerSubtitle: 'Doctor, Salon, Clinic, Restaurant, or Store. Manage queues with 1-tap controls.',
      ownerBadge: 'Digital Board • Instant Call',
      ownerAction: 'Open Business Console',
    },
    queue: {
      tokenNumber: 'Token Number',
      nowServing: 'Now Serving',
      waitingAhead: 'People Ahead of You',
      estimatedWait: 'Estimated Wait Time',
      joinQueue: 'Join Queue (No OTP)',
      leaveQueue: 'Leave Queue',
      callNext: 'Call Next',
      complete: 'Complete Token',
      skip: 'Skip Customer',
      turnNearAlert: 'Your turn is approaching! Please be near the counter.',
      noOtpNotice: 'Only Name + Mobile required. No SMS OTP wait.',
    },
    customer: {
      locationLabel: 'Current Location',
      searchPlaceholder: 'Search clinic, salon, doctor, restaurant...',
      categories: {
        all: 'All',
        clinic: 'Clinic',
        salon: 'Salon',
        bank: 'Bank / e-Lobby',
        restaurant: 'Restaurant',
        retail: 'Retail / Store',
      },
      activeTokenBanner: 'You have an Active Token',
      viewLiveToken: 'Track Live',
      peopleAhead: 'ahead',
      minsWait: 'mins wait',
      servicesOffered: 'Available Services',
      price: 'Price',
      duration: 'Duration',
      enterName: 'Your Name',
      enterMobile: '10-digit Indian Mobile',
      mobileHelper: 'Starting with 6, 7, 8, or 9 (No OTP needed)',
      invalidMobileError: 'Please enter a valid 10-digit Indian mobile (starts with 6-9)',
      nameRequiredError: 'Please enter your name',
      serviceRequiredError: 'Please select at least one service',
      instantBooking: 'Get Instant Token',
      zeroOtpGuarantee: '100% OTP-Free • Instant Confirmed Token',
      payUpi: 'Pay with any UPI App',
      scanToPay: 'Scan QR to Pay at Counter',
      leaveQueueConfirm: 'Leave this Queue?',
      leaveQueueWarning: 'Your token will be cancelled and you will lose your spot in line.',
      offlineQrNotice: 'Saved locally. Show this QR at the counter even without internet.',
      tabs: {
        explore: 'Explore',
        myQueues: 'My Queues',
        saved: 'Saved',
      },
      status: {
        active: 'Active',
        completed: 'Completed',
        cancelled: 'Cancelled',
        serving: 'Now Serving',
      },
      emptyBusinesses: 'No businesses found matching your criteria.',
      emptySaved: 'No saved businesses yet. Tap the bookmark icon on any store to save it here.',
      emptyQueues: 'You have not joined any queues yet.',
    },
    languages: {
      en: 'English (Default)',
      hi: 'हिन्दी (Hindi)',
      hinglish: 'Hinglish (Hindi + English)',
    },
  },
  hi: {
    common: {
      appName: 'क्यूलेस इंडिया',
      tagline: 'लाइन में नहीं, टाइम पर।',
      subTagline: 'भारतीय बाज़ारों के लिए बिना रुकावट, रियल-टाइम स्मार्ट कतार प्रणाली',
      selectLanguage: 'भाषा चुनें',
      changeLanguage: 'भाषा बदलें',
      continue: 'आगे बढ़ें',
      back: 'पीछे जाएं',
      loading: 'लोड हो रहा है...',
      cancel: 'रद्द करें',
      confirm: 'पुष्टि करें',
      close: 'बंद करें',
      offlineMode: 'ऑफलाइन मोड (सुरक्षित टोकन)',
    },
    roles: {
      selectRoleTitle: 'आप क्यूलेस का उपयोग कैसे करना चाहते हैं?',
      selectRoleSubtitle: 'आगे बढ़ने के लिए अपनी भूमिका चुनें। इसे कभी भी बदला जा सकता है।',
      customerTitle: 'मैं एक ग्राहक हूँ',
      customerSubtitle: 'भीड़भाड़ वाली कतारों में खड़े हुए बिना तुरंत लाइव टोकन पाएं।',
      customerBadge: 'बिना ओटीपी • 1 सेकंड में टोकन',
      customerAction: 'आस-पास की दुकानें देखें',
      ownerTitle: 'मैं एक दुकानदार / डॉक्टर हूँ',
      ownerSubtitle: 'क्लिनिक, सैलून, रेस्टोरेंट या स्टोर। 1-टैप में कतार और टोकन नियंत्रित करें।',
      ownerBadge: 'डिजिटल बोर्ड • वन-टैप कॉल',
      ownerAction: 'व्यापारी कंसोल खोलें',
    },
    queue: {
      tokenNumber: 'टोकन संख्या',
      nowServing: 'वर्तमान टोकन',
      waitingAhead: 'आपके आगे लोग',
      estimatedWait: 'अनुमानित समय',
      joinQueue: 'कतार में लगें (बिना ओटीपी)',
      leaveQueue: 'कतार छोड़ें',
      callNext: 'अगला टोकन बुलाएं',
      complete: 'टोकन पूरा करें',
      skip: 'टोकन स्किप करें',
      turnNearAlert: 'आपका नंबर आने वाला है! कृपया काउंटर के पास रहें।',
      noOtpNotice: 'केवल नाम और मोबाइल नंबर। कोई ओटीपी की झंझट नहीं।',
    },
    customer: {
      locationLabel: 'वर्तमान स्थान',
      searchPlaceholder: 'क्लिनिक, सैलून, डॉक्टर, रेस्टोरेंट खोजें...',
      categories: {
        all: 'सभी',
        clinic: 'क्लिनिक',
        salon: 'सैलून',
        bank: 'बैंक / कियोस्क',
        restaurant: 'रेस्टोरेंट / कैफ़े',
        retail: 'दुकान / रिटेल',
      },
      activeTokenBanner: 'आपका टोकन सक्रिय है',
      viewLiveToken: 'लाइव देखें',
      peopleAhead: 'आगे हैं',
      minsWait: 'मिनट शेष',
      servicesOffered: 'उपलब्ध सेवाएं',
      price: 'कीमत',
      duration: 'समय',
      enterName: 'आपका शुभ नाम',
      enterMobile: '10-अंकों का मोबाइल नंबर',
      mobileHelper: '6, 7, 8 या 9 से शुरू (कोई OTP नहीं)',
      invalidMobileError: 'कृपया 10-अंकों का वैध भारतीय मोबाइल नंबर डालें (6-9 से शुरू)',
      nameRequiredError: 'कृपया अपना नाम दर्ज करें',
      serviceRequiredError: 'कृपया कम से कम एक सेवा चुनें',
      instantBooking: 'तुरंत टोकन लें',
      zeroOtpGuarantee: '100% बिना OTP • 1 सेकंड में टोकन कन्फर्म',
      payUpi: 'किसी भी UPI ऐप से भुगतान करें',
      scanToPay: 'काउंटर पर भुगतान के लिए QR स्कैन करें',
      leaveQueueConfirm: 'क्या आप कतार छोड़ना चाहते हैं?',
      leaveQueueWarning: 'आपका टोकन रद्द हो जाएगा और आप कतार में अपना स्थान खो देंगे।',
      offlineQrNotice: 'यह टोकन सुरक्षित है। इंटरनेट न होने पर भी काउंटर पर यह QR दिखाएं।',
      tabs: {
        explore: 'खोजें',
        myQueues: 'मेरी कतारें',
        saved: 'पसंदीदा',
      },
      status: {
        active: 'सक्रिय',
        completed: 'पूर्ण',
        cancelled: 'रद्द',
        serving: 'काउंटर पर',
      },
      emptyBusinesses: 'आपकी खोज के अनुसार कोई दुकान नहीं मिली।',
      emptySaved: 'अभी कोई पसंदीदा दुकान नहीं है। किसी भी दुकान पर बुकमार्क दबाएं।',
      emptyQueues: 'आपने अभी तक कोई टोकन नहीं लिया है।',
    },
    languages: {
      en: 'English (अंग्रेज़ी)',
      hi: 'हिन्दी (Hindi)',
      hinglish: 'हिंग्लिश (Hinglish)',
    },
  },
  hinglish: {
    common: {
      appName: 'QueueLess India',
      tagline: 'Line mein nahi, time par.',
      subTagline: 'Indian local businesses ke liye zero-friction real-time smart queue app',
      selectLanguage: 'Language Chunein',
      changeLanguage: 'Language Change Karein',
      continue: 'Aage Badhein',
      back: 'Wapas Jayein',
      loading: 'Loading ho raha hai...',
      cancel: 'Cancel Karein',
      confirm: 'Confirm Karein',
      close: 'Band Karein',
      offlineMode: 'Offline Mode (Saved Token)',
    },
    roles: {
      selectRoleTitle: 'Aap QueueLess kaise use karna chahte hain?',
      selectRoleSubtitle: 'Apna profile select karein. Baad mein switch kar sakte hain.',
      customerTitle: 'Main Customer Hoon',
      customerSubtitle: 'Bheed wali line mein khade hue bina turant live token payein.',
      customerBadge: 'No OTP • 1 Second Token',
      customerAction: 'Nearby Queues Dekhein',
      ownerTitle: 'Main Business Owner / Doctor Hoon',
      ownerSubtitle: 'Clinic, Salon, Store ya Restaurant. 1-tap mein token manage karein.',
      ownerBadge: 'Digital Board • One-Tap Call',
      ownerAction: 'Business Console Kholein',
    },
    queue: {
      tokenNumber: 'Token Number',
      nowServing: 'Abhi Chal Raha Token',
      waitingAhead: 'Aapke Aage Log',
      estimatedWait: 'Expected Time',
      joinQueue: 'Line Join Karein (No OTP)',
      leaveQueue: 'Line Chhodein',
      callNext: 'Next Token Bulayein',
      complete: 'Complete Karein',
      skip: 'Customer Skip Karein',
      turnNearAlert: 'Aapka number aane wala hai! Please counter ke paas rahein.',
      noOtpNotice: 'Sirf Name + Mobile Number. SMS OTP ka koi wait nahi.',
    },
    customer: {
      locationLabel: 'Current Location',
      searchPlaceholder: 'Clinic, salon, doctor, restaurant search karein...',
      categories: {
        all: 'All',
        clinic: 'Clinic',
        salon: 'Salon',
        bank: 'Bank / Kiosk',
        restaurant: 'Restaurant / Cafe',
        retail: 'Store / Dukaan',
      },
      activeTokenBanner: 'Aapka Active Token Chalu Hai',
      viewLiveToken: 'Live Track Karein',
      peopleAhead: 'aage hain',
      minsWait: 'min bache hain',
      servicesOffered: 'Available Services',
      price: 'Price',
      duration: 'Time',
      enterName: 'Aapka Name',
      enterMobile: '10-digit Mobile Number',
      mobileHelper: '6, 7, 8 ya 9 se shuru (Koi OTP nahi)',
      invalidMobileError: 'Please valid 10-digit Indian mobile number enter karein (starts with 6-9)',
      nameRequiredError: 'Please apna name enter karein',
      serviceRequiredError: 'Please kam se kam ek service select karein',
      instantBooking: 'Instant Token Payein',
      zeroOtpGuarantee: '100% No-OTP • 1 Second Instant Confirmation',
      payUpi: 'Kisi bhi UPI App se Pay Karein',
      scanToPay: 'Counter par Pay karne ke liye QR scan karein',
      leaveQueueConfirm: 'Kya aap Line Chhodna Chahte Hain?',
      leaveQueueWarning: 'Aapka token cancel ho jayega aur line mein jagah chhoot jayegi.',
      offlineQrNotice: 'Offline saved token. Net na hone par bhi counter par ye QR dikhayein.',
      tabs: {
        explore: 'Explore',
        myQueues: 'Meri Queues',
        saved: 'Saved Shops',
      },
      status: {
        active: 'Active',
        completed: 'Completed',
        cancelled: 'Cancelled',
        serving: 'Now Serving',
      },
      emptyBusinesses: 'Koi business nahi mila. Search query badal kar dekhein.',
      emptySaved: 'Abhi koi saved business nahi hai. Shop par bookmark tap karke save karein.',
      emptyQueues: 'Aapne abhi tak koi token join nahi kiya hai.',
    },
    languages: {
      en: 'English (अंग्रेज़ी)',
      hi: 'हिन्दी (Hindi)',
      hinglish: 'Hinglish (हिंदी + English)',
    },
  },
};
