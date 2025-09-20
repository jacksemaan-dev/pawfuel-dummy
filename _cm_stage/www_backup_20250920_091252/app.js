/*
 * PawFuel PWA
 *
 * This script defines a simple offline-first raw feeding companion app.
 * Data is stored in localStorage under the key `rawpaw_state`.
 * When possible, it uses sensible defaults and heuristics to suggest daily meals
 * for your dog, manage inventory, log stool photos, and provide basic coaching.
 *
 * Note: This is not veterinary advice. Always consult a vet for
 * personalised guidance.
 */

(function() {
  'use strict';

  // State management
  let state = null;

  // The full Royal Barf catalogue is loaded from a global variable
  // `window.embeddedCatalog` which is defined in a separate script
  // (assets/embedded_catalog.js).  This avoids fetch() restrictions
  // under file:// by embedding the data directly.  See index.html for
  // the script order.

  /**
   * Load the full product catalogue used for ordering.  The catalogue is
   * shipped as a JSON file in assets (catalog_master_v14_1.json).  It
   * contains the official Royal Barf product list with prices, sizes and
   * categories.  Once loaded, state.catalogList will be an array of
   * catalogue objects and state.catalogMap a dictionary keyed by
   * product ID (product_key) for quick lookups.  If the file cannot be
   * fetched, the catalogue arrays remain empty and ordering will
   * gracefully fall back to the original smaller raw product list.
   */
  async function loadCatalog() {
    try {
      let data = [];
      // Prefer the embedded catalogue if present (loaded via embedded_catalog.js)
      if (Array.isArray(window.embeddedCatalog) && window.embeddedCatalog.length > 0) {
        data = window.embeddedCatalog;
      }
      // Fallback: attempt to fetch the JSON file when running under http/https
      if (data.length === 0) {
        const res = await fetch('assets/catalog_master_v14_1.json');
        if (!res.ok) throw new Error('Failed to fetch catalogue');
        const json = await res.json();
        data = json.map(item => ({
          id: item.product_key,
          name: item.product_name,
          category: item.category,
          size: item.size_weight || '',
          price: item.price_amount,
          currency: item.price_currency || 'USD',
          description: item.description || ''
        }));
      }
      // Map into our state format (ensuring all fields exist)
      state.catalogList = data.map(p => {
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          size: p.size || '',
          price: p.price,
          currency: p.currency || 'USD',
          description: p.description || ''
        };
      });
      state.catalogMap = {};
      state.catalogList.forEach(p => { state.catalogMap[p.id] = p; });
    } catch (err) {
      console.warn('Catalogue loading failed', err);
      // Ensure catalogue arrays exist even on failure
      state.catalogList = [];
      state.catalogMap = {};
    }
  }

  // ---------------------------------------------------------------------------
  // Internationalisation (i18n) support
  // Define a dictionary of translation keys for English (default) and Arabic.
  // When adding new UI strings, reference them by key rather than hard‑coding
  // the text.  If a translation is missing, the English fallback will be used.
  const translations = {
    en: {
      nav_home: 'Home',
      nav_inventory: 'Inventory',
      nav_stool: 'Stool',
      nav_plates: 'Plates',
      nav_insights: 'Insights',
      nav_orders: 'Orders',
      nav_settings: 'Settings',
      nav_account: 'Account',
      account_title: 'Account',
      account_create: 'Create Account',
      account_sign_in: 'Sign In',
      account_email: 'Email',
      account_password: 'Password',
      account_create_btn: 'Create',
      account_login_btn: 'Log In',
      account_sign_out: 'Sign Out',
      account_existing_error: 'Account already exists – please sign in.',
      account_not_found_error: 'No account found – please create one.',
      account_credentials_error: 'Incorrect email or password.',
      account_sign_in_with_google: 'Sign in with Google',
      account_sign_in_with_apple: 'Sign in with Apple',
      onboarding_title: 'Onboarding',
      onboarding_intro: 'Tell us about your dog to personalise PawFuel.',
      onboarding_weight: 'Weight (kg)',
      onboarding_age: 'Age (years)',
      onboarding_activity: 'Activity level',
      onboarding_sensitivities: 'Sensitivities (comma separated)',
      onboarding_continue: 'Save & Continue',
      onboarding_finish: 'Finish',
      onboarding_pro_required: 'Pro plan required to view rotation calendar.',
      // Launch banner message with placeholder for end date. The {date} token will be replaced
      // by the founder’s free Pro expiry date.
      banner_message: 'All Pro features free until {date}',
      banner_action: 'Start Now',
      settings_language: 'Language',
      settings_units: 'Units',
      settings_metric: 'Metric (kg, g)',
      settings_imperial: 'Imperial (lb, oz)',
      settings_pro_status: 'Pro status',
      settings_pro_active: 'Active',
      settings_pro_inactive: 'Inactive',
      settings_trial_left: 'Trial ends in',
      settings_subscription_intro_left: 'Intro price ends in',
      settings_subscription_active: 'Pro subscription active',
      settings_select_language: 'Select language',
      settings_select_english: 'English',
      settings_select_arabic: 'العربية',
      pro_feature_header: 'Pro Feature',
      pro_feature_message: 'This section is available for Pro users only.',
      pro_feature_button: 'Close',
      pro_feature_cta: 'Unlock Pro in settings to access advanced features like stool analysis, plates tutorials, insights and ordering.',
      stool_result_note: 'Note: This is not medical advice.',
      stool_select: 'Select a stool photo to analyse.',
      stool_result_prefix: 'Result',
      stool_healthy: 'Healthy',
      stool_watch: 'Watch',
      stool_concern: 'Concern',
      stool_analysis_title: 'Stool Analysis',
      analyse_stool_photo: 'Analyse Stool Photo',
      rotation_heading: '7‑Day Rotation',
      insights_rotation_heading: 'Protein Rotation (last 7 days)',
      build_from_inventory: 'Build from inventory',
      disclaimer: 'Disclaimer: This app provides general guidance and is not veterinary advice. Always consult a veterinarian for personalised guidance.'
      ,inventory_title: 'Inventory'
      ,add_stock_btn: 'Add Stock'
      ,add_product_btn: 'Add Product'
      ,plates_tutorials_title: 'Plates Tutorials'
      ,insights_title: 'Insights'
      ,orders_title: 'Orders'
      ,copy_order_list: 'Copy Order List'
      ,settings_title: 'Settings'
      ,motto: 'Fuel them like nature intended'
      ,settings_privacy: 'Privacy Policy'
      ,settings_terms: 'Terms of Use'
      ,settings_branch: 'Preferred Branch'
      ,settings_branch_lebanon: 'Lebanon'
      ,settings_branch_cyprus: 'Cyprus'
      ,settings_delete_account: 'Delete Account & Data'
      ,orders_submit_btn: 'Order Now'
      ,orders_recurring_title: 'Recurring Orders'
      ,orders_schedule_day: 'Day of week'
      ,orders_schedule_time: 'Time'
      ,orders_schedule_items: 'Items'
      ,orders_schedule_quantity: 'Quantity'
      ,orders_schedule_save: 'Save Schedule'
      ,order_delete_schedule: 'Delete Schedule'
      ,orders_column_product: 'Product'
      ,orders_column_size: 'Size'
      ,orders_column_price: 'Price'
      ,orders_column_qty: 'Qty'
      ,orders_recurring_none: 'No recurring orders set.'
      ,faqs_title: 'FAQs'
      ,faqs_question_storage: 'How do I store BARF safely?'
      ,faqs_answer_storage: 'Store meals in the freezer at -18°C. Thaw the night before in the refrigerator.'
      ,faqs_question_transition: 'How do I transition from kibble to raw?'
      ,faqs_answer_transition: 'Switch gradually over 7-10 days by mixing increasing portions of raw food.'
      ,faqs_question_stool: 'What do different stool colours mean?'
      ,faqs_answer_stool: 'Bright white: too much bone; dark tarry: too much organ; yellow runny: sensitivity.'
      ,studies_title: 'Studies'
      ,studies_view_btn: 'View Study'
      ,orders_search_placeholder: 'Search products'
      ,orders_filter_category: 'Filter by category'
      ,orders_sort_label: 'Sort by'
      ,orders_sort_name: 'Name'
      ,orders_sort_price_asc: 'Price (Low to High)'
      ,orders_sort_price_desc: 'Price (High to Low)'
      ,orders_order_summary_title: 'Order Summary'
      ,orders_send_now: 'Send Now'
      ,orders_confirm_send_title: 'Confirm Order'
      ,orders_confirm_send_message: 'Are you sure you want to send this order via WhatsApp?'
      ,orders_confirm_send_btn: 'Send'
      ,orders_cancel_btn: 'Cancel'
      ,orders_message_preview: 'Message Preview'
      ,orders_no_match: 'No products match your search'
      ,snacks_heading: 'Optional Snacks'
      ,show_welcome_offer: 'Show Welcome Offer'
      ,settings_contact_support: 'Contact Royal Barf'
    },
    ar: {
      nav_home: 'الرئيسية',
      nav_inventory: 'المخزون',
      nav_stool: 'البراز',
      nav_plates: 'الصحون',
      nav_insights: 'التبصر',
      nav_orders: 'الطلبات',
      nav_settings: 'الإعدادات',
      nav_account: 'الحساب',
      account_title: 'الحساب',
      account_create: 'إنشاء حساب',
      account_sign_in: 'تسجيل الدخول',
      account_email: 'البريد الإلكتروني',
      account_password: 'كلمة المرور',
      account_create_btn: 'إنشاء',
      account_login_btn: 'دخول',
      account_sign_out: 'تسجيل الخروج',
      account_existing_error: 'الحساب موجود بالفعل – الرجاء تسجيل الدخول.',
      account_not_found_error: 'لم يتم العثور على حساب – الرجاء إنشاء حساب.',
      account_credentials_error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      account_sign_in_with_google: 'تسجيل الدخول باستخدام جوجل',
      account_sign_in_with_apple: 'تسجيل الدخول باستخدام أبل',
      onboarding_title: 'الإعداد',
      onboarding_intro: 'أخبرنا عن كلبك لتخصيص باوفويل.',
      onboarding_weight: 'الوزن (كغ)',
      onboarding_age: 'العمر (سنوات)',
      onboarding_activity: 'مستوى النشاط',
      onboarding_sensitivities: 'الحساسيات (مفصولة بفواصل)',
      onboarding_continue: 'حفظ ومتابعة',
      onboarding_finish: 'إنهاء',
      onboarding_pro_required: 'يتطلب خطة برو لعرض جدول التناوب.',
      // Launch banner message for founder’s free year. The {date} token will be replaced
      // with the formatted expiry date.  Arabic translation provided.
      banner_message: 'جميع ميزات برو مجانية حتى {date}',
      banner_action: 'ابدأ الآن',
      settings_language: 'اللغة',
      settings_units: 'الوحدات',
      settings_metric: 'متري (كغ، غ)',
      settings_imperial: 'إنجليزي (رطل، أوقية)',
      settings_pro_status: 'حالة برو',
      settings_pro_active: 'نشط',
      settings_pro_inactive: 'غير نشط',
      settings_trial_left: 'تنتهي الفترة التجريبية خلال',
      settings_subscription_intro_left: 'تنتهي فترة السعر التمهيدي خلال',
      settings_subscription_active: 'اشتراك برو نشط',
      settings_select_language: 'اختر اللغة',
      settings_select_english: 'الإنجليزية',
      settings_select_arabic: 'العربية',
      pro_feature_header: 'ميزة برو',
      pro_feature_message: 'هذا القسم متاح فقط لمستخدمي برو.',
      pro_feature_button: 'إغلاق',
      pro_feature_cta: 'افتح برو في الإعدادات للوصول إلى ميزات متقدمة مثل تحليل البراز ودروس الصحون والتبصر والطلب.',
      stool_result_note: 'ملاحظة: هذه ليست نصيحة طبية.',
      stool_select: 'اختر صورة للبراز لتحليلها.',
      stool_result_prefix: 'النتيجة',
      stool_healthy: 'صحي',
      stool_watch: 'مراقبة',
      stool_concern: 'قلق',
      stool_analysis_title: 'تحليل البراز',
      analyse_stool_photo: 'تحليل صورة البراز',
      rotation_heading: 'تناوب لمدة 7 أيام',
      insights_rotation_heading: 'تدوير البروتين (آخر 7 أيام)',
      build_from_inventory: 'إعداد من المخزون',
      disclaimer: 'إخلاء المسؤولية: يوفر هذا التطبيق إرشادات عامة ولا يعد نصيحة بيطرية. استشر الطبيب البيطري للحصول على إرشادات مخصصة.'
      ,inventory_title: 'المخزون'
      ,add_stock_btn: 'إضافة مخزون'
      ,add_product_btn: 'إضافة منتج'
      ,plates_tutorials_title: 'دروس الصحون'
      ,insights_title: 'التبصر'
      ,orders_title: 'الطلبات'
      ,copy_order_list: 'نسخ قائمة الطلبات'
      ,settings_title: 'الإعدادات'
      ,motto: 'زودهم بالطاقة كما أرادت الطبيعة'
      ,settings_privacy: 'سياسة الخصوصية'
      ,settings_terms: 'شروط الاستخدام'
      ,settings_branch: 'الفرع المفضل'
      ,settings_branch_lebanon: 'لبنان'
      ,settings_branch_cyprus: 'قبرص'
      ,settings_delete_account: 'حذف الحساب والبيانات'
      ,orders_submit_btn: 'اطلب الآن'
      ,orders_recurring_title: 'الطلبات المتكررة'
      ,orders_schedule_day: 'اليوم'
      ,orders_schedule_time: 'الوقت'
      ,orders_schedule_items: 'المنتجات'
      ,orders_schedule_quantity: 'الكمية'
      ,orders_schedule_save: 'احفظ الجدول'
      ,order_delete_schedule: 'حذف الجدول'
      ,orders_column_product: 'المنتج'
      ,orders_column_size: 'الحجم'
      ,orders_column_price: 'السعر'
      ,orders_column_qty: 'الكمية'
      ,orders_recurring_none: 'لا توجد طلبات متكررة'
      ,faqs_title: 'الأسئلة الشائعة'
      ,faqs_question_storage: 'كيف أخزن اللحوم النيئة بأمان؟'
      ,faqs_answer_storage: 'احتفظ بالوجبات في المجمد عند -18 درجة مئوية. قم بإذابة الثلج في الثلاجة في الليلة السابقة.'
      ,faqs_question_transition: 'كيف أنتقل من طعام الكلاب الجاف إلى الخام؟'
      ,faqs_answer_transition: 'قم بالتحويل تدريجياً على مدى 7-10 أيام عن طريق خلط أجزاء متزايدة من الطعام الخام.'
      ,faqs_question_stool: 'ماذا تعني ألوان البراز المختلفة؟'
      ,faqs_answer_stool: 'الأبيض الفاتح: الكثير من العظم؛ الأسود الداكن: الكثير من الأعضاء؛ الأصفر السائل: حساسية.'
      ,studies_title: 'الدراسات'
      ,studies_view_btn: 'عرض الدراسة'
      ,orders_search_placeholder: 'ابحث عن المنتجات'
      ,orders_filter_category: 'تصفية حسب الفئة'
      ,orders_sort_label: 'ترتيب حسب'
      ,orders_sort_name: 'الاسم'
      ,orders_sort_price_asc: 'السعر (من الأقل إلى الأعلى)'
      ,orders_sort_price_desc: 'السعر (من الأعلى إلى الأقل)'
      ,orders_order_summary_title: 'ملخص الطلب'
      ,orders_send_now: 'إرسال الآن'
      ,orders_confirm_send_title: 'تأكيد الطلب'
      ,orders_confirm_send_message: 'هل أنت متأكد أنك تريد إرسال هذا الطلب عبر واتساب؟'
      ,orders_confirm_send_btn: 'إرسال'
      ,orders_cancel_btn: 'إلغاء'
      ,orders_message_preview: 'معاينة الرسالة'
      ,orders_no_match: 'لا توجد منتجات مطابقة للبحث'
      ,snacks_heading: 'الوجبات الخفيفة الاختيارية'
      ,show_welcome_offer: 'إظهار عرض الترحيب'
      ,settings_contact_support: 'اتصل برويال بارف'
    }
  };

  /**
   * Translate a key based on the current language stored in state.  If the
   * translation is missing for the selected language, fallback to English.
   * @param {string} key - The translation key
   * @returns {string} The translated string
   */
  function t(key) {
    const lang = state && state.settings && state.settings.language ? state.settings.language : 'en';
    return (translations[lang] && translations[lang][key]) || translations.en[key] || key;
  }

  /**
   * Apply language and direction to the document based on state.settings.language.
   * Should be called after the state is loaded or language updated.
   */
  function applyLanguage() {
    const lang = state && state.settings && state.settings.language ? state.settings.language : 'en';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    // Update static navigation labels if they are present in the DOM
    const navButtons = document.querySelectorAll('#navBar button');
    navButtons.forEach(btn => {
      const page = btn.getAttribute('data-page');
      if (!page) return;
      const labelSpan = btn.querySelector('.nav-label');
      if (labelSpan) {
        switch (page) {
          case 'home': labelSpan.textContent = t('nav_home'); break;
          case 'inventory': labelSpan.textContent = t('nav_inventory'); break;
          case 'stool': labelSpan.textContent = t('nav_stool'); break;
          case 'plates': labelSpan.textContent = t('nav_plates'); break;
          case 'insights': labelSpan.textContent = t('nav_insights'); break;
          case 'orders': labelSpan.textContent = t('nav_orders'); break;
          case 'settings': labelSpan.textContent = t('nav_settings'); break;
          case 'account': labelSpan.textContent = t('nav_account'); break;
        }
      }
    });

    // Update static page headings and labels based on language
    // Stool page title
    const stoolTitle = document.querySelector('#stoolPage h2');
    if (stoolTitle) stoolTitle.textContent = t('stool_analysis_title');
    // Stool analysis button label
    const stoolLabel = document.querySelector('#stoolPage label[for="stoolInput"]');
    if (stoolLabel) {
      // Replace only the text node before the input element
      const nodes = Array.from(stoolLabel.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
      if (nodes.length > 0) nodes[0].textContent = t('analyse_stool_photo') + ' ';
    }

    // Update other static headings and buttons if present
    const inventoryHeading = document.querySelector('#inventoryPage h2');
    if (inventoryHeading) inventoryHeading.textContent = t('inventory_title');
    const addStockBtn = document.querySelector('#addStockBtn');
    if (addStockBtn) addStockBtn.textContent = t('add_stock_btn');
    const addProductBtn = document.querySelector('#addProductBtn');
    if (addProductBtn) addProductBtn.textContent = t('add_product_btn');

    const platesHeading = document.querySelector('#platesPage h2');
    if (platesHeading) platesHeading.textContent = t('plates_tutorials_title');

    const insightsHeading = document.querySelector('#insightsPage h2');
    if (insightsHeading) insightsHeading.textContent = t('insights_title');

    const ordersHeading = document.querySelector('#ordersPage h2');
    if (ordersHeading) ordersHeading.textContent = t('orders_title');
    const copyOrderBtn = document.querySelector('#orderBtn');
    if (copyOrderBtn) copyOrderBtn.textContent = t('copy_order_list');

    const settingsHeading = document.querySelector('#settingsPage h2');
    if (settingsHeading) settingsHeading.textContent = t('settings_title');

    const mottoEl = document.getElementById('motto');
    if (mottoEl) mottoEl.textContent = t('motto');

    // FAQs and Studies headings
    const faqsHeading = document.querySelector('#faqsPage h2');
    if (faqsHeading) faqsHeading.textContent = t('faqs_title');
    const studiesHeading = document.querySelector('#studiesPage h2');
    if (studiesHeading) studiesHeading.textContent = t('studies_title');
  }

  // Track whether the inventory categories are currently expanded.  This
  // global flag allows us to keep the inventory table expanded when
  // incrementing or decrementing stock counts without collapsing back to
  // the default collapsed state.  It is toggled by clicking the shop
  // header and respected when rebuilding the inventory page.
  let inventoryExpanded = false;
  // Storage key version: increment when default state schema changes so
  // previous localStorage entries won't be loaded (forcing fresh data).
  // Storage key version: bump this when the default state or schema changes.
  // v3 corresponds to the introduction of category grouping, product details,
  // Pro toggle, PDF export and updated product catalogue.  Changing this key
  // forces a fresh state to be loaded and avoids conflicts with older local
  // storage entries.
  // Bump storage key whenever the default state or functionality changes.  v4 added
  // category grouping and the initial shop heading.  v5 introduces shop
  // grouping, duplicate‑filtering on the inventory list, and Pro gating for
  // advanced features (stool analysis, plates, insights and orders).  By
  // incrementing this key, any old localStorage state will be ignored and the
  // new defaults will be used instead.
  // Bump storage key whenever default state or structure changes. v6 holds
  // improved category deduplication, updated Pro pricing display and dialog
  // styling.
  // Bump the storage key to force a fresh load of the default state when
  // updating major features or UI improvements.  v8 includes improved
  // dialog readability and enlarged Pro toggle.  This ensures any
  // previously persisted state doesn’t interfere with new feature
  // roll‑outs.
// Bump storage key to force a fresh load when major changes (v10 adds smarter
// rotation engine, treat suggestions, banner restore and support link).
// Bump storage key to force reload state for v14 final build (including order history and smarter rotation engine)
const STORAGE_KEY = 'rawpaw_state_v11';

  function loadState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        state = JSON.parse(data);
        // Ensure new state fields added in v14 are present
        if (state.preferredBranch === undefined) state.preferredBranch = 'lebanon';
        if (!Array.isArray(state.recurringOrders)) state.recurringOrders = [];
        if (state.proExpiry === undefined) state.proExpiry = Date.now() + 365 * 24 * 60 * 60 * 1000;
        if (state.consentGiven === undefined) state.consentGiven = false;
        if (!Array.isArray(state.orderHistory)) state.orderHistory = [];
        // If settings.preferredBranch missing, copy from root or default
        if (state.settings && state.settings.preferredBranch === undefined) {
          state.settings.preferredBranch = state.preferredBranch || 'lebanon';
        }
        return;
      }
    } catch (err) {
      console.warn('Failed to load state', err);
    }
    state = getDefaultState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to save state', err);
      // If quota is exceeded, fall back to memory-only storage
      if (!state.__memoryFallback) {
        state.__memoryFallback = true;
        alert('Storage quota exceeded; data will not persist between sessions.');
      }
    }
  }

  // Default state
  function getDefaultState() {
    const ts = Date.now();
    return {
      dogs: [
        {
          id: 'dog1',
          name: 'Killer',
          breed: 'Mixed',
          sex: 'Male',
          weightKg: 25,
          ageYears: 4,
          energy: 'normal',
          bodyCondition: 'ideal',
          bodyScore: 'ideal',
          allergies: [],
          created: ts,
          updated: ts
        }
      ],
      activeDogId: 'dog1',
      // Order history to track past manual and recurring orders. Each entry
      // includes timestamp, items, address, notes and whether it was recurring.
      orderHistory: [],
      products: {
        /*
         * Royal Barf product catalogue (raw meats, treats and superfoods).
         * Each item includes a human‑friendly name, brand, pack size and
         * approximate macro breakdown (muscle/organ/bone) where applicable.
         * Treats and supplements are flagged as pantry items so they don’t
         * influence the daily macro calculations.  An ingredients field
         * describes the contents for transparency.  This list can be
         * extended easily when new products are added in the future.
         */

        // === Raw meats ===
        'trio1kg': {
          id: 'trio1kg', name: 'Trio Pack 1kg', brand: 'Royal Barf', gramsPerPack: 1000,
          category: 'raw', protein: 'mixed',
          ingredients: 'Fresh beef and chicken muscle meat, raw meaty bones, liver, hearts, gizzard, offal, whole fresh salmon and trout, green lipped mussels, salmon oil, olive oil, apple cider vinegar, kelp, alfalfa',
          macros: { muscle: 0.70, organ: 0.15, bone: 0.15 }, pantry: false
        },
        'duo400g': {
          id: 'duo400g', name: 'Duo Pack 400g', brand: 'Royal Barf', gramsPerPack: 400,
          category: 'raw', protein: 'mixed',
          ingredients: 'Fresh beef muscle meat, fresh green tripe, whole fresh salmon and trout',
          macros: { muscle: 0.75, organ: 0.15, bone: 0.10 }, pantry: false
        },
        'rabbitWhole230': {
          id: 'rabbitWhole230', name: 'Whole Rabbit 230g', brand: 'Royal Barf', gramsPerPack: 230,
          category: 'raw', protein: 'rabbit',
          ingredients: 'Whole rabbit',
          macros: { muscle: 0.80, organ: 0.10, bone: 0.10 }, pantry: false
        },
        'duckWhole230': {
          id: 'duckWhole230', name: 'Whole Duck 230g', brand: 'Royal Barf', gramsPerPack: 230,
          category: 'raw', protein: 'duck',
          ingredients: 'Whole duck',
          macros: { muscle: 0.80, organ: 0.10, bone: 0.10 }, pantry: false
        },
        'turkeyWhole230': {
          id: 'turkeyWhole230', name: 'Whole Turkey 230g', brand: 'Royal Barf', gramsPerPack: 230,
          category: 'raw', protein: 'turkey',
          ingredients: 'Whole turkey',
          macros: { muscle: 0.80, organ: 0.10, bone: 0.10 }, pantry: false
        },
        'lambBeefBoneless230': {
          id: 'lambBeefBoneless230', name: 'Boneless Lamb & Beef 230g', brand: 'Royal Barf', gramsPerPack: 230,
          category: 'raw', protein: 'lambBeef',
          ingredients: 'Boneless lamb and beef',
          macros: { muscle: 0.90, organ: 0.05, bone: 0.05 }, pantry: false
        },
        'chickenWhole230': {
          id: 'chickenWhole230', name: 'Whole Chicken 230g', brand: 'Royal Barf', gramsPerPack: 230,
          category: 'raw', protein: 'chicken',
          ingredients: 'Whole chicken',
          macros: { muscle: 0.80, organ: 0.10, bone: 0.10 }, pantry: false
        },
        'salmonWhole230': {
          id: 'salmonWhole230', name: 'Whole Salmon 230g', brand: 'Royal Barf', gramsPerPack: 230,
          category: 'raw', protein: 'salmon',
          ingredients: 'Whole salmon',
          macros: { muscle: 0.80, organ: 0.10, bone: 0.10 }, pantry: false
        },

        // === Treats ===
        'beefHeartChips85': {
          id: 'beefHeartChips85', name: 'Beef Heart Chips 85g', brand: 'Royal Barf', gramsPerPack: 85,
          category: 'treat', protein: 'beef',
          ingredients: 'Dehydrated beef heart chips',
          macros: { muscle: 0.0, organ: 1.0, bone: 0.0 }, pantry: true
        },
        'beefLiverChips300': {
          id: 'beefLiverChips300', name: 'Beef Liver Chips 300g', brand: 'Royal Barf', gramsPerPack: 300,
          category: 'treat', protein: 'beef',
          ingredients: 'Dehydrated beef liver chips',
          macros: { muscle: 0.0, organ: 1.0, bone: 0.0 }, pantry: true
        },
        'chickenHeart90': {
          id: 'chickenHeart90', name: 'Chicken Heart 90g', brand: 'Royal Barf', gramsPerPack: 90,
          category: 'treat', protein: 'chicken',
          ingredients: 'Dehydrated chicken hearts',
          macros: { muscle: 0.0, organ: 1.0, bone: 0.0 }, pantry: true
        },
        'beefLung60': {
          id: 'beefLung60', name: 'Beef Lung 60g', brand: 'Royal Barf', gramsPerPack: 60,
          category: 'treat', protein: 'beef',
          ingredients: 'Dehydrated beef lung',
          macros: { muscle: 0.0, organ: 1.0, bone: 0.0 }, pantry: true
        },
        'sardines30': {
          id: 'sardines30', name: 'Whole Sardines 30g', brand: 'Royal Barf', gramsPerPack: 30,
          category: 'treat', protein: 'fish',
          ingredients: 'Dehydrated whole sardines',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'beefMuscle85': {
          id: 'beefMuscle85', name: 'Beef Muscle Meat 85g', brand: 'Royal Barf', gramsPerPack: 85,
          category: 'treat', protein: 'beef',
          ingredients: 'Dehydrated beef muscle meat',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'beefSpleen85': {
          id: 'beefSpleen85', name: 'Beef Spleen 85g', brand: 'Royal Barf', gramsPerPack: 85,
          category: 'treat', protein: 'beef',
          ingredients: 'Dehydrated beef spleen',
          macros: { muscle: 0.0, organ: 1.0, bone: 0.0 }, pantry: true
        },
        'shrimp20': {
          id: 'shrimp20', name: 'Shrimp 20g', brand: 'Royal Barf', gramsPerPack: 20,
          category: 'treat', protein: 'seafood',
          ingredients: 'Dehydrated whole shrimp',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'chickenLiver85': {
          id: 'chickenLiver85', name: 'Chicken Liver 85g', brand: 'Royal Barf', gramsPerPack: 85,
          category: 'treat', protein: 'chicken',
          ingredients: 'Dehydrated chicken liver',
          macros: { muscle: 0.0, organ: 1.0, bone: 0.0 }, pantry: true
        },
        'chickenBreast85': {
          id: 'chickenBreast85', name: 'Chicken Breast 85g', brand: 'Royal Barf', gramsPerPack: 85,
          category: 'treat', protein: 'chicken',
          ingredients: 'Dehydrated chicken breast',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'seafoodCocktail40': {
          id: 'seafoodCocktail40', name: 'Seafood Cocktail 40g', brand: 'Royal Barf', gramsPerPack: 40,
          category: 'treat', protein: 'seafood',
          ingredients: 'Mixed dehydrated seafood pieces',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'salmonCubes90': {
          id: 'salmonCubes90', name: 'Salmon Cubes 90g', brand: 'Royal Barf', gramsPerPack: 90,
          category: 'treat', protein: 'salmon',
          ingredients: 'Dehydrated salmon cubes',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'beefChunks200': {
          id: 'beefChunks200', name: 'Beef Chunks 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'treat', protein: 'beef',
          ingredients: 'Dehydrated beef chunks',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'fishChunks200': {
          id: 'fishChunks200', name: 'Fish Chunks 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'treat', protein: 'seafood',
          ingredients: 'Dehydrated fish chunks',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'tracheaSmall': {
          id: 'tracheaSmall', name: 'Trachea (Small)', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'beef',
          ingredients: 'Dried beef trachea (small)',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'tracheaLarge': {
          id: 'tracheaLarge', name: 'Trachea (Large)', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'beef',
          ingredients: 'Dried beef trachea (large)',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'rabbitEars4': {
          id: 'rabbitEars4', name: 'Rabbit Ears with Fur (4pcs)', brand: 'Royal Barf', gramsPerPack: 4,
          category: 'treat', protein: 'rabbit',
          ingredients: 'Dehydrated rabbit ears with fur',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'bullyStickSingle': {
          id: 'bullyStickSingle', name: 'Braided Bully Stick (Single)', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'beef',
          ingredients: 'Braided bully stick',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'bullyStickSmall': {
          id: 'bullyStickSmall', name: 'Braided Bully Stick (Small)', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'beef',
          ingredients: 'Braided bully stick (small)',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'backStrap4': {
          id: 'backStrap4', name: 'Back Strap (4pcs)', brand: 'Royal Barf', gramsPerPack: 4,
          category: 'treat', protein: 'beef',
          ingredients: 'Back strap pieces',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'beefTendons200': {
          id: 'beefTendons200', name: 'Beef Tendons 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'treat', protein: 'beef',
          ingredients: 'Dehydrated beef tendons',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'beefEars': {
          id: 'beefEars', name: 'Beef Ears (pack)', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'beef',
          ingredients: 'Dehydrated beef ears',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'beefTripe140': {
          id: 'beefTripe140', name: 'Beef Tripe 140g', brand: 'Royal Barf', gramsPerPack: 140,
          category: 'treat', protein: 'beef',
          ingredients: 'Dehydrated beef tripe',
          macros: { muscle: 0.0, organ: 1.0, bone: 0.0 }, pantry: true
        },
        'chickenFeet15': {
          id: 'chickenFeet15', name: 'Chicken Feet (15 pcs)', brand: 'Royal Barf', gramsPerPack: 15,
          category: 'treat', protein: 'chicken',
          ingredients: 'Dried chicken feet',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'shark': {
          id: 'shark', name: 'Shark Pieces', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'fish',
          ingredients: 'Dried shark pieces',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'salmonSkinBraided2': {
          id: 'salmonSkinBraided2', name: 'Salmon Skin Braided (2 pcs)', brand: 'Royal Barf', gramsPerPack: 2,
          category: 'treat', protein: 'salmon',
          ingredients: 'Braided salmon skin',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'duckNeckSmall': {
          id: 'duckNeckSmall', name: 'Duck Neck (Small)', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'duck',
          ingredients: 'Dried duck neck (small)',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'duckNeckLarge': {
          id: 'duckNeckLarge', name: 'Duck Neck (Large)', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'duck',
          ingredients: 'Dried duck neck (large)',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'fdDuckBreast70': {
          id: 'fdDuckBreast70', name: 'Freeze Dried Duck Breast 70g', brand: 'Royal Barf', gramsPerPack: 70,
          category: 'treat', protein: 'duck',
          ingredients: 'Freeze dried duck breast',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'fdBeefCubes40': {
          id: 'fdBeefCubes40', name: 'Freeze Dried Beef Cubes 40g', brand: 'Royal Barf', gramsPerPack: 40,
          category: 'treat', protein: 'beef',
          ingredients: 'Freeze dried beef cubes',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'fdQuailEggYolk80': {
          id: 'fdQuailEggYolk80', name: 'Freeze Dried Quail Egg Yolk 80g', brand: 'Royal Barf', gramsPerPack: 80,
          category: 'treat', protein: 'quail',
          ingredients: 'Freeze dried quail egg yolks',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'fdChickenEggYolk40': {
          id: 'fdChickenEggYolk40', name: 'Freeze Dried Chicken Egg Yolk 40g', brand: 'Royal Barf', gramsPerPack: 40,
          category: 'treat', protein: 'chicken',
          ingredients: 'Freeze dried chicken egg yolks',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'fdMussels30': {
          id: 'fdMussels30', name: 'Freeze Dried Green Lipped Mussels 30g', brand: 'Royal Barf', gramsPerPack: 30,
          category: 'treat', protein: 'seafood',
          ingredients: 'Freeze dried green lipped mussels',
          macros: { muscle: 0.0, organ: 1.0, bone: 0.0 }, pantry: true
        },
        'fdChickenBreast100': {
          id: 'fdChickenBreast100', name: 'Freeze Dried Chicken Breast 100g', brand: 'Royal Barf', gramsPerPack: 100,
          category: 'treat', protein: 'chicken',
          ingredients: 'Freeze dried chicken breast',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'fdKrill30': {
          id: 'fdKrill30', name: 'Freeze Dried Antarctic Krill 30g', brand: 'Royal Barf', gramsPerPack: 30,
          category: 'treat', protein: 'seafood',
          ingredients: 'Freeze dried Antarctic krill',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'salmonSkinChunks100': {
          id: 'salmonSkinChunks100', name: 'Salmon Skin Chunks 100g', brand: 'Royal Barf', gramsPerPack: 100,
          category: 'treat', protein: 'salmon',
          ingredients: 'Dehydrated salmon skin chunks',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'tuna30': {
          id: 'tuna30', name: 'Tuna 30g', brand: 'Royal Barf', gramsPerPack: 30,
          category: 'treat', protein: 'fish',
          ingredients: 'Dehydrated tuna pieces',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'capelin75': {
          id: 'capelin75', name: 'Capelin 75g', brand: 'Royal Barf', gramsPerPack: 75,
          category: 'treat', protein: 'fish',
          ingredients: 'Dehydrated capelin',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'gourmetBeef150': {
          id: 'gourmetBeef150', name: 'Prime Gourmet Fillets Beef 150g', brand: 'Royal Barf', gramsPerPack: 150,
          category: 'treat', protein: 'beef',
          ingredients: 'Prime free‑range beef fillets',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'gourmetChicken150': {
          id: 'gourmetChicken150', name: 'Prime Gourmet Fillets Chicken 150g', brand: 'Royal Barf', gramsPerPack: 150,
          category: 'treat', protein: 'chicken',
          ingredients: 'Prime free‑range chicken fillets',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'gourmetDuck150': {
          id: 'gourmetDuck150', name: 'Prime Gourmet Fillets Duck 150g', brand: 'Royal Barf', gramsPerPack: 150,
          category: 'treat', protein: 'duck',
          ingredients: 'Prime free‑range duck fillets',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },

        // === Supplements (superfood powders, oils and fats) ===
        'berryFusion200': {
          id: 'berryFusion200', name: 'Berry Fusion 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'supplement', protein: 'none',
          ingredients: 'Blend of blueberry, raspberry and cranberry powders',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'spirulina200': {
          id: 'spirulina200', name: 'Organic Spirulina 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'supplement', protein: 'none',
          ingredients: 'Organic spirulina powder',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'digestPlus200': {
          id: 'digestPlus200', name: 'Digest Plus 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'supplement', protein: 'none',
          ingredients: 'Pumpkin powder',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'salmonOil300': {
          id: 'salmonOil300', name: 'Salmon Oil 300ml', brand: 'Royal Barf', gramsPerPack: 300,
          category: 'supplement', protein: 'none',
          ingredients: 'Pure salmon oil',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'duckLambBeefFat300': {
          id: 'duckLambBeefFat300', name: 'Duck Lamb Beef Fat 300g', brand: 'Royal Barf', gramsPerPack: 300,
          category: 'supplement', protein: 'mixed',
          ingredients: 'Rendered duck, lamb and beef fat',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'pigmentBooster150': {
          id: 'pigmentBooster150', name: 'Pigment Booster 150g', brand: 'Royal Barf', gramsPerPack: 150,
          category: 'supplement', protein: 'none',
          ingredients: 'Carrot powder (beta‑carotene)',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'allergies150': {
          id: 'allergies150', name: 'Allergies 150g', brand: 'Royal Barf', gramsPerPack: 150,
          category: 'supplement', protein: 'none',
          ingredients: 'Beetroot powder',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'mushroomParadise200': {
          id: 'mushroomParadise200', name: 'Mushroom Paradise 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'supplement', protein: 'none',
          ingredients: 'Blend of Lion’s Mane, Turkey Tail, Chaga, Cordyceps, Phellinus, Maitake, Reishi and Shiitake',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'superJoints200': {
          id: 'superJoints200', name: 'Super Joints 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'supplement', protein: 'none',
          ingredients: 'Beef cartilage and tendons, green lipped mussels, shark cartilage, fish collagen for joint lubrication and long‑term joint health',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'goldenGuard200': {
          id: 'goldenGuard200', name: 'Golden Guard 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'supplement', protein: 'none',
          ingredients: 'Turmeric and black pepper powder',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'eggshellPowder200': {
          id: 'eggshellPowder200', name: 'Eggshell Powder 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'supplement', protein: 'none',
          ingredients: 'Pasture raised organic duck and chicken eggshell and egg membrane',
          // Eggsheel powder is an excellent calcium source, so treat it as bone
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'goatMilk200': {
          id: 'goatMilk200', name: 'Goat Milk 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'supplement', protein: 'none',
          ingredients: 'Powdered goat milk',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'beefChunks200': {
          id: 'beefChunks200', name: 'Beef Chunks 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'treat', protein: 'beef',
          ingredients: 'Large beef cubes',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'fishChunks200': {
          id: 'fishChunks200', name: 'Fish Chunks 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'treat', protein: 'fish',
          ingredients: 'Chunks of fish',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'tracheaSmall': {
          id: 'tracheaSmall', name: 'Trachea (Small)', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'trachea',
          ingredients: 'Beef trachea',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'rabbitEarsFur4': {
          id: 'rabbitEarsFur4', name: 'Rabbit Ears with Fur (4 pcs)', brand: 'Royal Barf', gramsPerPack: 4,
          category: 'treat', protein: 'rabbit',
          ingredients: 'Rabbit ears with fur',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'bullyStickSingle': {
          id: 'bullyStickSingle', name: 'Braided Bully Stick (Single)', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'bully',
          ingredients: 'Braided bull pizzle',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'backStrap4': {
          id: 'backStrap4', name: 'Back Strap (4 pcs)', brand: 'Royal Barf', gramsPerPack: 4,
          category: 'treat', protein: 'beef',
          ingredients: 'Beef back straps',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'beefTendons200': {
          id: 'beefTendons200', name: 'Beef Tendons 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'treat', protein: 'beef',
          ingredients: 'Beef tendons',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'beefEars': {
          id: 'beefEars', name: 'Beef Ears', brand: 'Royal Barf', gramsPerPack: 2,
          category: 'treat', protein: 'beef',
          ingredients: 'Dried beef ears',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'beefTripe140': {
          id: 'beefTripe140', name: 'Beef Tripe 140g', brand: 'Royal Barf', gramsPerPack: 140,
          category: 'treat', protein: 'beef',
          ingredients: 'Dried beef tripe',
          macros: { muscle: 0.0, organ: 1.0, bone: 0.0 }, pantry: true
        },
        'chickenFeet15': {
          id: 'chickenFeet15', name: 'Chicken Feet (15 pcs)', brand: 'Royal Barf', gramsPerPack: 15,
          category: 'treat', protein: 'chicken',
          ingredients: 'Chicken feet',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'sharkPieces': {
          id: 'sharkPieces', name: 'Shark', brand: 'Royal Barf', gramsPerPack: 50,
          category: 'treat', protein: 'shark',
          ingredients: 'Dried shark pieces',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'salmonSkinBraided2': {
          id: 'salmonSkinBraided2', name: 'Salmon Skin Braided (2 pcs)', brand: 'Royal Barf', gramsPerPack: 2,
          category: 'treat', protein: 'salmon',
          ingredients: 'Braided salmon skin',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'duckNecksLarge': {
          id: 'duckNecksLarge', name: 'Duck Necks (Large)', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'duck',
          ingredients: 'Large duck necks',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'duckNecksSmall': {
          id: 'duckNecksSmall', name: 'Duck Necks (Small)', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'treat', protein: 'duck',
          ingredients: 'Small duck necks',
          macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'freezeDuckBreast70': {
          id: 'freezeDuckBreast70', name: 'Freeze Dried Duck Breast 70g', brand: 'Royal Barf', gramsPerPack: 70,
          category: 'treat', protein: 'duck',
          ingredients: 'Freeze dried duck breast',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'freezeBeefCubes40': {
          id: 'freezeBeefCubes40', name: 'Freeze Dried Beef Cubes 40g', brand: 'Royal Barf', gramsPerPack: 40,
          category: 'treat', protein: 'beef',
          ingredients: 'Freeze dried beef cubes',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'freezeQuailYolk80': {
          id: 'freezeQuailYolk80', name: 'Freeze Dried Quail Egg Yolk 80g', brand: 'Royal Barf', gramsPerPack: 80,
          category: 'treat', protein: 'egg',
          ingredients: 'Freeze dried quail egg yolk',
          macros: { muscle: 0.0, organ: 1.0, bone: 0.0 }, pantry: true
        },
        'freezeChickenYolk40': {
          id: 'freezeChickenYolk40', name: 'Freeze Dried Chicken Egg Yolk 40g', brand: 'Royal Barf', gramsPerPack: 40,
          category: 'treat', protein: 'egg',
          ingredients: 'Freeze dried chicken egg yolk',
          macros: { muscle: 0.0, organ: 1.0, bone: 0.0 }, pantry: true
        },
        'freezeMussels30': {
          id: 'freezeMussels30', name: 'Freeze Dried Green Lipped Mussels 30g', brand: 'Royal Barf', gramsPerPack: 30,
          category: 'treat', protein: 'mussels',
          ingredients: 'Freeze dried green lipped mussels',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'freezeChickenBreast100': {
          id: 'freezeChickenBreast100', name: 'Freeze Dried Chicken Breast 100g', brand: 'Royal Barf', gramsPerPack: 100,
          category: 'treat', protein: 'chicken',
          ingredients: 'Freeze dried chicken breast',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'freezeKrill30': {
          id: 'freezeKrill30', name: 'Freeze Dried Antarctic Krill 30g', brand: 'Royal Barf', gramsPerPack: 30,
          category: 'treat', protein: 'krill',
          ingredients: 'Freeze dried Antarctic krill',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'salmonSkinChunks100': {
          id: 'salmonSkinChunks100', name: 'Salmon Skin Chunks 100g', brand: 'Royal Barf', gramsPerPack: 100,
          category: 'treat', protein: 'salmon',
          ingredients: 'Chunks of salmon skin',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'tuna30': {
          id: 'tuna30', name: 'Tuna 30g', brand: 'Royal Barf', gramsPerPack: 30,
          category: 'treat', protein: 'tuna',
          ingredients: 'Dried tuna pieces',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'capelin75': {
          id: 'capelin75', name: 'Capelin 75g', brand: 'Royal Barf', gramsPerPack: 75,
          category: 'treat', protein: 'fish',
          ingredients: 'Whole capelin fish',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'filletsBeef150': {
          id: 'filletsBeef150', name: 'Prime Gourmet Fillets Beef 150g', brand: 'Royal Barf', gramsPerPack: 150,
          category: 'treat', protein: 'beef',
          ingredients: 'Free range beef fillets',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'filletsChicken150': {
          id: 'filletsChicken150', name: 'Prime Gourmet Fillets Chicken 150g', brand: 'Royal Barf', gramsPerPack: 150,
          category: 'treat', protein: 'chicken',
          ingredients: 'Free range chicken fillets',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'filletsDuck150': {
          id: 'filletsDuck150', name: 'Prime Gourmet Fillets Duck 150g', brand: 'Royal Barf', gramsPerPack: 150,
          category: 'treat', protein: 'duck',
          ingredients: 'Free range duck fillets',
          macros: { muscle: 1.0, organ: 0.0, bone: 0.0 }, pantry: true
        },

        // Supplements (super food range)
        'berryFusion200': {
          id: 'berryFusion200', name: 'Berry Fusion 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'supplement', protein: 'supplement',
          ingredients: 'Blend of blueberry, raspberry and cranberry powders',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'spirulina200': {
          id: 'spirulina200', name: 'Organic Spirulina 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'supplement', protein: 'supplement',
          ingredients: 'Organic spirulina powder',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'digestPlus200': {
          id: 'digestPlus200', name: 'Digest Plus 200g', brand: 'Royal Barf', gramsPerPack: 200,
          category: 'supplement', protein: 'supplement',
          ingredients: 'Pumpkin powder',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'salmonOil300': {
          id: 'salmonOil300', name: 'Salmon Oil 300ml', brand: 'Royal Barf', gramsPerPack: 300,
          category: 'supplement', protein: 'supplement',
          ingredients: 'Liquid salmon oil (Omega rich)',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'duckLambBeefFat300': {
          id: 'duckLambBeefFat300', name: 'Duck Lamb Beef Fat 300g', brand: 'Royal Barf', gramsPerPack: 300,
          category: 'supplement', protein: 'supplement',
          ingredients: 'Rendered fat from duck, lamb and beef',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'pigmentBooster150': {
          id: 'pigmentBooster150', name: 'Pigment Booster 150g', brand: 'Royal Barf', gramsPerPack: 150,
          category: 'supplement', protein: 'supplement',
          ingredients: 'Powdered carrots',
          macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        },
        'boneBroth': {
          id: 'boneBroth', name: 'Bone Broth 250g', brand: 'Homemade', gramsPerPack: 250,
          category: 'pantry', protein: 'broth', macros: { muscle: 0.0, organ: 0.0, bone: 0.0 }, pantry: true
        }
        ,
        // Additional chew treats
        'beefTendon': {
          id: 'beefTendon', name: 'Beef Tendon', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'pantry', protein: 'beefTendon', macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        },
        'backStrap': {
          id: 'backStrap', name: 'Back Strap', brand: 'Royal Barf', gramsPerPack: 1,
          category: 'pantry', protein: 'backStrap', macros: { muscle: 0.0, organ: 0.0, bone: 1.0 }, pantry: true
        }
      },
      // Full Royal Barf catalogue used for ordering.  Populated
      // asynchronously via loadCatalog() on app startup.  Contains an
      // array of catalogue objects (catalogList) and a mapping from
      // product ID to catalogue object (catalogMap).  These fields are
      // initialised empty here and will be filled in by loadCatalog().
      catalogList: [],
      catalogMap: {},
      inventoryEvents: [
        // Seed some initial stock for demonstration
        { id: generateId('evt'), productId: 'trio1kg', ts: ts, type: 'receive', packs: 2 },
        { id: generateId('evt'), productId: 'duo400g', ts: ts, type: 'receive', packs: 2 },
        { id: generateId('evt'), productId: 'rabbitWhole230', ts: ts, type: 'receive', packs: 2 },
        { id: generateId('evt'), productId: 'duckWhole230', ts: ts, type: 'receive', packs: 2 },
        { id: generateId('evt'), productId: 'turkeyWhole230', ts: ts, type: 'receive', packs: 2 },
        { id: generateId('evt'), productId: 'lambBeefBoneless230', ts: ts, type: 'receive', packs: 2 },
        { id: generateId('evt'), productId: 'chickenWhole230', ts: ts, type: 'receive', packs: 2 },
        { id: generateId('evt'), productId: 'salmonWhole230', ts: ts, type: 'receive', packs: 2 },
        { id: generateId('evt'), productId: 'boneBroth', ts: ts, type: 'receive', packs: 2 },
        { id: generateId('evt'), productId: 'berryFusion200', ts: ts, type: 'receive', packs: 1 },
        { id: generateId('evt'), productId: 'beefHeartChips85', ts: ts, type: 'receive', packs: 1 }
      ],
      meals: [], // daily meals logged
      stoolLogs: [],
      settings: {
        units: 'metric',
        feedingPercent: 0.03, // 3% of body weight per day
        morningTime: '08:00',
        eveningTime: '20:00',
        thawTime: '22:00',
        // A simple index used in earlier versions; retained for backward compatibility but not used.
        backgroundIndex: 0,
        // Set the default background to the photographic wolf backdrop. Users can change
        // this via Settings. The only built‑in option is the photo background; custom
        // images will be stored as data URLs in `customBackground` below.
        preferredBackground: 'wolf-photo-bg',
        // When a user uploads a custom background image, it is stored here as a data URL
        // and the preferredBackground key is set to 'custom-bg'.
        customBackground: null,
        // Whether the user has unlocked pro features.  In the free tier only one dog
        // profile is supported and advanced analytics and PDF export are disabled.
        isPro: false,
        // Interface language (en or ar)
        language: 'en',
        // Preferred branch for orders (lebanon or cyprus). Used by the orders page to pick the correct WhatsApp number.
        preferredBranch: 'lebanon'
      },
      lastSeenTips: {} // track last time each tip shown per day
      ,
      // Account information (null until created).  Contains email,
      // password (plain text for demo), timestamps and subscription details.
      account: null,
      // Flag whether the user has completed the onboarding wizard
      onboardingDone: false,
      // Seven‑day rotation calendar (generated after onboarding)
      rotation: [],
      // Whether the launch banner has been dismissed
      bannerDismissed: false,
      // v14 additional state fields
      // The user's preferred store branch for orders (lebanon or cyprus)
      preferredBranch: 'lebanon',
      // Array of recurring order schedules {day: 'Monday', time: '10:00', items: [{productId, quantity}]}
      recurringOrders: [],
      // Timestamp (ms) for the founder’s launch year free pro expiry (defaults to one year from now)
      proExpiry: ts + 365 * 24 * 60 * 60 * 1000,
      // Whether user has accepted the privacy policy and terms during onboarding
      consentGiven: false
    };
  }

  function generateId(prefix) {
    return prefix + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Heuristically determine default macros for a product based on its
   * name and category. Raw meat products should specify their muscle,
   * organ and bone proportions. Pantry items (treats, veggies,
   * supplements) default to zero macros so they don’t affect meal ratios.
   *
   * @param {string} name - The product name
   * @param {string} category - 'raw' or 'pantry'
   * @returns {{muscle:number, organ:number, bone:number}}
   */
  function computeDefaultMacros(name, category) {
    const n = (name || '').toLowerCase();
    // Pantry items: no macros counted
    if (category !== 'raw') {
      // Some pantry items contribute bone (e.g. egg shells)
      if (n.includes('shell')) return { muscle: 0.0, organ: 0.0, bone: 1.0 };
      if (n.includes('liver') || n.includes('tripe') || n.includes('organ')) return { muscle: 0.0, organ: 1.0, bone: 0.0 };
      if (n.includes('muscle') || n.includes('breast') || n.includes('cube')) return { muscle: 1.0, organ: 0.0, bone: 0.0 };
      // default pantry macros
      return { muscle: 0.0, organ: 0.0, bone: 0.0 };
    }
    // Raw meat items heuristics
    if (n.includes('boneless')) {
      return { muscle: 0.90, organ: 0.05, bone: 0.05 };
    }
    if (n.includes('trio')) {
      return { muscle: 0.70, organ: 0.15, bone: 0.15 };
    }
    if (n.includes('duo') || n.includes('tripe')) {
      return { muscle: 0.75, organ: 0.15, bone: 0.10 };
    }
    if (n.includes('cube') || n.includes('whole')) {
      return { muscle: 0.80, organ: 0.10, bone: 0.10 };
    }
    if (n.includes('breast') || n.includes('muscle')) {
      return { muscle: 1.0, organ: 0.0, bone: 0.0 };
    }
    // fallback to standard 80/10/10
    return { muscle: 0.80, organ: 0.10, bone: 0.10 };
  }

  // ---------------------------------------------------------------------------
  // Subscription and Pro status helpers
  /**
   * Determine whether the user currently has access to Pro features.  The
   * Pro status is derived from the account trial period, subscription
   * information and the legacy manual toggle stored in `state.settings.isPro`.
   * @returns {boolean} true if the user can access Pro features
   */
  function isProActive() {
    // Founder’s launch year: if proExpiry in state and not reached, Pro is active regardless of account
    const nowGlobal = Date.now();
    if (state && state.proExpiry && nowGlobal < state.proExpiry) {
      return true;
    }
    const acc = state.account;
    // If an account record exists
    if (acc) {
      // When the account is logged in, evaluate trial and subscription
      if (acc.loggedIn) {
        const now = Date.now();
        // Active trial lasts 30 days from trialStart
        if (acc.trialStart) {
          const trialEnd = new Date(acc.trialStart).getTime() + 30 * 24 * 60 * 60 * 1000;
          if (now < trialEnd) return true;
        }
        // Subscription considered active if a start date exists
        if (acc.subscriptionStart) {
          return true;
        }
        return false;
      }
      // If account exists but not logged in, treat as not pro (do not fall back to manual toggle)
      return false;
    }
    // If no account has ever been created, allow legacy manual toggle for backwards compatibility
    return !!(state.settings && state.settings.isPro);
  }

  /**
   * Synchronise the calculated Pro status back into the state.settings.isPro
   * property.  This ensures backward compatibility with existing gating logic.
   */
  function updateProStatus() {
    if (!state.settings) state.settings = {};
    state.settings.isPro = isProActive();
  }

  /**
   * Check whether the founder’s pro period has expired and alert the user
   * once. After showing the alert, a flag is stored to avoid repeated
   * notifications. This runs during initialisation and can also be invoked
   * after preferences or account changes.
   */
  function checkProExpiry() {
    try {
      if (state.proExpiry && Date.now() >= state.proExpiry && !state.proExpiryNotified) {
        state.proExpiryNotified = true;
        saveState();
        alert('Your Founder’s free year has ended. Subscribe to continue using Pro features.');
      }
    } catch (err) {
      console.warn('Error checking Pro expiry', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Image compression for stool photos
  /**
   * Compress an image file to a reasonable size before analysis or storage.
   * The image will be resized preserving its aspect ratio so that the longer
   * side does not exceed `maxSize` pixels.  The result is a JPEG encoded
   * data URL at roughly 70% quality.  This function returns a Promise
   * resolving to the compressed data URL.
   * @param {File} file - The image file selected by the user
   * @param {number} maxSize - Maximum dimension in pixels (default: 640)
   * @returns {Promise<string>} Data URL of the compressed image
   */
  function compressImage(file, maxSize = 640) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > h && w > maxSize) {
            h = Math.round(h * maxSize / w);
            w = maxSize;
          } else if (h >= w && h > maxSize) {
            w = Math.round(w * maxSize / h);
            h = maxSize;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          // Compress to JPEG; adjust quality if needed
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Analyse a stool photo by computing its average brightness and returning
   * a classification.  The image is compressed before analysis and the
   * compressed data URL is returned alongside the result.  The caller can
   * store the compressed image if desired.  This function does not store
   * any data itself.
   * @param {File} file - The image file selected by the user
   * @returns {Promise<{result: string, compressed: string}>} Analysis result and compressed image
   */
  function analyseStool(file) {
    return new Promise(resolve => {
      compressImage(file).then(dataUrl => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
          }
          const avg = sum / (data.length / 4);
          let result = 'Healthy';
          if (avg < 70) result = 'Vet';
          else if (avg < 130) result = 'Watch';
          resolve({ result, compressed: dataUrl });
        };
        img.src = dataUrl;
      });
    });
  }

  // Helpers to get active dog and metrics
  function getActiveDog() {
    return state.dogs.find(d => d.id === state.activeDogId);
  }

  // Inventory helpers
  function getStockByProduct(productId) {
    let qty = 0;
    state.inventoryEvents.forEach(ev => {
      if (ev.productId === productId) {
        qty += (ev.type === 'receive' ? ev.packs : -ev.packs);
      }
    });
    return qty;
  }

  function addInventoryEvent(productId, type, packs) {
    state.inventoryEvents.push({
      id: generateId('ev_'),
      productId,
      type,
      packs,
      ts: Date.now()
    });
    saveState();
    buildInventoryPage();
  }

  // Meal suggestion engine
  /**
   * Create a meal suggestion for the active dog based on
   * available stock, allergies, macros and variety.
   * Returns an object with meal items and analysis info.
   */
  function planMeal() {
    const dog = getActiveDog();
    if (!dog) return null;
    const gramsTarget = dog.weightKg * state.settings.feedingPercent * 1000; // grams/day
    // Keep track of how many grams we need for muscle, organ, bone
    let requiredMuscle = gramsTarget * 0.80;
    let requiredOrgan = gramsTarget * 0.10;
    let requiredBone = gramsTarget * 0.10;
    // Avoid repeating same protein more than 2 consecutive days
    const recentMeals = state.meals.slice(-4);
    const recentProteins = recentMeals.map(m => m.items.map(item => state.products[item.productId].protein)).flat();
    const proteinsUsed = {};
    recentProteins.forEach(p => { proteinsUsed[p] = (proteinsUsed[p] || 0) + 1; });

    // Determine available products and sort by stock descending to consume nearly expired first
    const available = Object.values(state.products).filter(p => getStockByProduct(p.id) > 0);
    // Filter by allergies
    const allergies = (dog.allergies || []).map(a => a.toLowerCase());
    const filtered = available.filter(p => !allergies.includes((p.protein || '').toLowerCase()));
    // Sort by rarity of protein usage (less used first) and by grams
    filtered.sort((a, b) => {
      const countA = proteinsUsed[a.protein] || 0;
      const countB = proteinsUsed[b.protein] || 0;
      if (countA !== countB) return countA - countB;
      return getStockByProduct(b.id) - getStockByProduct(a.id);
    });
    const items = [];
    let remaining = gramsTarget;
    // Add main raw packs until we approach target and fill macros
    for (const prod of filtered) {
      if (prod.pantry) continue; // skip pantry items here
      const availablePacks = getStockByProduct(prod.id);
      if (availablePacks <= 0) continue;
      // Use one pack at a time
      while (remaining > 0 && getStockByProduct(prod.id) > 0) {
        // Determine whether adding this pack helps macro balance
        const packGrams = prod.gramsPerPack;
        if (packGrams > remaining + 50) break; // don't overshoot significantly
        items.push({ productId: prod.id, grams: packGrams });
        remaining -= packGrams;
        requiredMuscle -= packGrams * prod.macros.muscle;
        requiredOrgan -= packGrams * prod.macros.organ;
        requiredBone -= packGrams * prod.macros.bone;
        // Temporarily reduce stock to avoid double counting
        addInventoryEvent(prod.id, 'consume', 1);
        if (remaining <= 0) break;
      }
      if (remaining <= 0) break;
    }
    // Remove the temporary consumption events used for planning (will be re-added on confirm)
    // (remove latest consumption events matching items length)
    state.inventoryEvents.splice(-items.length);
    // Add pantry items (bone broth) once/day if available
    if (state.lastBoneBrothDay !== new Date().toDateString()) {
      const brothProd = Object.values(state.products).find(p => p.protein === 'broth');
      if (brothProd && getStockByProduct(brothProd.id) > 0) {
        items.push({ productId: brothProd.id, grams: 80 });
      }
    }
    // Fill remaining with smaller cube or organ treat if needed
    if (remaining > 20) {
      // Try to find smallest pack that fits
      const smallest = filtered.filter(p => !p.pantry).sort((a, b) => a.gramsPerPack - b.gramsPerPack);
      for (const prod of smallest) {
        if (getStockByProduct(prod.id) <= 0) continue;
        if (prod.gramsPerPack <= remaining + 50) {
          items.push({ productId: prod.id, grams: prod.gramsPerPack });
          remaining -= prod.gramsPerPack;
          break;
        }
      }
    }
    // Compute analysis info: macros ratio
    let totalGrams = 0;
    let muscle = 0, organ = 0, bone = 0;
    items.forEach(itm => {
      const prod = state.products[itm.productId];
      totalGrams += itm.grams;
      muscle += itm.grams * prod.macros.muscle;
      organ += itm.grams * prod.macros.organ;
      bone  += itm.grams * prod.macros.bone;
    });
    const musclePct = muscle / totalGrams;
    const organPct  = organ / totalGrams;
    const bonePct   = bone / totalGrams;
    return { items, gramsTarget, totalGrams, macros: { musclePct, organPct, bonePct }, remaining };
  }

  /**
   * Compute the recommended feeding percentage of body weight based on the dog's
   * age, body condition and activity level.  Puppies under 6 months eat more,
   * juveniles under 1 year eat moderately more, adults eat less, and lean or
   * active dogs need a bit more than average while overweight or low‑energy
   * dogs need a bit less.  The returned value is a fraction (e.g. 0.03 for 3%).
   * @param {Object} dog - The active dog profile
   * @returns {number} Feeding percentage (0.02–0.06)
   */
  function computeFeedingPercent(dog) {
    if (!dog || !dog.weightKg) return state.settings.feedingPercent || 0.025;
    let pct;
    // Age rules: puppies (<0.5y) ~6%; 0.5–1y ~4%; adults ≥1y ~2.5%
    if (dog.ageYears < 0.5) pct = 0.06;
    else if (dog.ageYears < 1) pct = 0.04;
    else pct = 0.025;
    // Body condition adjustment: lean -> +0.005; overweight -> -0.005
    if (dog.bodyCondition === 'lean') pct += 0.005;
    else if (dog.bodyCondition === 'overweight') pct -= 0.005;
    // Energy adjustment: high -> +0.005; low -> -0.005
    if (dog.energy === 'high') pct += 0.005;
    else if (dog.energy === 'low') pct -= 0.005;
    // Ensure pct stays within sensible bounds
    if (pct < 0.02) pct = 0.02;
    if (pct > 0.06) pct = 0.06;
    return pct;
  }

  /**
   * Generate treat suggestions for one day based on the dog's weight.  Treats
   * are suggested by piece count rather than weight.  Dogs under 10kg are
   * offered up to 2 pieces per day; 10–25kg get 3 pieces; above 25kg get 4
   * pieces.  The pieces are distributed across one or two treat products if
   * available.  If no treats exist, an empty array is returned.
   * @param {Object} dog - The active dog profile
   * @returns {Array} Array of objects {productId, pieces}
   */
  function computeDailyTreats(dog) {
    // Find treat products: items flagged as pantry (non‑raw) or non‑raw categories
    const treatProducts = Object.values(state.products).filter(p => p.pantry && !p.protein.includes('broth'));
    if (treatProducts.length === 0) return [];
    // Determine treat cap based on weight
    let cap;
    const w = dog.weightKg || 0;
    if (w < 10) cap = 2;
    else if (w < 25) cap = 3;
    else cap = 4;
    // Shuffle treat list
    const shuffled = treatProducts.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Pick up to 2 treat types
    const treatCount = Math.min(2, shuffled.length);
    const selected = shuffled.slice(0, treatCount);
    // Distribute pieces across selected treats
    const treats = [];
    let remainingPieces = cap;
    selected.forEach((p, idx) => {
      // Allocate at least one piece to each selected treat
      const piecesForThis = idx === selected.length - 1 ? remainingPieces : Math.max(1, Math.floor(remainingPieces / (selected.length - idx)));
      remainingPieces -= piecesForThis;
      treats.push({ productId: p.id, pieces: piecesForThis });
    });
    return treats;
  }

  function confirmMeal(plan) {
    // Add consumption events for each product
    plan.items.forEach(itm => {
      const packs = itm.grams / state.products[itm.productId].gramsPerPack;
      addInventoryEvent(itm.productId, 'consume', packs);
    });
    // Save meal log
    state.meals.push({
      id: generateId('meal_'),
      dogId: state.activeDogId,
      date: new Date().toISOString().slice(0, 10),
      items: plan.items,
      macros: plan.macros
    });
    // Record bone broth usage
    plan.items.forEach(itm => {
      const prod = state.products[itm.productId];
      if (prod.protein === 'broth') {
        state.lastBoneBrothDay = new Date().toDateString();
      }
    });
    saveState();
  }

  // Coach messages
  function generateCoachMessages(plan) {
    const messages = [];
    // Variety: number of unique proteins this week
    const meals = state.meals.filter(m => m.dogId === state.activeDogId);
    const lastWeek = meals.slice(-7);
    const proteins = new Set();
    lastWeek.forEach(m => m.items.forEach(itm => {
      proteins.add(state.products[itm.productId].protein);
    }));
    if (proteins.size >= 3) {
      messages.push('Great variety! You used ' + proteins.size + ' proteins this week.');
    } else {
      messages.push('Try adding another protein tomorrow to keep things balanced.');
    }
    // Organ/Bone ratio
    const organPct = plan.macros.organPct;
    if (organPct < 0.08) messages.push('Organ content is low; consider adding organ treats.');
    if (organPct > 0.12) messages.push('Organ content high; reduce organs in next meal.');
    const bonePct = plan.macros.bonePct;
    if (bonePct < 0.08) messages.push('Bone content low; add bone broth or meaty bone next meal.');
    if (bonePct > 0.12) messages.push('Too much bone may cause constipation; add muscle meat.');
    // Low stock
    const daysLeft = computeDaysOfFoodLeft();
    if (daysLeft <= 2) messages.push('Low stock: about ' + daysLeft.toFixed(1) + ' day' + (daysLeft<1?'':'s') + ' left. Consider ordering soon.');
    // Treat suggestion: recommend a treat for dental health or enrichment
    const treat = generateTreatSuggestion();
    if (treat) messages.push(treat);
    return messages;
  }

  /**
   * Suggest a treat based on available pantry items. Treats are important
   * for dental health, enrichment and providing additional nutrients. This
   * function looks for pantry items (non-raw) other than bone broth and
   * supplements and returns a recommendation if one is available.
   */
  function generateTreatSuggestion() {
    // Use the daily treat suggestion helper to get treat pieces based on dog weight
    const dog = getActiveDog();
    const suggestions = computeDailyTreats(dog);
    if (!suggestions || suggestions.length === 0) return null;
    // Pick the first suggestion for coach messaging
    const sn = suggestions[0];
    const prod = state.products[sn.productId];
    const name = prod ? prod.name.replace(/\s*\d+(?:\.\d+)?g$/i, '') : sn.productId;
    const qty = sn.pieces === 1 ? '1 piece' : sn.pieces + ' pieces';
    return 'Offer ' + qty + ' of ' + name + ' as a treat today.';
  }

  function computeDaysOfFoodLeft() {
    const dog = getActiveDog();
    const dailyGrams = dog.weightKg * state.settings.feedingPercent * 1000;
    let totalGrams = 0;
    Object.keys(state.products).forEach(pid => {
      const prod = state.products[pid];
      if (prod.pantry) return;
      const stock = getStockByProduct(pid);
      totalGrams += stock * prod.gramsPerPack;
    });
    return totalGrams / dailyGrams;
  }

  // Build UI pages
  function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('#navBar button').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`#navBar button[data-page="${id.replace('Page','')}"]`);
    if (btn) btn.classList.add('active');
  }

  function buildHomePage() {
    const page = document.getElementById('homePage');
    const mealCard = document.getElementById('mealCard');
    const coachCard = document.getElementById('coachCard');
    mealCard.innerHTML = '';
    coachCard.innerHTML = '';
    const dog = getActiveDog();
    if (!dog) {
      mealCard.innerHTML = '<p>Please add a dog profile in Settings.</p>';
      return;
    }
    const plan = planMeal();
    if (!plan || plan.items.length === 0) {
      mealCard.innerHTML = '<p>No suitable items in inventory. Add stock!</p>';
      return;
    }
    // Build meal card
    const header = document.createElement('h3');
    header.textContent = "Today's Meal for " + dog.name;
    mealCard.appendChild(header);
    const list = document.createElement('ul');
    plan.items.forEach(itm => {
      const prod = state.products[itm.productId];
      const li = document.createElement('li');
      li.textContent = prod.name + ' — ' + itm.grams + 'g';
      list.appendChild(li);
    });
    mealCard.appendChild(list);
    const macros = document.createElement('p');
    macros.innerHTML = `Muscle: ${(plan.macros.musclePct*100).toFixed(1)}%, Organs: ${(plan.macros.organPct*100).toFixed(1)}%, Bone: ${(plan.macros.bonePct*100).toFixed(1)}%`;
    mealCard.appendChild(macros);
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm & Deduct';
    confirmBtn.className = 'primary';
    confirmBtn.onclick = () => {
      confirmMeal(plan);
      buildHomePage();
    };
    mealCard.appendChild(confirmBtn);
    // Build coach messages
    const tips = generateCoachMessages(plan);
    tips.forEach(tip => {
      const p = document.createElement('p');
      p.textContent = '• ' + tip;
      coachCard.appendChild(p);
    });
  }

  function buildInventoryPage() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = '';
    // Build a container for the shop.  In future versions you can list
    // multiple shops; for now there is only Royal Barf.  Users can click
    // the shop heading to toggle the visibility of its categories.
    const shopContainer = document.createElement('div');
    shopContainer.className = 'shop-container';
    const shopHeader = document.createElement('h3');
    shopHeader.textContent = 'Royal Barf Shop';
    shopHeader.className = 'shop-header';
    shopContainer.appendChild(shopHeader);
    const table = document.createElement('table');
    table.innerHTML = `<tr><th>Product</th><th>Packs</th><th>Category</th></tr>`;
    // Group products by category (raw, treat, supplement) and deduplicate by name.
    const grouped = { raw: [], treat: [], supplement: [] };
    const seenNames = new Set();
    Object.values(state.products).forEach(p => {
      // Deduplicate by case‑insensitive name, ignoring spaces and parentheses.
      // Some entries share the same name but differ only by spacing or punctuation;
      // we normalise by stripping whitespace and parentheses before comparing.
      const rawName = (p.name || '').toLowerCase();
      const nameKey = rawName.replace(/[\s()]/g, '');
      if (seenNames.has(nameKey)) return;
      seenNames.add(nameKey);
      const cat = p.category || (p.pantry ? 'treat' : 'raw');
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    const catNames = { raw: 'Raw Meat', treat: 'Treats', supplement: 'Supplements' };
    ['raw','treat','supplement'].forEach(cat => {
      if (grouped[cat].length === 0) return;
      const headerRow = document.createElement('tr');
      headerRow.className = 'category-row';
      headerRow.innerHTML = `<td colspan="3"><strong>${catNames[cat]}</strong></td>`;
      table.appendChild(headerRow);
      grouped[cat].forEach(prod => {
        const tr = document.createElement('tr');
        const stock = getStockByProduct(prod.id);
        // Build stock cell with adjust buttons.  Use data-id attributes to identify the product.
        // Only show the minus button if there is stock available to consume.
        const minusBtn = `<button class="adjust minus" data-id="${prod.id}" title="Consume one pack">&minus;</button>`;
        const plusBtn = `<button class="adjust plus" data-id="${prod.id}" title="Add one pack">&plus;</button>`;
        const controls = `${minusBtn} ${plusBtn}`;
        const stockHtml = `<span class="stock-value">${stock.toFixed(1)}</span>`;
        tr.innerHTML = `<td>${prod.name}</td><td>${stockHtml} ${controls}</td><td>${prod.category}</td>`;
        // When clicking on a row, open product details unless the click originated from an adjust button.
        tr.addEventListener('click', function(e) {
          const target = e.target;
          if (target.classList && target.classList.contains('adjust')) {
            return;
          }
          openProductDetails(prod.id);
        });
        table.appendChild(tr);
      });
    });
    shopContainer.appendChild(table);
    // Preserve the expanded/collapsed state across rebuilds.  Use the
    // global inventoryExpanded flag to determine whether to show the
    // categories table by default.  When the user clicks the shop header
    // we toggle the flag and update the display accordingly.  This ensures
    // that adjusting stock (via the plus/minus buttons) and rebuilding
    // the inventory list does not inadvertently collapse the categories.
    table.style.display = inventoryExpanded ? '' : 'none';
    shopHeader.onclick = () => {
      inventoryExpanded = !inventoryExpanded;
      table.style.display = inventoryExpanded ? '' : 'none';
    };
    list.appendChild(shopContainer);

    // Attach handlers for the adjust buttons (plus/minus) after the table is in the DOM.
    const adjustPlusBtns = table.querySelectorAll('button.adjust.plus');
    adjustPlusBtns.forEach(btn => {
      btn.addEventListener('click', function(event) {
        event.stopPropagation();
        const pid = this.dataset.id;
        // Add one pack to inventory
        addInventoryEvent(pid, 'receive', 1);
        // Rebuild the inventory page to reflect updated stock
        buildInventoryPage();
      });
    });
    const adjustMinusBtns = table.querySelectorAll('button.adjust.minus');
    adjustMinusBtns.forEach(btn => {
      btn.addEventListener('click', function(event) {
        event.stopPropagation();
        const pid = this.dataset.id;
        // Remove one pack only if stock is available
        const current = getStockByProduct(pid);
        if (current > 0) {
          addInventoryEvent(pid, 'consume', 1);
        }
        buildInventoryPage();
      });
    });
  }

  function openAddStockDialog() {
    const prodIds = Object.keys(state.products);
    const prodOptions = prodIds.map(pid => `<option value="${pid}">${state.products[pid].name}</option>`).join('');
    const html = `
      <form id="addStockForm" class="dialog">
        <h3>Add Stock</h3>
        <label>Product<select name="product">${prodOptions}</select></label>
        <label>Packs<input type="number" name="packs" min="0.1" step="0.1" value="1" /></label>
        <button type="submit" class="primary">Add</button>
        <button type="button" class="secondary" id="cancelAddStock">Cancel</button>
      </form>
    `;
    showModal(html, function closeHandler() {});
    const form = document.getElementById('addStockForm');
    form.onsubmit = function(e) {
      e.preventDefault();
      const pid = form.product.value;
      const packs = parseFloat(form.packs.value);
      addInventoryEvent(pid, 'receive', packs);
      hideModal();
    };
    document.getElementById('cancelAddStock').onclick = hideModal;
  }

  function openAddProductDialog() {
    const html = `
      <form id="addProductForm" class="dialog">
        <h3>Add Product</h3>
        <label>Name<input name="name" required /></label>
        <label>Brand<input name="brand" /></label>
        <label>Grams per pack<input name="gramsPerPack" type="number" step="1" required /></label>
        <label>Category
          <select name="category">
            <option value="raw">Raw</option>
            <option value="treat">Treat</option>
            <option value="supplement">Supplement</option>
          </select>
        </label>
        <label>Protein<input name="protein" /></label>
        <label>Macros (muscle,organ,bone)
          <input name="muscle" type="number" step="0.01" placeholder="0.8" />
          <input name="organ" type="number" step="0.01" placeholder="0.1" />
          <input name="bone" type="number" step="0.01" placeholder="0.1" />
        </label>
        <button type="submit" class="primary">Save</button>
        <button type="button" class="secondary" id="cancelAddProduct">Cancel</button>
      </form>
    `;
    showModal(html, function closeHandler() {});
    const form = document.getElementById('addProductForm');
    form.onsubmit = function(e) {
      e.preventDefault();
      const id = generateId('prod');
      const name = form.name.value.trim();
      const brand = form.brand.value.trim() || 'Custom';
      const grams = parseFloat(form.gramsPerPack.value);
      const category = form.category.value;
      const protein = form.protein.value.trim().toLowerCase() || 'unknown';
      // Determine macros: use explicit values if provided, otherwise compute heuristically
      const defaults = computeDefaultMacros(name, category);
      const muscle = form.muscle.value ? parseFloat(form.muscle.value) : defaults.muscle;
      const organ = form.organ.value ? parseFloat(form.organ.value) : defaults.organ;
      const bone = form.bone.value ? parseFloat(form.bone.value) : defaults.bone;
      state.products[id] = {
        id,
        name,
        brand,
        gramsPerPack: grams,
        category,
        protein,
        macros: { muscle, organ, bone },
        pantry: category !== 'raw'
      };
      saveState();
      buildInventoryPage();
      hideModal();
    };
    document.getElementById('cancelAddProduct').onclick = hideModal;
  }

  function showModal(html, onClose) {
    // Create overlay
    let overlay = document.getElementById('modalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modalOverlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
      overlay.style.zIndex = '100';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = html;
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        hideModal();
        if (onClose) onClose();
      }
    };
  }

  function hideModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  /**
   * Show detailed information about a product in a modal.  Displays
   * ingredients, pack size, category and macros.  Called when a
   * product row in the inventory is clicked.
   * @param {string} productId
   */
  function openProductDetails(productId) {
    const prod = state.products[productId];
    if (!prod) return;
    const macros = prod.macros || { muscle: 0, organ: 0, bone: 0 };
    const html = `<div class='dialog'>
      <h3>${prod.name}</h3>
      <p><strong>Category:</strong> ${prod.category || (prod.pantry ? 'pantry' : 'raw')}</p>
      <p><strong>Pack size:</strong> ${prod.gramsPerPack} g</p>
      <p><strong>Ingredients:</strong> ${prod.ingredients || 'N/A'}</p>
      <p><strong>Macros:</strong> Muscle ${(macros.muscle*100).toFixed(0)}%, Organ ${(macros.organ*100).toFixed(0)}%, Bone ${(macros.bone*100).toFixed(0)}%</p>
      <button id='closeProdDetails' class='secondary'>Close</button>
    </div>`;
    showModal(html);
    document.getElementById('closeProdDetails').onclick = hideModal;
  }

  // Stool analysis original implementation kept for legacy reference.  The
  // updated implementation supporting compression is defined earlier in this
  // file.  This stub remains to avoid accidental redefinition.
  function analyseStoolOriginal(file) {
    return Promise.resolve({ result: 'Healthy', compressed: null });
  }

  function buildStoolPage() {
    const resultDiv = document.getElementById('stoolResult');
    // Initial prompt
    resultDiv.innerHTML = `<p>${t('stool_select')}</p>`;
  }

  function buildPlatesPage() {
    const list = document.getElementById('platesList');
    list.innerHTML = '';
    // Example plates tutorials
    const tutorials = [
      {
        id: 'allergySeason',
        title: 'Allergy Season Plate',
        description: 'Lower histamines and inflammation using cooling proteins and vegetables.',
        build: function() {
          // Suggest: lean fish or rabbit, add beetroot/kefir if available
          const items = [];
          // pick first raw product with protein not allergic and not used recently
          const avail = Object.values(state.products).filter(p => p.category === 'raw' && getStockByProduct(p.id) > 0);
          for (const p of avail) {
            items.push({ productId: p.id, grams: p.gramsPerPack });
            break;
          }
          // Add beetroot if exists
          const beet = Object.values(state.products).find(p => p.name.toLowerCase().includes('beet'));
          if (beet && getStockByProduct(beet.id) > 0) {
            items.push({ productId: beet.id, grams: 30 });
          }
          const broth = Object.values(state.products).find(p => p.protein === 'broth');
          if (broth && getStockByProduct(broth.id) > 0) {
            items.push({ productId: broth.id, grams: 80 });
          }
          return items;
        }
      },
      {
        id: 'highActivity',
        title: 'High Activity Plate',
        description: 'Extra calories and joint support for very active days.',
        build: function() {
          const items = [];
          const raw = Object.values(state.products).filter(p => p.category === 'raw' && getStockByProduct(p.id) > 0);
          raw.forEach(p => {
            if (items.length < 2) items.push({ productId: p.id, grams: p.gramsPerPack });
          });
          // Add bone broth for joints
          const broth = Object.values(state.products).find(p => p.protein === 'broth');
          if (broth && getStockByProduct(broth.id) > 0) {
            items.push({ productId: broth.id, grams: 120 });
          }
          return items;
        }
      }
    ];
    tutorials.forEach(tut => {
      const card = document.createElement('div');
      card.className = 'card';
      const h3 = document.createElement('h3'); h3.textContent = tut.title; card.appendChild(h3);
      const p = document.createElement('p'); p.textContent = tut.description; card.appendChild(p);
      const buildBtn = document.createElement('button');
      buildBtn.className = 'primary'; buildBtn.textContent = t('build_from_inventory');
      buildBtn.onclick = () => {
        const items = tut.build();
        // show items in a modal
        const html = `<div class='dialog'><h3>${tut.title} Suggestion</h3>${items.map(it => `<p>${state.products[it.productId].name} – ${it.grams}g</p>`).join('')}<button id='closeTut' class='secondary'>Close</button></div>`;
        showModal(html);
        document.getElementById('closeTut').onclick = hideModal;
      };
      card.appendChild(buildBtn);
      list.appendChild(card);
    });
  }

  function buildInsightsPage() {
    const content = document.getElementById('insightsContent');
    content.innerHTML = '';
    // show rotation calendar for last 7 days
    const h3 = document.createElement('h3'); h3.textContent = t('insights_rotation_heading'); content.appendChild(h3);
    const table = document.createElement('table');
    const header = document.createElement('tr');
    header.innerHTML = '<th>Date</th><th>Proteins</th>';
    table.appendChild(header);
    const last7 = state.meals.filter(m => m.dogId === state.activeDogId).slice(-7);
    last7.forEach(m => {
      const tr = document.createElement('tr');
      const date = m.date || m.ts;
      const proteins = m.items.map(it => state.products[it.productId].protein).join(', ');
      tr.innerHTML = `<td>${date}</td><td>${proteins}</td>`;
      table.appendChild(tr);
    });
    content.appendChild(table);
    // Organ/bone meter for last meal
    if (last7.length > 0) {
      const last = last7[last7.length - 1];
      const p = document.createElement('p');
      p.textContent = `Last meal macros – Muscle: ${(last.macros.musclePct*100).toFixed(1)}%, Organs: ${(last.macros.organPct*100).toFixed(1)}%, Bone: ${(last.macros.bonePct*100).toFixed(1)}%`;
      content.appendChild(p);
    }
  }

  function buildOrdersPage() {
    const content = document.getElementById('ordersContent');
    content.innerHTML = '';
    // Display selected branch
    const branchPara = document.createElement('p');
    branchPara.innerHTML = `<strong>${t('settings_branch')}:</strong> ${state.settings.preferredBranch === 'lebanon' ? t('settings_branch_lebanon') : t('settings_branch_cyprus')}`;
    content.appendChild(branchPara);
    // Prepare product list and categories
    const allProducts = (state.catalogList && state.catalogList.length > 0)
      ? state.catalogList.filter(p => !p.pantry)
      : Object.values(state.products).filter(p => !p.pantry);
    // Unique categories
    const categories = Array.from(new Set(allProducts.map(p => p.category || ''))).filter(Boolean).sort();
    // Create controls for search, filter and sort
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'order-controls';
    controlsDiv.innerHTML = `
      <input type="text" id="orderSearch" placeholder="${t('orders_search_placeholder')}" style="margin-right:8px;" />
      <label>${t('orders_filter_category')} <select id="orderCategory" style="margin-right:8px;">
        <option value="all">All</option>
        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select></label>
      <label>${t('orders_sort_label')} <select id="orderSort">
        <option value="name">${t('orders_sort_name')}</option>
        <option value="price_asc">${t('orders_sort_price_asc')}</option>
        <option value="price_desc">${t('orders_sort_price_desc')}</option>
      </select></label>
    `;
    content.appendChild(controlsDiv);
    // Manual order form
    const form = document.createElement('form');
    form.id = 'manualOrderForm';
    form.className = 'card';
    // Build contact fields
    const contactDiv = document.createElement('div');
    contactDiv.innerHTML = `
      <h3>${t('orders_title')}</h3>
      <label>${t('account_email')}<input name="email" type="email" value="${state.account && state.account.email ? state.account.email : ''}" required /></label>
      <label>${t('account_password').replace('Password','Name')}<input name="name" value="" required /></label>
      <label>Phone<input name="phone" value="" required /></label>
    `;
    form.appendChild(contactDiv);
    // Table for products
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr><th style="text-align:left;padding:4px;">${t('orders_column_product')}</th><th style="text-align:left;padding:4px;">${t('orders_column_size')}</th><th style="text-align:left;padding:4px;">${t('orders_column_price')}</th><th style="text-align:left;padding:4px;">${t('orders_column_qty')}</th></tr>`;
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    form.appendChild(table);
    // Delivery, notes
    const deliveryDiv = document.createElement('div');
    deliveryDiv.innerHTML = `
      <label>Delivery Address<textarea name="address" rows="2"></textarea></label>
      <label>Notes<textarea name="notes" rows="2"></textarea></label>
    `;
    form.appendChild(deliveryDiv);
    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'primary';
    submitBtn.textContent = t('orders_submit_btn');
    form.appendChild(submitBtn);
    content.appendChild(form);
    // Function to render table rows based on filtered products
    function renderTable(list) {
      tbody.innerHTML = '';
      if (!list || list.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.style.padding = '4px';
        td.textContent = t('orders_no_match');
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      list.forEach(prod => {
        const id = prod.id;
        const name = prod.name || prod.product_name || prod.id;
        const size = prod.size || prod.size_weight || (prod.gramsPerPack ? `${prod.gramsPerPack}g` : '');
        const priceVal = (typeof prod.price !== 'undefined' && prod.price !== null) ? prod.price : (typeof prod.price_amount !== 'undefined' && prod.price_amount !== null ? prod.price_amount : null);
        const currencyVal = prod.currency || prod.price_currency || 'USD';
        const priceStr = priceVal !== null ? `${priceVal.toFixed(2)} ${currencyVal}` : '—';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="padding:4px;">${name}</td><td style="padding:4px;">${size}</td><td style="padding:4px;">${priceStr}</td><td style="padding:4px;"><input type="number" name="qty_${id}" min="0" step="1" value="0" style="width:60px;" /></td>`;
        tbody.appendChild(tr);
      });
    }
    // Current filter values
    function getFilteredList() {
      let list = allProducts.slice();
      const searchVal = document.getElementById('orderSearch').value.trim().toLowerCase();
      const catVal = document.getElementById('orderCategory').value;
      const sortVal = document.getElementById('orderSort').value;
      if (catVal && catVal !== 'all') {
        list = list.filter(p => (p.category || '') === catVal);
      }
      if (searchVal) {
        list = list.filter(p => (p.name || '').toLowerCase().includes(searchVal));
      }
      // Sorting
      if (sortVal === 'price_asc') {
        list.sort((a,b) => {
          const pa = (typeof a.price !== 'undefined' && a.price !== null) ? a.price : (a.price_amount !== null && a.price_amount !== undefined ? a.price_amount : Infinity);
          const pb = (typeof b.price !== 'undefined' && b.price !== null) ? b.price : (b.price_amount !== null && b.price_amount !== undefined ? b.price_amount : Infinity);
          return pa - pb;
        });
      } else if (sortVal === 'price_desc') {
        list.sort((a,b) => {
          const pa = (typeof a.price !== 'undefined' && a.price !== null) ? a.price : (a.price_amount !== null && a.price_amount !== undefined ? a.price_amount : -Infinity);
          const pb = (typeof b.price !== 'undefined' && b.price !== null) ? b.price : (b.price_amount !== null && b.price_amount !== undefined ? b.price_amount : -Infinity);
          return pb - pa;
        });
      } else {
        // default sort by name
        list.sort((a,b) => {
          const na = (a.name || '').toLowerCase();
          const nb = (b.name || '').toLowerCase();
          return na.localeCompare(nb);
        });
      }
      return list;
    }
    // Event listeners for controls
    document.getElementById('orderSearch').addEventListener('input', () => {
      renderTable(getFilteredList());
    });
    document.getElementById('orderCategory').addEventListener('change', () => {
      renderTable(getFilteredList());
    });
    document.getElementById('orderSort').addEventListener('change', () => {
      renderTable(getFilteredList());
    });
    // Initial render
    renderTable(getFilteredList());
    // Handle form submission
    form.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const custName = fd.get('name') || '';
      const email = fd.get('email') || '';
      const phone = fd.get('phone') || '';
      const address = fd.get('address') || '';
      const notes = fd.get('notes') || '';
      // Build order lines based on quantities
      const lines = [];
      allProducts.forEach(prod => {
        const id = prod.id;
        const qtyVal = parseInt(fd.get(`qty_${id}`), 10);
        if (qtyVal && qtyVal > 0) {
          const name = prod.name || prod.product_name || id;
          const size = prod.size || prod.size_weight || (prod.gramsPerPack ? `${prod.gramsPerPack}g` : '');
          const priceVal = (typeof prod.price !== 'undefined' && prod.price !== null) ? prod.price : (typeof prod.price_amount !== 'undefined' && prod.price_amount !== null ? prod.price_amount : null);
          const currencyVal = prod.currency || prod.price_currency || 'USD';
          const priceStr = priceVal !== null ? `${priceVal.toFixed(2)} ${currencyVal}` : '';
          const sizeStr = size ? ` (${size})` : '';
          lines.push({ qty: qtyVal, name, sizeStr, priceStr });
        }
      });
      if (lines.length === 0) {
        alert('Please specify quantities for at least one item.');
        return;
      }
      // Compose human-readable preview
      let preview = `${state.settings.preferredBranch === 'lebanon' ? 'Royal Barf Lebanon' : 'Royal Barf Cyprus'}\n`;
      preview += `\n${t('orders_order_summary_title')}\n`;
      lines.forEach(line => {
        preview += `- ${line.qty} × ${line.name}${line.sizeStr}`;
        if (line.priceStr) preview += ` – ${line.priceStr}`;
        preview += '\n';
      });
      if (custName) preview += `\nName: ${custName}`;
      if (phone) preview += `\nPhone: ${phone}`;
      if (email) preview += `\nEmail: ${email}`;
      if (address) preview += `\nAddress: ${address}`;
      if (notes) preview += `\nNotes: ${notes}`;
      // Compose WhatsApp encoded message
      let msg = `Hello Royal Barf ${state.settings.preferredBranch === 'lebanon' ? 'Lebanon' : 'Cyprus'},%0A`;
      msg += `I’d like to order:%0A`;
      lines.forEach(line => {
        msg += `- ${line.qty} × ${line.name}${line.sizeStr}`;
        if (line.priceStr) msg += ` – ${line.priceStr}`;
        msg += `%0A`;
      });
      if (custName) msg += `%0AName: ${custName}`;
      if (phone) msg += `%0APhone: ${phone}`;
      if (email) msg += `%0AEmail: ${email}`;
      if (address) msg += `%0AAddress: ${address}`;
      if (notes) msg += `%0ANotes: ${notes}`;
      const number = state.settings.preferredBranch === 'lebanon' ? '96181678131' : '35700000000';
      const url = `https://wa.me/${number}?text=${msg}`;
      // Show confirmation modal
      const html = `<div class='dialog'><h3>${t('orders_confirm_send_title')}</h3><p>${t('orders_confirm_send_message')}</p><pre style='white-space:pre-wrap;'>${preview.replace(/\n/g,'<br/>')}</pre><button id='confirmSendBtn' class='primary'>${t('orders_confirm_send_btn')}</button> <button id='cancelSendBtn' class='secondary'>${t('orders_cancel_btn')}</button></div>`;
      showModal(html);
      document.getElementById('confirmSendBtn').onclick = () => {
        // Record order history entry before sending
        try {
          const entry = {
            ts: Date.now(),
            branch: state.settings.preferredBranch || 'lebanon',
            items: lines.map(l => ({ name: l.name, qty: l.qty, size: l.sizeStr.replace(/^\s*\(|\)$/g,''), price: l.priceStr })),
            address,
            notes,
            recurring: false
          };
          if (!Array.isArray(state.orderHistory)) state.orderHistory = [];
          state.orderHistory.push(entry);
          saveState();
        } catch (err) {
          console.warn('Failed to save order history', err);
        }
        window.open(url, '_blank');
        hideModal();
      };
      document.getElementById('cancelSendBtn').onclick = () => {
        hideModal();
      };
    };
    // Recurring orders section
    const recurringSection = document.createElement('div');
    recurringSection.className = 'card';
    content.appendChild(recurringSection);
    // Render schedules and provide send/delete actions
    function renderSchedules() {
      recurringSection.innerHTML = `<h3>${t('orders_recurring_title')}</h3>`;
      if (!state.recurringOrders || state.recurringOrders.length === 0) {
        const p = document.createElement('p');
        p.textContent = t('orders_recurring_none');
        recurringSection.appendChild(p);
      } else {
        const ul = document.createElement('ul');
        state.recurringOrders.forEach((sch, idx) => {
          const li = document.createElement('li');
          const itemsSummary = sch.items.map(it => {
            const prod = (state.catalogMap && state.catalogMap[it.productId]) ? state.catalogMap[it.productId] : (state.products && state.products[it.productId]);
            const name = prod ? (prod.name || prod.product_name || it.productId) : it.productId;
            return `${name} x ${it.quantity}`;
          }).join(', ');
          li.innerHTML = `${sch.day} @ ${sch.time} – ${itemsSummary} <button data-send="${idx}" class="primary">${t('orders_send_now')}</button> <button data-del="${idx}" class="secondary">${t('order_delete_schedule')}</button>`;
          ul.appendChild(li);
        });
        recurringSection.appendChild(ul);
        // Attach handlers
        recurringSection.querySelectorAll('button[data-send]').forEach(btn => {
          btn.onclick = () => {
            const i = parseInt(btn.getAttribute('data-send'),10);
            const sch = state.recurringOrders[i];
            // Build message preview for schedule
            const lines = sch.items.map(it => {
              const prod = (state.catalogMap && state.catalogMap[it.productId]) ? state.catalogMap[it.productId] : (state.products && state.products[it.productId]);
              const name = prod ? (prod.name || prod.product_name || it.productId) : it.productId;
              const size = prod ? (prod.size || prod.size_weight || (prod.gramsPerPack ? `${prod.gramsPerPack}g` : '')) : '';
              const priceVal = prod ? ((typeof prod.price !== 'undefined' && prod.price !== null) ? prod.price : (typeof prod.price_amount !== 'undefined' && prod.price_amount !== null ? prod.price_amount : null)) : null;
              const currencyVal = prod ? (prod.currency || prod.price_currency || 'USD') : 'USD';
              const priceStr = priceVal !== null ? `${priceVal.toFixed(2)} ${currencyVal}` : '';
              const sizeStr = size ? ` (${size})` : '';
              return { qty: it.quantity, name, sizeStr, priceStr };
            });
            let preview = `${state.settings.preferredBranch === 'lebanon' ? 'Royal Barf Lebanon' : 'Royal Barf Cyprus'}\n`;
            preview += `\n${t('orders_order_summary_title')}\n`;
            lines.forEach(line => {
              preview += `- ${line.qty} × ${line.name}${line.sizeStr}`;
              if (line.priceStr) preview += ` – ${line.priceStr}`;
              preview += '\n';
            });
            // Compose encoded message
            let msg = `Hello Royal Barf ${state.settings.preferredBranch === 'lebanon' ? 'Lebanon' : 'Cyprus'},%0A`;
            msg += `I’d like to order:%0A`;
            lines.forEach(line => {
              msg += `- ${line.qty} × ${line.name}${line.sizeStr}`;
              if (line.priceStr) msg += ` – ${line.priceStr}`;
              msg += `%0A`;
            });
            const number = state.settings.preferredBranch === 'lebanon' ? '96181678131' : '35700000000';
            const url = `https://wa.me/${number}?text=${msg}`;
            const html = `<div class='dialog'><h3>${t('orders_confirm_send_title')}</h3><p>${t('orders_confirm_send_message')}</p><pre style='white-space:pre-wrap;'>${preview.replace(/\n/g,'<br/>')}</pre><button id='confirmSendBtn' class='primary'>${t('orders_confirm_send_btn')}</button> <button id='cancelSendBtn' class='secondary'>${t('orders_cancel_btn')}</button></div>`;
            showModal(html);
            document.getElementById('confirmSendBtn').onclick = () => {
              // Record recurring order history entry before sending
              try {
                const entry = {
                  ts: Date.now(),
                  branch: state.settings.preferredBranch || 'lebanon',
                  items: lines.map(l => ({ name: l.name, qty: l.qty, size: l.sizeStr.replace(/^\s*\(|\)$/g,''), price: l.priceStr })),
                  recurring: true,
                  schedule: { day: sch.day, time: sch.time }
                };
                if (!Array.isArray(state.orderHistory)) state.orderHistory = [];
                state.orderHistory.push(entry);
                saveState();
              } catch (err) {
                console.warn('Failed to save order history', err);
              }
              window.open(url, '_blank');
              hideModal();
            };
            document.getElementById('cancelSendBtn').onclick = () => {
              hideModal();
            };
          };
        });
        recurringSection.querySelectorAll('button[data-del]').forEach(btn => {
          btn.onclick = () => {
            const i = parseInt(btn.getAttribute('data-del'), 10);
            state.recurringOrders.splice(i,1);
            saveState();
            renderSchedules();
          };
        });
      }
      // Add schedule creation button
      const addBtn = document.createElement('button');
      addBtn.className = 'primary';
      addBtn.textContent = t('orders_schedule_save');
      recurringSection.appendChild(addBtn);
      addBtn.onclick = () => {
        showModal(buildScheduleFormHtml(), () => {});
        attachScheduleFormHandlers();
      };
    }
    renderSchedules();
    // Build HTML for schedule form
    function buildScheduleFormHtml() {
      let html = `<div class='dialog'><h3>${t('orders_recurring_title')}</h3>`;
      html += `<label>${t('orders_schedule_day')}<select id='schDay'><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option></select></label>`;
      html += `<label>${t('orders_schedule_time')}<input id='schTime' type='time' value='08:00' /></label>`;
      html += `<div><strong>${t('orders_schedule_items')}:</strong><br/>`;
      allProducts.forEach(prod => {
        const id = prod.id;
        const name = prod.name || prod.product_name || id;
        const size = prod.size || prod.size_weight || (prod.gramsPerPack ? `${prod.gramsPerPack}g` : '');
        const display = size ? `${name} (${size})` : name;
        html += `<label style='display:block'><input type='number' min='0' step='1' id='schQty_${id}' value='0' style='width:60px;' /> ${display}</label>`;
      });
      html += '</div>';
      html += `<button id='saveScheduleBtn' class='primary'>${t('orders_schedule_save')}</button>`;
      html += `</div>`;
      return html;
    }
    function attachScheduleFormHandlers() {
      const saveBtn = document.getElementById('saveScheduleBtn');
      if (saveBtn) {
        saveBtn.onclick = () => {
          const day = document.getElementById('schDay').value;
          const time = document.getElementById('schTime').value;
          const items = [];
          allProducts.forEach(prod => {
            const id = prod.id;
            const qty = parseInt(document.getElementById(`schQty_${id}`).value, 10);
            if (qty && qty > 0) {
              items.push({ productId: id, quantity: qty });
            }
          });
          if (items.length === 0) {
            alert('Please specify quantities for at least one item.');
            return;
          }
          state.recurringOrders.push({ day, time, items });
          saveState();
          hideModal();
          renderSchedules();
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // FAQs page
  /**
   * Render the FAQs page by listing common questions and answers in an
   * expandable format.  Questions and answers are defined via translation keys
   * to support bilingual display.  Additional FAQs can be added in the
   * translations object using the pattern faqs_question_* and faqs_answer_*.
   */
  function buildFaqsPage() {
    const content = document.getElementById('faqsContent');
    if (!content) return;
    content.innerHTML = '';
    // Define FAQ entries as pairs of translation keys
    const faqKeys = [
      ['faqs_question_storage','faqs_answer_storage'],
      ['faqs_question_transition','faqs_answer_transition'],
      ['faqs_question_stool','faqs_answer_stool']
    ];
    faqKeys.forEach(([qKey,aKey]) => {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = t(qKey);
      details.appendChild(summary);
      const p = document.createElement('p');
      p.textContent = t(aKey);
      details.appendChild(p);
      content.appendChild(details);
    });
  }

  // ---------------------------------------------------------------------------
  // Studies page
  /**
   * Render the Studies page listing curated research articles about raw feeding.
   * Each study includes a title, summary and external link.  Content is
   * bilingual via translation keys; however titles and summaries may remain
   * English if original study language differs.  Extend the `studies` array
   * below to add more entries.
   */
  function buildStudiesPage() {
    const content = document.getElementById('studiesContent');
    if (!content) return;
    content.innerHTML = '';
    const studies = [
      {
        title: 'Raw meat-based diets for dogs: benefits and risks',
        summary: 'Reviewing potential benefits and microbiological hazards of feeding raw meat-based diets to pets.',
        url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6137811/'
      },
      {
        title: 'Bones and raw food diets: a review of the evidence',
        summary: 'Evaluates the nutritional adequacy and safety concerns of BARF diets for dogs.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/32234751/'
      },
      {
        title: 'Gut microbiota changes in dogs fed raw diets',
        summary: 'Examines how raw feeding alters canine gut microbiome composition.',
        url: 'https://www.sciencedirect.com/science/article/pii/S1090023319302543'
      }
    ];
    studies.forEach(study => {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<strong>${study.title}</strong><p>${study.summary}</p><a href="${study.url}" target="_blank">${t('studies_view_btn')}</a>`;
      content.appendChild(div);
    });
  }

  function buildSettingsPage() {
    const content = document.getElementById('settingsContent');
    content.innerHTML = '';
    const dog = getActiveDog();
    // Dog profile form
    const form = document.createElement('form');
    form.id = 'dogForm';
    form.innerHTML = `
      <h3>Dog Profile</h3>
      <label>Name<input name="name" value="${dog.name}" required /></label>
      <label>Breed<input name="breed" value="${dog.breed}" /></label>
      <label>Sex<select name="sex"><option ${dog.sex==='Male'?'selected':''}>Male</option><option ${dog.sex==='Female'?'selected':''}>Female</option></select></label>
      <label>Weight (kg)<input name="weight" type="number" step="0.1" value="${dog.weightKg}" required /></label>
      <label>Age (years)<input name="age" type="number" step="0.1" value="${dog.ageYears}" required /></label>
      <label>Energy<select name="energy"><option ${dog.energy==='low'?'selected':''}>low</option><option ${dog.energy==='normal'?'selected':''}>normal</option><option ${dog.energy==='high'?'selected':''}>high</option></select></label>
      <label>Body condition<select name="condition"><option ${dog.bodyCondition==='lean'?'selected':''}>lean</option><option ${dog.bodyCondition==='ideal'?'selected':''}>ideal</option><option ${dog.bodyCondition==='overweight'?'selected':''}>overweight</option></select></label>
      <label>Allergies (comma separated)<input name="allergies" value="${dog.allergies.join(',')}" /></label>
      <button type="submit" class="primary">Save Profile</button>
    `;
    content.appendChild(form);
    form.onsubmit = (e) => {
      e.preventDefault();
      dog.name = form.name.value.trim();
      dog.breed = form.breed.value.trim();
      dog.sex = form.sex.value;
      dog.weightKg = parseFloat(form.weight.value);
      dog.ageYears = parseFloat(form.age.value);
      dog.energy = form.energy.value;
      dog.bodyCondition = form.condition.value;
      dog.allergies = form.allergies.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      dog.updated = Date.now();
      saveState();
      alert('Dog profile saved');
    };
    // Preferences form
    const prefs = state.settings;
    const prefForm = document.createElement('form');
    prefForm.id = 'prefForm';
    prefForm.innerHTML = `
      <h3>Preferences</h3>
      <label>${t('settings_units')}<select name="units"><option ${prefs.units==='metric'?'selected':''} value="metric">${t('settings_metric')}</option><option ${prefs.units==='imperial'?'selected':''} value="imperial">${t('settings_imperial')}</option></select></label>

      <label>${t('settings_language')}<select name="language"><option value="en" ${state.settings.language === 'en' ? 'selected' : ''}>${t('settings_select_english')}</option><option value="ar" ${state.settings.language === 'ar' ? 'selected' : ''}>${t('settings_select_arabic')}</option></select></label>

      <label>${t('settings_branch')}<select name="branch"><option value="lebanon" ${state.settings.preferredBranch === 'lebanon' ? 'selected' : ''}>${t('settings_branch_lebanon')}</option><option value="cyprus" ${state.settings.preferredBranch === 'cyprus' ? 'selected' : ''}>${t('settings_branch_cyprus')}</option></select></label>
      <label>Feeding % body weight<input name="feedPct" type="number" step="0.001" value="${prefs.feedingPercent}" /></label>
      <label>Morning reminder<input name="morning" type="time" value="${prefs.morningTime}" /></label>
      <label>Evening reminder<input name="evening" type="time" value="${prefs.eveningTime}" /></label>
      <label>Thaw reminder<input name="thaw" type="time" value="${prefs.thawTime}" /></label>
      <label>Background
        <select name="background">
          <option value="wolf-photo-bg" ${prefs.preferredBackground==='wolf-photo-bg'?'selected':''}>Wolf (Default)</option>
        </select>
      </label>
      <label>Custom background
        <input type="file" name="customBg" accept="image/*" />
      </label>
      <label class="pro-toggle">
        <!-- Display Pro status rather than allowing manual toggle -->
        <span><strong>${t('settings_pro_status')}:</strong> <strong>${isProActive() ? t('settings_pro_active') : t('settings_pro_inactive')}</strong></span>
      </label>
      <button type="submit" class="primary">Save Preferences</button>
    `;
    content.appendChild(prefForm);
    // Attach change handler for custom background upload. When a file is selected,
    // read it as a data URL and apply immediately. The file is stored in
    // prefs.customBackground and preferredBackground is set to 'custom-bg'.
    const fileInput = prefForm.querySelector('input[name="customBg"]');
    if (fileInput) {
      fileInput.onchange = (ev) => {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          prefs.customBackground = reader.result;
          prefs.preferredBackground = 'custom-bg';
          // Apply custom background immediately: remove any existing classes
          document.body.classList.remove('wolf-background-1','wolf-background-2','wolf-background-3','wolf-background-4','wolf-photo-bg');
          document.body.style.backgroundImage = `url('${reader.result}')`;
          document.body.style.backgroundSize = 'cover';
          document.body.style.backgroundPosition = 'center';
          saveState();
          alert('Custom background set');
        };
        reader.readAsDataURL(file);
      };
    }

    prefForm.onsubmit = (e) => {
      e.preventDefault();
      prefs.units = prefForm.units.value;
      prefs.feedingPercent = parseFloat(prefForm.feedPct.value);
      prefs.morningTime = prefForm.morning.value;
      prefs.eveningTime = prefForm.evening.value;
      prefs.thawTime = prefForm.thaw.value;
      // Save language preference
      prefs.language = prefForm.language.value;

      // Save preferred branch selection (used for WhatsApp ordering)
      prefs.preferredBranch = prefForm.branch.value;
      // Mirror to root level for backwards compatibility
      state.preferredBranch = prefs.preferredBranch;
      // Only update preferredBackground from the select if no custom background
      // has been set. When a custom image is uploaded, `prefs.preferredBackground`
      // is set to 'custom-bg' and should remain unchanged here.
      if (prefs.preferredBackground !== 'custom-bg') {
        prefs.preferredBackground = prefForm.background.value;
      }
      // Apply the selected background. If a custom background is set, apply it
      // as an inline style. Otherwise, use the CSS class on the body.
      document.body.classList.remove('wolf-background-1','wolf-background-2','wolf-background-3','wolf-background-4','wolf-photo-bg');
      if (prefs.preferredBackground === 'custom-bg' && prefs.customBackground) {
        document.body.style.backgroundImage = `url('${prefs.customBackground}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
      } else {
        // Clear any inline image set previously
        document.body.style.backgroundImage = '';
        document.body.classList.add(prefs.preferredBackground);
      }
      updateProStatus();
      saveState();
      applyLanguage();
      maybeShowBanner();
      alert('Preferences saved');
    };
    // Backup & Restore
    const backupDiv = document.createElement('div');
    backupDiv.innerHTML = `
      <h3>Backup & Restore</h3>
      <button id="exportBtn" class="secondary">Export JSON</button>
      <button id="exportPdfBtn" class="secondary">Export PDF</button>
      <label class="secondary">Import JSON<input id="importInput" type="file" accept="application/json" style="display:none" /></label>
    `;
    content.appendChild(backupDiv);
    document.getElementById('exportBtn').onclick = () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'pawfuel_backup.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };
    document.getElementById('importInput').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          state = data;
          saveState();
          alert('Data imported');
          location.reload();
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    // PDF export event
    document.getElementById('exportPdfBtn').onclick = () => {
      // Only allow PDF export if Pro is enabled
      if (!state.settings.isPro) {
        alert('PDF export is a Pro feature (US$1.99/month). Enable Pro in Preferences to use this.');
        return;
      }
      exportPDF();
    };

    // Legal documents and account deletion
    const legalDiv = document.createElement('div');
    legalDiv.innerHTML = `
      <h3>Legal & Extras</h3>
      <button id="privacyLink" class="secondary">${t('settings_privacy')}</button>
      <button id="termsLink" class="secondary">${t('settings_terms')}</button>
      <button id="faqsLink" class="secondary">${t('faqs_title')}</button>
      <button id="studiesLink" class="secondary">${t('studies_title')}</button>
      <button id="deleteDataBtn" class="secondary">${t('settings_delete_account')}</button>
      <button id="showBannerBtn" class="secondary">${t('show_welcome_offer')}</button>
      <button id="contactSupportBtn" class="secondary">${t('settings_contact_support')}</button>
    `;
    content.appendChild(legalDiv);
    // Attach events for legal docs and delete account
    document.getElementById('privacyLink').onclick = () => openLegalDoc('privacy');
    document.getElementById('termsLink').onclick = () => openLegalDoc('terms');
    const faqsBtn = document.getElementById('faqsLink');
    if (faqsBtn) faqsBtn.onclick = () => { showPage('faqsPage'); buildFaqsPage(); };
    const studiesBtn = document.getElementById('studiesLink');
    if (studiesBtn) studiesBtn.onclick = () => { showPage('studiesPage'); buildStudiesPage(); };
    document.getElementById('deleteDataBtn').onclick = deleteAccountAndData;

    // Restore the launch banner on demand
    const showBannerBtn = document.getElementById('showBannerBtn');
    if (showBannerBtn) {
      showBannerBtn.onclick = () => {
        state.bannerDismissed = false;
        saveState();
        maybeShowBanner();
        alert(t('show_welcome_offer'));
      };
    }
    // Contact support via WhatsApp to the preferred branch
    const contactBtn = document.getElementById('contactSupportBtn');
    if (contactBtn) {
      contactBtn.onclick = () => {
        // Determine branch number (Lebanon default; can extend later)
        const branch = state.settings && state.settings.preferredBranch ? state.settings.preferredBranch : 'lebanon';
        let number;
        if (branch === 'cyprus') {
          // Placeholder for Cyprus number (to be provided later)
          number = '35712345678';
        } else {
          // Lebanon branch
          number = '96181678131';
        }
        const url = 'https://wa.me/' + number;
        window.open(url, '_blank');
      };
    }

    // Append a disclaimer for users.  This informs them that the app’s
    // suggestions are general in nature and should not replace
    // professional veterinary advice.
    const disclaimer = document.createElement('p');
    disclaimer.className = 'disclaimer';
    disclaimer.textContent = t('disclaimer');
    content.appendChild(disclaimer);
  }

  // ---------------------------------------------------------------------------
  // Account page: sign up, sign in, and account management
  function buildAccountPage() {
    const section = document.getElementById('accountPage');
    section.innerHTML = '';
    // Heading
    const h2 = document.createElement('h2');
    h2.textContent = t('account_title');
    section.appendChild(h2);
    // If no account or logged out
    if (!state.account || !state.account.loggedIn) {
      // Show create account form
      const createDiv = document.createElement('div');
      createDiv.className = 'card';
      createDiv.innerHTML = `<h3>${t('account_create')}</h3>
        <form id="createAccountForm">
          <label>${t('account_email')}<input type="email" name="email" required /></label>
          <label>${t('account_password')}<input type="password" name="password" required /></label>
          <button type="submit" class="primary">${t('account_create_btn')}</button>
        </form>`;
      section.appendChild(createDiv);
      // Show sign in form
      const loginDiv = document.createElement('div');
      loginDiv.className = 'card';
      loginDiv.innerHTML = `<h3>${t('account_sign_in')}</h3>
        <form id="loginForm">
          <label>${t('account_email')}<input type="email" name="email" required /></label>
          <label>${t('account_password')}<input type="password" name="password" required /></label>
          <button type="submit" class="primary">${t('account_login_btn')}</button>
        </form>`;
      section.appendChild(loginDiv);
      // Sign in with social buttons (native only placeholder)
      const socialDiv = document.createElement('div');
      socialDiv.className = 'card';
      socialDiv.innerHTML = `<button id="loginGoogle" class="secondary" style="width:100%;margin-bottom:0.5rem;">${t('account_sign_in_with_google')}</button>
        <button id="loginApple" class="secondary" style="width:100%;">${t('account_sign_in_with_apple')}</button>`;
      section.appendChild(socialDiv);
      // Event handlers
      const createForm = document.getElementById('createAccountForm');
      if (createForm) {
        createForm.onsubmit = (e) => {
          e.preventDefault();
          const email = createForm.email.value.trim();
          const password = createForm.password.value;
          if (state.account) {
            alert(t('account_existing_error'));
            return;
          }
          state.account = {
            email,
            password,
            createdAt: Date.now(),
            trialStart: Date.now(),
            subscriptionStart: null,
            loggedIn: true,
            onboardingDone: false
          };
          updateProStatus();
          saveState();
          maybeShowBanner();
          // Redirect to onboarding wizard
          showPage('onboardingPage');
          buildOnboardingPage();
        };
      }
      const loginForm = document.getElementById('loginForm');
      if (loginForm) {
        loginForm.onsubmit = (e) => {
          e.preventDefault();
          const email = loginForm.email.value.trim();
          const password = loginForm.password.value;
          if (!state.account) {
            alert(t('account_not_found_error'));
            return;
          }
          if (state.account.email !== email || state.account.password !== password) {
            alert(t('account_credentials_error'));
            return;
          }
          state.account.loggedIn = true;
          updateProStatus();
          saveState();
          maybeShowBanner();
          // If onboarding not done, show wizard; else home
          if (!state.account.onboardingDone) {
            showPage('onboardingPage');
            buildOnboardingPage();
          } else {
            showPage('homePage');
            buildHomePage();
          }
        };
      }
      // Social sign in placeholders
      const googleBtn = document.getElementById('loginGoogle');
      if (googleBtn) {
        googleBtn.onclick = () => {
          alert('Sign in with Google is only available in the native app.');
        };
      }
      const appleBtn = document.getElementById('loginApple');
      if (appleBtn) {
        appleBtn.onclick = () => {
          alert('Sign in with Apple is only available in the native app.');
        };
      }
    } else {
      // Logged in – display account details and sign out option
      const infoDiv = document.createElement('div');
      infoDiv.className = 'card';
      // Compute trial/subscription status
      let status = '';
      if (state.account.trialStart) {
        const now = Date.now();
        const trialEnd = new Date(state.account.trialStart).getTime() + 30 * 24 * 60 * 60 * 1000;
        if (now < trialEnd) {
          const days = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
          status = `${t('settings_trial_left')} ${days}d`;
        }
      }
      if (!status && state.account.subscriptionStart) {
        // Determine if within intro period of 90 days
        const now = Date.now();
        const introEnd = new Date(state.account.subscriptionStart).getTime() + 90 * 24 * 60 * 60 * 1000;
        if (now < introEnd) {
          const days = Math.ceil((introEnd - now) / (24 * 60 * 60 * 1000));
          status = `${t('settings_subscription_intro_left')} ${days}d`;
        } else {
          status = t('settings_subscription_active');
        }
      }
      if (!status && isProActive()) {
        status = t('settings_subscription_active');
      }
      infoDiv.innerHTML = `<p><strong>${state.account.email}</strong></p><p>${status}</p>`;
      section.appendChild(infoDiv);
      const signOutBtn = document.createElement('button');
      signOutBtn.className = 'secondary';
      signOutBtn.textContent = t('account_sign_out');
      signOutBtn.onclick = () => {
        state.account.loggedIn = false;
        updateProStatus();
        saveState();
        maybeShowBanner();
        buildAccountPage();
      };
      section.appendChild(signOutBtn);
    }
  }

  // ---------------------------------------------------------------------------
  // Onboarding wizard: collect dog info and generate rotation plan
  function buildOnboardingPage() {
    const section = document.getElementById('onboardingPage');
    section.innerHTML = '';
    const h2 = document.createElement('h2');
    h2.textContent = t('onboarding_title');
    section.appendChild(h2);
    const p = document.createElement('p');
    p.textContent = t('onboarding_intro');
    section.appendChild(p);
    const dog = getActiveDog();
    const form = document.createElement('form');
    form.id = 'onboardingForm';
    form.innerHTML = `
      <label>${t('onboarding_weight')}<input name="weight" type="number" step="0.1" value="${dog.weightKg}" required /></label>
      <label>${t('onboarding_age')}<input name="age" type="number" step="0.1" value="${dog.ageYears}" required /></label>
      <label>${t('onboarding_activity')}<select name="energy"><option value="low" ${dog.energy==='low'?'selected':''}>low</option><option value="normal" ${dog.energy==='normal'?'selected':''}>normal</option><option value="high" ${dog.energy==='high'?'selected':''}>high</option></select></label>
      <label>${t('onboarding_sensitivities')}<input name="sensitivities" value="${dog.allergies.join(',')}" /></label>
      <label class="consent-label"><input name="consent" type="checkbox" required /> I agree to the <span id="onboardPrivacyLink" class="link">${t('settings_privacy')}</span> &amp; <span id="onboardTermsLink" class="link">${t('settings_terms')}</span></label>
      <button type="submit" class="primary">${t('onboarding_continue')}</button>
    `;
    section.appendChild(form);
    // Attach handlers for privacy and terms links
    setTimeout(() => {
      const privLink = document.getElementById('onboardPrivacyLink');
      if (privLink) privLink.onclick = (ev) => { ev.preventDefault(); openLegalDoc('privacy'); };
      const termsLink = document.getElementById('onboardTermsLink');
      if (termsLink) termsLink.onclick = (ev) => { ev.preventDefault(); openLegalDoc('terms'); };
    });
    form.onsubmit = (e) => {
      e.preventDefault();
      // Update dog info
      dog.weightKg = parseFloat(form.weight.value);
      dog.ageYears = parseFloat(form.age.value);
      dog.energy = form.energy.value;
      dog.allergies = form.sensitivities.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      dog.updated = Date.now();
      // Require consent checkbox
      const consentBox = form.consent;
      if (!consentBox || !consentBox.checked) {
        alert('You must agree to the Privacy Policy and Terms of Use to continue.');
        return;
      }
      state.consentGiven = true;
      // Generate rotation calendar if Pro active
      state.rotation = [];
      updateProStatus();
      if (isProActive()) {
        state.rotation = generateRotationCalendar();
      }
      // Mark onboarding complete
      if (state.account) state.account.onboardingDone = true;
      saveState();
      // Show summary / rotation
      displayRotationSummary();
    };
    // Helper to display rotation summary or message
    function displayRotationSummary() {
      // Clear previous content
      section.innerHTML = '';
      const title = document.createElement('h2');
      title.textContent = t('onboarding_title');
      section.appendChild(title);
      if (!isProActive()) {
        const msg = document.createElement('p');
        msg.textContent = t('onboarding_pro_required');
        section.appendChild(msg);
      } else {
        // Show 7‑day rotation with multiple items and optional snacks
        const list = document.createElement('div');
        list.className = 'card';
        let html = `<h3>${t('rotation_heading')}</h3><ul>`;
        state.rotation.forEach(day => {
          let line = `Day ${day.day}: `;
          // Build item descriptions: name and grams
          const itemParts = day.items.map(itm => {
            const prod = state.products[itm.productId];
            const name = prod ? prod.name : itm.productId;
            return `${name} (${itm.grams}g)`;
          });
          line += itemParts.join(', ');
          // Add snacks if present
          if (day.snacks && day.snacks.length > 0) {
            const snackParts = day.snacks.map(sn => {
              const prod = state.products[sn.productId];
              const name = prod ? prod.name : sn.productId;
              return `${sn.pieces}× ${name}`;
            });
            line += `; ${t('snacks_heading')}: ` + snackParts.join(', ');
          }
          html += `<li>${line}</li>`;
        });
        html += '</ul>';
        list.innerHTML = html;
        section.appendChild(list);
      }
      const finishBtn = document.createElement('button');
      finishBtn.className = 'primary';
      finishBtn.textContent = t('onboarding_finish');
      finishBtn.onclick = () => {
        showPage('homePage');
        buildHomePage();
      };
      section.appendChild(finishBtn);
    }
  }

  /**
   * Generate a simple 7‑day rotation calendar based on the dog's weight and
   * feeding percentage.  Picks random raw products for each day and
   * calculates the grams portion.  Returns an array of objects with
   * day number, productId, productName and grams.
   */
  function generateRotationCalendar() {
    const dog = getActiveDog();
    // Use a dynamic feeding percent based on dog profile
    const pct = computeFeedingPercent(dog);
    const gramsPerDay = Math.round((dog.weightKg || 0) * 1000 * pct);
    // Raw products are those with category 'raw' and not pantry
    const rawProducts = Object.values(state.products).filter(p => p.category === 'raw' && !p.pantry);
    // If no raw products defined, return empty rotation
    if (rawProducts.length === 0) return [];
    // Build a rotation array with 7 days.  For each day, pick 2–3 items with
    // distinct proteins where possible, distribute grams across them, and
    // compute macro ratios.  Also add daily treat suggestions (snacks).
    const rotation = [];
    for (let d = 0; d < 7; d++) {
      // Determine how many items today: choose randomly between 2 and 4.
      // Offering at least two different items each day promotes variety.
      // We cap at four to keep meal prep manageable.  If there are fewer
      // raw products than needed, fall back to the number available.
      let itemsCount = 2 + Math.floor(Math.random() * 3); // 2, 3 or 4
      if (rawProducts.length < itemsCount) itemsCount = rawProducts.length;
      /*
       * Shuffle the raw products and then pick a unique subset for this day.
       * We explicitly avoid choosing the same product twice in one day by
       * sampling without replacement.  First shuffle the list to randomise
       * order, then simply take the first `itemsCount` entries.  This
       * guarantees uniqueness because the slice contains no duplicates.
       * If there are fewer products than requested, we'll just return
       * whatever is available.
       */
      const shuffled = rawProducts.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      // Take the first `itemsCount` unique products.  Because `shuffled`
      // contains each product only once, slicing ensures uniqueness.
      let items = shuffled.slice(0, itemsCount);
      // As an extra safeguard, if there were duplicates (should not
      // happen), deduplicate by ID and refill from the remainder.
      const uniqueById = [];
      const seenIds = new Set();
      items.forEach(prod => {
        if (!seenIds.has(prod.id)) {
          uniqueById.push(prod);
          seenIds.add(prod.id);
        }
      });
      // If after deduplication we need more items, pull from the rest of the
      // shuffled list while avoiding duplicates
      if (uniqueById.length < itemsCount) {
        for (const prod of shuffled.slice(itemsCount)) {
          if (uniqueById.length >= itemsCount) break;
          if (!seenIds.has(prod.id)) {
            uniqueById.push(prod);
            seenIds.add(prod.id);
          }
        }
      }
      items = uniqueById;
      // Determine grams for each selected item.  Start with equal split and
      // adjust to pack sizes.  The last item gets the remainder.
      const itemGrams = [];
      let remaining = gramsPerDay;
      for (let i = 0; i < items.length; i++) {
        const prod = items[i];
        // Base target: equal share
        let grams = Math.round((gramsPerDay / items.length) / prod.gramsPerPack) * prod.gramsPerPack;
        if (grams < prod.gramsPerPack) grams = prod.gramsPerPack;
        if (i === items.length - 1) {
          grams = remaining;
        }
        // Ensure grams not negative
        if (grams < 0) grams = prod.gramsPerPack;
        itemGrams.push({ productId: prod.id, grams });
        remaining -= grams;
      }
      // Compute macro ratios for the day
      let totalGrams = 0;
      let muscle = 0, organ = 0, bone = 0;
      itemGrams.forEach(itm => {
        const prod = state.products[itm.productId];
        totalGrams += itm.grams;
        muscle += itm.grams * (prod.macros && prod.macros.muscle ? prod.macros.muscle : 0);
        organ  += itm.grams * (prod.macros && prod.macros.organ ? prod.macros.organ : 0);
        bone   += itm.grams * (prod.macros && prod.macros.bone ? prod.macros.bone : 0);
      });
      const musclePct = totalGrams > 0 ? muscle / totalGrams : 0;
      const organPct  = totalGrams > 0 ? organ / totalGrams : 0;
      const bonePct   = totalGrams > 0 ? bone  / totalGrams : 0;
      // Compute daily treat suggestions
      const snacks = computeDailyTreats(dog);
      rotation.push({ day: d + 1, items: itemGrams, snacks, macros: { musclePct, organPct, bonePct } });
    }
    return rotation;
  }

  /**
   * Display the launch banner promoting the trial and introductory pricing.  The
   * banner is shown only if the user is not currently Pro and has not
   * dismissed it.  It contains a call to action that navigates to the
   * account page, and a close button that hides the banner and sets
   * bannerDismissed to true in state.  The banner message and button
   * text are translated via the `t()` function.
   */
  function maybeShowBanner() {
    const banner = document.getElementById('launchBanner');
    if (!banner) return;
    // Hide by default
    banner.classList.add('hidden');
    // Only show if banner not dismissed.  We no longer hide the banner when
    // Pro is active; the founder’s free year offer is shown until dismissed.
    if (state.bannerDismissed) return;
    updateProStatus();
    // Construct banner content
    banner.innerHTML = '';
    const textSpan = document.createElement('span');
    // Replace date placeholder in banner message with formatted pro expiry date if available
    let bannerMsg = t('banner_message');
    if (state && state.proExpiry) {
      const end = new Date(state.proExpiry);
      // Use locale based on current language
      const locale = (state.settings && state.settings.language === 'ar') ? 'ar' : 'en';
      const formattedDate = end.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
      bannerMsg = bannerMsg.replace('{date}', formattedDate);
    }
    textSpan.textContent = bannerMsg;
    banner.appendChild(textSpan);
    const actionBtn = document.createElement('button');
    actionBtn.textContent = t('banner_action');
    actionBtn.onclick = () => {
      showPage('accountPage');
      buildAccountPage();
    };
    banner.appendChild(actionBtn);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => {
      state.bannerDismissed = true;
      saveState();
      banner.classList.add('hidden');
    };
    banner.appendChild(closeBtn);
    // Show banner
    banner.classList.remove('hidden');
  }

  // Event listeners setup
  function setupEventListeners() {
    document.querySelectorAll('#navBar button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = e.currentTarget.getAttribute('data-page');
        // Update Pro status before gating
        updateProStatus();
        // Gate pro‑only sections.  Free users can only access home, inventory, settings and account.
        if (!isProActive() && ['stool','plates','insights','orders'].includes(page)) {
          showModal(
        `<div class="dialog"><h3>${t('pro_feature_header')}</h3><p>${t('pro_feature_message')} ${t('pro_feature_cta')}</p><button type="button" class="primary" id="closeProModal">${t('pro_feature_button')}</button></div>`,
            () => {}
          );
          const close = document.getElementById('closeProModal');
          if (close) close.onclick = hideModal;
          return;
        }
        // Show the requested page
        showPage(page + 'Page');
        switch(page) {
          case 'home': buildHomePage(); break;
          case 'inventory': buildInventoryPage(); break;
          case 'stool': buildStoolPage(); break;
          case 'plates': buildPlatesPage(); break;
          case 'insights': buildInsightsPage(); break;
          case 'orders': buildOrdersPage(); break;
          case 'settings': buildSettingsPage(); break;
          case 'account': buildAccountPage(); break;
          default: break;
        }
      });
    });
    // Add stock/product buttons
    document.getElementById('addStockBtn').onclick = openAddStockDialog;
    document.getElementById('addProductBtn').onclick = openAddProductDialog;
    // Stool file input (Pro only).  Free users see a prompt to upgrade.
    document.getElementById('stoolInput').onchange = async (e) => {
      updateProStatus();
      if (!isProActive()) {
        // Show pro modal using translations
        showModal(
          `<div class="dialog"><h3>${t('pro_feature_header')}</h3><p>${t('pro_feature_message')} ${t('pro_feature_cta')}</p><button type="button" class="primary" id="closeProModal2">${t('pro_feature_button')}</button></div>`,
          () => {}
        );
        document.getElementById('closeProModal2').onclick = hideModal;
        e.target.value = '';
        return;
      }
      const file = e.target.files[0];
      if (!file) return;
      const analysis = await analyseStool(file);
      const div = document.getElementById('stoolResult');
      // Translate the result string based on language
      let resultKey;
      if (analysis.result === 'Healthy') {
        resultKey = 'stool_healthy';
      } else if (analysis.result === 'Watch') {
        resultKey = 'stool_watch';
      } else {
        resultKey = 'stool_concern';
      }
      const translatedResult = t(resultKey);
      div.innerHTML = `<p>${t('stool_result_prefix')}: ${translatedResult}</p><p>${t('stool_result_note')}</p>`;
      // Save log with compressed image
      state.stoolLogs.push({ id: generateId('stool_'), dogId: state.activeDogId, date: new Date().toISOString().slice(0,10), result: analysis.result, img: analysis.compressed });
      saveState();
    };
  }

  // Service worker registration
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('Service worker registration failed', err);
      });
    }
  }

  /**
   * Export a simple PDF summary of the dog's profile, recent meals and
   * stool logs.  This uses the browser's print function to generate
   * the PDF.  Available only when Pro is enabled.
   */
  function exportPDF() {
    const dog = getActiveDog();
    const win = window.open('', '_blank');
    win.document.write('<html><head><title>PawFuel Report</title>');
    win.document.write('<style>body{font-family:sans-serif;margin:20px;} h2{margin-top:0;} table{border-collapse:collapse;width:100%;margin-top:10px;} th,td{border:1px solid #ccc;padding:4px;text-align:left;} th{background:#f0f0f0;}</style>');
    win.document.write('</head><body>');
    win.document.write('<h2>Dog Profile</h2>');
    win.document.write(`<p><strong>Name:</strong> ${dog.name}</p>`);
    win.document.write(`<p><strong>Breed:</strong> ${dog.breed}</p>`);
    win.document.write(`<p><strong>Sex:</strong> ${dog.sex}</p>`);
    win.document.write(`<p><strong>Weight:</strong> ${dog.weightKg} kg</p>`);
    win.document.write(`<p><strong>Age:</strong> ${dog.ageYears} years</p>`);
    win.document.write(`<p><strong>Energy:</strong> ${dog.energy}</p>`);
    win.document.write(`<p><strong>Body condition:</strong> ${dog.bodyCondition}</p>`);
    if (dog.allergies && dog.allergies.length > 0) {
      win.document.write(`<p><strong>Allergies:</strong> ${dog.allergies.join(', ')}</p>`);
    }
    // Meals
    const meals = state.meals.filter(m => m.dogId === state.activeDogId).slice(-7);
    win.document.write('<h2>Recent Meals</h2>');
    if (meals.length === 0) {
      win.document.write('<p>No meals logged yet.</p>');
    } else {
      win.document.write('<table><tr><th>Date</th><th>Items</th><th>Muscle %</th><th>Organ %</th><th>Bone %</th></tr>');
      meals.forEach(m => {
        const date = m.date || new Date(m.ts).toLocaleDateString();
        const items = m.items.map(it => `${state.products[it.productId].name} (${it.grams}g)`).join(', ');
        win.document.write(`<tr><td>${date}</td><td>${items}</td><td>${(m.macros.musclePct*100).toFixed(1)}%</td><td>${(m.macros.organPct*100).toFixed(1)}%</td><td>${(m.macros.bonePct*100).toFixed(1)}%</td></tr>`);
      });
      win.document.write('</table>');
    }
    // Stool logs
    const stools = state.stoolLogs.filter(s => s.dogId === state.activeDogId).slice(-10);
    win.document.write('<h2>Stool Logs</h2>');
    if (stools.length === 0) {
      win.document.write('<p>No stool logs yet.</p>');
    } else {
      win.document.write('<table><tr><th>Date</th><th>Result</th></tr>');
      stools.forEach(s => {
        win.document.write(`<tr><td>${s.date}</td><td>${s.result}</td></tr>`);
      });
      win.document.write('</table>');
    }
    // Order history
    win.document.write('<h2>Order History</h2>');
    const orders = Array.isArray(state.orderHistory) ? state.orderHistory.slice(-10) : [];
    if (orders.length === 0) {
      win.document.write('<p>No orders yet.</p>');
    } else {
      win.document.write('<table><tr><th>Date</th><th>Branch</th><th>Items</th><th>Recurring</th></tr>');
      orders.forEach(o => {
        const date = new Date(o.ts).toLocaleDateString();
        const items = o.items.map(it => `${it.qty}× ${it.name}${it.size ? ' ('+it.size+')' : ''}`).join(', ');
        win.document.write(`<tr><td>${date}</td><td>${o.branch}</td><td>${items}</td><td>${o.recurring ? 'Yes' : 'No'}</td></tr>`);
      });
      win.document.write('</table>');
    }
    win.document.write('</body></html>');
    win.document.close();
    // Wait a bit then print
    win.focus();
    setTimeout(() => {
      win.print();
    }, 500);
  }

  /**
   * Open the appropriate legal document (privacy or terms) in a new window.  The
   * documents are packaged in the assets/legal directory as PDF files.  If
   * additional types are needed, extend this function accordingly.
   * @param {string} docType - 'privacy' or 'terms'
   */
  function openLegalDoc(docType) {
    let path;
    if (docType === 'privacy') {
      path = './assets/legal/Privacy_EN_AR.pdf';
    } else if (docType === 'terms') {
      path = './assets/legal/Terms_EN_AR.pdf';
    } else {
      return;
    }
    window.open(path, '_blank');
  }

  /**
   * Delete all locally stored data for PawFuel including account information,
   * preferences and logs.  Prompts the user for confirmation.  On
   * completion the app reloads with a fresh state.
   */
  function deleteAccountAndData() {
    const confirmDelete = confirm('This will delete your account and all local data. Are you sure?');
    if (!confirmDelete) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to remove data', err);
    }
    // Reset state to defaults and reload the app
    state = getDefaultState();
    alert('All data removed. The app will now reload.');
    location.reload();
  }

  // Initialize the app
  async function init() {
    loadState();
    // Load full catalogue asynchronously before the rest of the app initialises.
    await loadCatalog();
    // Update Pro status and apply language early
    updateProStatus();
    // Check for pro expiry and prompt user if founder period ended
    checkProExpiry();
    applyLanguage();
    // Apply saved background class or custom background. Ensure we start with a
    // single background class and remove any inline images from previous sessions.
    document.body.classList.remove('wolf-background-1','wolf-background-2','wolf-background-3','wolf-background-4','wolf-photo-bg');
    document.body.style.backgroundImage = '';
    const prefBg = state.settings.preferredBackground || 'wolf-photo-bg';
    if (prefBg === 'custom-bg' && state.settings.customBackground) {
      document.body.style.backgroundImage = `url('${state.settings.customBackground}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
    } else {
      document.body.classList.add(prefBg);
    }
    setupEventListeners();
    registerServiceWorker();
    // Decide which page to show on load
    if (state.account && state.account.loggedIn && !state.account.onboardingDone) {
      showPage('onboardingPage');
      buildOnboardingPage();
    } else {
      showPage('homePage');
      buildHomePage();
    }
    // Show banner if applicable
    maybeShowBanner();
  }

  document.addEventListener('DOMContentLoaded', init);

})();