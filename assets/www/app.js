// Main script for PawFuel static web build
// Immediately invoked async function to load configuration and set up the UI
(function(){
  // Utility: create a simple PDF and return a Uint8Array
  function makeSimplePdf(text){
    const lines = text.split('\n');
    const objects = [];
    const xref = [];
    let pdf = '%PDF-1.4\n';
    // Catalog
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
    // Pages
    objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
    // Page
    objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>\nendobj');
    // Content stream
    let stream = 'BT\n/F1 12 Tf\n';
    let y = 750;
    lines.forEach(function(l){
      const safe = l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      stream += '36 ' + y.toFixed(0) + ' Td (' + safe + ') Tj\n';
      y -= 14;
    });
    stream += 'ET';
    objects.push('4 0 obj\n<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream\nendobj');
    // Build the PDF string and xref
    let offset = pdf.length;
    objects.forEach(function(obj){
      xref.push(offset.toString().padStart(10, '0') + ' 00000 n ');
      pdf += obj + '\n';
      offset = pdf.length;
    });
    const xrefOffset = pdf.length;
    pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' + xref.join('\n') + '\n';
    pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';
    const uints = new Uint8Array(pdf.length);
    for(var i=0; i<pdf.length; i++){
      uints[i] = pdf.charCodeAt(i);
    }
    return uints;
  }

  async function init(){
    // Load configuration
    let config = {};
    try {
      const resp = await fetch('Configs/env.json');
      config = await resp.json();
    } catch (e) {
      console.error('Failed to load config', e);
    }
    // Provide defaults in case config is missing keys
    const defaults = {
      billingStartAt: '2099-01-01',
      userMonthly: 1.99,
      userAnnual: 18,
      shopMonthly: 10,
      shopAnnual: 90,
      commissionRate: 0.03,
      loyaltyDiscountMonths: 3,
      loyaltyDiscountRate: 0.5,
      showPricingPage: true,
      enableShopOwnerSignup: true,
      showCanary: false
    };
    config = Object.assign({}, defaults, config);
    // Expose config globally if needed
    window.appConfig = config;

    // Canary badge
    var canary = document.getElementById('canary');
    if(config.showCanary){
      canary.style.display = 'block';
    } else {
      canary.style.display = 'none';
    }

    // Elements
    const navButtons = document.querySelectorAll('#nav button[data-section]');
    const pages = document.querySelectorAll('.page');
    const langToggle = document.getElementById('lang-toggle');
    const createOrderBtn = document.getElementById('create-order');
    const orderSubtotalInput = document.getElementById('order-subtotal');
    const orderResult = document.getElementById('order-result');
    const downloadPdfBtn = document.getElementById('download-pdf');
    const uploadCatalogBtn = document.getElementById('upload-catalog');
    const catalogUpload = document.getElementById('catalog-upload');
    const uploadStatus = document.getElementById('upload-status');
    const pricingSection = document.getElementById('pricing');
    const pricingContent = document.getElementById('pricing-content');
    const labelOrderSubtotal = document.getElementById('label-order-subtotal');
    const createOrderLabel = createOrderBtn;
    const downloadPdfLabel = downloadPdfBtn;
    const shopPortalTitle = document.getElementById('shop-portal-title');
    const uploadCatalogLabel = uploadCatalogBtn;

    // Orders storage
    const orders = [];

    // Translation dictionary
    const translations = {
      en: {
        home: 'Home', inventory: 'Inventory', stool: 'Stool', plates: 'Plates', insights: 'Insights', orders: 'Orders', settings: 'Settings', account: 'Account', onboarding: 'Onboarding', faqs: 'FAQs', studies: 'Studies', shop: 'Shop Owner', pricing: 'Pricing', orderSubtotalLabel: 'Order Subtotal:', createOrder: 'Create Order', downloadPdf: 'Download PDF', shopPortal: 'Shop Owner Portal', upload: 'Upload Catalogue', uploaded: 'Uploaded! Awaiting approval...', pleaseSelect: 'Please select a file first', pricingTitle: 'Pricing' , joinMessage: 'You joined before billing start. Your first {{months}} months are 50% off.', userPlan: 'User Plan', shopPlan: 'Shop Owner Plan', commission: 'Commission', freeUntil: 'Free until {{date}}'
      },
      ar: {
        home: 'الرئيسية', inventory: 'المخزون', stool: 'البراز', plates: 'الوجبات', insights: 'المعلومات', orders: 'الطلبات', settings: 'الإعدادات', account: 'الحساب', onboarding: 'التعريف', faqs: 'الأسئلة', studies: 'الدراسات', shop: 'صاحب المتجر', pricing: 'التسعير', orderSubtotalLabel: 'إجمالي الطلب:', createOrder: 'إنشاء الطلب', downloadPdf: 'تحميل PDF', shopPortal: 'بوابة صاحب المتجر', upload: 'تحميل الكتالوج', uploaded: 'تم الرفع! بانتظار الموافقة...', pleaseSelect: 'يرجى اختيار ملف أولاً', pricingTitle: 'التسعير', joinMessage: 'لقد انضممت قبل بدء الفوترة. أول {{months}} أشهر لك نصف السعر.', userPlan: 'خطة المستخدم', shopPlan: 'خطة صاحب المتجر', commission: 'العمولة', freeUntil: 'مجاناً حتى {{date}}'
      }
    };
    let currentLang = 'en';

    function applyTranslations(){
      const t = translations[currentLang];
      navButtons.forEach(function(btn){
        const sec = btn.dataset.section;
        if(sec && t[sec]) btn.textContent = t[sec];
      });
      // Labels
      labelOrderSubtotal.textContent = t.orderSubtotalLabel;
      createOrderLabel.textContent = t.createOrder;
      downloadPdfLabel.textContent = t.downloadPdf;
      shopPortalTitle.textContent = t.shopPortal;
      uploadCatalogLabel.textContent = t.upload;
      // Pricing title
      document.getElementById('pricing-title').textContent = t.pricingTitle;
      // Language toggle button
      langToggle.textContent = currentLang === 'en' ? 'عربية' : 'English';
      document.documentElement.setAttribute('lang', currentLang);
      document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
      updatePricing();
    }

    langToggle.addEventListener('click', function(){
      currentLang = currentLang === 'en' ? 'ar' : 'en';
      applyTranslations();
    });

    // Navigation logic: show active page
    navButtons.forEach(function(btn){
      btn.addEventListener('click', function(){
        navButtons.forEach(function(b){ b.classList.remove('active'); });
        pages.forEach(function(sec){ sec.classList.remove('active'); });
        btn.classList.add('active');
        const section = btn.dataset.section;
        if(section){
          const page = document.getElementById(section);
          if(page) page.classList.add('active');
        }
      });
    });

    // Set default page
    if(navButtons.length > 0) navButtons[0].click();

    // Pricing page update function
    function updatePricing(){
      if(!config.showPricingPage){
        pricingSection.style.display = 'none';
        return;
      }
      pricingSection.style.display = 'block';
      const now = new Date();
      const billingStart = new Date(config.billingStartAt);
      let joinDate;
      const stored = localStorage.getItem('pfJoinDate');
      if(stored){
        joinDate = new Date(stored);
      } else {
        joinDate = now;
        localStorage.setItem('pfJoinDate', joinDate.toISOString());
      }
      let html = '';
      const t = translations[currentLang];
      if(now < billingStart){
        // still in free period
        const dateStr = billingStart.toLocaleDateString(currentLang === 'ar' ? 'ar' : 'en');
        html += '<p>' + t.freeUntil.replace('{{date}}', dateStr) + '</p>';
      } else {
        // billing started
        const monthsSince = Math.floor((now - billingStart) / (1000 * 60 * 60 * 24 * 30));
        const loyalty = joinDate < billingStart;
        let userPrice = config.userMonthly;
        if(loyalty && monthsSince < config.loyaltyDiscountMonths){
          userPrice = config.userMonthly * (1 - config.loyaltyDiscountRate);
        }
        html += '<p>' + t.userPlan + ': $' + userPrice.toFixed(2) + '/mo or $' + config.userAnnual.toFixed(2) + '/yr</p>';
        html += '<p>' + t.shopPlan + ': $' + config.shopMonthly.toFixed(2) + '/mo or $' + config.shopAnnual.toFixed(2) + '/yr</p>';
        html += '<p>' + t.commission + ': ' + (config.commissionRate * 100).toFixed(0) + '%</p>';
        if(loyalty){
          html += '<p>' + t.joinMessage.replace('{{months}}', config.loyaltyDiscountMonths) + '</p>';
        }
      }
      pricingContent.innerHTML = html;
    }

    // Create order button
    createOrderBtn.addEventListener('click', function(){
      const sub = parseFloat(orderSubtotalInput.value);
      if(isNaN(sub) || sub < 0) return;
      const commission = sub * config.commissionRate;
      const order = { subtotal: sub, commissionAmount: commission };
      orders.push(order);
      orderResult.textContent = 'Commission: $' + commission.toFixed(2);
    });

    // Upload catalog button
    uploadCatalogBtn.addEventListener('click', function(){
      if(!config.enableShopOwnerSignup){
        uploadStatus.textContent = 'Signup disabled.';
        return;
      }
      if(catalogUpload.files && catalogUpload.files.length > 0){
        uploadStatus.textContent = translations[currentLang].uploaded;
        catalogUpload.value = '';
      } else {
        uploadStatus.textContent = translations[currentLang].pleaseSelect;
      }
    });

    // Download PDF
    downloadPdfBtn.addEventListener('click', function(){
      const t = translations[currentLang];
      let lines = ['PawFuel Order Summary'];
      orders.forEach(function(o, idx){
        lines.push('Order ' + (idx + 1) + ': Subtotal $' + o.subtotal.toFixed(2) + ' Commission $' + o.commissionAmount.toFixed(2));
      });
      if(orders.length === 0){
        lines.push('No orders yet');
      }
      const pdfBytes = makeSimplePdf(lines.join('\n'));
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'order_summary.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    // Apply initial translations
    applyTranslations();
  }
  // Initialize once DOM ready
  if(document.readyState !== 'loading'){
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();