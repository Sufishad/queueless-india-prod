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
    languages: {
      en: 'English (अंग्रेज़ी)',
      hi: 'हिन्दी (Hindi)',
      hinglish: 'Hinglish (हिंदी + English)',
    },
  },
};
